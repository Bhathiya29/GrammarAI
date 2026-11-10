""" This test set is to check ASCII, single emoji shifts, double imoji shifts and trailing emojis."""

from app.schemas import Issue
from app.offsets import convert_to_utf16_offsets

def test_ascii_unchanged():
    text = "Hello world"
    issue = Issue(id="1", start=6, end=11, category="spelling", message="test", replacements=[], original="world")
    converted = convert_to_utf16_offsets(text, [issue])
    assert converted[0].start == 6
    assert converted[0].end == 11

def test_emoji_before_issue_shifts_offset():
    # '😀' (1 code point, 2 UTF-16 code units) + space (1 cp, 1 unit) = 3 UTF-16 units shift
    text = "😀 recieve"
    # In Python code points: '😀' is index 0, ' ' is index 1, 'recieve' starts at index 2
    issue = Issue(id="1", start=2, end=9, category="spelling", message="test", replacements=[], original="recieve")
    converted = convert_to_utf16_offsets(text, [issue])
    
    # In JS UTF-16: '😀' takes 2 units + space takes 1 unit = start offset is 3
    assert converted[0].start == 3
    assert converted[0].end == 10

def test_emoji_after_issue_no_shift():
    text = "recieve 😀"
    issue = Issue(id="1", start=0, end=7, category="spelling", message="test", replacements=[], original="recieve")
    converted = convert_to_utf16_offsets(text, [issue])
    assert converted[0].start == 0
    assert converted[0].end == 7