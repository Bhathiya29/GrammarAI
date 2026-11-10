import importlib.resources
import re
from symspellpy import SymSpell, Verbosity
from app.checkers.base import Checker
from app.schemas import Issue

# Compiled once at module level with proper boundary and apostrophe support
WORD_RE = re.compile(r"\b[A-Za-z]+(?:['’][A-Za-z]+)*\b")

class SpellingChecker(Checker):
    name = "spelling"
    priority = 100

    def __init__(self):
        # Initializing SymSpell with max edit distance of 2
        self.sym_spell = SymSpell(max_dictionary_edit_distance=2, prefix_length=7)
        
        # Load the bundled dictionary once during startup to avoid cold start lag
        dictionary_path = importlib.resources.files("symspellpy") / "frequency_dictionary_en_82_765.txt"
        self.sym_spell.load_dictionary(str(dictionary_path), term_index=0, count_index=1)

    @property
    def name(self) -> str:
        return "spelling"

    def check(self, text: str) -> list[Issue]:
        issues: list[Issue] = []
        for match in WORD_RE.finditer(text):
            word = match.group()
            start = match.start()
            end = match.end()

            # --- Skip Rules ---
            # 1. Skipping single letters (except 'a' or 'I')
            if len(word) == 1 and word.lower() not in ['a', 'i']:
                continue
            # 2. Skipping ALL-CAPS words (acronyms like NASA)
            if word.isupper():
                continue
            # 3. Skipping contractions containing straight or curly apostrophes
            if "'" in word or "’" in word:
                continue
            # 4. Skipping capitalized words unless they appear at the very start of a sentence/text.
            if word[0].isupper() and start > 0:
                preceding_text = text[:start].strip()
                if preceding_text and preceding_text[-1] not in ['.', '!', '?']:
                    continue

            lower_word = word.lower()
            # Fast O(1) dictionary check instead of redundant lookup
            if lower_word not in self.sym_spell.words:
                suggestions = self.sym_spell.lookup(
                    lower_word, Verbosity.CLOSEST, max_edit_distance=2
                )
                
                replacements = []
                for suggestion in suggestions[:3]:
                    rep = suggestion.term
                    if word[0].isupper():
                        rep = rep.capitalize()
                    replacements.append(rep)

                # I have fixed the deterministic ID to prevent UI re-mounting flicker
                issue_id = f"spell-{start}-{end}-{word}"
                issues.append(
                    Issue(
                        id=issue_id,
                        start=start,
                        end=end,
                        category="spelling",
                        message=f"Possible spelling mistake: '{word}'",
                        replacements=replacements,
                        original=word,
                    )
                )

        return issues