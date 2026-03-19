import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # The issue: `if (regex.test(str)) {` is a block. We want to remove the `.test()` and use `.match()`.
    # To keep exact brace match:
    #
    #   if (regex.test(str)) {
    #     const match = str.match(regex)
    #     if (match) {
    #
    # Can literally be replaced with:
    #   const match_123 = str.match(regex)
    #   if (match_123) {
    #     if (match_123) {
    #
    # This keeps EXACTLY the same number of `{` and `}` without deleting anything else!
    # Let's do this!

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
                    lines[i] = f"{indent}const {var_name}_{i} = {string}.match({regex})"
                    lines[i+1] = f"{indent}if ({var_name}_{i}) {{"
                    lines[i+2] = f"{indent}  if ({var_name}_{i}) {{"

                    # Need to also replace var_name with var_name_{i} inside the block
                    # But if we just leave `var_name` inside, wait! `var_name_{i}` is what we use in `if`.
                    # Actually, we can just do:
                    # lines[i]   = `{`  (to keep block scope)
                    # lines[i+1] = `  const {var_name} = {string}.match({regex})`
                    # lines[i+2] = `  if ({var_name}) {{`
                    #
                    # WAIT!
                    # if (regex.test(str)) { -> {
                    # This works PERFECTLY! Because it just becomes an unconditional block `{}`.
                    #
                    # BUT `} else if (regex.test(str)) {`
                    # If we change it to `} else {`, then we MUST change it.

                    lines[i] = f"{indent}{{"
                    # The rest stays EXACTLY the same!

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
                        if cond:
                            lines[i] = f"{indent}}} else if ({cond}) {{"
                        else:
                            lines[i] = f"{indent}}} else {{"

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
                        lines[i] = f"{indent}if ({cond}) {{"

        i += 1

    with open(filepath + ".simplest", 'w') as f:
        f.write('\n'.join(lines))

process_file('src/helpers/xml-builder.ts')
