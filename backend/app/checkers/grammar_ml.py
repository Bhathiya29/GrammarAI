import functools
import logging
import difflib
import spacy
import torch
from app.nlp import nlp
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from app.checkers.base import Checker
from app.schemas import Issue
from app.diffing import edits_from_diff

logger = logging.getLogger(__name__)

class GrammarModelChecker(Checker):
    name = "grammar_ml"
    priority = 25  # Lowest priority so spelling and rule checkers win overlap disputes

    def __init__(self):
        self.tokenizer = None
        self.model = None
        self._loaded = False
        self.nlp = spacy.blank("en")
        self.nlp.add_pipe("sentencizer")

    def _lazy_load(self):
        if self._loaded:
            return
        try:
            logger.info("Loading Unbabel/gec-t5_small model...")
            self.tokenizer = AutoTokenizer.from_pretrained("Unbabel/gec-t5_small")
            self.model = AutoModelForSeq2SeqLM.from_pretrained("Unbabel/gec-t5_small")
            self.model.eval()
            self._loaded = True
            logger.info("gec-t5_small loaded successfully.")
        except Exception:
            logger.exception("Failed to load HuggingFace model gec-t5_small")
            self.model = None

    @functools.lru_cache(maxsize=1024)
    def _correct_sentence(self, sentence: str) -> str:
        if not self.model or not self.tokenizer:
            return sentence

        # Unbabel/gec-t5_small expected prompt prefix format
        input_text = f"gec: {sentence}"
        inputs = self.tokenizer(input_text, return_tensors="pt", truncation=True, max_length=128)

        with torch.inference_mode():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=128,
                num_beams=2,
                early_stopping=True,
            )
        corrected = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        return corrected

    def check(self, text: str) -> list[Issue]:
        self._lazy_load()
        if not self.model:
            return []

        issues = []
        doc = self.nlp(text)

        for sent in doc.sents:
            sent_text = sent.text.strip()
            if not sent_text or len(sent) > 60:
                continue

            corrected_text = self._correct_sentence(sent_text)

            # Similarity guard: ratio below 0.6 means model rewrote too aggressively
            ratio = difflib.SequenceMatcher(None, sent_text, corrected_text).ratio()
            if ratio < 0.6:
                continue

            edits = edits_from_diff(sent_text, corrected_text)
            # Cap edits per sentence to ensure high precision
            if len(edits) > 3:
                continue

            for edit in edits:
                # Shift sentence-local offsets to document-level offsets
                global_start = sent.start_char + edit.start
                global_end = sent.start_char + edit.end

                if global_start >= global_end:
                    continue

                original_slice = text[global_start:global_end]
                if not original_slice.strip():
                    continue

                category = "punctuation" if all(not c.isalnum() for c in original_slice if not c.isspace()) else "grammar"
                issue_id = f"ml-{global_start}-{global_end}"

                issues.append(
                    Issue(
                        id=issue_id,
                        start=global_start,
                        end=global_end,
                        category=category,
                        message="Consider correcting this phrasing.",
                        replacements=[edit.replacement] if edit.replacement else [""],
                        original=original_slice,
                    )
                )

        return issues