from app.diffing import edits_from_diff, Edit

def apply_edits_right_to_left(original: str, edits: list[Edit]) -> str:
    sorted_edits = sorted(edits, key=lambda e: e.start, reverse=True)
    text = original
    for edit in sorted_edits:
        text = text[:edit.start] + edit.replacement + text[edit.end:]
    return text

def test_single_edit_precision():
    # Verify "She go" produces an edit strictly on "go", not the whole sentence
    edits = edits_from_diff("She go to school.", "She goes to school.")
    assert len(edits) == 1
    assert edits[0].replacement == "goes"

def test_empty_or_whitespace_original():
    assert edits_from_diff("", "Hello") == []
    assert edits_from_diff("   ", "Hello") == []

def test_invariant_helper_reconstructs_corrected():
    pairs = [
        ("She go to school.", "She goes to school."),
        ("I have apple.", "I have an apple."),
        ("I went to to the store.", "I went to the store."),
        ("Hello world", "Hello world."),
    ]
    for orig, corr in pairs:
        edits = edits_from_diff(orig, corr)
        reconstructed = apply_edits_right_to_left(orig, edits)
        assert reconstructed == corr