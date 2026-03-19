import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Find the positions of the `if (regex.test(str)) {` blocks we want to modify.

    # regex: `(?:(if\s*\([^)]*\)\s*)\{)?\s*if\s*\(\s*([a-zA-Z0-9_]+)\.test\(\s*([a-zA-Z0-9_\[\]\.\'\-]+)\s*\)\s*\)\s*\{\s*(?:[a-zA-Z0-9_]+\.lastIndex\s*=\s*0\s*)?(const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*\3\.match\(\s*\2\s*\)\s*if\s*\(\s*\5\s*\)\s*\{`

    # We will do a full AST-like brace matching!

    lines = content.split('\n')

    i = 0
    while i < len(lines):
        # 1. if (rgbRegex.test(colorCodeString)) {
        # 2.   const matchedParts = colorCodeString.match(rgbRegex)
        # 3.   if (matchedParts) {

        m1 = re.search(r'^(\s*)if\s*\(\s*([a-zA-Z0-9_]+)\.test\(\s*([a-zA-Z0-9_\[\]\.\'\-]+)\s*\)\s*\)\s*\{\s*$', lines[i])
        if m1 and i + 2 < len(lines):
            indent = m1.group(1)
            regex = m1.group(2)
            string = m1.group(3)

            m2 = re.search(r'^\s*(const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*([a-zA-Z0-9_\[\]\.\'\-]+)\.match\(\s*([a-zA-Z0-9_]+)\s*\)\s*$', lines[i+1])
            if m2 and m2.group(3) == string and m2.group(4) == regex:
                var_name = m2.group(2)

                m3 = re.search(r'^\s*if\s*\(\s*' + var_name + r'\s*\)\s*\{\s*$', lines[i+2])
                if m3:
                    # Match found! Lines i, i+1, i+2.
                    # We need to find the matching closing brace for lines[i]
                    # We will replace these 3 lines with:
                    # `const matchedParts = string.match(regex)`
                    # `if (matchedParts) {`
                    # And then we delete the closing brace of the `if (matchedParts)` because it has two nesting layers!

                    # Let's find the closing brace of `lines[i]`
                    brace_count = 0
                    start_j = i
                    end_j = -1
                    for j in range(i, len(lines)):
                        brace_count += lines[j].count('{')
                        brace_count -= lines[j].count('}')
                        if brace_count == 0:
                            end_j = j
                            break

                    if end_j != -1:
                        # end_j is the line with the closing brace of `if (regex.test(str)) {`
                        # We delete that closing brace line. Since there are 2 nested `{`, the inner `if (matchedParts) {` closes at `end_j - 1`!
                        # So we can just remove `end_j` line!

                        # Note: we should remove the exact `}` char, not the whole line if there are other things.
                        # Usually it's `  }`
                        if lines[end_j].strip() == '}':
                            lines[end_j] = ''
                        else:
                            # Replace the last `}` on that line
                            lines[end_j] = lines[end_j][::-1].replace('}', '', 1)[::-1]

                        # Now replace the 3 lines with 2 lines
                        lines[i] = f"{indent}const {var_name} = {string}.match({regex})"
                        lines[i+1] = f"{indent}if ({var_name}) {{"
                        lines[i+2] = ""

                        i += 3
                        continue

        # Check for } else if (regex.test(str)) {
        m_else = re.search(r'^(\s*)\}\s*else\s+if\s*\(\s*([a-zA-Z0-9_]+)\.test\(\s*([a-zA-Z0-9_\[\]\.\'\-]+)\s*\)\s*\)\s*\{\s*$', lines[i])
        if m_else and i + 2 < len(lines):
            indent = m_else.group(1)
            regex = m_else.group(2)
            string = m_else.group(3)

            # skip optional lastIndex
            match_line_idx = i + 1
            if '.lastIndex = 0' in lines[i+1]:
                match_line_idx = i + 2

            if match_line_idx + 1 < len(lines):
                m2 = re.search(r'^\s*(const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*([a-zA-Z0-9_\[\]\.\'\-]+)\.match\(\s*([a-zA-Z0-9_]+)\s*\)\s*$', lines[match_line_idx])
                if m2 and m2.group(3) == string and m2.group(4) == regex:
                    var_name = m2.group(2)

                    m3 = re.search(r'^\s*if\s*\(\s*' + var_name + r'\s*\)\s*\{\s*$', lines[match_line_idx+1])
                    if m3:
                        # Match found!
                        # We find the closing brace for the `} else if (...) {` block
                        brace_count = 0
                        # Count the '{' on line i
                        brace_count += lines[i].count('{')
                        # Note: line i has `} else if (...) {` so it also has `}`!
                        # We only count `{` and `}` starting from after the `else if` block?
                        # Actually just sum `{` and `- }` on each line works if we start from the `{` at the end!
                        # Let's just track `{` and `}`.
                        # `lines[i]` has 1 `}` and 1 `{`.
                        # Net is 0. But we know we are inside a new block starting at the end of line i.
                        brace_count = 1
                        end_j = -1
                        for j in range(i+1, len(lines)):
                            brace_count += lines[j].count('{')
                            brace_count -= lines[j].count('}')
                            if brace_count == 0:
                                end_j = j
                                break

                        if end_j != -1:
                            if lines[end_j].strip() == '}':
                                lines[end_j] = ''
                            else:
                                lines[end_j] = lines[end_j][::-1].replace('}', '', 1)[::-1]

                            # Replace lines
                            if match_line_idx == i + 1:
                                lines[i] = f"{indent}}} else {{"
                                lines[i+1] = f"{indent}  const {var_name} = {string}.match({regex})"
                                lines[i+2] = f"{indent}  if ({var_name}) {{"
                                i += 3
                            else:
                                lines[i] = f"{indent}}} else {{"
                                lines[i+1] = f"{indent}  {regex}.lastIndex = 0"
                                lines[i+2] = f"{indent}  const {var_name} = {string}.match({regex})"
                                lines[i+3] = f"{indent}  if ({var_name}) {{"
                                i += 4
                            continue

        i += 1

    with open(filepath + ".fixed", 'w') as f:
        f.write('\n'.join(lines))

process_file('src/helpers/xml-builder.ts')
