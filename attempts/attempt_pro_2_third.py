"""
Create a tracked-changes (redline) .docx by comparing two .docx files.

Key features:
- Accepts ALL pre-existing revisions in both inputs before diffing
  (unwrap <w:ins>/<w:moveTo>, drop <w:del>/<w:moveFrom>, remove *PrChange, etc.).
- Produces valid Word Track Changes: <w:ins>, <w:del> INSIDE paragraphs only,
  and <w:rPrChange> (run formatting) and <w:pPrChange> (paragraph style changes).
- Also diffs style definitions (word/styles.xml) and emits <w:pPrChange>/<w:rPrChange> per style.
- Char-level inserts/deletes inside single-run replacements (diff_match_patch).
- Ensures <w:trackRevisions/> in word/settings.xml.
- Preserves the entire "new" .docx package as base (keeps people.xml, rels, content types).
- Touches docProps/core.xml (lastModifiedBy, modified date, revision strategy).

Usage:
    python redline_docx.py old.docx new.docx redlined.docx --author "Acme LLP" --date "2025-10-10T10:15:00Z"

Author: your org
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

# -------------------------
# Namespaces
# -------------------------
NS_W   = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
NS_R   = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
NS_XML = 'http://www.w3.org/XML/1998/namespace'
# Optional Word feature namespaces (not strictly needed for creation, but safe to know)
NS_W14 = 'http://schemas.microsoft.com/office/word/2010/wordml'
NS_W15 = 'http://schemas.microsoft.com/office/word/2012/wordml'

# Core properties namespaces
NS_CP      = 'http://schemas.openxmlformats.org/package/2006/metadata/core-properties'
NS_DC      = 'http://purl.org/dc/elements/1.1/'
NS_DCTERMS = 'http://purl.org/dc/terms/'
NS_XSI     = 'http://www.w3.org/2001/XMLSchema-instance'

NSMAP = {
    'w':   NS_W,
    'r':   NS_R,
    'xml': NS_XML,
    'w14': NS_W14,
    'w15': NS_W15,
    'cp':  NS_CP,
    'dc':  NS_DC,
    'dcterms': NS_DCTERMS,
    'xsi': NS_XSI,
}

def qn(tag: str) -> str:
    """Expand 'w:p' → '{ns}p'."""
    prefix, local = tag.split(':')
    return f'{{{NSMAP[prefix]}}}{local}'

def now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')

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
# Word-specific helpers
# -----------------------------------------------------------------------------
def ensure_track_revisions(settings_xml: bytes | None) -> bytes:
    """Ensure <w:trackRevisions/> exists."""
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
        # keep a stable position: after any w:settings children like w:proofState, before w:rsids if present
        rsids = root.find(qn('w:rsids'))
        elem = etree.Element(qn('w:trackRevisions'))
        if rsids is not None:
            idx = list(root).index(rsids)
            root.insert(idx, elem)
        else:
            root.append(elem)

    return serialize_xml(root, 'word/settings.xml')

def text_of_element(elem: etree._Element) -> str:
    return ''.join([(t.text or '') for t in elem.xpath('.//w:t', namespaces=NSMAP)])

def block_iter(body: etree._Element):
    """Yield (element, kind) for block-level nodes."""
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
    """Tokenize a paragraph into run-granularity tokens with formatting snapshot."""
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

def clone_r_special(kind: str, rPr: etree._Element | None) -> etree._Element:
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

# ---------- acceptance (strip pre-existing tracked changes) ----------
def _unwrap_all(parent: etree._Element, tag_qname: str) -> int:
    """Replace <tag_qname> with its children everywhere."""
    count = 0
    for node in list(parent.iter(tag_qname)):
        p = node.getparent()
        if p is None:
            continue
        idx = p.index(node)
        for child in list(node):
            p.insert(idx, child)
            idx += 1
        p.remove(node)
        count += 1
    return count

def _drop_all(parent: etree._Element, tag_qname: str) -> int:
    count = 0
    for node in list(parent.iter(tag_qname)):
        p = node.getparent()
        if p is None:
            continue
        p.remove(node)
        count += 1
    return count

def _remove_all_changes(parent: etree._Element, change_local_names: list[str]) -> int:
    count = 0
    for lname in change_local_names:
        for node in list(parent.xpath(f'.//w:{lname}', namespaces=NSMAP)):
            p = node.getparent()
            if p is None:
                continue
            p.remove(node)
            count += 1
    return count

def accept_all_revisions_tree(root: etree._Element) -> None:
    """Accept all existing tracked changes in a document or styles tree."""
    # Unwrap insertions and moves-to; drop deletions and moves-from
    _unwrap_all(root, qn('w:ins'))
    _unwrap_all(root, qn('w:moveTo'))
    _drop_all(root, qn('w:del'))
    _drop_all(root, qn('w:moveFrom'))
    # Remove any *PrChange (paragraph/run/table/cell/section/row)
    _remove_all_changes(root, [
        'rPrChange', 'pPrChange', 'tblPrChange', 'tcPrChange', 'trPrChange', 'sectPrChange'
    ])
    # Remove proofing errors which can pollute matching
    _drop_all(root, qn('w:proofErr'))

# ---------- paragraph-level style change tagging ----------
def _strip_rsid_attrs_on_p(p: etree._Element) -> etree._Element | None:
    """Return a deepcopy of pPr with rsid* removed (to avoid false positives)."""
    pPr = p.find(qn('w:pPr'))
    if pPr is None:
        return None
    pPr_copy = deepcopy(pPr)
    # rsid* live on w:p, not usually inside pPr, but be defensive
    for e in [pPr_copy] + list(pPr_copy.iter()):
        for attr in list(e.attrib.keys()):
            if attr.endswith('}rsidR') or attr.endswith('}rsidRDefault') or attr.endswith('}rsidP'):
                del e.attrib[attr]
    return pPr_copy

def as_c14n_bytes(e: etree._Element | None) -> bytes:
    if e is None:
        return b''
    return etree.tostring(e, method='c14n')

def add_pPrChange_if_needed(out_p: etree._Element, old_p: etree._Element,
                            author: str, date_iso: str, cidgen: ChangeIdGen) -> None:
    old_pPr = _strip_rsid_attrs_on_p(old_p)
    new_pPr = out_p.find(qn('w:pPr'))  # out_p already carries new_pPr
    if as_c14n_bytes(old_pPr) != as_c14n_bytes(new_pPr):
        # Ensure w:pPr exists
        if new_pPr is None:
            new_pPr = etree.Element(qn('w:pPr'))
            out_p.insert(0, new_pPr)
        ch = etree.Element(qn('w:pPrChange'))
        ch.set(qn('w:id'), str(cidgen.next()))
        ch.set(qn('w:author'), author)
        ch.set(qn('w:date'), date_iso)
        prior = deepcopy(old_pPr) if old_pPr is not None else etree.Element(qn('w:pPr'))
        ch.append(prior)
        new_pPr.append(ch)

# ---------- diff helpers ----------
def dmp_to_opcodes(diffs):
    opcodes = []
    i1 = i2 = j1 = j2 = 0
    for op, text in diffs:
        n = len(text)
        if op == diff_match_patch.DIFF_EQUAL:
            tag = 'equal'; i2 = i1 + n; j2 = j1 + n
        elif op == diff_match_patch.DIFF_DELETE:
            tag = 'delete'; i2 = i1 + n; j2 = j1
        elif op == diff_match_patch.DIFF_INSERT:
            tag = 'insert'; i2 = i1;     j2 = j1 + n
        if n > 0:
            opcodes.append((tag, i1, i2, j1, j2))
        i1 = i2; j1 = j2

    # Merge delete+insert / insert+delete into replace
    merged = []
    i = 0
    while i < len(opcodes):
        if i < len(opcodes) - 1:
            a = opcodes[i]; b = opcodes[i+1]
            if a[0] == 'delete' and b[0] == 'insert':
                merged.append(('replace', a[1], a[2], b[3], b[4])); i += 2; continue
            if a[0] == 'insert' and b[0] == 'delete':
                merged.append(('replace', b[1], b[2], a[3], a[4])); i += 2; continue
        merged.append(opcodes[i]); i += 1
    return merged

def diff_sequences_dmp(old_seq, new_seq):
    item_to_char = {}; next_code = 0
    def enc(item):
        nonlocal next_code
        k = str(item)
        if k not in item_to_char:
            item_to_char[k] = chr(next_code)
            next_code += 1
        return item_to_char[k]
    old_str = ''.join(enc(x) for x in old_seq)
    new_str = ''.join(enc(x) for x in new_seq)
    dmp = diff_match_patch(); dmp.Diff_Timeout = 2.0
    diffs = dmp.diff_main(old_str, new_str)
    dmp.diff_cleanupSemantic(diffs); dmp.diff_cleanupEfficiency(diffs)
    return dmp_to_opcodes(diffs)

def equal_runs_style(a_rPr: etree._Element | None, b_rPr: etree._Element | None) -> bool:
    def c14n(e): return b'' if e is None else etree.tostring(e, method='c14n')
    return c14n(a_rPr) == c14n(b_rPr)

def diff_run_text_charlevel(old_text: str, new_text: str,
                            new_rPr: etree._Element | None, old_rPr: etree._Element | None,
                            author: str, date_iso: str, cidgen: ChangeIdGen):
    out = []
    dmp = diff_match_patch(); dmp.Diff_Timeout = 200.0
    diffs = dmp.diff_main(old_text, new_text)
    dmp.diff_cleanupSemantic(diffs); dmp.diff_cleanupEfficiency(diffs)
    for op, text in diffs:
        if not text:
            continue
        if op == diff_match_patch.DIFF_EQUAL:
            out.append(clone_r_with_text(text, new_rPr, deleted=False))
        elif op == diff_match_patch.DIFF_DELETE:
            de = make_del_container(author, date_iso, cidgen.next())
            de.append(clone_r_with_text(text, old_rPr, deleted=True))
            out.append(de)
        elif op == diff_match_patch.DIFF_INSERT:
            ins = make_ins_container(author, date_iso, cidgen.next())
            ins.append(clone_r_with_text(text, new_rPr, deleted=False))
            out.append(ins)
    return out

# ---------- paragraph construction ----------
def build_paragraph_with_diffs(old_p: etree._Element, new_p: etree._Element,
                               author: str, date_iso: str, cidgen: ChangeIdGen) -> etree._Element:
    out_p = etree.Element(qn('w:p'))
    new_pPr = new_p.find(qn('w:pPr'))
    if new_pPr is not None:
        out_p.append(deepcopy(new_pPr))

    old_tokens = paragraph_runs_tokens(old_p)
    new_tokens = paragraph_runs_tokens(new_p)

    def key(tok): return (tok['kind'], tok['text'])
    old_keys = [key(t) for t in old_tokens]
    new_keys = [key(t) for t in new_tokens]
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
            if not old_slice: continue
            de = make_del_container(author, date_iso, cidgen.next())
            for o in old_slice:
                if o['kind'] == 'text':
                    de.append(clone_r_with_text(o['text'], o['rPr'], deleted=True))
                elif o['kind'] in {'tab', 'br'}:
                    de.append(clone_r_special(o['kind'], o['rPr']))
                else:
                    de.append(deepcopy(o['run_xml']))
            out_p.append(de)

        elif tag == 'insert':
            if not new_slice: continue
            ins = make_ins_container(author, date_iso, cidgen.next())
            for n in new_slice:
                if n['kind'] == 'text':
                    ins.append(clone_r_with_text(n['text'], n['rPr'], deleted=False))
                elif n['kind'] in {'tab', 'br'}:
                    ins.append(clone_r_special(n['kind'], n['rPr']))
                else:
                    ins.append(deepcopy(n['run_xml']))
            out_p.append(ins)

        elif tag == 'replace':
            if (len(old_slice) == 1 and len(new_slice) == 1 and
                old_slice[0]['kind'] == 'text' and new_slice[0]['kind'] == 'text'):
                pieces = diff_run_text_charlevel(
                    old_slice[0]['text'], new_slice[0]['text'],
                    new_slice[0]['rPr'], old_slice[0]['rPr'],
                    author, date_iso, cidgen
                )
                for node in pieces: out_p.append(node)
                if (old_slice[0]['text'] == new_slice[0]['text'] and
                    not equal_runs_style(old_slice[0]['rPr'], new_slice[0]['rPr'])):
                    r = clone_r_with_text(new_slice[0]['text'], new_slice[0]['rPr'], deleted=False)
                    add_rPrChange(r, old_slice[0]['rPr'], author, date_iso, cidgen.next())
                    out_p.append(r)
            else:
                if old_slice:
                    de = make_del_container(author, date_iso, cidgen.next())
                    for o in old_slice:
                        if o['kind'] == 'text':
                            de.append(clone_r_with_text(o['text'], o['rPr'], deleted=True))
                        elif o['kind'] in {'tab', 'br'}:
                            de.append(clone_r_special(o['kind'], o['rPr']))
                        else:
                            de.append(deepcopy(o['run_xml']))
                    out_p.append(de)
                if new_slice:
                    ins = make_ins_container(author, date_iso, cidgen.next())
                    for n in new_slice:
                        if n['kind'] == 'text':
                            ins.append(clone_r_with_text(n['text'], n['rPr'], deleted=False))
                        elif n['kind'] in {'tab', 'br'}:
                            ins.append(clone_r_special(n['kind'], n['rPr']))
                        else:
                            ins.append(deepcopy(n['run_xml']))
                    out_p.append(ins)

    # Track paragraph property changes
    add_pPrChange_if_needed(out_p, old_p, author, date_iso, cidgen)
    return out_p

def blocks_text_key(elem: etree._Element, kind: str) -> str:
    if kind == 'p':
        return tokens_text_key(paragraph_runs_tokens(elem))
    if kind == 'tbl':
        return 'TABLE|' + text_of_element(elem)
    return 'OTHER|' + (text_of_element(elem) or '')

def _emit_deleted_paragraph(old_p: etree._Element, author: str, date_iso: str, cidgen: ChangeIdGen) -> etree._Element:
    out_p = etree.Element(qn('w:p'))
    old_pPr = old_p.find(qn('w:pPr'))
    if old_pPr is not None:
        out_p.append(deepcopy(old_pPr))
    de = make_del_container(author, date_iso, cidgen.next())
    for tok in paragraph_runs_tokens(old_p):
        if tok['kind'] == 'text':
            de.append(clone_r_with_text(tok['text'], tok['rPr'], deleted=True))
        elif tok['kind'] in {'tab','br'}:
            de.append(clone_r_special(tok['kind'], tok['rPr']))
        else:
            de.append(deepcopy(tok['run_xml']))
    out_p.append(de)
    return out_p

def _emit_inserted_paragraph(new_p: etree._Element, author: str, date_iso: str, cidgen: ChangeIdGen) -> etree._Element:
    out_p = etree.Element(qn('w:p'))
    new_pPr = new_p.find(qn('w:pPr'))
    if new_pPr is not None:
        out_p.append(deepcopy(new_pPr))
    ins = make_ins_container(author, date_iso, cidgen.next())
    for tok in paragraph_runs_tokens(new_p):
        if tok['kind'] == 'text':
            ins.append(clone_r_with_text(tok['text'], tok['rPr'], deleted=False))
        elif tok['kind'] in {'tab','br'}:
            ins.append(clone_r_special(tok['kind'], tok['rPr']))
        else:
            ins.append(deepcopy(tok['run_xml']))
    out_p.append(ins)
    return out_p

def build_body_with_diffs(old_body: etree._Element, new_body: etree._Element,
                          author: str, date_iso: str, cidgen: ChangeIdGen) -> etree._Element:
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
                    body.append(deepcopy(ne))

        elif tag == 'delete':
            for oe, ok in old_slice:
                if ok == 'p':
                    body.append(_emit_deleted_paragraph(oe, author, date_iso, cidgen))
                else:
                    # TODO: table deletion tracking; for now, omit tracked wrapper to stay valid
                    pass

        elif tag == 'insert':
            for ne, nk in new_slice:
                if nk == 'p':
                    body.append(_emit_inserted_paragraph(ne, author, date_iso, cidgen))
                else:
                    # Copy tables as-is (no invalid wrappers)
                    body.append(deepcopy(ne))

        elif tag == 'replace':
            if len(old_slice) == 1 and len(new_slice) == 1 and old_slice[0][1] == 'p' and new_slice[0][1] == 'p':
                body.append(build_paragraph_with_diffs(old_slice[0][0], new_slice[0][0], author, date_iso, cidgen))
            else:
                # delete old paragraphs with legal wrappers; drop tables; insert new ones
                for oe, ok in old_slice:
                    if ok == 'p':
                        body.append(_emit_deleted_paragraph(oe, author, date_iso, cidgen))
                for ne, nk in new_slice:
                    if nk == 'p':
                        body.append(_emit_inserted_paragraph(ne, author, date_iso, cidgen))
                    elif nk != 'p':
                        body.append(deepcopy(ne))

    # Keep the last section properties from the new doc
    sect = new_body.find(qn('w:sectPr'))
    if sect is not None:
        body.append(deepcopy(sect))
    return body

# ---------- style definitions tracking (word/styles.xml) ----------
def track_style_definition_changes(old_styles_xml: bytes | None, new_styles_xml: bytes | None,
                                   author: str, date_iso: str, cidgen: ChangeIdGen) -> bytes | None:
    if not new_styles_xml:
        return None  # nothing to do
    new_tree = parse_xml(new_styles_xml); new_root = new_tree.getroot()
    if old_styles_xml:
        old_tree = parse_xml(old_styles_xml); old_root = old_tree.getroot()
        # Accept existing changes first
        accept_all_revisions_tree(old_root); accept_all_revisions_tree(new_root)
        old_map = { s.get(qn('w:styleId')): s for s in old_root.xpath('/w:styles/w:style', namespaces=NSMAP) }
        for s in new_root.xpath('/w:styles/w:style', namespaces=NSMAP):
            sid = s.get(qn('w:styleId'))
            if not sid or sid not in old_map:
                continue
            # compare pPr
            old_pPr = old_map[sid].find(qn('w:pPr'))
            new_pPr = s.find(qn('w:pPr'))
            if as_c14n_bytes(old_pPr) != as_c14n_bytes(new_pPr):
                ch = etree.Element(qn('w:pPrChange'))
                ch.set(qn('w:id'), str(cidgen.next()))
                ch.set(qn('w:author'), author)
                ch.set(qn('w:date'), date_iso)
                prior = etree.Element(qn('w:pPr')) if old_pPr is None else deepcopy(old_pPr)
                ch.append(prior)
                # ensure any previous pPrChange is removed (we accepted earlier)
                for prev in s.findall(qn('w:pPrChange')): s.remove(prev)
                s.append(ch)
            # compare rPr
            old_rPr = old_map[sid].find(qn('w:rPr'))
            new_rPr = s.find(qn('w:rPr'))
            if as_c14n_bytes(old_rPr) != as_c14n_bytes(new_rPr):
                ch = etree.Element(qn('w:rPrChange'))
                ch.set(qn('w:id'), str(cidgen.next()))
                ch.set(qn('w:author'), author)
                ch.set(qn('w:date'), date_iso)
                prior = etree.Element(qn('w:rPr')) if old_rPr is None else deepcopy(old_rPr)
                ch.append(prior)
                for prev in s.findall(qn('w:rPrChange')): s.remove(prev)
                s.append(ch)
    else:
        # Accept any existing changes in "new" and leave as-is; nothing to compare with
        accept_all_revisions_tree(new_root)
    return serialize_xml(new_root, 'word/styles.xml')

# ---------- core properties touch ----------
def touch_core_properties(core_xml: bytes | None, author: str | None, date_iso: str,
                          revision_strategy: str = 'increment') -> bytes | None:
    if not core_xml:
        return None
    tree = parse_xml(core_xml); root = tree.getroot()
    # cp:lastModifiedBy
    if author:
        node = root.find(qn('cp:lastModifiedBy'))
        if node is None:
            node = etree.SubElement(root, qn('cp:lastModifiedBy'))
        node.text = author
    # dcterms:modified (xsi:type='dcterms:W3CDTF')
    mod = root.find(qn('dcterms:modified'))
    if mod is None:
        mod = etree.SubElement(root, qn('dcterms:modified'))
        mod.set(qn('xsi:type'), 'dcterms:W3CDTF')
    mod.text = date_iso
    # cp:revision
    rev = root.find(qn('cp:revision'))
    if revision_strategy == 'reset_to_1':
        if rev is None: rev = etree.SubElement(root, qn('cp:revision'))
        rev.text = '1'
    elif revision_strategy == 'increment':
        if rev is not None:
            try:
                rev.text = str(max(1, int(rev.text or '0') + 1))
            except Exception:
                rev.text = '1'
        else:
            rev = etree.SubElement(root, qn('cp:revision'))
            rev.text = '1'
    # else: preserve
    return serialize_xml(root, 'docProps/core.xml')

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------
def make_redline_docx(old_path: str, new_path: str, out_path: str,
                      author: str = 'AutoDiff', date_iso: str | None = None,
                      core_revision_strategy: str = 'increment') -> None:
    if date_iso is None:
        date_iso = now_iso()
    cidgen = ChangeIdGen()

    old_parts = read_docx_xml_parts(old_path)
    new_parts = read_docx_xml_parts(new_path)

    # Parse & accept revisions in document.xml
    try:
        old_doc_tree = parse_xml(old_parts['word/document.xml'])
        new_doc_tree = parse_xml(new_parts['word/document.xml'])
    except KeyError as e:
        raise RuntimeError(f'Missing required part: {e}')

    old_doc = old_doc_tree.getroot(); new_doc = new_doc_tree.getroot()
    if old_doc.tag != qn('w:document') or new_doc.tag != qn('w:document'):
        raise RuntimeError('document.xml root is not w:document')

    # Accept all existing tracked changes before diffing
    accept_all_revisions_tree(old_doc)
    accept_all_revisions_tree(new_doc)

    old_body = old_doc.find(qn('w:body')); new_body = new_doc.find(qn('w:body'))
    if old_body is None or new_body is None:
        raise RuntimeError('document.xml missing w:body')

    # Build redlined body
    redline_body = build_body_with_diffs(old_body, new_body, author, date_iso, cidgen)

    # Construct the result document from the *new* document root
    result_doc = deepcopy(new_doc)
    # Replace the body with our redlined body
    for child in list(result_doc):
        if child.tag == qn('w:body'):
            result_doc.remove(child)
    result_doc.append(redline_body)
    result_document_xml = serialize_xml(result_doc, 'word/document.xml')

    # Ensure settings enable track revisions
    new_parts['word/settings.xml'] = ensure_track_revisions(new_parts.get('word/settings.xml', None))
    # Update styles.xml with tracked style definition changes
    new_parts['word/styles.xml'] = track_style_definition_changes(
        old_parts.get('word/styles.xml'), new_parts.get('word/styles.xml'),
        author, date_iso, cidgen
    ) or new_parts.get('word/styles.xml')

    # Replace document.xml
    new_parts['word/document.xml'] = result_document_xml

    # Touch core properties (lastModifiedBy, modified date, revision)
    if 'docProps/core.xml' in new_parts:
        new_parts['docProps/core.xml'] = touch_core_properties(
            new_parts['docProps/core.xml'], author, date_iso, revision_strategy=core_revision_strategy
        ) or new_parts['docProps/core.xml']

    # IMPORTANT: Write the *entire* new package (keeps people.xml, rels, content types)
    write_docx_xml_parts(new_parts, out_path)

def main(argv=None) -> None:
    p = argparse.ArgumentParser(description='Generate a redlined .docx (Track Changes) by comparing two .docx files.')
    p.add_argument('old', help='Old/original .docx')
    p.add_argument('new', help='New/revised .docx')
    p.add_argument('out', help='Output redlined .docx')
    p.add_argument('--author', default='AutoDiff', help='Author name for the tracked changes')
    p.add_argument('--date', default=None, help='ISO timestamp for changes (default: now, UTC)')
    p.add_argument('--core-rev', default='increment', choices=['increment','reset_to_1','preserve'],
                   help='How to set cp:revision in core props')
    args = p.parse_args(argv)
    make_redline_docx(args.old, args.new, args.out, author=args.author, date_iso=args.date,
                      core_revision_strategy=args.core_rev)

if __name__ == '__main__':
    sys.exit(main())
