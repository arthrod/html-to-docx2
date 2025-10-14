#!/usr/bin/env python3
"""DOCX Redlining Script - Creates tracked changes preserving styles.

Usage: python scripts/diff-redline.py <baseline.docx> <current.docx> <output.docx>

This script compares two DOCX files and generates a redlined version with tracked
changes, preserving all formatting and styles using the Document library.
"""

import sys
from difflib import SequenceMatcher
from pathlib import Path

# Add claude_office_skills to path
skills_path = Path(__file__).parent.parent / 'claude_office_skills'
sys.path.insert(0, str(skills_path))
sys.path.insert(0, str(skills_path / 'public' / 'docx'))

from public.docx.scripts.document import Document


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


def diff_text_runs(baseline_runs, current_runs):
    """Compare two lists of text runs and generate diff operations.

    Returns list of operations: [(op, baseline_run, current_run), ...]
    op can be: 'equal', 'delete', 'insert', 'replace'
    """
    baseline_texts = [r['text'] for r in baseline_runs]
    current_texts = [r['text'] for r in current_runs]

    # Use SequenceMatcher for character-level diffing
    baseline_full = ''.join(baseline_texts)
    current_full = ''.join(current_texts)

    matcher = SequenceMatcher(None, baseline_full, current_full)
    operations = []

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        baseline_chunk = baseline_full[i1:i2]
        current_chunk = current_full[j1:j2]

        if tag == 'equal':
            operations.append(('equal', baseline_chunk, None))
        elif tag == 'delete':
            operations.append(('delete', baseline_chunk, None))
        elif tag == 'insert':
            operations.append(('insert', None, current_chunk))
        elif tag == 'replace':
            operations.append(('replace', baseline_chunk, current_chunk))

    return operations, baseline_runs, current_runs


def apply_diff_to_paragraph(doc, para_elem, baseline_runs, current_runs, operations) -> None:
    """Apply diff operations to a paragraph using tracked changes.

    This preserves formatting from original runs while marking changes.
    """
    baseline_run_idx = 0
    baseline_char_offset = 0
    current_run_idx = 0
    current_char_offset = 0

    for op, baseline_chunk, current_chunk in operations:
        if op == 'equal':
            # Skip over unchanged text - don't modify it
            baseline_char_offset += len(baseline_chunk)
            current_char_offset += len(baseline_chunk)

        elif op == 'delete':
            # Find the run(s) containing deleted text and mark for deletion
            remaining = len(baseline_chunk)

            while remaining > 0 and baseline_run_idx < len(baseline_runs):
                run_info = baseline_runs[baseline_run_idx]
                run_elem = run_info['elem']
                run_text = run_info['text']

                # Check if run is already tracked
                parent = run_elem.parentNode
                if parent.tagName in {'w:ins', 'w:del'}:
                    # Skip already tracked changes
                    baseline_run_idx += 1
                    baseline_char_offset = 0
                    continue

                available = len(run_text) - baseline_char_offset

                if available <= remaining:
                    # Delete entire remaining part of run
                    if baseline_char_offset == 0:
                        # Delete whole run
                        doc['word/document.xml'].suggest_deletion(run_elem)
                    else:
                        # Need to split run - delete from offset onwards
                        # This is complex, for now mark entire run
                        doc['word/document.xml'].suggest_deletion(run_elem)

                    remaining -= available
                    baseline_run_idx += 1
                    baseline_char_offset = 0
                else:
                    # Delete part of run (complex - requires splitting)
                    # For now, mark entire run for deletion
                    doc['word/document.xml'].suggest_deletion(run_elem)
                    baseline_char_offset += remaining
                    remaining = 0

        elif op == 'insert':
            # Find appropriate insertion point and add tracked insertion
            remaining = len(current_chunk)

            while remaining > 0 and current_run_idx < len(current_runs):
                run_info = current_runs[current_run_idx]
                run_text = run_info['text']
                rpr = run_info['rPr']

                available = len(run_text) - current_char_offset

                if available <= remaining:
                    # Insert text with formatting
                    chunk_to_insert = run_text[current_char_offset:]
                    insert_xml = (
                        f'<w:ins><w:r>{rpr}<w:t xml:space="preserve">{escape_xml(chunk_to_insert)}</w:t></w:r></w:ins>'
                    )

                    # Find insertion point in baseline
                    if baseline_run_idx < len(baseline_runs):
                        anchor = baseline_runs[baseline_run_idx]['elem']
                        doc['word/document.xml'].insert_before(anchor, insert_xml)
                    else:
                        # Insert at end of paragraph
                        doc['word/document.xml'].append_to(para_elem, insert_xml)

                    remaining -= available
                    current_run_idx += 1
                    current_char_offset = 0
                else:
                    # Insert part of text
                    chunk_to_insert = run_text[current_char_offset : current_char_offset + remaining]
                    insert_xml = (
                        f'<w:ins><w:r>{rpr}<w:t xml:space="preserve">{escape_xml(chunk_to_insert)}</w:t></w:r></w:ins>'
                    )

                    if baseline_run_idx < len(baseline_runs):
                        anchor = baseline_runs[baseline_run_idx]['elem']
                        doc['word/document.xml'].insert_before(anchor, insert_xml)
                    else:
                        doc['word/document.xml'].append_to(para_elem, insert_xml)

                    current_char_offset += remaining
                    remaining = 0


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
    # Simple paragraph-level matching by text content
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
                    # Paragraph content changed - apply run-level diff
                    operations, baseline_runs, current_runs = diff_text_runs(baseline_runs, current_runs)
                    apply_diff_to_paragraph(doc, baseline_para, baseline_runs, current_runs, operations)

        elif tag == 'delete':
            # Deleted paragraphs
            for i in range(i1, i2):
                baseline_para = baseline_texts[i][0]
                doc['word/document.xml'].suggest_deletion(baseline_para)

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

    doc = None
    current_doc = None
    try:
        # Initialize Document with baseline (makes a copy)
        doc = Document(baseline_docx, track_revisions=True)

        # Get paragraphs from both documents
        baseline_paras = doc['word/document.xml'].dom.getElementsByTagName('w:p')

        # Load current document for comparison
        current_doc = Document(current_docx, track_revisions=False)
        current_paras = current_doc['word/document.xml'].dom.getElementsByTagName('w:p')

        # Perform comparison and apply tracked changes
        compare_paragraphs(doc, list(baseline_paras), list(current_paras))

        # Save the redlined document directly to output
        doc.save(destination=output_docx)
    finally:
        if doc is not None:
            doc.close()
        if current_doc is not None:
            current_doc.close()


if __name__ == '__main__':
    main()
