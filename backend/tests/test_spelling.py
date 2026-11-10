import pytest
from app.checkers.spelling import SpellingChecker

@pytest.fixture(scope="module")
def checker():
    """Instantiate the SpellingChecker once for the test session for speed."""
    return SpellingChecker()

def test_invariant_offsets(checker):
    # Core invariant: slice from text using offsets must match the original flagged word.
    text = "I recieve teh mesage tommorow."
    issues = checker.check(text)
    assert len(issues) > 0
    for issue in issues:
        assert text[issue.start:issue.end] == issue.original

def test_sample_sentence_flags(checker):
    # Verifying target misspellings are caught and acronyms like NASA are ignored.
    text = "I recieve teh mesage tommorow, but NASA said it was fine."
    issues = checker.check(text)
    flagged_words = [issue.original for issue in issues]
    
    assert "recieve" in flagged_words
    assert "teh" in flagged_words
    assert "mesage" in flagged_words
    assert "tommorow" in flagged_words
    assert "NASA" not in flagged_words

def test_capitalization_prepreservation(checker):
    # Verifying capitalization is preserved in suggestions (Teh -> The).
    text = "Teh cat sat on the mat."
    issues = checker.check(text)
    teh_issue = next((i for i in issues if i.original == "Teh"), None)
    
    assert teh_issue is not None
    assert len(teh_issue.replacements) > 0
    assert teh_issue.replacements[0] == "The"

def test_apostrophes_and_quotes(checker):
    # Verifying contractions are skipped and quoted misspellings are flagged.
    # Contractions with straight or curly apostrophes should be ignored
    text_contractions = "I don't and I don’t know why."
    assert len(checker.check(text_contractions)) == 0

    # Misspelling enclosed in quotes should still be caught correctly
    text_quotes = "He said 'recieve' yesterday."
    issues = checker.check(text_quotes)
    assert any(i.original == "recieve" for i in issues)

def test_numbers_attached(checker):
    # Verifying words glued to digits (e.g., abc123) do not trigger false positives.
    text = "Please check abc123 code."
    issues = checker.check(text)
    assert len(issues) == 0

def test_edge_inputs(checker):
    # Verifying empty strings and punctuation-only strings return no issues without crashing.
    assert checker.check("") == []
    assert checker.check("... , ! ? - /") == []

def test_stable_ids(checker):
    # Verifying IDs are deterministic across repeated runs for the same text.
    text = "I recieve teh mesage."
    run_one = checker.check(text)
    run_two = checker.check(text)

    assert len(run_one) == len(run_two)
    for issue_a, issue_b in zip(run_one, run_two):
        assert issue_a.id == issue_b.id