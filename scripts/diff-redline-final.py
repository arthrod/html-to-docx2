#!/usr/bin/env python3
"""DOCX Redlining Script - Creates tracked changes preserving styles.

Usage: python scripts/diff-redline-final.py <baseline.docx> <current.docx> <output.docx>

This script uses the Document library and utilities from claude_office_skills
to generate proper Word tracked changes with complete style preservation.
"""

import sys
from difflib import SequenceMatcher
from pathlib import Path

# Add claude_office_skills to path
skills_path = Path(__file__).parent.parent / 'claude_office_skills'
sys.path.insert(0, str(skills_path))
sys.path.insert(0, str(skills_path / 'public' / 'docx'))

import contextlib

from public.docx.scripts.document import Document, DocxXMLEditor


def compare_and_redline(doc: Document, current_docx: Path) -> None:
    """Compare baseline (doc) with current document and apply tracked changes.

    Uses the Document library's methods for proper tracked change generation:
    - suggest_deletion() for deleted content
    - suggest_paragraph() for inserted paragraphs
    - replace_node() with w:ins/w:del for inline changes
    """
    current_doc = Document(current_docx, track_revisions=False)
    try:
        # Get paragraphs from both documents
        baseline_paras = list(doc['word/document.xml'].dom.getElementsByTagName('w:p'))
        current_paras = list(current_doc['word/document.xml'].dom.getElementsByTagName('w:p'))

        # Extract text from each paragraph for comparison
        baseline_texts = [(p, _get_para_text(p)) for p in baseline_paras]
        current_texts = [(p, _get_para_text(p)) for p in current_paras]

        # Perform paragraph-level diff
        matcher = SequenceMatcher(None, [t[1] for t in baseline_texts], [t[1] for t in current_texts])

        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag == 'equal':
                # Paragraphs match - check for run-level changes
                for i, j in zip(range(i1, i2), range(j1, j2)):
                    baseline_para, baseline_text = baseline_texts[i]
                    current_para, current_text = current_texts[j]

                    if baseline_text != current_text:
                        _compare_paragraph_runs(doc, baseline_para, current_para)

            elif tag == 'delete':
                # Deleted paragraphs
                for i in range(i1, i2):
                    baseline_para = baseline_texts[i][0]
                    try:
                        doc['word/document.xml'].suggest_deletion(baseline_para)
                    except ValueError:
                        # Skip if already has tracked changes
                        pass

            elif tag == 'insert':
                # Inserted paragraphs
                for j in range(j1, j2):
                    current_para = current_texts[j][0]

                    # Build paragraph XML by reconstructing from text
                    # Get paragraph properties (styles, alignment, etc.)
                    ppr_xml = _extract_element_xml(current_para, 'w:pPr')

                    # Get runs (with formatting)
                    runs_xml = []
                    for run in current_para.getElementsByTagName('w:r'):
                        # Skip runs already in tracked changes
                        if run.parentNode.tagName in {'w:ins', 'w:del'}:
                            continue
                        runs_xml.append(_serialize_run(run))

                    # Skip empty paragraphs (no runs)
                    if not runs_xml:
                        continue

                    # Build simple paragraph
                    para_xml = f'<w:p>{ppr_xml}{"".join(runs_xml)}</w:p>'

                    # Transform to tracked insertion
                    tracked_para_xml = DocxXMLEditor.suggest_paragraph(para_xml)

                    # Find insertion point
                    if i1 < len(baseline_texts):
                        anchor = baseline_texts[i1][0]
                        doc['word/document.xml'].insert_before(anchor, tracked_para_xml)
                    else:
                        # Insert at end of body
                        body = doc['word/document.xml'].get_node(tag='w:body')
                        doc['word/document.xml'].append_to(body, tracked_para_xml)

            elif tag == 'replace':
                # Paragraphs differ completely - delete old, insert new
                for i in range(i1, i2):
                    baseline_para = baseline_texts[i][0]
                    with contextlib.suppress(ValueError):
                        doc['word/document.xml'].suggest_deletion(baseline_para)

                for j in range(j1, j2):
                    current_para = current_texts[j][0]

                    # Build paragraph XML
                    ppr_xml = _extract_element_xml(current_para, 'w:pPr')

                    runs_xml = []
                    for run in current_para.getElementsByTagName('w:r'):
                        if run.parentNode.tagName in {'w:ins', 'w:del'}:
                            continue
                        runs_xml.append(_serialize_run(run))

                    # Skip empty paragraphs
                    if not runs_xml:
                        continue

                    para_xml = f'<w:p>{ppr_xml}{"".join(runs_xml)}</w:p>'
                    tracked_para_xml = DocxXMLEditor.suggest_paragraph(para_xml)

                    if i1 < len(baseline_texts):
                        anchor = baseline_texts[i1][0]
                        doc['word/document.xml'].insert_before(anchor, tracked_para_xml)
                    else:
                        body = doc['word/document.xml'].get_node(tag='w:body')
                        doc['word/document.xml'].append_to(body, tracked_para_xml)
    finally:
        current_doc.close()


def _compare_paragraph_runs(doc: Document, baseline_para, current_para) -> None:
    """Compare runs within a paragraph and apply tracked changes.

    Uses character-level diff to preserve formatting on unchanged text.
    """
    # Get runs from both paragraphs
    baseline_runs = _get_runs_with_text(baseline_para)
    current_runs = _get_runs_with_text(current_para)

    # Extract full text
    baseline_text = ''.join(r['text'] for r in baseline_runs)
    current_text = ''.join(r['text'] for r in current_runs)

    # Character-level diff
    matcher = SequenceMatcher(None, baseline_text, current_text)

    # Track positions in runs
    baseline_run_idx = 0
    baseline_char_offset = 0
    current_run_idx = 0
    current_char_offset = 0

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'equal':
            # Skip equal text - preserve as-is
            chars_to_skip = i2 - i1
            baseline_run_idx, baseline_char_offset = _advance_position(
                baseline_runs, baseline_run_idx, baseline_char_offset, chars_to_skip
            )
            current_run_idx, current_char_offset = _advance_position(
                current_runs, current_run_idx, current_char_offset, chars_to_skip
            )

        elif tag == 'delete':
            # Mark deleted text
            deleted_text = baseline_text[i1:i2]
            deleted_runs = _extract_text_runs(baseline_runs, baseline_run_idx, baseline_char_offset, len(deleted_text))

            for run_info in deleted_runs:
                try:
                    doc['word/document.xml'].suggest_deletion(run_info['elem'])
                except ValueError:
                    # Already tracked or invalid
                    pass

            baseline_run_idx, baseline_char_offset = _advance_position(
                baseline_runs, baseline_run_idx, baseline_char_offset, len(deleted_text)
            )

        elif tag == 'insert':
            # Insert new text with formatting
            inserted_text = current_text[j1:j2]
            inserted_runs = _extract_text_runs(current_runs, current_run_idx, current_char_offset, len(inserted_text))

            # Build insertion XML with preserved formatting
            for run_info in inserted_runs:
                rpr = run_info['rPr']
                text = _escape_xml(run_info['text'])
                ins_xml = f'<w:ins><w:r>{rpr}<w:t xml:space="preserve">{text}</w:t></w:r></w:ins>'

                # Insert before the first baseline run
                if baseline_run_idx < len(baseline_runs):
                    anchor = baseline_runs[baseline_run_idx]['elem']
                    doc['word/document.xml'].insert_before(anchor, ins_xml)
                else:
                    # Insert at end of paragraph
                    doc['word/document.xml'].append_to(baseline_para, ins_xml)

            current_run_idx, current_char_offset = _advance_position(
                current_runs, current_run_idx, current_char_offset, len(inserted_text)
            )

        elif tag == 'replace':
            # Delete old, insert new
            deleted_text = baseline_text[i1:i2]
            inserted_text = current_text[j1:j2]

            deleted_runs = _extract_text_runs(baseline_runs, baseline_run_idx, baseline_char_offset, len(deleted_text))
            inserted_runs = _extract_text_runs(current_runs, current_run_idx, current_char_offset, len(inserted_text))

            # Delete old runs
            for run_info in deleted_runs:
                with contextlib.suppress(ValueError):
                    doc['word/document.xml'].suggest_deletion(run_info['elem'])

            # Insert new runs
            for run_info in inserted_runs:
                rpr = run_info['rPr']
                text = _escape_xml(run_info['text'])
                ins_xml = f'<w:ins><w:r>{rpr}<w:t xml:space="preserve">{text}</w:t></w:r></w:ins>'

                if baseline_run_idx < len(baseline_runs):
                    anchor = baseline_runs[baseline_run_idx]['elem']
                    doc['word/document.xml'].insert_before(anchor, ins_xml)
                else:
                    doc['word/document.xml'].append_to(baseline_para, ins_xml)

            baseline_run_idx, baseline_char_offset = _advance_position(
                baseline_runs, baseline_run_idx, baseline_char_offset, len(deleted_text)
            )
            current_run_idx, current_char_offset = _advance_position(
                current_runs, current_run_idx, current_char_offset, len(inserted_text)
            )


def _get_para_text(para_elem):
    """Extract all text from a paragraph element."""
    texts = [t_elem.firstChild.data for t_elem in para_elem.getElementsByTagName('w:t') if t_elem.firstChild]
    return ''.join(texts)


def _get_runs_with_text(para_elem):
    """Extract runs with their text and formatting.

    Returns list of dicts: {text, rPr, elem}
    """
    runs = []
    for run_elem in para_elem.getElementsByTagName('w:r'):
        # Skip runs that are already in tracked changes
        parent = run_elem.parentNode
        if parent.tagName in {'w:ins', 'w:del'}:
            continue

        # Extract text
        text_parts = [t_elem.firstChild.data for t_elem in run_elem.getElementsByTagName('w:t') if t_elem.firstChild]

        text = ''.join(text_parts)
        if not text:
            continue

        # Extract formatting
        rpr_elems = run_elem.getElementsByTagName('w:rPr')
        rpr = rpr_elems[0].toxml() if rpr_elems else ''

        runs.append({'text': text, 'rPr': rpr, 'elem': run_elem})

    return runs


def _advance_position(runs, run_idx, char_offset, chars_to_advance):
    """Advance position through runs by specified number of characters."""
    remaining = chars_to_advance

    while remaining > 0 and run_idx < len(runs):
        run_text = runs[run_idx]['text']
        available = len(run_text) - char_offset

        if available <= remaining:
            remaining -= available
            run_idx += 1
            char_offset = 0
        else:
            char_offset += remaining
            remaining = 0

    return run_idx, char_offset


def _extract_text_runs(runs, start_run_idx, start_char_offset, length):
    """Extract runs covering specified text length."""
    extracted = []
    remaining = length
    run_idx = start_run_idx
    char_offset = start_char_offset

    while remaining > 0 and run_idx < len(runs):
        run_info = runs[run_idx]
        run_text = run_info['text']
        available = len(run_text) - char_offset

        if available <= remaining:
            # Use entire remaining part of run
            text_chunk = run_text[char_offset:]
            extracted.append({'text': text_chunk, 'rPr': run_info['rPr'], 'elem': run_info['elem']})
            remaining -= available
            run_idx += 1
            char_offset = 0
        else:
            # Use part of run
            text_chunk = run_text[char_offset : char_offset + remaining]
            extracted.append({'text': text_chunk, 'rPr': run_info['rPr'], 'elem': run_info['elem']})
            remaining = 0

    return extracted


def _escape_xml(text):
    """Escape special XML characters."""
    return (
        text.replace('&', '&amp;')
        .replace('<', '&lt;')
        .replace('>', '&gt;')
        .replace('"', '&quot;')
        .replace("'", '&apos;')
    )


def _extract_element_xml(parent_elem, tag_name):
    """Extract XML of a child element, or return empty string if not found."""
    elems = parent_elem.getElementsByTagName(tag_name)
    if not elems:
        return ''

    # Use _serialize_element to get clean XML
    return _serialize_element(elems[0])


def _serialize_element(elem):
    """Recursively serialize an element without namespace declarations or whitespace."""
    if elem.nodeType == elem.TEXT_NODE:
        return elem.data

    # Build opening tag with attributes
    attrs = []
    for i in range(elem.attributes.length):
        attr = elem.attributes.item(i)
        # Skip xmlns declarations
        if not attr.name.startswith('xmlns'):
            attrs.append(f'{attr.name}="{attr.value}"')

    attrs_str = ' ' + ' '.join(attrs) if attrs else ''

    # Serialize children (skip whitespace-only text nodes)
    children = []
    for child in elem.childNodes:
        if child.nodeType == child.TEXT_NODE:
            # Skip whitespace-only text nodes (formatting from pretty-print)
            if child.data.strip():
                children.append(child.data)
        else:
            children.append(_serialize_element(child))

    children_str = ''.join(children)

    if children_str:
        return f'<{elem.tagName}{attrs_str}>{children_str}</{elem.tagName}>'
    return f'<{elem.tagName}{attrs_str}/>'


def _serialize_run(run_elem):
    """Serialize a run element with all its properties and text."""
    return _serialize_element(run_elem)


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
    try:
        # Initialize Document with baseline
        doc = Document(baseline_docx, track_revisions=True)

        # Compare and apply tracked changes
        compare_and_redline(doc, current_docx)

        # Save redlined document
        doc.save(destination=output_docx)
    finally:
        if doc is not None:
            doc.close()


if __name__ == '__main__':
    main()
