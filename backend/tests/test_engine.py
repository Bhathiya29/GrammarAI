from app.checkers.base import Checker
from app.engine import GrammarEngine
from app.schemas import Issue

class StubChecker(Checker):
    def __init__(self, name: str, priority: int, issues: list[Issue]):
        self.name = name
        self.priority = priority
        self._issues = issues

    def check(self, text: str) -> list[Issue]:
        return self._issues

class ErrorChecker(Checker):
    name = "error"
    priority = 10
    def check(self, text: str) -> list[Issue]:
        raise RuntimeError("Checker failed!")

def test_higher_priority_wins_on_partial_overlap():
    # Issue 1 (low priority) spans [0, 5)
    low_issue = Issue(id="1", start=0, end=5, category="spelling", message="low", replacements=["a"], original="test")
    # Issue 2 (high priority) spans [3, 8) - overlapping at [3, 5)
    high_issue = Issue(id="2", start=3, end=8, category="grammar", message="high", replacements=["b"], original="st th")

    checker_low = StubChecker("low", 10, [low_issue])
    checker_high = StubChecker("high", 100, [high_issue])

    engine = GrammarEngine(checkers=[checker_low, checker_high])
    results = engine.analyze("test string")

    assert len(results) == 1
    assert results[0].id == "2" # High priority wins

def test_identical_range_merges_replacements():
    issue1 = Issue(id="1", start=0, end=5, category="spelling", message="msg1", replacements=["rep1"], original="test")
    issue2 = Issue(id="2", start=0, end=5, category="grammar", message="msg2", replacements=["rep2", "rep1"], original="test")

    checker1 = StubChecker("c1", 100, [issue1])
    checker2 = StubChecker("c2", 50, [issue2])

    engine = GrammarEngine(checkers=[checker1, checker2])
    results = engine.analyze("test")

    assert len(results) == 1
    assert results[0].replacements == ["rep1", "rep2"] # Deduplicated and merged

def test_adjacent_ranges_both_kept():
    issue1 = Issue(id="1", start=0, end=3, category="spelling", message="1", replacements=[], original="abc")
    issue2 = Issue(id="2", start=3, end=6, category="spelling", message="2", replacements=[], original="def")

    checker = StubChecker("c", 50, [issue1, issue2])
    engine = GrammarEngine(checkers=[checker])
    results = engine.analyze("abcdef")

    assert len(results) == 2

def test_exception_isolation():
    issue = Issue(id="1", start=0, end=3, category="spelling", message="1", replacements=[], original="abc")
    checker_ok = StubChecker("ok", 50, [issue])
    checker_err = ErrorChecker()

    engine = GrammarEngine(checkers=[checker_err, checker_ok])
    results = engine.analyze("abc")

    assert len(results) == 1
    assert results[0].id == "1"

def test_empty_checker_list():
    engine = GrammarEngine(checkers=[])
    results = engine.analyze("hello")
    assert results == []