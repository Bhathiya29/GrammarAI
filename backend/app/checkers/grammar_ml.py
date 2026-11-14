import difflib
import functools
import hashlib
import logging
import os
import threading

import spacy
import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

from app.checkers.base import Checker
from app.diffing import edits_from_diff
from app.schemas import Issue

logger = logging.getLogger(__name__)

MODEL_NAME = os.getenv("GEC_MODEL_NAME", "Unbabel/gec-t5_small")

# These were chosen by hand and not tuned on a dataset
MAX_SENTENCE_TOKENS = 60
SIMILARITY_THRESHOLD = 0.6  # below this the model rewrote the sentence instead of correcting it
MAX_EDITS_PER_SENTENCE = 3


class GrammarModelChecker(Checker):
    name = "grammar_ml"
    priority = 25  # lowest, so spelling and rule checks win any overlap

    def __init__(self):
        self.tokenizer = None
        self.model = None
        self._load_attempted = False
        self._load_lock = threading.Lock()   # makes sure the model loads once, even with many threads
        self._infer_lock = threading.Lock()  # one generation at a time keeps memory and CPU predictable
        self.nlp = spacy.blank("en")
        self.nlp.add_pipe("sentencizer")

    @property
    def ready(self) -> bool:
        return self.model is not None and self.tokenizer is not None

    def warm_up(self) -> None:
        """Load the model once. Safe to call from several threads; later calls return immediately."""
        if self._load_attempted:
            return
        with self._load_lock:
            if self._load_attempted:
                return
            try:
                threads = os.getenv("TORCH_NUM_THREADS")
                if threads:
                    torch.set_num_threads(int(threads))
                logger.info("Loading %s ...", MODEL_NAME)
                self.tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
                self.model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME)
                self.model.eval()
                logger.info("%s loaded", MODEL_NAME)
            except Exception:
                logger.exception("Could not load %s, model checks are disabled", MODEL_NAME)
                self.tokenizer = None
                self.model = None
            finally:
                # A failed load is not retried on every request
                self._load_attempted = True

    @functools.lru_cache(maxsize=1024)
    def _correct_sentence(self, sentence: str) -> str:
        inputs = self.tokenizer(f"gec: {sentence}", return_tensors="pt", truncation=True, max_length=128)
        with self._infer_lock, torch.inference_mode():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=128,
                num_beams=2,
                early_stopping=True,
            )
        return self.tokenizer.decode(outputs[0], skip_special_tokens=True)

    def check(self, text: str) -> list[Issue]:
        self.warm_up()
        if not self.ready:
            return []

        issues: list[Issue] = []
        doc = self.nlp(text)

        for sent in doc.sents:
            raw = sent.text
            sent_text = raw.strip()
            if not sent_text or len(sent) > MAX_SENTENCE_TOKENS:
                continue

            # A sentence span can start with whitespace (for example after a blank line).
            # The edits are relative to the stripped text, so add back what was stripped.
            base = sent.start_char + (len(raw) - len(raw.lstrip()))

            corrected_text = self._correct_sentence(sent_text)

            ratio = difflib.SequenceMatcher(None, sent_text, corrected_text).ratio()
            if ratio < SIMILARITY_THRESHOLD:
                continue

            edits = edits_from_diff(sent_text, corrected_text)
            if len(edits) > MAX_EDITS_PER_SENTENCE:
                continue

            for edit in edits:
                global_start = base + edit.start
                global_end = base + edit.end
                if global_start >= global_end:
                    continue

                original = text[global_start:global_end]
                if not original.strip():
                    continue

                is_punctuation = all(not c.isalnum() for c in original if not c.isspace())
                category = "punctuation" if is_punctuation else "grammar"

                # The ID must be safe to use in a CSS selector, so it uses a hash and not the text itself
                digest = hashlib.sha1(original.encode("utf-8")).hexdigest()[:8]
                issue_id = f"ml-{global_start}-{global_end}-{digest}"

                if edit.replacement == "":
                    message = "Consider removing this."
                else:
                    message = f"Consider changing “{original}” to “{edit.replacement}”."

                issues.append(
                    Issue(
                        id=issue_id,
                        start=global_start,
                        end=global_end,
                        category=category,
                        message=message,
                        replacements=[edit.replacement],
                        original=original,
                    )
                )

        return issues