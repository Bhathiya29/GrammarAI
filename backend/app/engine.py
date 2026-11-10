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
class GrammarEngine:
    def __init__(self):
        self.checkers = [
            SpellingChecker(),
            ArticleChecker(),
        ]

    def analyze(self, text: str) -> list[Issue]:
        all_issues = []
        for checker in self.checkers:
            try:
                issues = checker.check(text)
                all_issues.extend(issues)
            except Exception as e:
                # Isolate checker failures so one broken checker doesn't crash the API
                print(f"Checker error: {e}")
        
        # Sort by start offset ascending
        all_issues.sort(key=lambda x: x.start)
        return all_issues

engine = GrammarEngine()
