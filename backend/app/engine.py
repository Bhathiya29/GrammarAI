import logging
from app.checkers.spelling import SpellingChecker
from app.checkers.articles import ArticleChecker
from app.checkers.grammar_ml import GrammarModelChecker
from app.schemas import Issue

logger = logging.getLogger(__name__)

class GrammarEngine:
    def __init__(self, checkers=None):
        self.checkers = checkers if checkers is not None else [
            SpellingChecker(),
            ArticleChecker(),
            GrammarModelChecker(),
        ]
    
    def analyze(self, text: str) -> list[Issue]:
        all_candidates = []
        for checker in self.checkers:
            try:
                issues = checker.check(text)
                for issue in issues:
                    all_candidates.append((issue, checker.priority))
            except Exception as e:
                logger.exception("Checker error in %s", getattr(checker, 'name', 'unknown'))

        # Sort candidates: highest priority first, then longer span (tiebreaker)
        all_candidates.sort(key=lambda x: (x[1], x[0].end - x[0].start), reverse=True)

        accepted: list[Issue] = []

        for issue, priority in all_candidates:
            # Stretch goal: check for identical range merge
            identical = False
            for existing in accepted:
                if existing.start == issue.start and existing.end == issue.end:
                    seen = set(existing.replacements)
                    merged_replacements = list(existing.replacements)
                    for rep in issue.replacements:
                        if rep not in seen:
                            seen.add(rep)
                            merged_replacements.append(rep)
                    existing.replacements = merged_replacements
                    identical = True
                    break

            if identical:
                continue

            # Check for partial overlap or containment with any accepted issue
            has_overlap = False
            for existing in accepted:
                # Overlap formula: a.start < b.end and b.start < a.end
                if issue.start < existing.end and existing.start < issue.end:
                    has_overlap = True
                    break

            if not has_overlap:
                accepted.append(issue.model_copy(deep=True))

        # Sort final accepted issues by start offset ascending
        accepted.sort(key=lambda x: x.start)
        return accepted

engine = GrammarEngine()
