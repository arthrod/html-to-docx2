#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12"
# dependencies = [
#   "typer",
#   "loguru",
# ]
# ///
"""Enhanced docx redline comparison tool.

Create a third .docx that shows tracked changes (insertions, deletions, and formatting changes)
between two .docx files while preserving styles.

Features:
- Word-level redline tracking with SequenceMatcher
- Preserves paragraph and run properties
- Standard library XML processing (no external deps beyond CLI/logging)
- Comprehensive error handling and logging

Notes & scope:
- Paragraph-level alignment is performed over top-level body paragraphs
- Word-level redlines are produced for 1:1 paragraph replacements
- N↔M replacements are modeled as deletions followed by insertions
- Text inside tables is NOT redlined (preserved as-is)
- Existing tracked changes in inputs are effectively "accepted"
"""

from __future__ import annotations

import copy
import datetime as dt
import difflib
import io
import re
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path
from typing import Optional

import typer
from loguru import logger

# Configure loguru
logger.remove()
logger.add(
    sys.stderr,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>",
    level="INFO",
)

app = typer.Typer(help="Create redlined DOCX files with tracked changes")

# Namespace constants
NS = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'xml': 'http://www.w3.org/XML/1998/namespace',
    'mc': 'http://schemas.openxmlformats.org/markup-compatibility/2006',
}

# Register namespaces for cleaner output
for _prefix, _uri in NS.items():
    ET.register_namespace(_prefix, _uri)


def W(tag: str) -> str:
    """Generate WordprocessingML namespace tag.

    Args:
        tag: Local tag name (e.g., 'p', 'r', 'body')

    Returns:
        Fully qualified XML tag with namespace
    """
    return f'{{{NS["w"]}}}{tag}'


def R(tag: str) -> str:
    """Generate relationships namespace tag.

    Args:
        tag: Local tag name

    Returns:
        Fully qualified XML tag with namespace
    """
    return f'{{{NS["r"]}}}{tag}'


def XML_ATTR(local: str) -> str:
    """Generate XML namespace attribute.

    Args:
        local: Attribute name (e.g., 'space')

    Returns:
        Fully qualified XML attribute with namespace
    """
    return f'{{{NS["xml"]}}}{local}'


def W_ATTR(local: str) -> str:
    """Generate WordprocessingML namespace attribute.

    Args:
        local: Attribute name (e.g., 'author', 'date')

    Returns:
        Fully qualified XML attribute with namespace
    """
    return f'{{{NS["w"]}}}{local}'


def _utc_now_iso() -> str:
    """Get current UTC timestamp in ISO format with Z suffix.

    Returns:
        ISO formatted timestamp string
    """
    return dt.datetime.now(dt.UTC).replace(microsecond=0).isoformat() + 'Z'


def _read_docx_xml(docx_path: Path, part: str) -> ET.Element:
    """Read and parse a specific XML part from a DOCX file.

    Args:
        docx_path: Path to DOCX file
        part: Part name within ZIP (e.g., 'word/document.xml')

    Returns:
        Parsed XML element tree root

    Raises:
        FileNotFoundError: If DOCX file doesn't exist
        KeyError: If requested part doesn't exist in DOCX
    """
    logger.debug(f"Reading {part} from {docx_path}")
    try:
        with zipfile.ZipFile(docx_path, 'r') as z:
            data = z.read(part)
        return ET.fromstring(data)
    except FileNotFoundError:
        logger.error(f"DOCX file not found: {docx_path}")
        raise
    except KeyError:
        logger.error(f"Part {part} not found in {docx_path}")
        raise


def _read_docx_all(docx_path: Path) -> tuple[ET.Element, Optional[ET.Element], dict[str, bytes]]:
    """Read entire DOCX package including document, styles, and all files.

    Args:
        docx_path: Path to DOCX file

    Returns:
        Tuple of (document_root, styles_root, all_files_dict)

    Raises:
        ValueError: If word/document.xml is missing
        FileNotFoundError: If DOCX file doesn't exist
    """
    logger.info(f"Loading DOCX package: {docx_path}")
    try:
        with zipfile.ZipFile(docx_path, 'r') as z:
            files = {name: z.read(name) for name in z.namelist()}
    except FileNotFoundError:
        logger.error(f"DOCX file not found: {docx_path}")
        raise

    if 'word/document.xml' not in files:
        msg = f'{docx_path!r} does not contain word/document.xml'
        logger.error(msg)
        raise ValueError(msg)

    doc = ET.fromstring(files['word/document.xml'])
    styles = ET.fromstring(files['word/styles.xml']) if 'word/styles.xml' in files else None

    logger.debug(f"Loaded {len(files)} files from package")
    return doc, styles, files


def _write_docx_from_base(
    base_files: dict[str, bytes],
    new_document_root: ET.Element,
    new_styles_root: Optional[ET.Element],
    out_path: Path
) -> None:
    """Write a new DOCX file using base files with updated document and styles.

    Args:
        base_files: Dictionary of filename to bytes for all ZIP entries
        new_document_root: Updated document.xml root element
        new_styles_root: Updated styles.xml root element (optional)
        out_path: Output DOCX file path
    """
    logger.info(f"Writing redlined DOCX to: {out_path}")
    with zipfile.ZipFile(out_path, 'w', compression=zipfile.ZIP_DEFLATED) as outzip:
        for name, data in base_files.items():
            if name == 'word/document.xml':
                continue
            if name == 'word/styles.xml' and new_styles_root is not None:
                continue
            outzip.writestr(name, data)

        # Write new document.xml
        buf = io.BytesIO()
        ET.ElementTree(new_document_root).write(buf, encoding='utf-8', xml_declaration=True)
        outzip.writestr('word/document.xml', buf.getvalue())

        # Write new styles.xml if provided
        if new_styles_root is not None:
            sbuf = io.BytesIO()
            ET.ElementTree(new_styles_root).write(sbuf, encoding='utf-8', xml_declaration=True)
            outzip.writestr('word/styles.xml', sbuf.getvalue())

    logger.success(f"Successfully wrote redlined document")


def _clone(el: Optional[ET.Element]) -> Optional[ET.Element]:
    """Deep copy an XML element.

    Args:
        el: Element to clone (can be None)

    Returns:
        Deep copy of element or None
    """
    return copy.deepcopy(el) if el is not None else None


class RunTok:
    """Token representing a word or whitespace segment with its formatting.

    Attributes:
        text: The text content
        rPr: Run properties (formatting) element
    """
    __slots__ = ('rPr', 'text')

    def __init__(self, text: str, rPr: Optional[ET.Element]) -> None:
        self.text = text
        self.rPr = _clone(rPr)


class Para:
    """Paragraph representation with element, properties, and tokenized text.

    Attributes:
        el: Original paragraph XML element
        pPr: Paragraph properties element
        raw_text: Concatenated text of all tokens
        tokens: List of RunTok tokens
    """
    __slots__ = ('el', 'pPr', 'raw_text', 'tokens')

    def __init__(self, el: ET.Element, pPr: Optional[ET.Element], tokens: list[RunTok]) -> None:
        self.el = el
        self.pPr = _clone(pPr)
        self.tokens = tokens
        self.raw_text = ''.join(tok.text for tok in tokens)


# Regex to split text into words and whitespace
_word_ws_re = re.compile(r'\S+|\s+')


def _iter_runlike(p: ET.Element, include_ins: bool = True, include_del: bool = False):
    """Iterate run-like elements in a paragraph, handling insertions and deletions.

    Args:
        p: Paragraph element
        include_ins: Whether to include runs inside w:ins elements
        include_del: Whether to include runs inside w:del elements

    Yields:
        Run elements in logical order
    """
    for child in p:
        t = child.tag
        if t == W('r'):
            yield child
        elif t == W('hyperlink'):
            for r in child.findall('w:r', NS):
                yield r
        elif t == W('ins'):
            if include_ins:
                for r in child.findall('.//w:r', NS):
                    yield r
        elif t == W('del'):
            if include_del:
                for r in child.findall('.//w:r', NS):
                    yield r


def _run_text_in_order(r: ET.Element) -> str:
    """Extract text from a run element in document order.

    Handles w:t (text), w:delText (deleted text), w:tab, and w:br elements.

    Args:
        r: Run element

    Returns:
        Concatenated text content
    """
    out = []
    for ch in r:
        if ch.tag == W('t') or ch.tag == W('delText'):
            out.append(ch.text or '')
        elif ch.tag == W('tab'):
            out.append('\t')
        elif ch.tag == W('br'):
            out.append('\n')
    return ''.join(out)


def _tokens_from_para(p: ET.Element) -> tuple[list[RunTok], Optional[ET.Element]]:
    """Convert paragraph element to sequence of word/space tokens with formatting.

    Args:
        p: Paragraph element

    Returns:
        Tuple of (tokens, paragraph_properties)
    """
    pPr = p.find('w:pPr', NS)
    tokens: list[RunTok] = []

    for r in _iter_runlike(p, include_ins=True, include_del=False):
        rPr = r.find('w:rPr', NS)
        text = _run_text_in_order(r)
        if not text:
            continue
        # Split into word and whitespace tokens, preserving formatting
        tokens.extend(RunTok(tok, rPr) for tok in _word_ws_re.findall(text))

    return tokens, pPr


def _collect_top_level_paragraphs(doc_root: ET.Element) -> tuple[list[Para], ET.Element]:
    """Collect only top-level paragraphs that are direct children of w:body.

    Args:
        doc_root: Document root element

    Returns:
        Tuple of (paragraph_list, body_element)

    Raises:
        ValueError: If document has no w:body
    """
    body = doc_root.find('w:body', NS)
    if body is None:
        msg = 'Document has no w:body'
        logger.error(msg)
        raise ValueError(msg)

    paras: list[Para] = []
    for child in list(body):
        if child.tag == W('p'):
            tokens, pPr = _tokens_from_para(child)
            paras.append(Para(child, pPr, tokens))

    logger.debug(f"Collected {len(paras)} top-level paragraphs")
    return paras, body


def _merge_styles(styles_old: Optional[ET.Element], styles_new: Optional[ET.Element]) -> Optional[ET.Element]:
    """Merge styles from old document into new document by styleId.

    Args:
        styles_old: Old document styles root
        styles_new: New document styles root

    Returns:
        Merged styles root element
    """
    if styles_new is None:
        return _clone(styles_old)
    if styles_old is None:
        return _clone(styles_new)

    out = _clone(styles_new)
    if out is None:
        return None

    have = {st.get(W_ATTR('styleId')) for st in out.findall('w:style', NS)}
    added = 0

    for st in styles_old.findall('w:style', NS):
        sid = st.get(W_ATTR('styleId'))
        if sid and sid not in have:
            out.append(_clone(st))
            have.add(sid)
            added += 1

    logger.debug(f"Merged styles: {added} styles added from old document")
    return out


def _new_run(parent: ET.Element, text: str, rPr: Optional[ET.Element], deleted: bool = False) -> ET.Element:
    """Create a new run element with text and formatting.

    Args:
        parent: Parent element to attach run to
        text: Text content
        rPr: Run properties (formatting)
        deleted: Whether this is deleted text (uses w:delText)

    Returns:
        Created run element
    """
    r = ET.SubElement(parent, W('r'))
    if rPr is not None:
        r.append(_clone(rPr))
    t = ET.SubElement(r, W('delText') if deleted else W('t'))
    t.set(XML_ATTR('space'), 'preserve')
    t.text = text
    return r


def _new_change_block(parent: ET.Element, tag: str, author: str, date: str, next_id: int) -> ET.Element:
    """Create a new track changes container (ins or del).

    Args:
        parent: Parent element
        tag: 'ins' or 'del'
        author: Author name for change
        date: ISO date string
        next_id: Change ID

    Returns:
        Created change block element
    """
    attrs = {W_ATTR('author'): author, W_ATTR('date'): date, W_ATTR('id'): str(next_id)}
    return ET.SubElement(parent, W(tag), attrs)


def _append_pPr(target_p: ET.Element, pPr: Optional[ET.Element]) -> None:
    """Append paragraph properties to target paragraph.

    Args:
        target_p: Target paragraph element
        pPr: Paragraph properties to append
    """
    if pPr is not None:
        target_p.append(_clone(pPr))


def _wrap_paragraph_as_insertion(p: ET.Element, author: str, date: str, next_id: int) -> ET.Element:
    """Create new paragraph where all runs are wrapped in a single w:ins.

    Args:
        p: Source paragraph element
        author: Author name
        date: ISO date string
        next_id: Change ID

    Returns:
        New paragraph with insertion tracking
    """
    newp = ET.Element(W('p'))
    _append_pPr(newp, p.find('w:pPr', NS))
    ins = _new_change_block(newp, 'ins', author, date, next_id)

    for r in _iter_runlike(p, include_ins=True, include_del=False):
        text = _run_text_in_order(r)
        if not text:
            continue
        rPr = r.find('w:rPr', NS)
        for tok in _word_ws_re.findall(text):
            _new_run(ins, tok, rPr, deleted=False)

    return newp


def _deleted_paragraph_from_old(p_old: ET.Element, author: str, date: str, next_id: int) -> ET.Element:
    """Create paragraph consisting of a single w:del with old paragraph content as deleted runs.

    Args:
        p_old: Old paragraph element
        author: Author name
        date: ISO date string
        next_id: Change ID

    Returns:
        New paragraph with deletion tracking
    """
    newp = ET.Element(W('p'))
    _append_pPr(newp, p_old.find('w:pPr', NS))
    d = _new_change_block(newp, 'del', author, date, next_id)

    for r in _iter_runlike(p_old, include_ins=True, include_del=True):
        text = _run_text_in_order(r)
        if not text:
            continue
        rPr = r.find('w:rPr', NS)
        for tok in _word_ws_re.findall(text):
            _new_run(d, tok, rPr, deleted=True)

    return newp


def _same_rpr(a: Optional[ET.Element], b: Optional[ET.Element]) -> bool:
    """Compare two run properties elements for equality.

    Args:
        a: First run properties element
        b: Second run properties element

    Returns:
        True if properties are identical
    """
    if (a is None) and (b is None):
        return True
    if (a is None) != (b is None):
        return False
    return ET.tostring(a, encoding='utf-8') == ET.tostring(b, encoding='utf-8')


def _add_rPr_change(run_el: ET.Element, old_rPr: Optional[ET.Element], author: str, date: str, next_id: int) -> None:
    """Add run properties change tracking to a run element.

    Args:
        run_el: Run element to modify
        old_rPr: Old run properties
        author: Author name
        date: ISO date string
        next_id: Change ID
    """
    rPr = run_el.find('w:rPr', NS)
    if rPr is None:
        rPr = ET.SubElement(run_el, W('rPr'))
    ch = ET.Element(W('rPrChange'), {W_ATTR('author'): author, W_ATTR('date'): date, W_ATTR('id'): str(next_id)})
    if old_rPr is not None:
        for child in list(old_rPr):
            ch.append(_clone(child))
    rPr.append(ch)


def _redline_1to1_paragraph(p_old: Para, p_new: Para, author: str, date: str, id_start: int) -> tuple[ET.Element, int]:
    """Build new paragraph with word-level tracked changes.

    Args:
        p_old: Old paragraph
        p_new: New paragraph
        author: Author name
        date: ISO date string
        id_start: Starting change ID

    Returns:
        Tuple of (new_paragraph_element, next_change_id)
    """
    next_id = id_start
    newp = ET.Element(W('p'))
    _append_pPr(newp, p_new.pPr if p_new.pPr is not None else p_old.pPr)

    old_tokens = p_old.tokens
    new_tokens = p_new.tokens

    sm = difflib.SequenceMatcher(a=[t.text for t in old_tokens], b=[t.text for t in new_tokens])

    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            for k in range(j1, j2):
                tok_new = new_tokens[k]
                tok_old = old_tokens[i1 + (k - j1)]
                run = _new_run(newp, tok_new.text, tok_new.rPr, deleted=False)
                if not _same_rpr(tok_old.rPr, tok_new.rPr):
                    _add_rPr_change(run, tok_old.rPr, author, date, next_id)
                    next_id += 1
        elif tag == 'insert':
            ins = _new_change_block(newp, 'ins', author, date, next_id)
            next_id += 1
            for tok in new_tokens[j1:j2]:
                _new_run(ins, tok.text, tok.rPr, deleted=False)
        elif tag == 'delete':
            d = _new_change_block(newp, 'del', author, date, next_id)
            next_id += 1
            for tok in old_tokens[i1:i2]:
                _new_run(d, tok.text, tok.rPr, deleted=True)
        elif tag == 'replace':
            d = _new_change_block(newp, 'del', author, date, next_id)
            next_id += 1
            for tok in old_tokens[i1:i2]:
                _new_run(d, tok.text, tok.rPr, deleted=True)
            ins = _new_change_block(newp, 'ins', author, date, next_id)
            next_id += 1
            for tok in new_tokens[j1:j2]:
                _new_run(ins, tok.text, tok.rPr, deleted=False)
        else:
            msg = f'Unexpected opcode: {tag}'
            logger.error(msg)
            raise RuntimeError(msg)

    return newp, next_id


def build_redlined_document(
    doc_old: ET.Element,
    doc_new: ET.Element,
    author: str,
    now_iso: Optional[str] = None
) -> ET.Element:
    """Build redlined document with track changes from old to new.

    Args:
        doc_old: Old document root element
        doc_new: New document root element
        author: Author name for changes
        now_iso: ISO timestamp (defaults to current time)

    Returns:
        New document root element with tracked changes
    """
    if now_iso is None:
        now_iso = _utc_now_iso()

    logger.info("Building redlined document")
    old_paras, _ = _collect_top_level_paragraphs(doc_old)
    new_paras, _body_new = _collect_top_level_paragraphs(doc_new)

    body_children = list(doc_new.find('w:body', NS))

    # Paragraph-level diff
    sm = difflib.SequenceMatcher(a=[p.raw_text for p in old_paras], b=[p.raw_text for p in new_paras])

    plan_for_p2: dict[int, tuple[str, Optional[int]]] = {}
    pending_deletions_at_index: dict[int, list[int]] = {}

    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            for j in range(j1, j2):
                plan_for_p2[j] = ('as_is', None)
        elif tag == 'insert':
            for j in range(j1, j2):
                plan_for_p2[j] = ('insert_para', None)
        elif tag == 'delete':
            if i1 < i2:
                pending_deletions_at_index.setdefault(j1, []).extend(list(range(i1, i2)))
        elif tag == 'replace':
            len_old = i2 - i1
            len_new = j2 - j1
            if len_old == 1 and len_new == 1:
                plan_for_p2[j1] = ('replace_1to1', i1)
            else:
                for j in range(j1, j2):
                    plan_for_p2[j] = ('insert_para', None)
                if i1 < i2:
                    pending_deletions_at_index.setdefault(j1, []).extend(list(range(i1, i2)))

    new_body = ET.Element(W('body'))
    next_change_id = 1
    sectPr = None

    new_para_counter = 0
    for ch in body_children:
        if ch.tag == W('sectPr'):
            sectPr = ch
            continue
        if ch.tag != W('p'):
            new_body.append(_clone(ch))
            continue

        if new_para_counter in pending_deletions_at_index:
            for i_old in pending_deletions_at_index[new_para_counter]:
                old_p_el = old_paras[i_old].el
                delp = _deleted_paragraph_from_old(old_p_el, author, now_iso, next_change_id)
                next_change_id += 1
                new_body.append(delp)

        action, maybe_i_old = plan_for_p2.get(new_para_counter, ('as_is', None))

        if action == 'as_is':
            new_body.append(_clone(ch))
        elif action == 'insert_para':
            ins_p = _wrap_paragraph_as_insertion(ch, author, now_iso, next_change_id)
            next_change_id += 1
            new_body.append(ins_p)
        elif action == 'replace_1to1':
            i_old = maybe_i_old
            para_old = old_paras[i_old]
            para_new = new_paras[new_para_counter]
            redlined_p, next_change_id = _redline_1to1_paragraph(para_old, para_new, author, now_iso, next_change_id)
            new_body.append(redlined_p)

        new_para_counter += 1

    if new_para_counter in pending_deletions_at_index:
        for i_old in pending_deletions_at_index[new_para_counter]:
            delp = _deleted_paragraph_from_old(old_paras[i_old].el, author, now_iso, next_change_id)
            next_change_id += 1
            new_body.append(delp)

    if sectPr is not None:
        new_body.append(_clone(sectPr))

    out_doc = _clone(doc_new)
    parent = out_doc

    for i, child in enumerate(list(parent)):
        if child.tag == W('body'):
            parent.remove(child)
            parent.insert(i, new_body)
            break
    else:
        msg = 'No w:body in document'
        logger.error(msg)
        raise RuntimeError(msg)

    logger.info(f"Generated {next_change_id - 1} tracked changes")
    return out_doc


@app.command()
def main(
    from_path: Path = typer.Option(..., "--from", help="Old / base DOCX path", exists=True, file_okay=True, dir_okay=False),
    to_path: Path = typer.Option(..., "--to", help="New / target DOCX path", exists=True, file_okay=True, dir_okay=False),
    out_path: Path = typer.Option(..., "--out", help="Output DOCX path"),
    author: str = typer.Option("Comparison", "--author", help="Track-changes author name"),
    date: Optional[str] = typer.Option(None, "--date", help="ISO datetime for changes (default: now UTC)"),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Enable verbose logging"),
) -> None:
    """Produce a tracked-changes DOCX that redlines two DOCX files.

    This command compares two DOCX files and generates a third file showing
    all changes as Microsoft Word Track Changes.
    """
    if verbose:
        logger.remove()
        logger.add(
            sys.stderr,
            format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>",
            level="DEBUG",
        )

    try:
        logger.info(f"Starting redline comparison: {from_path} -> {to_path}")

        old_doc, old_styles, _old_files = _read_docx_all(from_path)
        new_doc, new_styles, new_files = _read_docx_all(to_path)

        date_iso = date or _utc_now_iso()

        out_doc = build_redlined_document(old_doc, new_doc, author=author, now_iso=date_iso)
        out_styles = _merge_styles(old_styles, new_styles)

        _write_docx_from_base(new_files, out_doc, out_styles, out_path)

        logger.success(f"Redlined document created: {out_path}")

    except Exception as e:
        logger.exception(f"Failed to create redlined document: {e}")
        raise typer.Exit(code=2)


if __name__ == '__main__':
    app()
