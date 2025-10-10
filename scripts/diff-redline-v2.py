#!/usr/bin/env python3
"""DOCX Redlining Script - Creates tracked changes preserving styles.

Usage: python scripts/diff-redline-v2.py <baseline.docx> <current.docx> <output.docx>

This script uses the official pack.py, unpack.py, and Document library from claude-office-skills.
"""

import subprocess
import sys
import tempfile
from difflib import SequenceMatcher
from pathlib import Path

# Add claude-office-skills to path
skills_path = Path(__file__).parent.parent / 'claude-office-skills'
sys.path.insert(0, str(skills_path))
sys.path.insert(0, str(skills_path / 'public' / 'docx'))

from public.docx.ooxml.scripts.pack import pack_document
from public.docx.scripts.document import Document


def unpack_docx(docx_path, output_dir):
    """Unpack DOCX using the official unpack.py script."""
    unpack_script = skills_path / 'public' / 'docx' / 'ooxml' / 'scripts' / 'unpack.py'

    result = subprocess.run(
        [sys.executable, str(unpack_script), str(docx_path), str(output_dir)],
        capture_output=True,
        text=True,
        check=False,
    )

    if result.returncode != 0:
        msg = f'Unpack failed: {result.stderr}'
        raise RuntimeError(msg)

    # Extract suggested RSID if provided
    if 'Suggested RSID' in result.stdout:
        return result.stdout.split('Suggested RSID for edit session: ')[1].strip()
    return None


def parse_runs_from_paragraph(para_elem):
    """Extract text runs with their formatting from a paragraph element.

    Returns list of dicts with: {text, rPr, rsid, elem}
    """
    runs = []
    for run in para_elem.getElementsByTagName('w:r'):
        # Extract text
        text_parts = [t_elem.firstChild.data for t_elem in run.getElementsByTagName('w:t') if t_elem.firstChild]
        text_parts.extend(
            dt_elem.firstChild.data for dt_elem in run.getElementsByTagName('w:delText') if dt_elem.firstChild
        )

        text = ''.join(text_parts)
        if not text:
            continue

        # Extract formatting properties
        rpr_elems = run.getElementsByTagName('w:rPr')
        rpr = rpr_elems[0].toxml() if rpr_elems else ''

        # Extract RSID
        rsid = run.getAttribute('w:rsidR') or run.getAttribute('w:rsidDel') or ''

        runs.append({'text': text, 'rPr': rpr, 'rsid': rsid, 'elem': run})

    return runs


def get_paragraph_properties(para_elem):
    """Extract paragraph properties (w:pPr) from paragraph element."""
    ppr_elems = para_elem.getElementsByTagName('w:pPr')
    return ppr_elems[0].toxml() if ppr_elems else ''


def escape_xml(text):
    """Escape special XML characters."""
    return (
        text.replace('&', '&amp;')
        .replace('<', '&lt;')
        .replace('>', '&gt;')
        .replace('"', '&quot;')
        .replace("'", '&apos;')
    )


def compare_paragraphs(doc, baseline_paras, current_paras) -> None:
    """Compare paragraphs and generate tracked changes."""
    # Build paragraph lists with text and runs
    baseline_texts = []
    for para in baseline_paras:
        runs = parse_runs_from_paragraph(para)
        text = ''.join(r['text'] for r in runs)
        baseline_texts.append((para, text, runs))

    current_texts = []
    for para in current_paras:
        runs = parse_runs_from_paragraph(para)
        text = ''.join(r['text'] for r in runs)
        current_texts.append((para, text, runs))

    # Match paragraphs by similarity
    matcher = SequenceMatcher(None, [t[1] for t in baseline_texts], [t[1] for t in current_texts])

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'equal':
            # Compare each matched paragraph for run-level changes
            for i, j in zip(range(i1, i2), range(j1, j2)):
                baseline_para, baseline_text, baseline_runs = baseline_texts[i]
                current_para, current_text, current_runs = current_texts[j]

                if baseline_text != current_text:
                    # Text changed - use Document library's suggest_deletion on changed runs
                    # This is simplified - ideally would do character-level diff
                    text_diff = SequenceMatcher(None, baseline_text, current_text)

                    for diff_tag, t1, t2, u1, u2 in text_diff.get_opcodes():
                        if diff_tag == 'delete':
                            # Find runs containing deleted text
                            for run in baseline_runs:
                                if run['text'] in baseline_text[t1:t2]:
                                    try:
                                        doc['word/document.xml'].suggest_deletion(run['elem'])
                                    except:
                                        pass  # Skip if already tracked

                        elif diff_tag == 'insert':
                            # Insert new text with formatting from current
                            inserted_text = current_text[u1:u2]
                            # Find appropriate run formatting
                            for run in current_runs:
                                if run['text'] in inserted_text:
                                    insert_xml = f'<w:ins><w:r>{run["rPr"]}<w:t xml:space="preserve">{escape_xml(run["text"])}</w:t></w:r></w:ins>'
                                    # Insert before first baseline run
                                    if baseline_runs:
                                        doc['word/document.xml'].insert_before(baseline_runs[0]['elem'], insert_xml)
                                    break

        elif tag == 'delete':
            # Deleted paragraphs
            for i in range(i1, i2):
                baseline_para = baseline_texts[i][0]
                try:
                    doc['word/document.xml'].suggest_deletion(baseline_para)
                except:
                    pass  # Skip if already tracked

        elif tag == 'insert':
            # Inserted paragraphs
            for j in range(j1, j2):
                current_para, current_text, current_runs = current_texts[j]
                ppr = get_paragraph_properties(current_para)

                # Build paragraph with tracked insertion
                runs_xml = [
                    f'<w:r>{run["rPr"]}<w:t xml:space="preserve">{escape_xml(run["text"])}</w:t></w:r>'
                    for run in current_runs
                ]

                para_xml = f'<w:p>{ppr}{"".join(runs_xml)}</w:p>'
                tracked_para = doc['word/document.xml'].suggest_paragraph(para_xml)

                # Find insertion point
                if i1 < len(baseline_texts):
                    anchor = baseline_texts[i1][0]
                    doc['word/document.xml'].insert_before(anchor, tracked_para)
                else:
                    # Insert at end
                    body = doc['word/document.xml'].get_node(tag='w:body')
                    doc['word/document.xml'].append_to(body, tracked_para)


def main() -> None:
    if len(sys.argv) < 4:
        sys.exit(1)

    baseline_docx = Path(sys.argv[1])
    current_docx = Path(sys.argv[2])
    output_docx = Path(sys.argv[3])

    if not baseline_docx.exists():
        sys.exit(1)

    if not current_docx.exists():
        sys.exit(1)

    # Create temp directories
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        baseline_unpacked = temp_path / 'baseline'
        current_unpacked = temp_path / 'current'

        # Unpack both documents using official unpack.py
        rsid_baseline = unpack_docx(baseline_docx, baseline_unpacked)
        unpack_docx(current_docx, current_unpacked)
        if rsid_baseline:
            pass

        # Initialize Document with baseline (makes a copy)
        doc = Document(baseline_unpacked, track_revisions=True)

        # Get paragraphs from both documents
        baseline_paras = doc['word/document.xml'].dom.getElementsByTagName('w:p')

        # Load current document for comparison
        current_doc = Document(current_unpacked, track_revisions=False)
        current_paras = current_doc['word/document.xml'].dom.getElementsByTagName('w:p')

        # Perform comparison and apply tracked changes
        compare_paragraphs(doc, list(baseline_paras), list(current_paras))

        # Save the redlined document
        output_unpacked = temp_path / 'output'
        doc.save(destination=output_unpacked, validate=False)

        # Pack using official pack_document function
        success = pack_document(output_unpacked, output_docx, validate=False)

        if success:
            pass
        else:
            sys.exit(1)


if __name__ == '__main__':
    main()
