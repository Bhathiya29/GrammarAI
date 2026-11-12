from dataclasses import dataclass
import difflib
import spacy
from app.nlp import nlp

@dataclass
class Edit:
    start: int
    end: int
    replacement: str

def edits_from_diff(original: str, corrected: str) -> list[Edit]:
    if not original or not original.strip():
        return []
    if original == corrected:
        return []

    orig_doc = nlp(original)
    corr_doc = nlp(corrected)

    orig_tokens = list(orig_doc)
    corr_tokens = list(corr_doc)

    # 1. Compare lists of strings, not Token objects
    orig_texts = [t.text for t in orig_tokens]
    corr_texts = [t.text for t in corr_tokens]

    matcher = difflib.SequenceMatcher(None, orig_texts, corr_texts, autojunk=False)
    edits: list[Edit] = []

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'equal':
            continue

        if tag == 'replace':
            start = orig_tokens[i1].idx
            end = orig_tokens[i2 - 1].idx + len(orig_tokens[i2 - 1].text)
            replacement = corrected[corr_tokens[j1].idx : corr_tokens[j2 - 1].idx + len(corr_tokens[j2 - 1].text)]
            edits.append(Edit(start=start, end=end, replacement=replacement))

        elif tag == 'delete':
            # 3. Anchor deletion to neighbour to prevent double spaces
            if i1 > 0:
                anchor = orig_tokens[i1 - 1]
                start = anchor.idx
                end = orig_tokens[i2 - 1].idx + len(orig_tokens[i2 - 1].text)
                replacement = anchor.text
                edits.append(Edit(start=start, end=end, replacement=replacement))
            elif i2 < len(orig_tokens):
                anchor = orig_tokens[i2]
                start = orig_tokens[i1].idx
                end = anchor.idx + len(anchor.text)
                replacement = anchor.text
                edits.append(Edit(start=start, end=end, replacement=replacement))
            else:
                start = orig_tokens[i1].idx
                end = orig_tokens[i2 - 1].idx + len(orig_tokens[i2 - 1].text)
                edits.append(Edit(start=start, end=end, replacement=""))

        elif tag == 'insert':
            # 2. Anchor insertion and slice spacing from corrected doc
            if i1 > 0:
                anchor = orig_tokens[i1 - 1]
                start = anchor.idx
                end = anchor.idx + len(anchor.text)
                corr_start = corr_tokens[j1 - 1].idx
                corr_end = corr_tokens[j2 - 1].idx + len(corr_tokens[j2 - 1].text)
                replacement = corrected[corr_start:corr_end]
                edits.append(Edit(start=start, end=end, replacement=replacement))
            else:
                start = orig_tokens[0].idx
                end = orig_tokens[0].idx + len(orig_tokens[0].text)
                corr_start = corr_tokens[j1].idx
                corr_end = corr_tokens[j2].idx + len(corr_tokens[j2].text)
                replacement = corrected[corr_start:corr_end]
                edits.append(Edit(start=start, end=end, replacement=replacement))

    return edits