import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    lines = content.split('\n')

    # We need to correctly identify block boundaries by counting braces!

    i = 0
    while i < len(lines):
        # 1. `if (regex.test(str)) {`
        # 2. `const match = str.match(regex)`
        # 3. `if (match) {`
        m1 = re.search(r'^(\s*)(?:\}?\s*else\s+)?if\s*\(\s*(?:(.+?)\s*&&\s*)?([a-zA-Z0-9_]+)\.test\(\s*([a-zA-Z0-9_\[\]\.\'\-]+)\s*\)\s*\)\s*\{\s*$', lines[i])

        if m1 and i + 2 < len(lines):
            indent = m1.group(1)
            cond = m1.group(2)
            regex = m1.group(3)
            string = m1.group(4)

            is_else = 'else' in lines[i]

            # optional lastIndex
            match_line_idx = i + 1
            has_last_index = False
            if '.lastIndex = 0' in lines[i+1]:
                match_line_idx = i + 2
                has_last_index = True

            if match_line_idx + 1 < len(lines):
                m2 = re.search(r'^\s*(const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*([a-zA-Z0-9_\[\]\.\'\-]+)\.match\(\s*([a-zA-Z0-9_]+)\s*\)\s*$', lines[match_line_idx])

                if m2 and m2.group(3) == string and m2.group(4) == regex:
                    var_name = m2.group(2)

                    m3 = re.search(r'^\s*if\s*\(\s*' + var_name + r'\s*\)\s*\{\s*$', lines[match_line_idx+1])
                    if m3:
                        # Found match! Find closing brace.

                        brace_count = 1
                        end_j = -1
                        for j in range(i+1, len(lines)):
                            line_j = lines[j]

                            # count '{' and '}'
                            brace_count += line_j.count('{')
                            brace_count -= line_j.count('}')

                            if brace_count == 0:
                                end_j = j
                                break

                        if end_j != -1:
                            if lines[end_j].strip() == '}':
                                lines[end_j] = ''
                            else:
                                lines[end_j] = lines[end_j][::-1].replace('}', '', 1)[::-1]

                            # Reconstruct lines
                            if is_else:
                                if cond:
                                    lines[i] = f"{indent}}} else if ({cond}) {{"
                                else:
                                    lines[i] = f"{indent}}} else {{"
                            else:
                                if cond:
                                    lines[i] = f"{indent}if ({cond}) {{"
                                else:
                                    # Just pull out the block
                                    lines[i] = ""

                            if has_last_index:
                                lines[match_line_idx-1] = f"{indent}{regex}.lastIndex = 0"

                            lines[match_line_idx] = f"{indent}const {var_name} = {string}.match({regex})"
                            lines[match_line_idx+1] = f"{indent}if ({var_name}) {{"

                            i = match_line_idx + 2
                            continue
        i += 1

    with open(filepath + ".fixed2", 'w') as f:
        f.write('\n'.join(lines))

process_file('src/helpers/xml-builder.ts')
