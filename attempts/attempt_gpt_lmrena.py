"""
Create a tracked-changes (redline) .docx by comparing two .docx files.
- Produces Word Track Changes: <w:ins>, <w:del>, and <w:rPrChange>, and <w:pPrChange>.
- Preserves styles (paragraph/run properties) and paragraph-level identifiers.
- Char-level inserts/deletes inside single-run replacements.
- Enables <w:trackRevisions/> in settings.
- Accepts existing tracked changes in inputs before diffing (prevents phantom/user misattribution).
- Updates core properties (revision, modified, lastModifiedBy).

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
    xmldiff_lcs = None  # Fallback

# Namespaces (UPDATED)
NS_W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
NS_XML = 'http://www.w3.org/XML/1998/namespace'
NS_W14 = 'http://schemas.microsoft.com/office/word/2010/wordml'
NS_W15 = 'http://schemas.microsoft.com/office/word/2012/wordml'
NS_W16 = 'http://schemas.microsoft.com/office/word/2016/wordml'
NS_W16DU = 'http://schemas.microsoft.com/office/word/2023/wordml/word16du'
NS_MC = 'http://schemas.openxmlformats.org/markup-compatibility/2006'

NSMAP = {
    'w': NS_W,
    'r': NS_R,
    'xml': NS_XML,
    'w14': NS_W14,
    'w15': NS_W15,
    'w16': NS_W16,
    'w16du': NS_W16DU,
    'mc': NS_MC,
}

# Core properties namespaces (NEW)
NS_CORE = {
    'cp': 'http://schemas.openxmlformats.org/package/2006/metadata/core-properties',
    'dc': 'http://purl.org/dc/elements/1.1/',
    'dcterms': 'http://purl.org/dc/terms/',
    'dcmitype': 'http://purl.org/dc/dcmitype/',
    'xsi': 'http://www.w3.org/2001/XMLSchema-instance',
}

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
    with zipfile.ZipFile(path, 'r') as zf:
        return {name: zf.read(name) for name in zf.namelist()}

def write_docx_xml_parts(parts: dict[str, bytes], out_path: str) -> None:
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
    root = elem_or_tree.getroot() if isinstance(elem_or_tree, etree._ElementTree) else elem_or_tree
    xml_bytes = etree.tostring(root, encoding='UTF-8', xml_declaration=True, standalone=False)
    if part_path:
        xml_bytes = enforce_standalone_on_xml_header(part_path, xml_bytes)
    return xml_bytes

# -----------------------------------------------------------------------------
# Accept existing tracked revisions (NEW)
# -----------------------------------------------------------------------------
_CHANGE_CONTAINERS_UNWRAP = {qn('w:ins'), qn('w:moveTo')}
_CHANGE_CONTAINERS_DROP = {qn('w:del'), qn('w:moveFrom')}
_PR_CHANGE_TAGS = {
    qn('w:rPrChange'),
    qn('w:pPrChange'),
    qn('w:tblPrChange'),
    qn('w:tcPrChange'),
    qn('w:trPrChange'),
    qn('w:sectPrChange'),
}

def accept_revisions_in_element(elem: etree._Element) -> None:
    """Mutate element tree in-place to accept existing tracked changes.
    - Unwrap w:ins/w:moveTo (keep contents).
    - Drop w:del/w:moveFrom entirely.
    - Remove any *PrChange nodes (rPrChange, pPrChange, etc.).
    """
    # Work on a snapshot of children since we'll modify the tree
    for child in list(elem):
        tag = child.tag

        # First, recursively accept inside children we keep
        if tag not in _CHANGE_CONTAINERS_DROP:
            accept_revisions_in_element(child)

        # Then handle change containers
        if tag in _CHANGE_CONTAINERS_UNWRAP:
            # Splice children of change container into parent at same position
            idx = elem.index(child)
            for gc in list(child):
                elem.insert(idx, gc)
                idx += 1
            elem.remove(child)

        elif tag in _CHANGE_CONTAINERS_DROP:
            # Remove deletions (and moveFrom) entirely
            elem.remove(child)

        else:
            # Remove any immediate *PrChange children
            for c2 in list(child):
                if c2.tag in _PR_CHANGE_TAGS:
                    child.remove(c2)

    # Also remove any direct *PrChange under elem (rare)
    for c in list(elem):
        if c.tag in _PR_CHANGE_TAGS:
            elem.remove(c)

def accept_revisions_in_document_tree(doc_root: etree._Element) -> None:
    """Accept changes in w:document/w:body."""
    if doc_root.tag != qn('w:document'):
        return
    body = doc_root.find(qn('w:body'))
    if body is not None:
        accept_revisions_in_element(body)

# -----------------------------------------------------------------------------
# Word-specific helpers
# -----------------------------------------------------------------------------
def ensure_track_revisions(settings_xml: bytes | None) -> bytes:
    """Add <w:trackRevisions/> to word/settings.xml, preserving other settings."""
    if not settings_xml:
        root = etree.Element(qn('w:settings'), nsmap={'w': NS_W})
        root.append(etree.Element(qn('w:trackRevisions')))
        return serialize_xml(root, 'word/settings.xml')

    tree = parse_xml(settings_xml)
    root = tree.getroot()
    if root.tag != qn('w:settings'):
        root = etree.Element(qn('w:settings'), nsmap={'w': NS_W})
        root.append(etree.Element(qn('w:trackRevisions')))
        return serialize_xml(root, 'word/settings.xml')

    if not root.xpath('w:trackRevisions', namespaces=NSMAP):
        root.append(etree.Element(qn('w:trackRevisions')))
    return serialize_xml(root, 'word/settings.xml')

def update_core_properties(parts: dict[str, bytes], author: str, date_iso: str, revision: str = '1') -> None:
    """Update docProps/core.xml: cp:revision, dcterms:modified, cp:lastModifiedBy."""
    path = 'docProps/core.xml'
    if path not in parts:
        return
    tree = parse_xml(parts[path])
    root = tree.getroot()

    # cp:revision
    rev = root.find('cp:revision', namespaces=NS_CORE)
    if rev is None:
        rev = etree.SubElement(root, f"{{{NS_CORE['cp']}}}revision")
    rev.text = revision

    # dcterms:modified
    mod = root.find('dcterms:modified', namespaces=NS_CORE)
    if mod is None:
        mod = etree.SubElement(root, f"{{{NS_CORE['dcterms']}}}modified")
        mod.set(f"{{{NS_CORE['xsi']}}}type", 'dcterms:W3CDTF')
    mod.text = date_iso

    # cp:lastModifiedBy
    lmb = root.find('cp:lastModifiedBy', namespaces=NS_CORE)
    if lmb is None:
        lmb = etree.SubElement(root, f"{{{NS_CORE['cp']}}}lastModifiedBy")
    lmb.text = author

    parts[path] = etree.tostring(root, encoding='UTF-8', xml_declaration=True)

def text_of_element(elem: etree._Element) -> str:
    texts = [t.text or '' for t in elem.xpath('.//w:t', namespaces=NSMAP)]
    return ''.join(texts)

def block_iter(body: etree._Element):
    """Iterate block-level content under w:body."""
    for child in body:
        if child.tag == qn('w:p'):
            yield child, 'p'
        elif child.tag == qn('w:tbl'):
            yield child, 'tbl'
        elif child.tag == qn('w:sectPr'):
            yield child, 'sectPr'
        else:
            yield child, 'other'

def paragraph_runs_tokens(p: etree._Element):
    """Convert <w:p> into run-level tokens."""
    tokens = []
    for r in p.xpath('./w:r', namespaces=NSMAP):
        rPr = r.find(qn('w:rPr'))
        rPr_copy = deepcopy(rPr) if rPr is not None else None

        t_nodes = r.findall(qn('w:t'))
        if t_nodes:
            full_text = ''.join([t.text or '' for t in t_nodes])
            tokens.append({'kind': 'text', 'text': full_text, 'rPr': rPr_copy, 'run_xml': r})
            continue

        if r.find(qn('w:tab')) is not None:
            tokens.append({'kind': 'tab', 'text': '\t', 'rPr': rPr_copy, 'run_xml': r})
            continue

        if r.find(qn('w:br')) is not None:
            tokens.append({'kind': 'br', 'text': '\n', 'rPr': rPr_copy, 'run_xml': r})
            continue

        tokens.append({'kind': 'other', 'text': '', 'rPr': rPr_copy, 'run_xml': r})
    return tokens

def tokens_text_key(tokens) -> str:
    parts = []
    for tok in tokens:
        if tok['kind'] == 'text':
            parts.append(tok['text'])
        elif tok['kind'] == 'tab':
            parts.append('\t')
        elif tok['kind'] == 'br':
            parts.append('\n')
        else:
            parts.append('\ufffc')
    return ''.join(parts)

def clone_r_with_text(text: str, rPr: etree._Element | None, *, deleted=False) -> etree._Element:
    r = etree.Element(qn('w:r'))
    if rPr is not None:
        r.append(deepcopy(rPr))
    t = etree.Element(qn('w:delText')) if deleted else etree.Element(qn('w:t'))
    if text and (text[:1].isspace() or text[-1:].isspace()):
        t.set(f'{{{NS_XML}}}space', 'preserve')
    t.text = text
    r.append(t)
    return r

def clone_r_special(kind: str, rPr: etree._Element | None, *, deleted=False) -> etree._Element:
    r = etree.Element(qn('w:r'))
    if rPr is not None:
        r.append(deepcopy(rPr))
    if kind == 'tab':
        r.append(etree.Element(qn('w:tab')))
    elif kind == 'br':
        r.append(etree.Element(qn('w:br')))
    return r

class ChangeIdGen:
    def __init__(self, start: int | None = None) -> None:
        if start is None:
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
    """Mark a run's formatting change by appending <w:rPrChange> with prior properties."""
    if old_rPr is None:
        return
    rPr = new_r.find(qn('w:rPr'))
    if rPr is None:
        rPr = etree.Element(qn('w:rPr'))
        new_r.insert(0, rPr)
    rPrChange = etree.Element(qn('w:rPrChange'))
    rPrChange.set(qn('w:id'), str(cid))
    rPrChange.set(qn('w:author'), author)
    rPrChange.set(qn('w:date'), date_iso)
    prior = deepcopy(old_rPr)
    prior.tag = qn('w:rPr')
    rPrChange.append(prior)
    rPr.append(rPrChange)

def add_pPrChange(out_p: etree._Element, old_pPr: etree._Element | None, author: str, date_iso: str, cid: int) -> None:
    """Mark paragraph property change (<w:pPrChange>) on out_p's pPr."""
    # Ensure pPr exists
    pPr = out_p.find(qn('w:pPr'))
    if pPr is None:
        pPr = etree.Element(qn('w:pPr'))
        out_p.insert(0, pPr)

    pPrChange = etree.Element(qn('w:pPrChange'))
    pPrChange.set(qn('w:id'), str(cid))
    pPrChange.set(qn('w:author'), author)
    pPrChange.set(qn('w:date'), date_iso)

    prior = etree.Element(qn('w:pPr'))
    if old_pPr is not None:
        prior = deepcopy(old_pPr)
        prior.tag = qn('w:pPr')
    pPrChange.append(prior)

    pPr.append(pPrChange)

def equal_runs_style(a_rPr: etree._Element | None, b_rPr: etree._Element | None) -> bool:
    def as_c14n(e):
        if e is None:
            return b''
        return etree.tostring(e, method='c14n')
    return as_c14n(a_rPr) == as_c14n(b_rPr)

def equal_xml(a: etree._Element | None, b: etree._Element | None) -> bool:
    def as_c14n(e):
        if e is None:
            return b''
        return etree.tostring(e, method='c14n')
    return as_c14n(a) == as_c14n(b)

def diff_run_text_charlevel(
    old_text: str,
    new_text: str,
    new_rPr: etree._Element | None,
    old_rPr: etree._Element | None,
    author: str,
    date_iso: str,
    cidgen: ChangeIdGen,
):
    """Yield sequence of nodes representing char-level diffs inside a single run replacement."""
    out = []
    dmp = diff_match_patch()
    dmp.Diff_Timeout = 200.0
    diffs = dmp.diff_main(old_text, new_text)
    dmp.diff_cleanupSemantic(diffs)
    dmp.diff_cleanupEfficiency(diffs)

    for op, text in diffs:
        if not text:
            continue
        if op == diff_match_patch.DIFF_EQUAL:
            r = clone_r_with_text(text, new_rPr, deleted=False)
            if not equal_runs_style(old_rPr, new_rPr):
                add_rPrChange(r, old_rPr, author, date_iso, cidgen.next())
            out.append(r)
        elif op == diff_match_patch.DIFF_DELETE:
            cid = cidgen.next()
            de = make_del_container(author, date_iso, cid)
            de.append(clone_r_with_text(text, old_rPr, deleted=True))
            out.append(de)
        elif op == diff_match_patch.DIFF_INSERT:
            cid = cidgen.next()
            ins = make_ins_container(author, date_iso, cid)
            ins.append(clone_r_with_text(text, new_rPr, deleted=False))
            out.append(ins)
    return out

def dmp_to_opcodes(diffs):
    opcodes = []
    i1 = i2 = j1 = j2 = 0
    for op, text in diffs:
        text_len = len(text)
        if op == diff_match_patch.DIFF_EQUAL:
            tag = 'equal'; i2 = i1 + text_len; j2 = j1 + text_len
        elif op == diff_match_patch.DIFF_DELETE:
            tag = 'delete'; i2 = i1 + text_len; j2 = j1
        elif op == diff_match_patch.DIFF_INSERT:
            tag = 'insert'; i2 = i1; j2 = j1 + text_len
        if text_len > 0:
            opcodes.append((tag, i1, i2, j1, j2))
        i1 = i2; j1 = j2

    merged_opcodes = []
    i = 0
    while i < len(opcodes):
        if i < len(opcodes) - 1:
            curr = opcodes[i]
            nxt = opcodes[i+1]
            if curr[0] == 'delete' and nxt[0] == 'insert':
                merged_opcodes.append(('replace', curr[1], curr[2], nxt[3], nxt[4]))
                i += 2
                continue
            elif curr[0] == 'insert' and nxt[0] == 'delete':
                merged_opcodes.append(('replace', nxt[1], nxt[2], curr[3], curr[4]))
                i += 2
                continue
        merged_opcodes.append(opcodes[i])
        i += 1
    return merged_opcodes

def diff_sequences_dmp(old_seq, new_seq):
    item_to_char = {}
    char_to_item = {}
    next_char = 1  # avoid \x00 issues

    def get_char(item):
        nonlocal next_char
        key = str(item)
        if key not in item_to_char:
            ch = chr(next_char)
            item_to_char[key] = ch
            char_to_item[ch] = item
            next_char += 1
        return item_to_char[key]

    old_str = ''.join(get_char(item) for item in old_seq)
    new_str = ''.join(get_char(item) for item in new_seq)

    dmp = diff_match_patch()
    dmp.Diff_Timeout = 2.0
    diffs = dmp.diff_main(old_str, new_str)
    dmp.diff_cleanupSemantic(diffs)
    dmp.diff_cleanupEfficiency(diffs)
    return dmp_to_opcodes(diffs)

# Helpers to preserve paragraph attributes and mark insert/delete at paragraph level (NEW)
def get_paragraph_children_except_pPr(p: etree._Element):
    return [c for c in p if c.tag != qn('w:pPr')]

def make_deleted_paragraph_from_old(old_p: etree._Element, author: str, date_iso: str, cidgen: ChangeIdGen) -> etree._Element:
    """Create a paragraph that preserves old_p attributes/pPr but wraps its content in <w:del>."""
    out_p = deepcopy(old_p)
    # Keep pPr; remove all other children
    pPr = out_p.find(qn('w:pPr'))
    for child in list(out_p):
        if child is not pPr:
            out_p.remove(child)

    cid = cidgen.next()
    de = make_del_container(author, date_iso, cid)
    for child in get_paragraph_children_except_pPr(old_p):
        de.append(deepcopy(child))
    out_p.append(de)
    return out_p

def make_inserted_paragraph_from_new(new_p: etree._Element, author: str, date_iso: str, cidgen: ChangeIdGen) -> etree._Element:
    """Create a paragraph that preserves new_p attributes/pPr and wraps its content in <w:ins>."""
    out_p = deepcopy(new_p)
    pPr = out_p.find(qn('w:pPr'))
    for child in list(out_p):
        if child is not pPr:
            out_p.remove(child)

    cid = cidgen.next()
    ins = make_ins_container(author, date_iso, cid)
    for child in get_paragraph_children_except_pPr(new_p):
        ins.append(deepcopy(child))
    out_p.append(ins)
    return out_p

def build_paragraph_with_diffs(
    old_p: etree._Element, new_p: etree._Element, author: str, date_iso: str, cidgen: ChangeIdGen
) -> etree._Element:
    """Construct a new <w:p> with tracked changes from old_p -> new_p."""
    # Start from new paragraph (preserves attributes and namespaces)
    out_p = deepcopy(new_p)

    # Keep pPr; clear existing content runs
    new_pPr = out_p.find(qn('w:pPr'))
    for child in list(out_p):
        if child is not new_pPr:
            out_p.remove(child)

    # Paragraph property changes (add w:pPrChange if pPr differs)
    old_pPr = old_p.find(qn('w:pPr'))
    if not equal_xml(old_pPr, new_pPr):
        add_pPrChange(out_p, old_pPr, author, date_iso, cidgen.next())

    old_tokens = paragraph_runs_tokens(old_p)
    new_tokens = paragraph_runs_tokens(new_p)

    def token_key(tok):
        return (tok['kind'], tok['text'])

    old_keys = [token_key(t) for t in old_tokens]
    new_keys = [token_key(t) for t in new_tokens]
    opcodes = diff_sequences_dmp(old_keys, new_keys)

    for tag, i1, i2, j1, j2 in opcodes:
        old_slice = old_tokens[i1:i2]
        new_slice = new_tokens[j1:j2]

        if tag == 'equal':
            for k in range(len(old_slice)):
                o = old_slice[k]; n = new_slice[k]
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
                    out_p.append(deepcopy(n['run_xml']))

        elif tag == 'delete':
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
            if (
                len(old_slice) == 1 and len(new_slice) == 1
                and old_slice[0]['kind'] == 'text' and new_slice[0]['kind'] == 'text'
            ):
                pieces = diff_run_text_charlevel(
                    old_slice[0]['text'], new_slice[0]['text'],
                    new_slice[0]['rPr'], old_slice[0]['rPr'],
                    author, date_iso, cidgen
                )
                for node in pieces:
                    out_p.append(node)
                # If text equal and formatting changed (unlikely here)
                if old_slice[0]['text'] == new_slice[0]['text'] and not equal_runs_style(
                    old_slice[0]['rPr'], new_slice[0]['rPr']
                ):
                    r = clone_r_with_text(new_slice[0]['text'], new_slice[0]['rPr'], deleted=False)
                    add_rPrChange(r, old_slice[0]['rPr'], author, date_iso, cidgen.next())
                    out_p.append(r)
            else:
                # General replace: delete old slice then insert new slice
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
    if kind == 'p':
        return tokens_text_key(paragraph_runs_tokens(elem))
    if kind == 'tbl':
        return 'TABLE|' + text_of_element(elem)
    return 'OTHER|' + (text_of_element(elem) or '')

def build_body_with_diffs(
    old_body: etree._Element, new_body: etree._Element, author: str, date_iso: str, cidgen: ChangeIdGen
) -> etree._Element:
    """Align blocks and emit diffs, ensuring tracked change containers are inside paragraphs."""
    old_blocks = [(e, k) for e, k in block_iter(old_body) if k != 'sectPr']
    new_blocks = [(e, k) for e, k in block_iter(new_body) if k != 'sectPr']

    old_keys = list(starmap(blocks_text_key, old_blocks))
    new_keys = list(starmap(blocks_text_key, new_blocks))

    body = etree.Element(qn('w:body'))

    opcodes = diff_sequences_dmp(old_keys, new_keys)

    for tag, i1, i2, j1, j2 in opcodes:
        old_slice = old_blocks[i1:i2]
        new_slice = new_blocks[j1:j2]

        if tag == 'equal':
            for (oe, ok), (ne, nk) in zip(old_slice, new_slice):
                if ok == 'p' and nk == 'p':
                    body.append(build_paragraph_with_diffs(oe, ne, author, date_iso, cidgen))
                else:
                    # Copy new block directly (e.g., tables unchanged)
                    body.append(deepcopy(ne))

        elif tag == 'delete':
            for oe, ok in old_slice:
                if ok == 'p':
                    body.append(make_deleted_paragraph_from_old(oe, author, date_iso, cidgen))
                else:
                    # For non-paragraph deletions: best-effort — wrap in a deleted paragraph
                    # to avoid invalid body-level <w:del>.
                    placeholder = etree.Element(qn('w:p'))
                    cid = cidgen.next()
                    de = make_del_container(author, date_iso, cid)
                    # Embed the deleted block inside the deletion (Word usually tolerates this)
                    de.append(deepcopy(oe))
                    placeholder.append(de)
                    body.append(placeholder)

        elif tag == 'insert':
            for ne, nk in new_slice:
                if nk == 'p':
                    body.append(make_inserted_paragraph_from_new(ne, author, date_iso, cidgen))
                else:
                    placeholder = etree.Element(qn('w:p'))
                    cid = cidgen.next()
                    ins = make_ins_container(author, date_iso, cid)
                    ins.append(deepcopy(ne))
                    placeholder.append(ins)
                    body.append(placeholder)

        elif tag == 'replace':
            if len(old_slice) == 1 and len(new_slice) == 1 and old_slice[0][1] == 'p' and new_slice[0][1] == 'p':
                body.append(build_paragraph_with_diffs(old_slice[0][0], new_slice[0][0], author, date_iso, cidgen))
            else:
                for oe, ok in old_slice:
                    if ok == 'p':
                        body.append(make_deleted_paragraph_from_old(oe, author, date_iso, cidgen))
                    else:
                        placeholder = etree.Element(qn('w:p'))
                        cid = cidgen.next()
                        de = make_del_container(author, date_iso, cid)
                        de.append(deepcopy(oe))
                        placeholder.append(de)
                        body.append(placeholder)
                for ne, nk in new_slice:
                    if nk == 'p':
                        body.append(make_inserted_paragraph_from_new(ne, author, date_iso, cidgen))
                    else:
                        placeholder = etree.Element(qn('w:p'))
                        cid = cidgen.next()
                        ins = make_ins_container(author, date_iso, cid)
                        ins.append(deepcopy(ne))
                        placeholder.append(ins)
                        body.append(placeholder)

    # Append sectPr from the new body
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
    if 'word/document.xml' not in old_parts:
        raise RuntimeError('Missing word/document.xml in old docx')
    if 'word/document.xml' not in new_parts:
        raise RuntimeError('Missing word/document.xml in new docx')

    old_doc_tree = parse_xml(old_parts['word/document.xml'])
    new_doc_tree = parse_xml(new_parts['word/document.xml'])
    old_doc = old_doc_tree.getroot()
    new_doc = new_doc_tree.getroot()

    if old_doc.tag != qn('w:document') or new_doc.tag != qn('w:document'):
        raise RuntimeError('document.xml root is not w:document')

    old_body = old_doc.find(qn('w:body'))
    new_body = new_doc.find(qn('w:body'))
    if old_body is None or new_body is None:
        raise RuntimeError('document.xml missing w:body')

    # Accept existing tracked revisions BEFORE diffing (NEW)
    accept_revisions_in_document_tree(old_doc)
    accept_revisions_in_document_tree(new_doc)

    # Build the redlined body
    redline_body = build_body_with_diffs(old_body, new_body, author, date_iso, cidgen)

    # Construct the result document from the accepted new document root (preserve ns/compat)
    result_doc = deepcopy(new_doc)
    # Replace body
    for child in list(result_doc):
        if child.tag == qn('w:body'):
            result_doc.remove(child)
    result_doc.append(redline_body)

    # Serialize document.xml
    result_document_xml = serialize_xml(result_doc, 'word/document.xml')

    # Ensure settings enable track revisions
    settings_xml = new_parts.get('word/settings.xml', None)
    new_parts['word/settings.xml'] = ensure_track_revisions(settings_xml)

    # Replace document.xml
    new_parts['word/document.xml'] = result_document_xml

    # Update core props to reflect author/time and reset revision (NEW)
    update_core_properties(new_parts, author=author, date_iso=date_iso, revision='1')

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
