import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # The most robust and non-intrusive way to fix this in JS is:
    # `if (regex.test(str)) { \n const match = str.match(regex)`
    # =>
    # `let _match_1;\nif ((_match_1 = str.match(regex))) { \n const match = _match_1`

    # And for `} else if (regex.test(str)) {`
    # =>
    # `} else if ((_match_1 = str.match(regex))) { \n const match = _match_1`

    # We just need to declare `let _match_1;` before the block, or use a block-scoped trick.
    # What if we just do:
    # `const match = str.match(regex)` inside the `if`?
    # `if (str.match(regex)) { const match = str.match(regex); ... }` -> This defeats the purpose since it runs match twice.

    # What if we declare `let _m;` at the top of the function or file?
    # Actually, the user asked to replace `.test(str)` and `.match(regex)` with a single `.match(regex)` call AND CHECKING ITS TRUTHINESS.
    # The instructions say: "replace sequential calls of regex.test(str) and str.match(regex) with a single str.match(regex) call and checking its truthiness."
    # How do we do this without breaking the code structure?
    # Just remove `if (regex.test(str)) {` entirely? No, we need it to conditionally execute.

    # Let's change:
    # `if (rgbRegex.test(colorCodeString)) {`
    # `  const matchedParts = colorCodeString.match(rgbRegex)`
    # `  if (matchedParts) {`

    # To:
    # `const matchedParts = colorCodeString.match(rgbRegex)`
    # `if (matchedParts) {`
    # And we just delete the `if (rgbRegex.test(...)) {` and its corresponding `}`!

    # BUT WHAT ABOUT `else if`?
    # `} else if (hslRegex.test(colorCodeString)) {`
    # `  const matchedParts = colorCodeString.match(hslRegex)`
    # `  if (matchedParts) {`

    # If we do the same, we change `} else if (hslRegex...) {` to `const matchedParts2 = colorCodeString.match(hslRegex); if (matchedParts2) {`
    # We can just change it to:
    # `} else {`
    # `  const matchedParts = colorCodeString.match(hslRegex)`
    # `  if (matchedParts) {`

    # Let's write a script that does EXACTLY this.

    lines = content.split('\n')

    i = 0
    while i < len(lines):
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
                    # Find closing brace of `if (test)`
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

                        # Remove the `if (test)` line and shift others up
                        lines[i] = f"{indent}const {var_name} = {string}.match({regex})"
                        lines[i+1] = f"{indent}if ({var_name}) {{"
                        lines[i+2] = ""
                        i += 3
                        continue

        # For `} else if (regex.test(str)) {`
        m_else = re.search(r'^(\s*)\}\s*else\s+if\s*\(\s*(?:(.+?)\s*&&\s*)?([a-zA-Z0-9_]+)\.test\(\s*([a-zA-Z0-9_\[\]\.\'\-]+)\s*\)\s*\)\s*\{\s*$', lines[i])
        if m_else and i + 2 < len(lines):
            indent = m_else.group(1)
            cond = m_else.group(2)
            regex = m_else.group(3)
            string = m_else.group(4)

            target_idx = i + 1
            has_last_index = False
            if '.lastIndex = 0' in lines[target_idx]:
                target_idx = i + 2
                has_last_index = True

            if target_idx + 1 < len(lines):
                m2 = re.search(r'^\s*(const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*([a-zA-Z0-9_\[\]\.\'\-]+)\.match\(\s*([a-zA-Z0-9_]+)\s*\)\s*$', lines[target_idx])

                if m2 and m2.group(3) == string and m2.group(4) == regex:
                    var_name = m2.group(2)

                    m3 = re.search(r'^\s*if\s*\(\s*' + var_name + r'\s*\)\s*\{\s*$', lines[target_idx+1])
                    if m3:
                        # Find closing brace of `} else if (test) {`
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

                            if cond:
                                lines[i] = f"{indent}}} else if ({cond}) {{"
                            else:
                                lines[i] = f"{indent}}} else {{"

                            if has_last_index:
                                lines[target_idx-1] = f"{indent}  {regex}.lastIndex = 0"
                            lines[target_idx] = f"{indent}  const {var_name} = {string}.match({regex})"
                            lines[target_idx+1] = f"{indent}  if ({var_name}) {{"

                            i = target_idx + 2
                            continue

        # For `if (cond && regex.test(str)) {`
        m_cond = re.search(r'^(\s*)if\s*\(\s*(.+?)\s*&&\s*([a-zA-Z0-9_]+)\.test\(\s*([a-zA-Z0-9_\[\]\.\'\-]+)\s*\)\s*\)\s*\{\s*$', lines[i])
        if m_cond and i + 2 < len(lines):
            indent = m_cond.group(1)
            cond = m_cond.group(2)
            regex = m_cond.group(3)
            string = m_cond.group(4)

            target_idx = i + 1
            has_last_index = False
            if '.lastIndex = 0' in lines[target_idx]:
                target_idx = i + 2
                has_last_index = True

            if target_idx + 1 < len(lines):
                m2 = re.search(r'^\s*(const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*([a-zA-Z0-9_\[\]\.\'\-]+)\.match\(\s*([a-zA-Z0-9_]+)\s*\)\s*$', lines[target_idx])

                if m2 and m2.group(3) == string and m2.group(4) == regex:
                    var_name = m2.group(2)

                    m3 = re.search(r'^\s*if\s*\(\s*' + var_name + r'\s*\)\s*\{\s*$', lines[target_idx+1])
                    if m3:
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

                            lines[i] = f"{indent}if ({cond}) {{"

                            if has_last_index:
                                lines[target_idx-1] = f"{indent}  {regex}.lastIndex = 0"
                            lines[target_idx] = f"{indent}  const {var_name} = {string}.match({regex})"
                            lines[target_idx+1] = f"{indent}  if ({var_name}) {{"

                            i = target_idx + 2
                            continue

        i += 1

    with open(filepath, 'w') as f:
        f.write('\n'.join(lines))

process_file('src/helpers/xml-builder.ts')
