"""
Create a tracked-changes (redline) .docx by comparing two .docx files.
- Produces Word Track Changes: <w:ins>, <w:del>, and <w:rPrChange>.
- Preserves styles (paragraph/run properties).
- Char-level inserts/deletes inside single-run replacements.
- Enables <w:trackRevisions/> in settings.

Usage:
    python redline_docx.py old.docx new.docx redlined.docx --author "Acme LLP" --date "2025-10-10T10:15:00Z"

Author: (you can set this to your org)
"""
from __future__ import annotations

import argparse
import datetime as dt
import re
import sys
import uuid
import zipfile
from copy import deepcopy
from itertools import starmap
from lxml import etree

from diff_match_patch import diff_match_patch


# Optional utility import
try:
    from xmldiff.utils import longest_common_subsequence as xmldiff_lcs
except Exception:
    xmldiff_lcs = None  # Fallback; we don't strictly require it

# Namespaces
NS_W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
NS_XML = 'http://www.w3.org/XML/1998/namespace'
NSMAP = {'w': NS_W, 'r': NS_R, 'xml': NS_XML}


def qn(tag: str) -> str:
    """Expand a QName like 'w:p' to '{ns}p'."""
    prefix, local = tag.split(':')
    return f'{{{NSMAP[prefix]}}}{local}'


def now_iso() -> str:
    return dt.datetime.now(dt.UTC).replace(microsecond=0, tzinfo=dt.timezone.utc).isoformat().replace('+00:00', 'Z')


# -----------------------------------------------------------------------------
# .docx packaging helpers
# -----------------------------------------------------------------------------
def read_docx_xml_parts(path: str) -> dict[str, bytes]:
    """Return all zip entries as a dict of name -> bytes."""
    with zipfile.ZipFile(path, 'r') as zf:
        return {name: zf.read(name) for name in zf.namelist()}


def write_docx_xml_parts(parts: dict[str, bytes], out_path: str) -> None:
    """Write a .docx ZIP from a dict of name -> bytes."""
    with zipfile.ZipFile(out_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for name, data in parts.items():
            zf.writestr(name, data)


def parse_xml(data: bytes, remove_blank_text=True) -> etree._ElementTree:
    parser = etree.XMLParser(remove_blank_text=remove_blank_text)
    return etree.fromstring(data, parser=parser).getroottree()


# XML declaration regex for enforcing standalone="yes"
_XML_DECL_RE = re.compile(rb'^\s*<\?xml[^>]*\?>', re.I)

# Parts that require standalone="yes" in XML declaration
_WORD_PARTS_REQUIRE_STANDALONE = {
    'word/document.xml',
    'word/settings.xml',
}


def enforce_standalone_on_xml_header(part_path: str, xml_bytes: bytes) -> bytes:
    """
    Ensures the XML prolog on selected Word parts is:
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    If a prolog is present, it is replaced; otherwise it is prepended.
    """
    norm = part_path.replace('\\', '/')
    if norm not in _WORD_PARTS_REQUIRE_STANDALONE:
        return xml_bytes

    header = b'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    payload = xml_bytes.lstrip()

    if payload.startswith(b'<?xml'):
        payload = _XML_DECL_RE.sub(header, payload, count=1)
    else:
        payload = header + b'\n' + payload

    return payload


def serialize_xml(elem_or_tree: etree._Element | etree._ElementTree, part_path: str = '') -> bytes:
    """Serialize XML element to bytes with proper XML declaration.
    For Word document.xml and settings.xml, enforces standalone="yes".
    """
    root = elem_or_tree.getroot() if isinstance(elem_or_tree, etree._ElementTree) else elem_or_tree
    xml_bytes = etree.tostring(root, encoding='UTF-8', xml_declaration=True, standalone=False)

    # Apply standalone enforcement if needed
    if part_path:
        xml_bytes = enforce_standalone_on_xml_header(part_path, xml_bytes)

    return xml_bytes


# -----------------------------------------------------------------------------
# Word-specific helpers
# -----------------------------------------------------------------------------
def ensure_track_revisions(settings_xml: bytes | None) -> bytes:
    """Add <w:trackRevisions/> to word/settings.xml, preserving other settings.
    If settings are absent, create a minimal settings part.
    """
    if not settings_xml:
        root = etree.Element(qn('w:settings'), nsmap={'w': NS_W})
        root.append(etree.Element(qn('w:trackRevisions')))
        return serialize_xml(root, 'word/settings.xml')

    tree = parse_xml(settings_xml)
    root = tree.getroot()

    if root.tag != qn('w:settings'):
        # Unexpected; fall back to creating a minimal settings
        root = etree.Element(qn('w:settings'), nsmap={'w': NS_W})
        root.append(etree.Element(qn('w:trackRevisions')))
        return serialize_xml(root, 'word/settings.xml')

    # Add trackRevisions if missing
    if not root.xpath('w:trackRevisions', namespaces=NSMAP):
        root.append(etree.Element(qn('w:trackRevisions')))

    return serialize_xml(root, 'word/settings.xml')


def text_of_element(elem: etree._Element) -> str:
    """Concatenate all w:t texts under elem."""
    texts = [t.text or '' for t in elem.xpath('.//w:t', namespaces=NSMAP)]
    return ''.join(texts)


def block_iter(body: etree._Element):
    """Iterate block-level content under w:body (paragraphs and tables),
    returning (element, kind) where kind in {'p','tbl','sectPr'}.
    """
    for child in body:
        if child.tag == qn('w:p'):
            yield child, 'p'
        elif child.tag == qn('w:tbl'):
            yield child, 'tbl'
        elif child.tag == qn('w:sectPr'):
            yield child, 'sectPr'
        else:
            # Unknown block-level; treat as raw
            yield child, 'other'


def paragraph_runs_tokens(p: etree._Element):
    """Convert a paragraph (<w:p>) into a list of tokens at run granularity.
    A token is dict with:
        kind: 'text' | 'tab' | 'br' | 'other'
        text: (for kind='text')
        rPr: the <w:rPr> element (deepcopy) or None
        run_xml: original run (for cloning non-text children if needed).
    """
    tokens = []
    for r in p.xpath('./w:r', namespaces=NSMAP):
        rPr = r.find(qn('w:rPr'))
        rPr_copy = deepcopy(rPr) if rPr is not None else None

        # Emit <w:t> segments as 'text' tokens
        t_nodes = r.findall(qn('w:t'))
        if t_nodes:
            full_text = ''.join([t.text or '' for t in t_nodes])
            tokens.append({'kind': 'text', 'text': full_text, 'rPr': rPr_copy, 'run_xml': r})
            continue

        # Tabs/br handled explicitly
        if r.find(qn('w:tab')) is not None:
            tokens.append({'kind': 'tab', 'text': '\t', 'rPr': rPr_copy, 'run_xml': r})
            continue

        if r.find(qn('w:br')) is not None:
            tokens.append({'kind': 'br', 'text': '\n', 'rPr': rPr_copy, 'run_xml': r})
            continue

        # Catch-all for other run content (drawing, fldChar, etc.)
        tokens.append({'kind': 'other', 'text': '', 'rPr': rPr_copy, 'run_xml': r})

    return tokens


def tokens_text_key(tokens) -> str:
    """Build a normalized text key for paragraph alignment (ignores style),
    mapping tabs/br to visible markers to stabilize matching.
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
            # use a placeholder for non-textual run
            parts.append('\ufffc')  # object replacement char
    return ''.join(parts)


def clone_r_with_text(text: str, rPr: etree._Element | None, *, deleted=False) -> etree._Element:
    """Create a <w:r> containing either <w:t> (insert/normal) or <w:delText> (deleted),
    preserving spacing and run properties.
    """
    r = etree.Element(qn('w:r'))
    if rPr is not None:
        r.append(deepcopy(rPr))

    t = etree.Element(qn('w:delText')) if deleted else etree.Element(qn('w:t'))

    # Preserve leading/trailing spaces
    if text and (text[:1].isspace() or text[-1:].isspace()):
        t.set(f'{{{NS_XML}}}space', 'preserve')

    t.text = text
    r.append(t)
    return r


def clone_r_special(kind: str, rPr: etree._Element | None, *, deleted=False) -> etree._Element:
    """Create a <w:r> that contains <w:tab/> or <w:br/> (same for delete/insert wrappers)."""
    r = etree.Element(qn('w:r'))
    if rPr is not None:
        r.append(deepcopy(rPr))

    if kind == 'tab':
        r.append(etree.Element(qn('w:tab')))
    elif kind == 'br':
        r.append(etree.Element(qn('w:br')))
    else:
        # As a fallback, create an empty run (rare)
        pass

    return r


class ChangeIdGen:
    def __init__(self, start: int | None = None) -> None:
        if start is None:
            # Use a bounded int derived from uuid to avoid collisions across docs
            start = int(uuid.uuid4().int & 0x7FFFFFFF)
        self.cur = start

    def next(self) -> int:
        self.cur += 1
        return self.cur


def make_ins_container(author: str, date_iso: str, cid: int) -> etree._Element:
    ins = etree.Element(qn('w:ins'))
    ins.set(qn('w:id'), str(cid))
    ins.set(qn('w:author'), author)
    ins.set(qn('w:date'), date_iso)
    return ins


def make_del_container(author: str, date_iso: str, cid: int) -> etree._Element:
    de = etree.Element(qn('w:del'))
    de.set(qn('w:id'), str(cid))
    de.set(qn('w:author'), author)
    de.set(qn('w:date'), date_iso)
    return de


def add_rPrChange(new_r: etree._Element, old_rPr: etree._Element | None, author: str, date_iso: str, cid: int) -> None:
    """Mark a run's formatting change: the run retains its *new* <w:rPr>,
    and we append <w:rPrChange> showing the previous properties.
    """
    if old_rPr is None:
        # No prior formatting to record; nothing to do
        return

    # Ensure <w:rPr> exists on new run
    rPr = new_r.find(qn('w:rPr'))
    if rPr is None:
        rPr = etree.Element(qn('w:rPr'))
        new_r.insert(0, rPr)

    rPrChange = etree.Element(qn('w:rPrChange'))
    rPrChange.set(qn('w:id'), str(cid))
    rPrChange.set(qn('w:author'), author)
    rPrChange.set(qn('w:date'), date_iso)

    # Spec stores the "prior" property set inside rPrChange/rPr
    prior = deepcopy(old_rPr)
    prior.tag = qn('w:rPr')  # ensure correct tag
    rPrChange.append(prior)

    rPr.append(rPrChange)


def equal_runs_style(a_rPr: etree._Element | None, b_rPr: etree._Element | None) -> bool:
    """Compare run properties by canonical XML string."""
    def as_c14n(e):
        if e is None:
            return b''
        # Serialize children too:
        return etree.tostring(e, method='c14n')

    return as_c14n(a_rPr) == as_c14n(b_rPr)


def diff_run_text_charlevel(
    old_text: str,
    new_text: str,
    new_rPr: etree._Element | None,
    old_rPr: etree._Element | None,
    author: str,
    date_iso: str,
    cidgen: ChangeIdGen,
):
    """Yield a sequence of elements (plain <w:r>, <w:ins>, <w:del>) representing
    char-level changes within a single-run replacement.
    Uses diff_match_patch with semantic cleanup for better quality diffs.
    """
    out = []

    # Use diff_match_patch for superior text diffing
    dmp = diff_match_patch()
    dmp.Diff_Timeout = 200.0  # Timeout protection for large texts

    diffs = dmp.diff_main(old_text, new_text)

    # Apply cleanup algorithms for better diff quality
    dmp.diff_cleanupSemantic(diffs)
    dmp.diff_cleanupEfficiency(diffs)

    # Process diff_match_patch results
    for op, text in diffs:
        if op == diff_match_patch.DIFF_EQUAL:
            # Equal text - use new formatting
            if text:
                out.append(clone_r_with_text(text, new_rPr, deleted=False))

        elif op == diff_match_patch.DIFF_DELETE:
            # Deleted text - mark with old formatting
            if text:
                cid = cidgen.next()
                de = make_del_container(author, date_iso, cid)
                de.append(clone_r_with_text(text, old_rPr, deleted=True))
                out.append(de)

        elif op == diff_match_patch.DIFF_INSERT:
            # Inserted text - mark with new formatting
            if text:
                cid = cidgen.next()
                ins = make_ins_container(author, date_iso, cid)
                ins.append(clone_r_with_text(text, new_rPr, deleted=False))
                out.append(ins)

    return out


def dmp_to_opcodes(diffs):
    """Convert diff_match_patch diffs to SequenceMatcher-like opcodes.

    Args:
        diffs: List of (operation, text) tuples from diff_match_patch

    Returns:
        List of (tag, i1, i2, j1, j2) tuples compatible with SequenceMatcher opcodes
    """
    opcodes = []
    i1 = i2 = j1 = j2 = 0

    for op, text in diffs:
        text_len = len(text)

        if op == diff_match_patch.DIFF_EQUAL:
            tag = 'equal'
            i2 = i1 + text_len
            j2 = j1 + text_len
        elif op == diff_match_patch.DIFF_DELETE:
            tag = 'delete'
            i2 = i1 + text_len
            j2 = j1
        elif op == diff_match_patch.DIFF_INSERT:
            tag = 'insert'
            i2 = i1
            j2 = j1 + text_len

        if text_len > 0:
            opcodes.append((tag, i1, i2, j1, j2))

        i1 = i2
        j1 = j2

    # Merge consecutive operations into 'replace' where applicable
    merged_opcodes = []
    i = 0
    while i < len(opcodes):
        if i < len(opcodes) - 1:
            curr_tag, curr_i1, curr_i2, curr_j1, curr_j2 = opcodes[i]
            next_tag, next_i1, next_i2, next_j1, next_j2 = opcodes[i + 1]

            # Merge delete+insert into replace
            if curr_tag == 'delete' and next_tag == 'insert':
                merged_opcodes.append(('replace', curr_i1, curr_i2, next_j1, next_j2))
                i += 2
                continue
            elif curr_tag == 'insert' and next_tag == 'delete':
                merged_opcodes.append(('replace', next_i1, next_i2, curr_j1, curr_j2))
                i += 2
                continue

        merged_opcodes.append(opcodes[i])
        i += 1

    return merged_opcodes


def diff_sequences_dmp(old_seq, new_seq):
    """Diff two sequences using diff_match_patch.

    Args:
        old_seq: List of items (will be converted to string for diffing)
        new_seq: List of items (will be converted to string for diffing)

    Returns:
        List of (tag, i1, i2, j1, j2) tuples compatible with SequenceMatcher opcodes
    """
    # Create unique placeholders for each unique item
    item_to_char = {}
    char_to_item = {}
    next_char = ord('\x00')

    def get_char(item):
        nonlocal next_char
        key = str(item)
        if key not in item_to_char:
            char = chr(next_char)
            item_to_char[key] = char
            char_to_item[char] = item
            next_char += 1
        return item_to_char[key]

    # Convert sequences to strings
    old_str = ''.join(get_char(item) for item in old_seq)
    new_str = ''.join(get_char(item) for item in new_seq)

    # Perform diff
    dmp = diff_match_patch()
    dmp.Diff_Timeout = 2.0
    diffs = dmp.diff_main(old_str, new_str)
    dmp.diff_cleanupSemantic(diffs)
    dmp.diff_cleanupEfficiency(diffs)

    # Convert back to opcodes
    return dmp_to_opcodes(diffs)


def build_paragraph_with_diffs(
    old_p: etree._Element, new_p: etree._Element, author: str, date_iso: str, cidgen: ChangeIdGen
) -> etree._Element:
    """Construct a new <w:p> representing the paragraph with tracked changes
    from old_p -> new_p, preserving styles.
    Uses diff_match_patch for superior token-level diffing.
    """
    # Start from new paragraph's structure (to preserve pPr, numbering, etc.)
    out_p = etree.Element(qn('w:p'))

    # Copy paragraph properties from new paragraph
    new_pPr = new_p.find(qn('w:pPr'))
    if new_pPr is not None:
        out_p.append(deepcopy(new_pPr))

    old_tokens = paragraph_runs_tokens(old_p)
    new_tokens = paragraph_runs_tokens(new_p)

    # For alignment we diff on token level (by kind+text only); styles handled post-hoc
    def token_key(tok):
        return (tok['kind'], tok['text'])

    old_keys = [token_key(t) for t in old_tokens]
    new_keys = [token_key(t) for t in new_tokens]

    # Use diff_match_patch for token-level diffing
    opcodes = diff_sequences_dmp(old_keys, new_keys)

    for tag, i1, i2, j1, j2 in opcodes:
        old_slice = old_tokens[i1:i2]
        new_slice = new_tokens[j1:j2]

        if tag == 'equal':
            # Equal by kind+text → may still have formatting changes
            for k in range(len(old_slice)):
                o = old_slice[k]
                n = new_slice[k]

                if o['kind'] in {'tab', 'br'}:
                    r = clone_r_special(o['kind'], n['rPr'])
                    # If formatting changed on a non-text run, mark rPrChange
                    if not equal_runs_style(o['rPr'], n['rPr']):
                        add_rPrChange(r, o['rPr'], author, date_iso, cidgen.next())
                    out_p.append(r)

                elif o['kind'] == 'text':
                    # copy new run with its text; add rPrChange if formatting changed
                    r = clone_r_with_text(n['text'], n['rPr'], deleted=False)
                    if not equal_runs_style(o['rPr'], n['rPr']):
                        add_rPrChange(r, o['rPr'], author, date_iso, cidgen.next())
                    out_p.append(r)

                else:
                    # 'other' run content: copy new run wholesale
                    out_p.append(deepcopy(n['run_xml']))

        elif tag == 'delete':
            # Emit deleted content (group as one <w:del> for contiguous slice)
            if not old_slice:
                continue

            cid = cidgen.next()
            de = make_del_container(author, date_iso, cid)

            for o in old_slice:
                if o['kind'] == 'text':
                    de.append(clone_r_with_text(o['text'], o['rPr'], deleted=True))
                elif o['kind'] in {'tab', 'br'}:
                    de.append(clone_r_special(o['kind'], o['rPr'], deleted=True))
                else:
                    # Non-text run being deleted -> put the run inside a deleted wrapper
                    # (a run with the same content; Word will show deletion bracket)
                    de.append(deepcopy(o['run_xml']))

            out_p.append(de)

        elif tag == 'insert':
            if not new_slice:
                continue

            cid = cidgen.next()
            ins = make_ins_container(author, date_iso, cid)

            for n in new_slice:
                if n['kind'] == 'text':
                    ins.append(clone_r_with_text(n['text'], n['rPr'], deleted=False))
                elif n['kind'] in {'tab', 'br'}:
                    ins.append(clone_r_special(n['kind'], n['rPr'], deleted=False))
                else:
                    ins.append(deepcopy(n['run_xml']))

            out_p.append(ins)

        elif tag == 'replace':
            # Try char-level diff if it's a single text run on both sides.
            if (
                len(old_slice) == 1
                and len(new_slice) == 1
                and old_slice[0]['kind'] == 'text'
                and new_slice[0]['kind'] == 'text'
            ):
                pieces = diff_run_text_charlevel(
                    old_slice[0]['text'],
                    new_slice[0]['text'],
                    new_slice[0]['rPr'],
                    old_slice[0]['rPr'],
                    author,
                    date_iso,
                    cidgen,
                )
                for node in pieces:
                    out_p.append(node)

                # If formatting changed but text equal (rare here), also mark rPrChange:
                if old_slice[0]['text'] == new_slice[0]['text'] and not equal_runs_style(
                    old_slice[0]['rPr'], new_slice[0]['rPr']
                ):
                    # Append a copy of the new text run and mark rPrChange
                    r = clone_r_with_text(new_slice[0]['text'], new_slice[0]['rPr'], deleted=False)
                    add_rPrChange(r, old_slice[0]['rPr'], author, date_iso, cidgen.next())
                    out_p.append(r)

            else:
                # General-case replacement: delete old slice, then insert new slice
                if old_slice:
                    cid = cidgen.next()
                    de = make_del_container(author, date_iso, cid)

                    for o in old_slice:
                        if o['kind'] == 'text':
                            de.append(clone_r_with_text(o['text'], o['rPr'], deleted=True))
                        elif o['kind'] in {'tab', 'br'}:
                            de.append(clone_r_special(o['kind'], o['rPr'], deleted=True))
                        else:
                            de.append(deepcopy(o['run_xml']))

                    out_p.append(de)

                if new_slice:
                    cid = cidgen.next()
                    ins = make_ins_container(author, date_iso, cid)

                    for n in new_slice:
                        if n['kind'] == 'text':
                            ins.append(clone_r_with_text(n['text'], n['rPr'], deleted=False))
                        elif n['kind'] in {'tab', 'br'}:
                            ins.append(clone_r_special(n['kind'], n['rPr'], deleted=False))
                        else:
                            ins.append(deepcopy(n['run_xml']))

                    out_p.append(ins)

    return out_p


def blocks_text_key(elem: etree._Element, kind: str) -> str:
    """Return a normalized text key to align blocks across documents."""
    if kind == 'p':
        return tokens_text_key(paragraph_runs_tokens(elem))
    if kind == 'tbl':
        # Use all text in table for alignment; if too coarse, it degrades to replace
        return 'TABLE|' + text_of_element(elem)
    return 'OTHER|' + (text_of_element(elem) or '')


def build_body_with_diffs(
    old_body: etree._Element, new_body: etree._Element, author: str, date_iso: str, cidgen: ChangeIdGen
) -> etree._Element:
    """Create a new <w:body> by aligning block-level content (paragraphs/tables)
    and emitting inserts/deletes and intra-paragraph diffs.
    Uses diff_match_patch for superior block-level alignment.
    """
    # Collect blocks, keeping any trailing sectPr from the new doc (section props)
    old_blocks = [(e, k) for e, k in block_iter(old_body) if k != 'sectPr']
    new_blocks = [(e, k) for e, k in block_iter(new_body) if k != 'sectPr']

    old_keys = list(starmap(blocks_text_key, old_blocks))
    new_keys = list(starmap(blocks_text_key, new_blocks))

    body = etree.Element(qn('w:body'))

    # Use diff_match_patch for block-level diffing
    opcodes = diff_sequences_dmp(old_keys, new_keys)

    for tag, i1, i2, j1, j2 in opcodes:
        old_slice = old_blocks[i1:i2]
        new_slice = new_blocks[j1:j2]

        if tag == 'equal':
            # Blocks exist in both – but if paragraph text is equal, we still check
            # for formatting-only changes and record them via rPrChange.
            for (oe, ok), (ne, nk) in zip(old_slice, new_slice):
                if ok == 'p' and nk == 'p':
                    body.append(build_paragraph_with_diffs(oe, ne, author, date_iso, cidgen))
                else:
                    # Copy new block (tables/others)
                    body.append(deepcopy(ne))

        elif tag == 'delete':
            # Entire blocks removed => emit <w:del> wrappers (block-level)
            for oe, ok in old_slice:
                cid = cidgen.next()
                de = make_del_container(author, date_iso, cid)
                # Insert the whole block inside the deletion (paragraph/table)
                de.append(deepcopy(oe))
                body.append(de)

        elif tag == 'insert':
            for ne, nk in new_slice:
                cid = cidgen.next()
                ins = make_ins_container(author, date_iso, cid)
                ins.append(deepcopy(ne))
                body.append(ins)

        elif tag == 'replace':
            # If it's a 1:1 paragraph replace, try intra-paragraph diff; else delete+insert groups.
            if len(old_slice) == 1 and len(new_slice) == 1 and old_slice[0][1] == 'p' and new_slice[0][1] == 'p':
                body.append(build_paragraph_with_diffs(old_slice[0][0], new_slice[0][0], author, date_iso, cidgen))
            else:
                for oe, ok in old_slice:
                    cid = cidgen.next()
                    de = make_del_container(author, date_iso, cid)
                    de.append(deepcopy(oe))
                    body.append(de)

                for ne, nk in new_slice:
                    cid = cidgen.next()
                    ins = make_ins_container(author, date_iso, cid)
                    ins.append(deepcopy(ne))
                    body.append(ins)

    # Append sectPr from the *new* body if present (ensures section settings)
    sect = new_body.find(qn('w:sectPr'))
    if sect is not None:
        body.append(deepcopy(sect))

    return body


def make_redline_docx(
    old_path: str, new_path: str, out_path: str, author: str = 'AutoDiff', date_iso: str | None = None
) -> None:
    """Compare old_path vs. new_path and write a redlined .docx to out_path."""
    if date_iso is None:
        date_iso = now_iso()

    cidgen = ChangeIdGen()

    # Load packages
    old_parts = read_docx_xml_parts(old_path)
    new_parts = read_docx_xml_parts(new_path)

    # Parse document.xml for both
    try:
        old_doc_tree = parse_xml(old_parts['word/document.xml'])
    except KeyError:
        msg = 'Missing word/document.xml in old docx'
        raise RuntimeError(msg)

    try:
        new_doc_tree = parse_xml(new_parts['word/document.xml'])
    except KeyError:
        msg = 'Missing word/document.xml in new docx'
        raise RuntimeError(msg)

    old_doc = old_doc_tree.getroot()
    new_doc = new_doc_tree.getroot()

    if old_doc.tag != qn('w:document') or new_doc.tag != qn('w:document'):
        msg = 'document.xml root is not w:document'
        raise RuntimeError(msg)

    old_body = old_doc.find(qn('w:body'))
    new_body = new_doc.find(qn('w:body'))

    if old_body is None or new_body is None:
        msg = 'document.xml missing w:body'
        raise RuntimeError(msg)

    # Build the redlined body
    redline_body = build_body_with_diffs(old_body, new_body, author, date_iso, cidgen)

    # Construct the result document from the *new* document root (preserve settings like w:compat)
    result_doc = deepcopy(new_doc)

    # Replace body
    for child in list(result_doc):
        if child.tag == qn('w:body'):
            result_doc.remove(child)

    result_doc.append(redline_body)

    # Serialize back with proper XML declaration for document.xml
    result_document_xml = serialize_xml(result_doc, 'word/document.xml')

    # Ensure settings enable track revisions (also enforces proper XML declaration)
    settings_xml = new_parts.get('word/settings.xml', None)
    new_parts['word/settings.xml'] = ensure_track_revisions(settings_xml)

    # Replace document.xml
    new_parts['word/document.xml'] = result_document_xml

    # (Optional TODO) Extend to headers/footers/footnotes similarly:
    #   for each part in ["word/header1.xml", "word/footer1.xml", "word/footnotes.xml", ...]
    #   align and build diffs the same way as for document.xml

    # Write resulting package
    write_docx_xml_parts(new_parts, out_path)


# -----------------------------------------------------------------------------
# CLI
# -----------------------------------------------------------------------------
def main(argv=None) -> None:
    p = argparse.ArgumentParser(description='Generate a redlined .docx (Track Changes) by comparing two .docx files.')
    p.add_argument('old', help='Old/original .docx')
    p.add_argument('new', help='New/revised .docx')
    p.add_argument('out', help='Output redlined .docx')
    p.add_argument('--author', default='AutoDiff', help='Author name for the tracked changes')
    p.add_argument('--date', default=None, help='ISO timestamp for changes (default: now, UTC)')

    args = p.parse_args(argv)
    make_redline_docx(args.old, args.new, args.out, author=args.author, date_iso=args.date)


if __name__ == '__main__':
    sys.exit(main())
