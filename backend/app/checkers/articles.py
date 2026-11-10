import spacy
import cmudict
from typing import List
from app.schemas import Issue
from app.checkers.base import Checker

def _is_vowel_sound(phoneme: str) -> bool:
    # ARPAbet vowel phonemes end with a stress digit (0, 1, or 2)
    return phoneme[-1].isdigit()

class ArticleChecker(Checker):
    def __init__(self):
        self.nlp = spacy.blank("en")
        self.d = cmudict.dict()

    def check(self, text: str) -> List[Issue]:
        issues = []
        doc = self.nlp(text)

        tokens = list(doc)
        for i, token in enumerate(tokens):
            word_lower = token.text.lower()
            if word_lower not in ("a", "an"):
                continue

            # Finding the next word token (skipping whitespace / non-word tokens)
            next_token = None
            for j in range(i + 1, len(tokens)):
                if not tokens[j].is_space:
                    next_token = tokens[j]
                    break

            if not next_token or not next_token.is_alpha:
                continue

            # Skip ALL-CAPS acronyms (e.g., 'a FBI' -> skip)
            if next_token.text.isupper() and len(next_token.text) > 1:
                continue

            next_word_lower = next_token.text.lower()
            pronunciations = self.d.get(next_word_lower)

            # If word is not in dictionary, stay silent (avoid false alarms)
            if not pronunciations:
                continue

            # Determine if pronunciations consistently start with a vowel sound
            starts_with_vowel = None
            disagree = False
            for pron in pronunciations:
                if not pron:
                    continue
                is_vowel = _is_vowel_sound(pron[0])
                if starts_with_vowel is None:
                    starts_with_vowel = is_vowel
                elif starts_with_vowel != is_vowel:
                    disagree = True
                    break

            if disagree or starts_with_vowel is None:
                continue

            # Expected: 'an' before vowel sound, 'a' before consonant sound
            should_be_an = starts_with_vowel
            is_currently_an = (word_lower == "an")

            if should_be_an and not is_currently_an:
                # Needs 'an' instead of 'a'
                replacement = "An" if token.text[0].isupper() else "an"
                msg = f"Use 'An' before words starting with a vowel sound."
                issue_id = f"art-{token.idx}-{token.idx + len(token.text)}"
                issues.append(
                    Issue(
                        id=issue_id,
                        start=token.idx,
                        end=token.idx + len(token.text),
                        category="grammar",
                        message=msg,
                        replacements=[replacement],
                        original=token.text,
                    )
                )
            elif not should_be_an and is_currently_an:
                # Needs 'a' instead of 'an'
                replacement = "A" if token.text[0].isupper() else "a"
                msg = f"Use 'A' before words starting with a consonant sound."
                issue_id = f"art-{token.idx}-{token.idx + len(token.text)}"
                issues.append(
                    Issue(
                        id=issue_id,
                        start=token.idx,
                        end=token.idx + len(token.text),
                        category="grammar",
                        message=msg,
                        replacements=[replacement],
                        original=token.text,
                    )
                )

        return issues