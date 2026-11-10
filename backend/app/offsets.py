from app.schemas import Issue
def convert_to_utf16_offsets(text:str, issues:list[Issue]) -> list[Issue]:
    """ 
    The method converts Python code-point character offsets into JavaScript-compatible 
    UTF-16 code unit offsets using an O(n) prefix mapping array.
    """

    if not issues:
        return issues
    
    # Build a prefix mapping array where index `cp_index` maps to its UTF-16 code unit offset.
    cp_to_utf16 = []
    current_utf16 = 0
    for char in text:
        cp_to_utf16.append(current_utf16)
        # Each UTF-16 code unit is 2 bytes in utf-16-le
        current_utf16 += len(char.encode('utf-16-le')) // 2
    cp_to_utf16.append(current_utf16)  # Sentinel for end of string index

    converted_issues = []
    for issue in issues:
        start_cp = max(0, min(issue.start, len(text)))
        end_cp = max(0, min(issue.end, len(text)))

        utf16_start = cp_to_utf16[start_cp]
        utf16_end = cp_to_utf16[end_cp]

        converted_issue = issue.model_copy(update={"start": utf16_start, "end": utf16_end})
        converted_issues.append(converted_issue)

    return converted_issues