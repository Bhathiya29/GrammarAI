import logging
from app.checkers.base import Checker
from app.checkers.spelling import SpellingChecker
from app.schemas import Issue

class GrammarEngine:
    def __init__(self,checkers:list[Checker]):
        self.checkers = checkers
    
    def analyze(self, text: str) -> list[Issue]:
        all_issues: list[Issue] = []
        for checker in self.checkers:
            try:
                all_issues.extend(checker.check(text))
            except Exception as e:
                logger.error(f"Checker '{checker.name}' failed with error: {e}")
                continue
        
        # Sorting all issues by start position ascending
        all_issues.sort(key=lambda issue: issue.start)
        return all_issues

# Instantiating engine once at module level to keep dictionary loaded in memory
engine = GrammarEngine(
    checkers = [
        SpellingChecker()
        # Future Developments to be done here (Features)
        
        ]
)
