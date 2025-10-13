#!/usr/bin/env python3
"""redline_docx_enhanced.py - Enhanced lxml-based DOCX redlining.

Create a tracked-changes (redline) .docx by comparing two .docx files with advanced features:
- Word Track Changes: <w:ins>, <w:del>, <w:rPrChange>
- Character-level diffs for precise change tracking
- **Table cell redlining** - recursively processes table content
- **Hyperlink preservation** - maintains hyperlink structures
- Robust error handling and validation
- Preserves styles, numbering, and formatting
- Enables <w:trackRevisions/> in settings.xml

Enhanced features:
- Recursive table cell comparison
- Hyperlink-aware diffing
- Better error messages with context
- Validation of document structure
- Support for complex nested structures
- Improved handling of runs with mixed content

Usage:
    python redline_docx_enhanced.py old.docx new.docx output.docx --author "Legal Team" --verbose

Author: Enhanced by CodeRabbit
License: MIT
"""

from __future__ import annotations

import argparse
import datetime as dt
import logging
import sys
import uuid
import zipfile
from copy import deepcopy
from difflib import SequenceMatcher
from pathlib import Path
from typing import Optional

from lxml import etree

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s: %(message)s'
)
logger = logging.getLogger(__name__)

# Namespaces
NS_W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
NS_XML = 'http://www.w3.org/XML/1998/namespace'

NSMAP = {'w': NS_W, 'r': NS_R, 'xml': NS_XML}


def qn(tag: str) -> str:
    """Expand a QName like 'w:p' to '{namespace}p'.

    Args:
        tag: Qualified name with namespace prefix (e.g., 'w:p')

    Returns:
        Full qualified name with namespace URI

    Raises:
        ValueError: If tag format is invalid
    """
    if ':' not in tag:
        msg = f'Invalid QName format: {tag!r} (expected "prefix:local")'
        raise ValueError(msg)

    prefix, local = tag.split(':', 1)
    if prefix not in NSMAP:
        msg = f'Unknown namespace prefix: {prefix!r}'
        raise ValueError(msg)

    return f'{{{NSMAP[prefix]}}}{local}'


def now_iso() -> str:
    """Return current UTC timestamp in ISO format with 'Z' suffix."""
    return dt.datetime.now(dt.UTC).replace(microsecond=0).isoformat() + 'Z'


# -----------------------------------------------------------------------------
# .docx packaging helpers
# -----------------------------------------------------------------------------
def read_docx_xml_parts(path: str) -> dict[str, bytes]:
    """Read all entries from a .docx ZIP archive.

    Args:
        path: Path to .docx file

    Returns:
        Dictionary mapping part names to their byte content

    Raises:
        FileNotFoundError: If file doesn't exist
        zipfile.BadZipFile: If file is not a valid ZIP
    """
    path_obj = Path(path)
    if not path_obj.exists():
        msg = f'File not found: {path}'
        raise FileNotFoundError(msg)

    if not path_obj.suffix.lower() == '.docx':
        logger.warning(f'File {path} does not have .docx extension')

    try:
        with zipfile.ZipFile(path, 'r') as zf:
            parts = {name: zf.read(name) for name in zf.namelist()}
            logger.debug(f'Read {len(parts)} parts from {path}')
            return parts
    except zipfile.BadZipFile as e:
        msg = f'Invalid ZIP archive: {path}'
        raise zipfile.BadZipFile(msg) from e


def write_docx_xml_parts(parts: dict[str, bytes], out_path: str) -> None:
    """Write a .docx ZIP archive from parts dictionary.

    Args:
        parts: Dictionary of part names to byte content
        out_path: Output file path

    Raises:
        OSError: If write fails
    """
    try:
        with zipfile.ZipFile(out_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            for name, data in parts.items():
                zf.writestr(name, data)
        logger.debug(f'Wrote {len(parts)} parts to {out_path}')
    except Exception as e:
        msg = f'Failed to write {out_path}: {e}'
        raise OSError(msg) from e


def parse_xml(data: bytes, remove_blank_text: bool = True) -> etree._ElementTree:
    """Parse XML bytes into lxml ElementTree.

    Args:
        data: XML content as bytes
        remove_blank_text: Whether to strip whitespace-only text nodes

    Returns:
        ElementTree object

    Raises:
        etree.XMLSyntaxError: If XML is malformed
    """
    try:
        parser = etree.XMLParser(remove_blank_text=remove_blank_text)
        root = etree.fromstring(data, parser=parser)
        return root.getroottree()
    except etree.XMLSyntaxError as e:
        msg = f'XML parsing failed: {e}'
        raise etree.XMLSyntaxError(msg) from e


def serialize_xml(elem_or_tree: etree._Element | etree._ElementTree) -> bytes:
    """Serialize element or tree to XML bytes with declaration.

    Args:
        elem_or_tree: Element or ElementTree to serialize

    Returns:
        XML bytes with declaration
    """
    root = elem_or_tree.getroot() if isinstance(elem_or_tree, etree._ElementTree) else elem_or_tree
    return etree.tostring(root, encoding='UTF-8', xml_declaration=True, pretty_print=False)


# -----------------------------------------------------------------------------
# Word-specific helpers
# -----------------------------------------------------------------------------
def ensure_track_revisions(settings_xml: Optional[bytes]) -> bytes:
    """Add <w:trackRevisions/> to settings.xml.

    Creates minimal settings if none exist, or modifies existing settings
    to enable track revisions.

    Args:
        settings_xml: Existing settings.xml content or None

    Returns:
        Modified settings.xml with trackRevisions enabled
    """
    if not settings_xml:
        logger.debug('Creating minimal settings.xml with trackRevisions')
        root = etree.Element(qn('w:settings'), nsmap={'w': NS_W})
        root.append(etree.Element(qn('w:trackRevisions')))
        return serialize_xml(root)

    try:
        tree = parse_xml(settings_xml)
        root = tree.getroot()
    except etree.XMLSyntaxError:
        logger.warning('Invalid settings.xml, creating new one')
        root = etree.Element(qn('w:settings'), nsmap={'w': NS_W})
        root.append(etree.Element(qn('w:trackRevisions')))
        return serialize_xml(root)

    if root.tag != qn('w:settings'):
        logger.warning(f'Unexpected settings root tag: {root.tag}')
        root = etree.Element(qn('w:settings'), nsmap={'w': NS_W})
        root.append(etree.Element(qn('w:trackRevisions')))
        return serialize_xml(root)

    # Check if trackRevisions already exists
    existing = root.xpath('w:trackRevisions', namespaces=NSMAP)
    if not existing:
        logger.debug('Adding trackRevisions to settings')
        root.append(etree.Element(qn('w:trackRevisions')))
    else:
        logger.debug('trackRevisions already present in settings')

    return serialize_xml(root)


def text_of_element(elem: etree._Element) -> str:
    """Extract all text content from element and descendants.

    Args:
        elem: Element to extract text from

    Returns:
        Concatenated text content
    """
    texts = [t.text or '' for t in elem.xpath('.//w:t', namespaces=NSMAP)]
    return ''.join(texts)


def block_iter(container: etree._Element):
    """Iterate block-level content (paragraphs, tables, section props).

    Args:
        container: Container element (usually w:body or w:tc)

    Yields:
        Tuples of (element, kind) where kind is 'p', 'tbl', 'sectPr', or 'other'
    """
    for child in container:
        if child.tag == qn('w:p'):
            yield child, 'p'
        elif child.tag == qn('w:tbl'):
            yield child, 'tbl'
        elif child.tag == qn('w:sectPr'):
            yield child, 'sectPr'
        else:
            yield child, 'other'


def extract_runs_from_hyperlink(hyperlink: etree._Element) -> list[etree._Element]:
    """Extract runs from hyperlink element.

    Args:
        hyperlink: w:hyperlink element

    Returns:
        List of w:r elements within the hyperlink
    """
    return hyperlink.xpath('./w:r', namespaces=NSMAP)


def paragraph_runs_tokens(p: etree._Element, preserve_hyperlinks: bool = True):
    """Convert paragraph to list of run tokens with optional hyperlink preservation.

    Token structure:
        {
            'kind': 'text' | 'tab' | 'br' | 'hyperlink' | 'other',
            'text': str (for text/tab/br),
            'rPr': Element or None (run properties),
            'run_xml': Element (original run),
            'hyperlink': Element or None (for hyperlink runs)
        }

    Args:
        p: Paragraph element
        preserve_hyperlinks: Whether to mark hyperlink runs specially

    Returns:
        List of token dictionaries
    """
    tokens = []

    for child in p:
        if child.tag == qn('w:r'):
            tokens.extend(_process_single_run(child, None))
        elif child.tag == qn('w:hyperlink') and preserve_hyperlinks:
            # Process runs within hyperlink, marking them
            for r in extract_runs_from_hyperlink(child):
                tokens.extend(_process_single_run(r, child))
        elif child.tag == qn('w:hyperlink'):
            # Flatten hyperlink without special marking
            for r in extract_runs_from_hyperlink(child):
                tokens.extend(_process_single_run(r, None))

    return tokens


def _process_single_run(r: etree._Element, hyperlink: Optional[etree._Element]) -> list[dict]:
    """Process a single run element into tokens.

    Args:
        r: Run element
        hyperlink: Parent hyperlink element if any

    Returns:
        List of token dicts (usually one, but can be multiple for mixed content)
    """
    rPr = r.find(qn('w:rPr'))
    rPr_copy = deepcopy(rPr) if rPr is not None else None

    # Text runs
    t_nodes = r.findall(qn('w:t'))
    if t_nodes:
        full_text = ''.join([t.text or '' for t in t_nodes])
        token = {
            'kind': 'hyperlink' if hyperlink is not None else 'text',
            'text': full_text,
            'rPr': rPr_copy,
            'run_xml': r,
            'hyperlink': hyperlink
        }
        return [token]

    # Tab
    if r.find(qn('w:tab')) is not None:
        return [{
            'kind': 'tab',
            'text': '\t',
            'rPr': rPr_copy,
            'run_xml': r,
            'hyperlink': hyperlink
        }]

    # Line break
    if r.find(qn('w:br')) is not None:
        return [{
            'kind': 'br',
            'text': '\n',
            'rPr': rPr_copy,
            'run_xml': r,
            'hyperlink': hyperlink
        }]

    # Other content (drawings, fields, etc.)
    return [{
        'kind': 'other',
        'text': '',
        'rPr': rPr_copy,
        'run_xml': r,
        'hyperlink': hyperlink
    }]


def tokens_text_key(tokens) -> str:
    """Build normalized text key for paragraph alignment.

    Args:
        tokens: List of token dictionaries

    Returns:
        Normalized text string for comparison
    """
    parts = []
    for tok in tokens:
        if tok['kind'] in {'text', 'hyperlink'}:
            parts.append(tok['text'])
        elif tok['kind'] == 'tab':
            parts.append('\t')
        elif tok['kind'] == 'br':
            parts.append('\n')
        else:
            parts.append('\ufffc')  # Object replacement character
    return ''.join(parts)


def clone_r_with_text(text: str, rPr: Optional[etree._Element], *, deleted: bool = False) -> etree._Element:
    """Create run element with text content.

    Args:
        text: Text content
        rPr: Run properties element to copy
        deleted: Whether this is deleted text (uses w:delText)

    Returns:
        New run element
    """
    r = etree.Element(qn('w:r'))
    if rPr is not None:
        r.append(deepcopy(rPr))

    t = etree.Element(qn('w:delText') if deleted else qn('w:t'))
    # Preserve leading/trailing spaces
    if text and (text[:1].isspace() or text[-1:].isspace()):
        t.set(f'{{{NS_XML}}}space', 'preserve')
    t.text = text
    r.append(t)
    return r


def clone_r_special(kind: str, rPr: Optional[etree._Element], *, deleted: bool = False) -> etree._Element:
    """Create run with special content (tab/br).

    Args:
        kind: 'tab' or 'br'
        rPr: Run properties to copy
        deleted: Whether this is in a deletion

    Returns:
        New run element
    """
    r = etree.Element(qn('w:r'))
    if rPr is not None:
        r.append(deepcopy(rPr))

    if kind == 'tab':
        r.append(etree.Element(qn('w:tab')))
    elif kind == 'br':
        r.append(etree.Element(qn('w:br')))

    return r


def wrap_run_in_hyperlink(r: etree._Element, hyperlink_template: etree._Element) -> etree._Element:
    """Wrap a run in a hyperlink element.

    Args:
        r: Run element to wrap
        hyperlink_template: Original hyperlink element to copy attributes from

    Returns:
        New hyperlink element containing the run
    """
    hl = etree.Element(qn('w:hyperlink'))
    # Copy relevant attributes
    for attr_name in [qn('r:id'), qn('w:anchor'), qn('w:tooltip')]:
        if attr_name in hyperlink_template.attrib:
            hl.set(attr_name, hyperlink_template.get(attr_name))
    hl.append(r)
    return hl


class ChangeIdGen:
    """Generate unique change IDs for tracked changes."""

    def __init__(self, start: Optional[int] = None) -> None:
        """Initialize generator.

        Args:
            start: Starting ID (uses UUID-based random if None)
        """
        if start is None:
            start = int(uuid.uuid4().int & 0x7FFFFFFF)
        self.cur = start
        logger.debug(f'Initialized ChangeIdGen with start={start}')

    def next(self) -> int:
        """Get next change ID."""
        self.cur += 1
        return self.cur


def make_ins_container(author: str, date_iso: str, cid: int) -> etree._Element:
    """Create insertion container element.

    Args:
        author: Change author name
        date_iso: ISO timestamp
        cid: Change ID

    Returns:
        w:ins element with attributes set
    """
    ins = etree.Element(qn('w:ins'))
    ins.set(qn('w:id'), str(cid))
    ins.set(qn('w:author'), author)
    ins.set(qn('w:date'), date_iso)
    return ins


def make_del_container(author: str, date_iso: str, cid: int) -> etree._Element:
    """Create deletion container element.

    Args:
        author: Change author name
        date_iso: ISO timestamp
        cid: Change ID

    Returns:
        w:del element with attributes set
    """
    de = etree.Element(qn('w:del'))
    de.set(qn('w:id'), str(cid))
    de.set(qn('w:author'), author)
    de.set(qn('w:date'), date_iso)
    return de


def add_rPrChange(new_r: etree._Element, old_rPr: Optional[etree._Element],
                  author: str, date_iso: str, cid: int) -> None:
    """Mark formatting change on a run.

    Adds w:rPrChange element showing previous formatting.

    Args:
        new_r: Run element with new formatting
        old_rPr: Previous run properties element
        author: Change author
        date_iso: ISO timestamp
        cid: Change ID
    """
    if old_rPr is None:
        return

    # Ensure w:rPr exists
    rPr = new_r.find(qn('w:rPr'))
    if rPr is None:
        rPr = etree.Element(qn('w:rPr'))
        new_r.insert(0, rPr)

    rPrChange = etree.Element(qn('w:rPrChange'))
    rPrChange.set(qn('w:id'), str(cid))
    rPrChange.set(qn('w:author'), author)
    rPrChange.set(qn('w:date'), date_iso)

    # Store previous properties
    prior = deepcopy(old_rPr)
    prior.tag = qn('w:rPr')
    rPrChange.append(prior)
    rPr.append(rPrChange)


def equal_runs_style(a_rPr: Optional[etree._Element], b_rPr: Optional[etree._Element]) -> bool:
    """Compare run properties for equality.

    Args:
        a_rPr: First run properties element
        b_rPr: Second run properties element

    Returns:
        True if properties are equivalent
    """
    def as_c14n(e):
        return etree.tostring(e, method='c14n') if e is not None else b''
    return as_c14n(a_rPr) == as_c14n(b_rPr)


def diff_run_text_charlevel(
    old_text: str,
    new_text: str,
    new_rPr: Optional[etree._Element],
    old_rPr: Optional[etree._Element],
    author: str,
    date_iso: str,
    cidgen: ChangeIdGen,
    hyperlink: Optional[etree._Element] = None
) -> list[etree._Element]:
    """Generate character-level diff for single-run replacement.

    Args:
        old_text: Original text
        new_text: New text
        new_rPr: New run properties
        old_rPr: Old run properties
        author: Change author
        date_iso: ISO timestamp
        cidgen: Change ID generator
        hyperlink: Hyperlink element if text is in hyperlink

    Returns:
        List of elements (runs, insertions, deletions)
    """
    out = []
    sm = SequenceMatcher(a=old_text, b=new_text, autojunk=False)

    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            if i2 > i1:
                r = clone_r_with_text(old_text[i1:i2], new_rPr, deleted=False)
                if hyperlink is not None:
                    r = wrap_run_in_hyperlink(r, hyperlink)
                out.append(r)

        elif tag == 'delete':
            if i2 > i1:
                de = make_del_container(author, date_iso, cidgen.next())
                r = clone_r_with_text(old_text[i1:i2], old_rPr, deleted=True)
                if hyperlink is not None:
                    r = wrap_run_in_hyperlink(r, hyperlink)
                de.append(r)
                out.append(de)

        elif tag == 'insert':
            if j2 > j1:
                ins = make_ins_container(author, date_iso, cidgen.next())
                r = clone_r_with_text(new_text[j1:j2], new_rPr, deleted=False)
                if hyperlink is not None:
                    r = wrap_run_in_hyperlink(r, hyperlink)
                ins.append(r)
                out.append(ins)

        elif tag == 'replace':
            if i2 > i1:
                de = make_del_container(author, date_iso, cidgen.next())
                r = clone_r_with_text(old_text[i1:i2], old_rPr, deleted=True)
                if hyperlink is not None:
                    r = wrap_run_in_hyperlink(r, hyperlink)
                de.append(r)
                out.append(de)
            if j2 > j1:
                ins = make_ins_container(author, date_iso, cidgen.next())
                r = clone_r_with_text(new_text[j1:j2], new_rPr, deleted=False)
                if hyperlink is not None:
                    r = wrap_run_in_hyperlink(r, hyperlink)
                ins.append(r)
                out.append(ins)

    return out


def build_paragraph_with_diffs(
    old_p: etree._Element,
    new_p: etree._Element,
    author: str,
    date_iso: str,
    cidgen: ChangeIdGen
) -> etree._Element:
    """Build paragraph with tracked changes from old to new.

    Args:
        old_p: Original paragraph
        new_p: New paragraph
        author: Change author
        date_iso: ISO timestamp
        cidgen: Change ID generator

    Returns:
        New paragraph element with tracked changes
    """
    out_p = etree.Element(qn('w:p'))

    # Copy paragraph properties from new
    new_pPr = new_p.find(qn('w:pPr'))
    if new_pPr is not None:
        out_p.append(deepcopy(new_pPr))

    old_tokens = paragraph_runs_tokens(old_p, preserve_hyperlinks=True)
    new_tokens = paragraph_runs_tokens(new_p, preserve_hyperlinks=True)

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

                elif o['kind'] in {'text', 'hyperlink'}:
                    r = clone_r_with_text(n['text'], n['rPr'], deleted=False)
                    if not equal_runs_style(o['rPr'], n['rPr']):
                        add_rPrChange(r, o['rPr'], author, date_iso, cidgen.next())

                    # Wrap in hyperlink if needed
                    if n.get('hyperlink') is not None:
                        r = wrap_run_in_hyperlink(r, n['hyperlink'])
                    out_p.append(r)

                else:
                    out_p.append(deepcopy(n['run_xml']))

        elif tag == 'delete':
            if not old_slice:
                continue
            de = make_del_container(author, date_iso, cidgen.next())
            for o in old_slice:
                if o['kind'] in {'text', 'hyperlink'}:
                    r = clone_r_with_text(o['text'], o['rPr'], deleted=True)
                    if o.get('hyperlink') is not None:
                        r = wrap_run_in_hyperlink(r, o['hyperlink'])
                    de.append(r)
                elif o['kind'] in {'tab', 'br'}:
                    de.append(clone_r_special(o['kind'], o['rPr'], deleted=True))
                else:
                    de.append(deepcopy(o['run_xml']))
            out_p.append(de)

        elif tag == 'insert':
            if not new_slice:
                continue
            ins = make_ins_container(author, date_iso, cidgen.next())
            for n in new_slice:
                if n['kind'] in {'text', 'hyperlink'}:
                    r = clone_r_with_text(n['text'], n['rPr'], deleted=False)
                    if n.get('hyperlink') is not None:
                        r = wrap_run_in_hyperlink(r, n['hyperlink'])
                    ins.append(r)
                elif n['kind'] in {'tab', 'br'}:
                    ins.append(clone_r_special(n['kind'], n['rPr'], deleted=False))
                else:
                    ins.append(deepcopy(n['run_xml']))
            out_p.append(ins)

        elif tag == 'replace':
            # Try character-level diff for single text runs
            if (len(old_slice) == 1 and len(new_slice) == 1 and
                old_slice[0]['kind'] in {'text', 'hyperlink'} and
                new_slice[0]['kind'] in {'text', 'hyperlink'}):

                pieces = diff_run_text_charlevel(
                    old_slice[0]['text'], new_slice[0]['text'],
                    new_slice[0]['rPr'], old_slice[0]['rPr'],
                    author, date_iso, cidgen,
                    hyperlink=new_slice[0].get('hyperlink')
                )
                for node in pieces:
                    out_p.append(node)
            else:
                # General case: delete + insert
                if old_slice:
                    de = make_del_container(author, date_iso, cidgen.next())
                    for o in old_slice:
                        if o['kind'] in {'text', 'hyperlink'}:
                            r = clone_r_with_text(o['text'], o['rPr'], deleted=True)
                            if o.get('hyperlink') is not None:
                                r = wrap_run_in_hyperlink(r, o['hyperlink'])
                            de.append(r)
                        elif o['kind'] in {'tab', 'br'}:
                            de.append(clone_r_special(o['kind'], o['rPr'], deleted=True))
                        else:
                            de.append(deepcopy(o['run_xml']))
                    out_p.append(de)

                if new_slice:
                    ins = make_ins_container(author, date_iso, cidgen.next())
                    for n in new_slice:
                        if n['kind'] in {'text', 'hyperlink'}:
                            r = clone_r_with_text(n['text'], n['rPr'], deleted=False)
                            if n.get('hyperlink') is not None:
                                r = wrap_run_in_hyperlink(r, n['hyperlink'])
                            ins.append(r)
                        elif n['kind'] in {'tab', 'br'}:
                            ins.append(clone_r_special(n['kind'], n['rPr'], deleted=False))
                        else:
                            ins.append(deepcopy(n['run_xml']))
                    out_p.append(ins)

    return out_p


def build_table_with_diffs(
    old_tbl: etree._Element,
    new_tbl: etree._Element,
    author: str,
    date_iso: str,
    cidgen: ChangeIdGen
) -> etree._Element:
    """Build table with tracked changes by comparing rows and cells.

    This is a simplified table diff that compares row-by-row.
    More sophisticated implementations could handle row insertions/deletions.

    Args:
        old_tbl: Original table
        new_tbl: New table
        author: Change author
        date_iso: ISO timestamp
        cidgen: Change ID generator

    Returns:
        New table element with tracked changes in cells
    """
    # Start with new table structure
    result_tbl = deepcopy(new_tbl)

    # Get all rows
    old_rows = old_tbl.xpath('./w:tr', namespaces=NSMAP)
    new_rows = result_tbl.xpath('./w:tr', namespaces=NSMAP)

    # Simple row-by-row comparison
    for i, new_row in enumerate(new_rows):
        if i < len(old_rows):
            old_row = old_rows[i]
            _diff_table_row(old_row, new_row, author, date_iso, cidgen)
        else:
            # New row added - wrap entire row in insertion
            _mark_row_as_inserted(new_row, author, date_iso, cidgen)

    # Handle deleted rows (append at end)
    if len(old_rows) > len(new_rows):
        for i in range(len(new_rows), len(old_rows)):
            deleted_row = deepcopy(old_rows[i])
            _mark_row_as_deleted(deleted_row, author, date_iso, cidgen)
            result_tbl.append(deleted_row)

    return result_tbl


def _diff_table_row(old_row: etree._Element, new_row: etree._Element,
                     author: str, date_iso: str, cidgen: ChangeIdGen) -> None:
    """Compare and diff cells within a table row (modifies new_row in place).

    Args:
        old_row: Original row
        new_row: New row (will be modified)
        author: Change author
        date_iso: ISO timestamp
        cidgen: Change ID generator
    """
    old_cells = old_row.xpath('./w:tc', namespaces=NSMAP)
    new_cells = new_row.xpath('./w:tc', namespaces=NSMAP)

    for i, new_cell in enumerate(new_cells):
        if i < len(old_cells):
            old_cell = old_cells[i]
            _diff_table_cell(old_cell, new_cell, author, date_iso, cidgen)


def _diff_table_cell(old_cell: etree._Element, new_cell: etree._Element,
                      author: str, date_iso: str, cidgen: ChangeIdGen) -> None:
    """Compare and diff content within a table cell (modifies new_cell in place).

    Recursively processes paragraphs and nested tables within the cell.

    Args:
        old_cell: Original cell
        new_cell: New cell (will be modified)
        author: Change author
        date_iso: ISO timestamp
        cidgen: Change ID generator
    """
    # Get paragraphs and tables from both cells
    old_blocks = [(e, k) for e, k in block_iter(old_cell) if k in {'p', 'tbl'}]
    new_blocks = [(e, k) for e, k in block_iter(new_cell) if k in {'p', 'tbl'}]

    # Build keys for alignment
    old_keys = [_block_text_key(e, k) for e, k in old_blocks]
    new_keys = [_block_text_key(e, k) for e, k in new_blocks]

    # Clear new cell content (except tcPr)
    tcPr = new_cell.find(qn('w:tcPr'))
    for child in list(new_cell):
        if child.tag != qn('w:tcPr'):
            new_cell.remove(child)

    # Rebuild cell with diffs
    sm = SequenceMatcher(a=old_keys, b=new_keys, autojunk=False)

    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        old_slice = old_blocks[i1:i2]
        new_slice = new_blocks[j1:j2]

        if tag == 'equal':
            for (oe, ok), (ne, nk) in zip(old_slice, new_slice):
                if ok == 'p' and nk == 'p':
                    new_cell.append(build_paragraph_with_diffs(oe, ne, author, date_iso, cidgen))
                elif ok == 'tbl' and nk == 'tbl':
                    new_cell.append(build_table_with_diffs(oe, ne, author, date_iso, cidgen))
                else:
                    new_cell.append(deepcopy(ne))

        elif tag == 'delete':
            for oe, ok in old_slice:
                de = make_del_container(author, date_iso, cidgen.next())
                de.append(deepcopy(oe))
                new_cell.append(de)

        elif tag == 'insert':
            for ne, nk in new_slice:
                ins = make_ins_container(author, date_iso, cidgen.next())
                ins.append(deepcopy(ne))
                new_cell.append(ins)

        elif tag == 'replace':
            if (len(old_slice) == 1 and len(new_slice) == 1 and
                old_slice[0][1] == 'p' and new_slice[0][1] == 'p'):
                new_cell.append(build_paragraph_with_diffs(old_slice[0][0], new_slice[0][0], author, date_iso, cidgen))
            else:
                for oe, ok in old_slice:
                    de = make_del_container(author, date_iso, cidgen.next())
                    de.append(deepcopy(oe))
                    new_cell.append(de)
                for ne, nk in new_slice:
                    ins = make_ins_container(author, date_iso, cidgen.next())
                    ins.append(deepcopy(ne))
                    new_cell.append(ins)


def _mark_row_as_inserted(row: etree._Element, author: str, date_iso: str, cidgen: ChangeIdGen) -> None:
    """Mark all content in row as inserted."""
    for cell in row.xpath('./w:tc', namespaces=NSMAP):
        for child in list(cell):
            if child.tag != qn('w:tcPr'):
                cell.remove(child)
                ins = make_ins_container(author, date_iso, cidgen.next())
                ins.append(child)
                cell.append(ins)


def _mark_row_as_deleted(row: etree._Element, author: str, date_iso: str, cidgen: ChangeIdGen) -> None:
    """Mark all content in row as deleted."""
    for cell in row.xpath('./w:tc', namespaces=NSMAP):
        for child in list(cell):
            if child.tag != qn('w:tcPr'):
                cell.remove(child)
                de = make_del_container(author, date_iso, cidgen.next())
                de.append(child)
                cell.append(de)


def _block_text_key(elem: etree._Element, kind: str) -> str:
    """Get text key for block-level alignment."""
    if kind == 'p':
        return tokens_text_key(paragraph_runs_tokens(elem))
    if kind == 'tbl':
        return 'TABLE|' + text_of_element(elem)
    return 'OTHER|' + (text_of_element(elem) or '')


def build_body_with_diffs(
    old_body: etree._Element,
    new_body: etree._Element,
    author: str,
    date_iso: str,
    cidgen: ChangeIdGen
) -> etree._Element:
    """Build body with tracked changes by comparing blocks.

    Args:
        old_body: Original body
        new_body: New body
        author: Change author
        date_iso: ISO timestamp
        cidgen: Change ID generator

    Returns:
        New body element with tracked changes
    """
    old_blocks = [(e, k) for e, k in block_iter(old_body) if k != 'sectPr']
    new_blocks = [(e, k) for e, k in block_iter(new_body) if k != 'sectPr']

    old_keys = [_block_text_key(e, k) for e, k in old_blocks]
    new_keys = [_block_text_key(e, k) for e, k in new_blocks]

    body = etree.Element(qn('w:body'))

    sm = SequenceMatcher(a=old_keys, b=new_keys, autojunk=False)

    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        old_slice = old_blocks[i1:i2]
        new_slice = new_blocks[j1:j2]

        if tag == 'equal':
            for (oe, ok), (ne, nk) in zip(old_slice, new_slice):
                if ok == 'p' and nk == 'p':
                    body.append(build_paragraph_with_diffs(oe, ne, author, date_iso, cidgen))
                elif ok == 'tbl' and nk == 'tbl':
                    body.append(build_table_with_diffs(oe, ne, author, date_iso, cidgen))
                else:
                    body.append(deepcopy(ne))

        elif tag == 'delete':
            for oe, ok in old_slice:
                de = make_del_container(author, date_iso, cidgen.next())
                de.append(deepcopy(oe))
                body.append(de)

        elif tag == 'insert':
            for ne, nk in new_slice:
                ins = make_ins_container(author, date_iso, cidgen.next())
                ins.append(deepcopy(ne))
                body.append(ins)

        elif tag == 'replace':
            if (len(old_slice) == 1 and len(new_slice) == 1 and
                old_slice[0][1] == 'p' and new_slice[0][1] == 'p'):
                body.append(build_paragraph_with_diffs(old_slice[0][0], new_slice[0][0], author, date_iso, cidgen))
            elif (len(old_slice) == 1 and len(new_slice) == 1 and
                  old_slice[0][1] == 'tbl' and new_slice[0][1] == 'tbl'):
                body.append(build_table_with_diffs(old_slice[0][0], new_slice[0][0], author, date_iso, cidgen))
            else:
                for oe, ok in old_slice:
                    de = make_del_container(author, date_iso, cidgen.next())
                    de.append(deepcopy(oe))
                    body.append(de)
                for ne, nk in new_slice:
                    ins = make_ins_container(author, date_iso, cidgen.next())
                    ins.append(deepcopy(ne))
                    body.append(ins)

    # Append section properties from new body
    sect = new_body.find(qn('w:sectPr'))
    if sect is not None:
        body.append(deepcopy(sect))

    return body


def validate_docx_structure(parts: dict[str, bytes], path: str) -> None:
    """Validate that .docx has required structure.

    Args:
        parts: Dictionary of .docx parts
        path: File path (for error messages)

    Raises:
        ValueError: If validation fails
    """
    if 'word/document.xml' not in parts:
        msg = f'{path}: Missing required part "word/document.xml"'
        raise ValueError(msg)

    if '_rels/.rels' not in parts:
        logger.warning(f'{path}: Missing _rels/.rels (may cause issues)')

    if '[Content_Types].xml' not in parts:
        logger.warning(f'{path}: Missing [Content_Types].xml (may cause issues)')

    # Try parsing document.xml
    try:
        doc_tree = parse_xml(parts['word/document.xml'])
        root = doc_tree.getroot()
        if root.tag != qn('w:document'):
            msg = f'{path}: document.xml root is not w:document (got {root.tag})'
            raise ValueError(msg)

        body = root.find(qn('w:body'))
        if body is None:
            msg = f'{path}: document.xml missing w:body'
            raise ValueError(msg)
    except etree.XMLSyntaxError as e:
        msg = f'{path}: Invalid XML in document.xml: {e}'
        raise ValueError(msg) from e


def make_redline_docx(
    old_path: str,
    new_path: str,
    out_path: str,
    author: str = 'AutoDiff',
    date_iso: Optional[str] = None
) -> None:
    """Create redlined .docx by comparing two .docx files.

    Args:
        old_path: Path to old/original .docx
        new_path: Path to new/revised .docx
        out_path: Path for output .docx
        author: Author name for tracked changes
        date_iso: ISO timestamp (uses current time if None)

    Raises:
        FileNotFoundError: If input files don't exist
        ValueError: If .docx structure is invalid
        RuntimeError: If redlining fails
    """
    if date_iso is None:
        date_iso = now_iso()

    logger.info(f'Comparing {old_path} → {new_path}')

    # Load and validate
    try:
        old_parts = read_docx_xml_parts(old_path)
        validate_docx_structure(old_parts, old_path)
    except Exception as e:
        msg = f'Failed to load old document: {e}'
        raise RuntimeError(msg) from e

    try:
        new_parts = read_docx_xml_parts(new_path)
        validate_docx_structure(new_parts, new_path)
    except Exception as e:
        msg = f'Failed to load new document: {e}'
        raise RuntimeError(msg) from e

    # Parse documents
    old_doc = parse_xml(old_parts['word/document.xml']).getroot()
    new_doc = parse_xml(new_parts['word/document.xml']).getroot()

    old_body = old_doc.find(qn('w:body'))
    new_body = new_doc.find(qn('w:body'))

    # Generate change ID
    cidgen = ChangeIdGen()

    # Build redlined body
    logger.info('Building redlined document...')
    try:
        redline_body = build_body_with_diffs(old_body, new_body, author, date_iso, cidgen)
    except Exception as e:
        msg = f'Failed to build redlined content: {e}'
        raise RuntimeError(msg) from e

    # Construct result document
    result_doc = deepcopy(new_doc)
    for child in list(result_doc):
        if child.tag == qn('w:body'):
            result_doc.remove(child)
    result_doc.append(redline_body)

    # Serialize
    result_document_xml = serialize_xml(result_doc)

    # Enable track revisions
    settings_xml = new_parts.get('word/settings.xml')
    new_parts['word/settings.xml'] = ensure_track_revisions(settings_xml)

    # Update document.xml
    new_parts['word/document.xml'] = result_document_xml

    # Write output
    logger.info(f'Writing redlined document to {out_path}')
    write_docx_xml_parts(new_parts, out_path)
    logger.info(f'✓ Redline complete: {out_path}')


# -----------------------------------------------------------------------------
# CLI
# -----------------------------------------------------------------------------
def main(argv=None) -> int:
    """Main entry point.

    Returns:
        Exit code (0 for success, non-zero for errors)
    """
    p = argparse.ArgumentParser(
        description='Generate redlined .docx with Word Track Changes',
        epilog='Enhanced version with table cell redlining and hyperlink preservation'
    )
    p.add_argument('old', help='Old/original .docx file')
    p.add_argument('new', help='New/revised .docx file')
    p.add_argument('out', help='Output redlined .docx file')
    p.add_argument('--author', default='AutoDiff', help='Author name for tracked changes')
    p.add_argument('--date', default=None, help='ISO timestamp for changes (default: now)')
    p.add_argument('--verbose', '-v', action='store_true', help='Enable verbose logging')
    p.add_argument('--quiet', '-q', action='store_true', help='Suppress all output except errors')

    args = p.parse_args(argv)

    # Configure logging
    if args.quiet:
        logger.setLevel(logging.ERROR)
    elif args.verbose:
        logger.setLevel(logging.DEBUG)
    else:
        logger.setLevel(logging.INFO)

    try:
        make_redline_docx(args.old, args.new, args.out, author=args.author, date_iso=args.date)
        return 0
    except FileNotFoundError as e:
        logger.error(f'File not found: {e}')
        return 1
    except ValueError as e:
        logger.error(f'Invalid document: {e}')
        return 2
    except RuntimeError as e:
        logger.error(f'Redlining failed: {e}')
        return 3
    except Exception as e:
        logger.error(f'Unexpected error: {e}', exc_info=args.verbose)
        return 99


if __name__ == '__main__':
    sys.exit(main())
