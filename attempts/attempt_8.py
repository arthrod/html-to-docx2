#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12"
# dependencies = [
#   "typer",
#   "loguru",
# ]
# ///
"""Enhanced stdlib-only docx redline comparison tool - FIXED formatting changes.

Create tracked-changes (redline) .docx by comparing two .docx files using only stdlib.

Features:
- No external dependencies beyond CLI/logging (converted from lxml to ElementTree)
- Character-level diffs for precise changes
- FIXED: Properly tracks formatting-only changes via rPrChange
- Word Track Changes: <w:ins>, <w:del>, and <w:rPrChange>
- Enables <w:trackRevisions/> in settings.xml
- Preserves styles and formatting
- Comprehensive error handling and logging

Key Fix:
- Always process paragraphs through diff logic, even when text is equal
- Properly detects and tracks formatting-only changes

Usage:
    uv run attempt_10.py old.docx new.docx redlined.docx --author "Acme LLP"
"""

from __future__ import annotations

import argparse
import copy
import datetime as dt
import io
import sys
import uuid
import xml.etree.ElementTree as ET
import zipfile
from difflib import SequenceMatcher
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

app = typer.Typer(help="Create redlined DOCX files with character-level tracked changes")

# Namespaces
NS_W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
NS_XML = 'http://www.w3.org/XML/1998/namespace'

NS = {'w': NS_W, 'r': NS_R, 'xml': NS_XML}

# Register namespaces
for _prefix, _uri in NS.items():
    ET.register_namespace(_prefix, _uri)


def qn(tag: str) -> str:
    """Expand QName like 'w:p' to '{namespace}p'.

    Args:
        tag: Qualified name with prefix (e.g., 'w:p')

    Returns:
        Fully qualified XML tag with namespace
    """
    prefix, local = tag.split(':')
    return f'{{{NS[prefix]}}}{local}'


def now_iso() -> str:
    """Return current UTC time in ISO format with Z suffix.

    Returns:
        ISO formatted timestamp string (e.g., '2025-10-10T12:00:00Z')
    """
    return dt.datetime.now(dt.UTC).replace(microsecond=0).isoformat() + 'Z'


def read_docx_xml_parts(path: Path) -> dict[str, bytes]:
    """Return all zip entries as dict of name -> bytes.

    Args:
        path: Path to DOCX file

    Returns:
        Dictionary mapping entry names to their bytes content

    Raises:
        FileNotFoundError: If DOCX file doesn't exist
        ValueError: If file cannot be read or is not a valid ZIP
    """
    logger.debug(f"Reading DOCX package: {path}")
    try:
        with zipfile.ZipFile(path, 'r') as zf:
            files = {name: zf.read(name) for name in zf.namelist()}
        logger.debug(f"Read {len(files)} entries from {path}")
        return files
    except FileNotFoundError:
        logger.error(f"DOCX file not found: {path}")
        raise
    except (zipfile.BadZipFile, Exception) as e:
        msg = f'Cannot read {path}: {e}'
        logger.error(msg)
        raise ValueError(msg) from e


def write_docx_xml_parts(parts: dict[str, bytes], out_path: Path) -> None:
    """Write .docx ZIP from dict of name -> bytes.

    Args:
        parts: Dictionary of entry names to bytes content
        out_path: Output DOCX file path
    """
    logger.info(f"Writing DOCX package to: {out_path}")
    try:
        with zipfile.ZipFile(out_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            for name, data in parts.items():
                zf.writestr(name, data)
        logger.success(f"Successfully wrote {len(parts)} entries to {out_path}")
    except Exception as e:
        logger.error(f"Failed to write DOCX: {e}")
        raise


def parse_xml(data: bytes) -> ET.Element:
    """Parse XML bytes and return root element.

    Args:
        data: XML content as bytes

    Returns:
        Parsed XML root element

    Raises:
        ET.ParseError: If XML is malformed
    """
    try:
        return ET.fromstring(data)
    except ET.ParseError as e:
        logger.error(f"Failed to parse XML: {e}")
        raise


def serialize_xml(elem: ET.Element) -> bytes:
    """Serialize element to XML bytes with declaration.

    Args:
        elem: XML element to serialize

    Returns:
        Serialized XML as bytes with declaration
    """
    buf = io.BytesIO()
    tree = ET.ElementTree(elem)
    tree.write(buf, encoding='utf-8', xml_declaration=True)
    return buf.getvalue()


def ensure_track_revisions(settings_xml: Optional[bytes]) -> bytes:
    """Add <w:trackRevisions/> to settings.xml.

    Creates minimal settings if none exist, or adds trackRevisions element
    to existing settings.

    Args:
        settings_xml: Existing settings.xml content (can be None)

    Returns:
        Updated settings.xml content with trackRevisions enabled
    """
    if not settings_xml:
        logger.debug("Creating new settings.xml with trackRevisions")
        root = ET.Element(qn('w:settings'))
        root.append(ET.Element(qn('w:trackRevisions')))
        return serialize_xml(root)

    root = parse_xml(settings_xml)
    if root.tag != qn('w:settings'):
        logger.warning("Unexpected settings.xml root, recreating")
        root = ET.Element(qn('w:settings'))
        root.append(ET.Element(qn('w:trackRevisions')))
        return serialize_xml(root)

    if root.find('w:trackRevisions', NS) is None:
        logger.debug("Adding trackRevisions to existing settings")
        root.append(ET.Element(qn('w:trackRevisions')))

    return serialize_xml(root)


def text_of_element(elem: ET.Element) -> str:
    """Concatenate all w:t texts under elem.

    Args:
        elem: XML element to extract text from

    Returns:
        Concatenated text content
    """
    texts = [t.text or '' for t in elem.findall('.//w:t', NS)]
    return ''.join(texts)


def block_iter(body: ET.Element):
    """Iterate block-level content (paragraphs, tables, section properties).

    Args:
        body: Body element to iterate

    Yields:
        Tuples of (element, kind) where kind is 'p', 'tbl', 'sectPr', or 'other'
    """
    for child in body:
        if child.tag == qn('w:p'):
            yield child, 'p'
        elif child.tag == qn('w:tbl'):
            yield child, 'tbl'
        elif child.tag == qn('w:sectPr'):
            yield child, 'sectPr'
        else:
            yield child, 'other'


def paragraph_runs_tokens(p: ET.Element) -> list[dict]:
    """Convert paragraph to list of run tokens.

    Each token is a dict with:
        kind: 'text' | 'tab' | 'br' | 'other'
        text: Text content (for text/tab/br)
        rPr: Run properties (formatting) - deepcopy or None
        run_xml: Original run element

    Args:
        p: Paragraph element

    Returns:
        List of token dictionaries
    """
    tokens = []
    for r in p.findall('./w:r', NS):
        rPr = r.find(qn('w:rPr'))
        rPr_copy = copy.deepcopy(rPr) if rPr is not None else None

        # Text nodes
        t_nodes = r.findall(qn('w:t'))
        if t_nodes:
            full_text = ''.join([t.text or '' for t in t_nodes])
            tokens.append({'kind': 'text', 'text': full_text, 'rPr': rPr_copy, 'run_xml': r})
            continue

        # Tab
        if r.find(qn('w:tab')) is not None:
            tokens.append({'kind': 'tab', 'text': '\t', 'rPr': rPr_copy, 'run_xml': r})
            continue

        # Line break
        if r.find(qn('w:br')) is not None:
            tokens.append({'kind': 'br', 'text': '\n', 'rPr': rPr_copy, 'run_xml': r})
            continue

        # Other run content (drawings, fields, etc.)
        tokens.append({'kind': 'other', 'text': '', 'rPr': rPr_copy, 'run_xml': r})

    return tokens


def tokens_text_key(tokens: list[dict]) -> str:
    """Build normalized text key for paragraph alignment.

    Args:
        tokens: List of token dictionaries

    Returns:
        Concatenated text representation for comparison
    """
    parts = []
    for tok in tokens:
        if tok['kind'] == 'text':
            parts.append(tok['text'])
        elif tok['kind'] == 'tab':
            parts.append('\t')
        elif tok['kind'] == 'br':
            parts.append('\n')
        else:
            parts.append('\ufffc')  # Object replacement character
    return ''.join(parts)


def clone_r_with_text(text: str, rPr: Optional[ET.Element], *, deleted: bool = False) -> ET.Element:
    """Create <w:r> with <w:t> or <w:delText>.

    Args:
        text: Text content
        rPr: Run properties (formatting)
        deleted: Whether this is deleted text (uses w:delText)

    Returns:
        Created run element
    """
    r = ET.Element(qn('w:r'))
    if rPr is not None:
        r.append(copy.deepcopy(rPr))

    t = ET.Element(qn('w:delText') if deleted else qn('w:t'))
    # Preserve leading/trailing spaces
    if text and (text[:1].isspace() or text[-1:].isspace()):
        t.set(f'{{{NS_XML}}}space', 'preserve')
    t.text = text
    r.append(t)
    return r


def clone_r_special(kind: str, rPr: Optional[ET.Element], *, deleted: bool = False) -> ET.Element:
    """Create <w:r> with <w:tab/> or <w:br/>.

    Args:
        kind: 'tab' or 'br'
        rPr: Run properties
        deleted: Currently unused (tabs/breaks same for insert/delete)

    Returns:
        Created run element
    """
    r = ET.Element(qn('w:r'))
    if rPr is not None:
        r.append(copy.deepcopy(rPr))
    if kind == 'tab':
        r.append(ET.Element(qn('w:tab')))
    elif kind == 'br':
        r.append(ET.Element(qn('w:br')))
    return r


class ChangeIdGen:
    """Generate unique change IDs for track changes.

    Attributes:
        cur: Current change ID counter
    """

    def __init__(self, start: Optional[int] = None) -> None:
        """Initialize change ID generator.

        Args:
            start: Starting ID (defaults to UUID-based random int)
        """
        if start is None:
            start = int(uuid.uuid4().int & 0x7FFFFFFF)
        self.cur = start
        logger.debug(f"Initialized ChangeIdGen with start={start}")

    def next(self) -> int:
        """Get next change ID.

        Returns:
            Next sequential change ID
        """
        self.cur += 1
        return self.cur


def make_ins_container(author: str, date_iso: str, cid: int) -> ET.Element:
    """Create <w:ins> element for insertion tracking.

    Args:
        author: Author name
        date_iso: ISO date string
        cid: Change ID

    Returns:
        Insertion container element
    """
    ins = ET.Element(qn('w:ins'))
    ins.set(qn('w:id'), str(cid))
    ins.set(qn('w:author'), author)
    ins.set(qn('w:date'), date_iso)
    return ins


def make_del_container(author: str, date_iso: str, cid: int) -> ET.Element:
    """Create <w:del> element for deletion tracking.

    Args:
        author: Author name
        date_iso: ISO date string
        cid: Change ID

    Returns:
        Deletion container element
    """
    de = ET.Element(qn('w:del'))
    de.set(qn('w:id'), str(cid))
    de.set(qn('w:author'), author)
    de.set(qn('w:date'), date_iso)
    return de


def add_rPrChange(new_r: ET.Element, old_rPr: Optional[ET.Element], author: str, date_iso: str, cid: int) -> None:
    """Mark formatting change with <w:rPrChange>.

    Args:
        new_r: Run element to modify
        old_rPr: Old run properties to record
        author: Author name
        date_iso: ISO date string
        cid: Change ID
    """
    if old_rPr is None:
        return

    rPr = new_r.find(qn('w:rPr'))
    if rPr is None:
        rPr = ET.Element(qn('w:rPr'))
        new_r.insert(0, rPr)

    rPrChange = ET.Element(qn('w:rPrChange'))
    rPrChange.set(qn('w:id'), str(cid))
    rPrChange.set(qn('w:author'), author)
    rPrChange.set(qn('w:date'), date_iso)

    prior = copy.deepcopy(old_rPr)
    prior.tag = qn('w:rPr')
    rPrChange.append(prior)
    rPr.append(rPrChange)


def equal_runs_style(a_rPr: Optional[ET.Element], b_rPr: Optional[ET.Element]) -> bool:
    """Compare run properties by XML string.

    Args:
        a_rPr: First run properties
        b_rPr: Second run properties

    Returns:
        True if properties are identical
    """
    def as_str(e):
        return ET.tostring(e, encoding='utf-8') if e is not None else b''
    return as_str(a_rPr) == as_str(b_rPr)


def diff_run_text_charlevel(
    old_text: str,
    new_text: str,
    new_rPr: Optional[ET.Element],
    old_rPr: Optional[ET.Element],
    author: str,
    date_iso: str,
    cidgen: ChangeIdGen,
) -> list[ET.Element]:
    """Yield char-level changes for single-run replacement.

    Args:
        old_text: Original text
        new_text: New text
        new_rPr: New run properties
        old_rPr: Old run properties
        author: Author name
        date_iso: ISO date string
        cidgen: Change ID generator

    Returns:
        List of run/ins/del elements representing character-level changes
    """
    out = []
    sm = SequenceMatcher(a=old_text, b=new_text, autojunk=False)

    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            if i2 > i1:
                r = clone_r_with_text(old_text[i1:i2], new_rPr, deleted=False)
                if not equal_runs_style(old_rPr, new_rPr):
                    add_rPrChange(r, old_rPr, author, date_iso, cidgen.next())
                out.append(r)
        elif tag == 'delete':
            if i2 > i1:
                de = make_del_container(author, date_iso, cidgen.next())
                de.append(clone_r_with_text(old_text[i1:i2], old_rPr, deleted=True))
                out.append(de)
        elif tag == 'insert':
            if j2 > j1:
                ins = make_ins_container(author, date_iso, cidgen.next())
                ins.append(clone_r_with_text(new_text[j1:j2], new_rPr, deleted=False))
                out.append(ins)
        elif tag == 'replace':
            if i2 > i1:
                de = make_del_container(author, date_iso, cidgen.next())
                de.append(clone_r_with_text(old_text[i1:i2], old_rPr, deleted=True))
                out.append(de)
            if j2 > j1:
                ins = make_ins_container(author, date_iso, cidgen.next())
                ins.append(clone_r_with_text(new_text[j1:j2], new_rPr, deleted=False))
                out.append(ins)

    logger.debug(f"Character-level diff: {len(old_text)} -> {len(new_text)} chars, {len(out)} elements")
    return out


def build_paragraph_with_diffs(
    old_p: ET.Element,
    new_p: ET.Element,
    author: str,
    date_iso: str,
    cidgen: ChangeIdGen
) -> ET.Element:
    """Construct paragraph with tracked changes.

    Performs token-level and character-level diffing to create precise
    tracked changes.

    Args:
        old_p: Old paragraph element
        new_p: New paragraph element
        author: Author name
        date_iso: ISO date string
        cidgen: Change ID generator

    Returns:
        New paragraph element with tracked changes
    """
    out_p = ET.Element(qn('w:p'))

    # Copy paragraph properties from new paragraph
    new_pPr = new_p.find(qn('w:pPr'))
    if new_pPr is not None:
        out_p.append(copy.deepcopy(new_pPr))

    old_tokens = paragraph_runs_tokens(old_p)
    new_tokens = paragraph_runs_tokens(new_p)

    def token_key(tok):
        return (tok['kind'], tok['text'])

    sm = SequenceMatcher(
        a=[token_key(t) for t in old_tokens],
        b=[token_key(t) for t in new_tokens],
        autojunk=False
    )

    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        old_slice = old_tokens[i1:i2]
        new_slice = new_tokens[j1:j2]

        if tag == 'equal':
            for k in range(len(old_slice)):
                o = old_slice[k]
                n = new_slice[k]
                if o['kind'] in {'tab', 'br'}:
                    r = clone_r_special(o['kind'], n['rPr'])
                    if not equal_runs_style(o['rPr'], n['rPr']):
                        add_rPrChange(r, o['rPr'], author, date_iso, cidgen.next())
                    out_p.append(r)
                elif o['kind'] == 'text':
                    r = clone_r_with_text(n['text'], n['rPr'], deleted=False)
                    if not equal_runs_style(o['rPr'], n['rPr']):
                        add_rPrChange(r, o['rPr'], author, date_iso, cidgen.next())
                    out_p.append(r)
                else:
                    out_p.append(copy.deepcopy(n['run_xml']))

        elif tag == 'delete':
            if not old_slice:
                continue
            de = make_del_container(author, date_iso, cidgen.next())
            for o in old_slice:
                if o['kind'] == 'text':
                    de.append(clone_r_with_text(o['text'], o['rPr'], deleted=True))
                elif o['kind'] in {'tab', 'br'}:
                    de.append(clone_r_special(o['kind'], o['rPr'], deleted=True))
                else:
                    de.append(copy.deepcopy(o['run_xml']))
            out_p.append(de)

        elif tag == 'insert':
            if not new_slice:
                continue
            ins = make_ins_container(author, date_iso, cidgen.next())
            for n in new_slice:
                if n['kind'] == 'text':
                    ins.append(clone_r_with_text(n['text'], n['rPr'], deleted=False))
                elif n['kind'] in {'tab', 'br'}:
                    ins.append(clone_r_special(n['kind'], n['rPr'], deleted=False))
                else:
                    ins.append(copy.deepcopy(n['run_xml']))
            out_p.append(ins)

        elif tag == 'replace':
            # Try char-level diff for single text runs
            if (len(old_slice) == 1 and len(new_slice) == 1 and
                old_slice[0]['kind'] == 'text' and new_slice[0]['kind'] == 'text'):
                pieces = diff_run_text_charlevel(
                    old_slice[0]['text'], new_slice[0]['text'],
                    new_slice[0]['rPr'], old_slice[0]['rPr'],
                    author, date_iso, cidgen
                )
                for node in pieces:
                    out_p.append(node)
            else:
                # General case: delete old, insert new
                if old_slice:
                    de = make_del_container(author, date_iso, cidgen.next())
                    for o in old_slice:
                        if o['kind'] == 'text':
                            de.append(clone_r_with_text(o['text'], o['rPr'], deleted=True))
                        elif o['kind'] in {'tab', 'br'}:
                            de.append(clone_r_special(o['kind'], o['rPr'], deleted=True))
                        else:
                            de.append(copy.deepcopy(o['run_xml']))
                    out_p.append(de)
                if new_slice:
                    ins = make_ins_container(author, date_iso, cidgen.next())
                    for n in new_slice:
                        if n['kind'] == 'text':
                            ins.append(clone_r_with_text(n['text'], n['rPr'], deleted=False))
                        elif n['kind'] in {'tab', 'br'}:
                            ins.append(clone_r_special(n['kind'], n['rPr'], deleted=False))
                        else:
                            ins.append(copy.deepcopy(n['run_xml']))
                    out_p.append(ins)

    return out_p


def blocks_text_key(elem: ET.Element, kind: str) -> str:
    """Return normalized text key for block alignment.

    Args:
        elem: Block element
        kind: Block kind ('p', 'tbl', etc.)

    Returns:
        Text key for comparison
    """
    if kind == 'p':
        return tokens_text_key(paragraph_runs_tokens(elem))
    if kind == 'tbl':
        return 'TABLE|' + text_of_element(elem)
    return 'OTHER|' + (text_of_element(elem) or '')


def build_body_with_diffs(
    old_body: ET.Element,
    new_body: ET.Element,
    author: str,
    date_iso: str,
    cidgen: ChangeIdGen
) -> ET.Element:
    """Create new <w:body> with block-level alignment and diffs.

    Args:
        old_body: Old body element
        new_body: New body element
        author: Author name
        date_iso: ISO date string
        cidgen: Change ID generator

    Returns:
        New body element with tracked changes
    """
    logger.info("Building body with block-level diffs")

    # Collect blocks
    old_blocks = [(e, k) for e, k in block_iter(old_body) if k != 'sectPr']
    new_blocks = [(e, k) for e, k in block_iter(new_body) if k != 'sectPr']

    logger.debug(f"Old body: {len(old_blocks)} blocks, New body: {len(new_blocks)} blocks")

    old_keys = [blocks_text_key(e, k) for e, k in old_blocks]
    new_keys = [blocks_text_key(e, k) for e, k in new_blocks]

    body = ET.Element(qn('w:body'))

    sm = SequenceMatcher(a=old_keys, b=new_keys, autojunk=False)
    changes = 0

    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        old_slice = old_blocks[i1:i2]
        new_slice = new_blocks[j1:j2]

        if tag == 'equal':
            # KEY FIX: Always process paragraphs through diff logic to detect formatting changes
            for (oe, ok), (ne, nk) in zip(old_slice, new_slice):
                if ok == 'p' and nk == 'p':
                    # Even when text is equal, check for formatting changes
                    body.append(build_paragraph_with_diffs(oe, ne, author, date_iso, cidgen))
                else:
                    body.append(copy.deepcopy(ne))

        elif tag == 'delete':
            for oe, ok in old_slice:
                de = make_del_container(author, date_iso, cidgen.next())
                de.append(copy.deepcopy(oe))
                body.append(de)
                changes += 1

        elif tag == 'insert':
            for ne, nk in new_slice:
                ins = make_ins_container(author, date_iso, cidgen.next())
                ins.append(copy.deepcopy(ne))
                body.append(ins)
                changes += 1

        elif tag == 'replace':
            if (len(old_slice) == 1 and len(new_slice) == 1 and
                old_slice[0][1] == 'p' and new_slice[0][1] == 'p'):
                body.append(build_paragraph_with_diffs(old_slice[0][0], new_slice[0][0], author, date_iso, cidgen))
                changes += 1
            else:
                for oe, ok in old_slice:
                    de = make_del_container(author, date_iso, cidgen.next())
                    de.append(copy.deepcopy(oe))
                    body.append(de)
                    changes += 1
                for ne, nk in new_slice:
                    ins = make_ins_container(author, date_iso, cidgen.next())
                    ins.append(copy.deepcopy(ne))
                    body.append(ins)
                    changes += 1

    # Append sectPr from new body
    sect = new_body.find(qn('w:sectPr'))
    if sect is not None:
        body.append(copy.deepcopy(sect))

    logger.info(f"Generated {changes} block-level changes")
    return body


def make_redline_docx(
    old_path: Path,
    new_path: Path,
    out_path: Path,
    author: str = 'AutoDiff',
    date_iso: Optional[str] = None
) -> None:
    """Compare documents and write redlined output.

    Args:
        old_path: Path to old/original DOCX
        new_path: Path to new/revised DOCX
        out_path: Path for output redlined DOCX
        author: Author name for changes
        date_iso: ISO timestamp (defaults to current time)

    Raises:
        ValueError: If DOCX files are invalid or missing required parts
    """
    if date_iso is None:
        date_iso = now_iso()
    cidgen = ChangeIdGen()

    logger.info(f"Comparing {old_path} -> {new_path}")

    # Load packages
    old_parts = read_docx_xml_parts(old_path)
    new_parts = read_docx_xml_parts(new_path)

    # Parse documents
    if 'word/document.xml' not in old_parts:
        msg = 'Missing word/document.xml in old docx'
        logger.error(msg)
        raise ValueError(msg)
    if 'word/document.xml' not in new_parts:
        msg = 'Missing word/document.xml in new docx'
        logger.error(msg)
        raise ValueError(msg)

    old_doc = parse_xml(old_parts['word/document.xml'])
    new_doc = parse_xml(new_parts['word/document.xml'])

    if old_doc.tag != qn('w:document') or new_doc.tag != qn('w:document'):
        msg = 'document.xml root is not w:document'
        logger.error(msg)
        raise ValueError(msg)

    old_body = old_doc.find(qn('w:body'))
    new_body = new_doc.find(qn('w:body'))
    if old_body is None or new_body is None:
        msg = 'document.xml missing w:body'
        logger.error(msg)
        raise ValueError(msg)

    # Build redlined body
    redline_body = build_body_with_diffs(old_body, new_body, author, date_iso, cidgen)

    # Construct result document
    result_doc = copy.deepcopy(new_doc)
    for child in list(result_doc):
        if child.tag == qn('w:body'):
            result_doc.remove(child)
    result_doc.append(redline_body)

    # Serialize
    result_document_xml = serialize_xml(result_doc)

    # Enable track revisions
    settings_xml = new_parts.get('word/settings.xml')
    new_parts['word/settings.xml'] = ensure_track_revisions(settings_xml)

    # Replace document.xml
    new_parts['word/document.xml'] = result_document_xml

    # Write result
    write_docx_xml_parts(new_parts, out_path)
    logger.success(f"Redline document created with {cidgen.cur} changes")


@app.command()
def main(
    old: Path = typer.Argument(..., help="Old/original .docx", exists=True, file_okay=True, dir_okay=False),
    new: Path = typer.Argument(..., help="New/revised .docx", exists=True, file_okay=True, dir_okay=False),
    out: Path = typer.Argument(..., help="Output redlined .docx"),
    author: str = typer.Option("AutoDiff", "--author", help="Author name for tracked changes"),
    date: Optional[str] = typer.Option(None, "--date", help="ISO timestamp for changes (default: now UTC)"),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Enable verbose logging"),
) -> None:
    """Generate redlined .docx with Track Changes by comparing two documents.

    This tool performs character-level comparison between two DOCX files and
    generates a third file with all changes marked as Microsoft Word Track Changes.

    Example:
        uv run attempt_8.py old.docx new.docx output.docx --author "Legal Team"
    """
    if verbose:
        logger.remove()
        logger.add(
            sys.stderr,
            format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>",
            level="DEBUG",
        )
        logger.debug("Verbose logging enabled")

    try:
        make_redline_docx(old, new, out, author=author, date_iso=date)
    except (ValueError, ET.ParseError) as e:
        logger.error(f"Error: {e}")
        raise typer.Exit(code=1)
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
        raise typer.Exit(code=2)


if __name__ == '__main__':
    app()
