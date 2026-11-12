import pytest
from app.checkers.grammar_ml import GrammarModelChecker

@pytest.mark.slow
def test_grammar_model_checker_integration():
    checker = GrammarModelChecker()
    issues = checker.check("She go to school yesterday.")
    assert len(issues)>0