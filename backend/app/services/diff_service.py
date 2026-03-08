import re


def parse_patch(patch: str) -> list[dict]:
    """Parse a unified diff patch string into structured lines."""
    if not patch:
        return []

    lines = patch.split("\n")
    result: list[dict] = []
    old_line = 0
    new_line = 0

    for line in lines:
        if line.startswith("@@"):
            match = re.match(r"@@ -(\d+),?\d* \+(\d+),?\d* @@", line)
            if match:
                old_line = int(match.group(1))
                new_line = int(match.group(2))
            result.append({"type": "hunk-header", "content": line, "old_line_number": None, "new_line_number": None})
        elif line.startswith("+"):
            result.append({
                "type": "addition",
                "content": line[1:],
                "old_line_number": None,
                "new_line_number": new_line,
            })
            new_line += 1
        elif line.startswith("-"):
            result.append({
                "type": "deletion",
                "content": line[1:],
                "old_line_number": old_line,
                "new_line_number": None,
            })
            old_line += 1
        else:
            content = line[1:] if line.startswith(" ") else line
            result.append({
                "type": "context",
                "content": content,
                "old_line_number": old_line,
                "new_line_number": new_line,
            })
            old_line += 1
            new_line += 1

    return result


def extract_diff_context(
    diff_data: list[dict],
    file_path: str,
    line_number: int,
    context_lines: int = 2,
) -> list[dict]:
    """Extract a small diff snippet around a specific line number for a file."""
    for file_entry in diff_data:
        if file_entry.get("filename") != file_path:
            continue

        patch = file_entry.get("patch", "")
        if not patch:
            return []

        parsed = parse_patch(patch)

        # Find the index of the line matching line_number (by new_line_number)
        target_idx = None
        for i, pline in enumerate(parsed):
            if pline.get("new_line_number") == line_number:
                target_idx = i
                break

        if target_idx is None:
            # Fallback: try old_line_number
            for i, pline in enumerate(parsed):
                if pline.get("old_line_number") == line_number:
                    target_idx = i
                    break

        if target_idx is None:
            return []

        start = max(0, target_idx - context_lines)
        end = min(len(parsed), target_idx + context_lines + 1)

        return parsed[start:end]

    return []
