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

    def warm_up(self) -> None:
        """Let every checker that needs it (the ML model) load before the first request."""
        for checker in self.checkers:
            warm = getattr(checker, "warm_up", None)
            if callable(warm):
                try:
                    warm()
                except Exception:
                    logger.exception("Warm-up failed for %s", getattr(checker, "name", "unknown"))

    def is_ready(self) -> bool:
        """True when every checker that reports a readiness flag is ready."""
        return all(getattr(checker, "ready", True) for checker in self.checkers)

    def analyze(self, text: str) -> list[Issue]:
        all_candidates = []
        for checker in self.checkers:
            try:
                issues = checker.check(text)
                for issue in issues:
                    all_candidates.append((issue, checker.priority))
            except Exception:
                logger.exception("Checker error in %s", getattr(checker, "name", "unknown"))

        # Highest priority first, then the longer span, then the earlier start (fully deterministic)
        all_candidates.sort(
            key=lambda x: (x[1], x[0].end - x[0].start, -x[0].start),
            reverse=True,
        )

        accepted: list[Issue] = []

        for issue, _priority in all_candidates:
            # Identical range: keep the higher-priority issue and merge the suggestions
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

            # Partial overlap or containment with anything already accepted
            has_overlap = False
            for existing in accepted:
                # Overlap formula: a.start < b.end and b.start < a.end
                if issue.start < existing.end and existing.start < issue.end:
                    has_overlap = True
                    break

            if not has_overlap:
                accepted.append(issue.model_copy(deep=True))

        accepted.sort(key=lambda x: x.start)
        return accepted


engine = GrammarEngine()