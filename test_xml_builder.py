import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    lines = content.split('\n')
    lines_to_delete = set()

    i = 0
    while i < len(lines):
        # 1. if (regex.test(str)) {
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
                    # Found!

                    brace_count = 1
                    end_j = -1
                    for j in range(i+1, len(lines)):
                        brace_count += lines[j].count('{')
                        brace_count -= lines[j].count('}')
                        if brace_count == 0:
                            end_j = j
                            break

                    if end_j != -1:
                        var_new = var_name + "_" + str(i)
                        lines[i] = f"{indent}const {var_new} = {string}.match({regex})"
                        lines[i+1] = f"{indent}if ({var_new}) {{"
                        lines_to_delete.add(i+2)

                        for k in range(i+3, end_j):
                            # Replace whole words
                            lines[k] = re.sub(r'\b' + var_name + r'\b', var_new, lines[k])

                        if lines[end_j].strip() == '}':
                            lines_to_delete.add(end_j)
                        else:
                            # Actually if it's not a standalone '}', we should replace the last '}'
                            lines[end_j] = lines[end_j][::-1].replace('}', '', 1)[::-1]

                        i += 2
                        continue

        # 2. } else if (regex.test(str)) {
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
                        brace_count = 1
                        end_j = -1
                        for j in range(i+1, len(lines)):
                            brace_count += lines[j].count('{')
                            brace_count -= lines[j].count('}')
                            if brace_count == 0:
                                end_j = j
                                break

                        if end_j != -1:
                            var_new = var_name + "_" + str(i)

                            if cond:
                                lines[i] = f"{indent}}} else if ({cond}) {{"
                            else:
                                lines[i] = f"{indent}}} else {{"

                            if has_last_index:
                                lines[target_idx-1] = f"{indent}  {regex}.lastIndex = 0"

                            lines[target_idx] = f"{indent}  const {var_new} = {string}.match({regex})"
                            lines[target_idx+1] = f"{indent}  if ({var_new}) {{"
                            lines_to_delete.add(target_idx+2)

                            # Note: target_idx+2 is the inner `if` that is deleted! Oh wait, `lines[target_idx+1]` WAS the `if (matchedParts) {`. So we overwrite it and do not delete any!
                            # Wait! `lines[target_idx+1]` is overwritten with `if (var_new) {`.
                            # What was the original inner `if`? It was `lines[target_idx+1]`!
                            # So no lines are added to `lines_to_delete` here for the `if`. We just overwrite `lines[target_idx+1]`.

                            for k in range(target_idx+2, end_j):
                                lines[k] = re.sub(r'\b' + var_name + r'\b', var_new, lines[k])

                            # We don't delete `end_j` here because the `}` belongs to the `else {` block which we kept!
                            # Wait, the inner `if` had its own closing `}` right? Yes, which is usually right before `end_j`.
                            # So we SHOULD delete the closing `}` of the inner `if (matchedParts) {`.
                            # It is typically at `end_j - 1`. Let's search backwards for the first `}` before `end_j`!

                            # Find the inner `}`:
                            inner_end = -1
                            inner_brace_count = 1
                            for j in range(target_idx+2, end_j):
                                inner_brace_count += lines[j].count('{')
                                inner_brace_count -= lines[j].count('}')
                                if inner_brace_count == 0:
                                    inner_end = j
                                    break

                            if inner_end != -1:
                                if lines[inner_end].strip() == '}':
                                    lines_to_delete.add(inner_end)
                                else:
                                    lines[inner_end] = lines[inner_end][::-1].replace('}', '', 1)[::-1]

                            i = target_idx + 1
                            continue

        i += 1

    new_lines = []
    for idx, line in enumerate(lines):
        if idx not in lines_to_delete:
            new_lines.append(line)

    with open(filepath + ".fixed4", 'w') as f:
        f.write('\n'.join(new_lines))

process_file('src/helpers/xml-builder.ts')
