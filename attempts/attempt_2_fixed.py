#!/usr/bin/env python3
"""redline_docx_fixed.py.

Create a tracked-changes (redline) .docx by comparing two .docx files.
Uses lxml for proper XML handling.

Fixed version with:
- Proper pPrChange (paragraph property change) tracking
- Proper rPrChange (run property change) tracking for all cases
- Correct handling when old has no formatting but new does
- Proper element ordering according to OOXML spec
- Style references (pStyle, rStyle) preservation
- Character-level diffing for single-run replacements

Usage:
    python attempt_2_fixed.py old.docx new.docx redlined.docx --author "Acme LLP" --date "2025-10-10T10:15:00Z"

"""

from __future__ import annotations

import argparse
import datetime as dt
import re
import sys
import uuid
import zipfile
from copy import deepcopy
from difflib import SequenceMatcher

from lxml import etree

# Regex to split text into words and whitespace tokens
_word_ws_re = re.compile(r'\S+|\s+')

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


def serialize_xml(elem_or_tree: etree._Element | etree._ElementTree) -> bytes:
    root = elem_or_tree.getroot() if isinstance(elem_or_tree, etree._ElementTree) else elem_or_tree
    return etree.tostring(root, encoding='UTF-8', xml_declaration=True, standalone=False)


# -----------------------------------------------------------------------------
# Word-specific helpers
# -----------------------------------------------------------------------------
def ensure_track_revisions(settings_xml: bytes | None) -> bytes:
    """Add <w:trackRevisions/> to word/settings.xml after proofState if present."""
    if not settings_xml:
        root = etree.Element(qn('w:settings'), nsmap={'w': NS_W})
        root.append(etree.Element(qn('w:trackRevisions')))
        return serialize_xml(root)

    tree = parse_xml(settings_xml)
    root = tree.getroot()
    if root.tag != qn('w:settings'):
        root = etree.Element(qn('w:settings'), nsmap={'w': NS_W})
        root.append(etree.Element(qn('w:trackRevisions')))
        return serialize_xml(root)

    # Add trackRevisions if missing, after proofState per OOXML spec
    if not root.xpath('w:trackRevisions', namespaces=NSMAP):
        track_rev = etree.Element(qn('w:trackRevisions'))
        proof_state = root.xpath('w:proofState', namespaces=NSMAP)
        if proof_state:
            idx = list(root).index(proof_state[0])
            root.insert(idx + 1, track_rev)
        else:
            root.insert(0, track_rev)
    return serialize_xml(root)


def text_of_element(elem: etree._Element) -> str:
    """Concatenate all w:t texts under elem."""
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
    """Convert a paragraph into a list of tokens at WORD level (not run level).

    This splits run text into individual word/whitespace tokens so that
    formatting changes can be detected even when run boundaries differ.

    Each token is dict with:
        kind: 'text' | 'tab' | 'br' | 'other'
        text: the word or whitespace
        rPr: the <w:rPr> element (deepcopy) or None
        run_xml: original run element
    """
    tokens = []
    for r in p.xpath('./w:r', namespaces=NSMAP):
        rPr = r.find(qn('w:rPr'))
        rPr_copy = deepcopy(rPr) if rPr is not None else None

        t_nodes = r.findall(qn('w:t'))
        if t_nodes:
            full_text = ''.join([t.text or '' for t in t_nodes])
            # Split into word/whitespace tokens, each gets the same rPr
            for tok in _word_ws_re.findall(full_text):
                tokens.append({'kind': 'text', 'text': tok, 'rPr': rPr_copy, 'run_xml': r})
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
    """Build a normalized text key for paragraph alignment."""
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
    """Create a <w:r> containing either <w:t> or <w:delText>."""
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
    """Create a <w:r> that contains <w:tab/> or <w:br/>."""
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
    """Mark a run's formatting change with proper handling for all cases.

    Cases handled:
    - old_rPr exists, new_rPr exists: stores old properties in rPrChange
    - old_rPr is None, new_rPr exists: stores empty rPr in rPrChange (new formatting added)
    - old_rPr exists, new_rPr is None: creates rPr with rPrChange containing old (formatting removed)
    """
    rPr = new_r.find(qn('w:rPr'))

    # Create rPrChange element
    rPrChange = etree.Element(qn('w:rPrChange'))
    rPrChange.set(qn('w:id'), str(cid))
    rPrChange.set(qn('w:author'), author)
    rPrChange.set(qn('w:date'), date_iso)

    # Store the prior properties inside rPrChange
    # Per OOXML spec, rPrChange contains an rPr element with the old properties
    if old_rPr is not None:
        prior = deepcopy(old_rPr)
        # Remove any existing rPrChange from the copy
        for existing_change in prior.xpath('w:rPrChange', namespaces=NSMAP):
            prior.remove(existing_change)
        prior.tag = qn('w:rPr')
        rPrChange.append(prior)
    else:
        # Old had no formatting - create empty rPr to indicate that
        rPrChange.append(etree.Element(qn('w:rPr')))

    if rPr is None:
        # Create a new rPr element
        rPr = etree.Element(qn('w:rPr'))
        new_r.insert(0, rPr)

    # Add rPrChange at the end of rPr (proper OOXML ordering)
    rPr.append(rPrChange)


def add_pPrChange(new_pPr: etree._Element, old_pPr: etree._Element | None, author: str, date_iso: str, cid: int) -> None:
    """Mark a paragraph's formatting change.

    Per OOXML spec, pPrChange contains a pPr element with the old properties.
    """
    pPrChange = etree.Element(qn('w:pPrChange'))
    pPrChange.set(qn('w:id'), str(cid))
    pPrChange.set(qn('w:author'), author)
    pPrChange.set(qn('w:date'), date_iso)

    if old_pPr is not None:
        prior = deepcopy(old_pPr)
        # Remove any existing pPrChange from the copy
        for existing_change in prior.xpath('w:pPrChange', namespaces=NSMAP):
            prior.remove(existing_change)
        prior.tag = qn('w:pPr')
        pPrChange.append(prior)
    else:
        # Old had no properties - create empty pPr
        pPrChange.append(etree.Element(qn('w:pPr')))

    # Add pPrChange at the end of pPr (proper OOXML ordering)
    new_pPr.append(pPrChange)


def equal_runs_style(a_rPr: etree._Element | None, b_rPr: etree._Element | None) -> bool:
    """Compare run properties by canonical XML string."""
    def as_c14n(e):
        if e is None:
            return b''
        # Make a copy and remove any change tracking elements for comparison
        e_copy = deepcopy(e)
        for change in e_copy.xpath('w:rPrChange', namespaces=NSMAP):
            e_copy.remove(change)
        return etree.tostring(e_copy, method='c14n')
    return as_c14n(a_rPr) == as_c14n(b_rPr)


def equal_para_style(a_pPr: etree._Element | None, b_pPr: etree._Element | None) -> bool:
    """Compare paragraph properties by canonical XML string."""
    def as_c14n(e):
        if e is None:
            return b''
        # Make a copy and remove any change tracking elements for comparison
        e_copy = deepcopy(e)
        for change in e_copy.xpath('w:pPrChange', namespaces=NSMAP):
            e_copy.remove(change)
        return etree.tostring(e_copy, method='c14n')
    return as_c14n(a_pPr) == as_c14n(b_pPr)


def diff_run_text_charlevel(
    old_text: str,
    new_text: str,
    new_rPr: etree._Element | None,
    old_rPr: etree._Element | None,
    author: str,
    date_iso: str,
    cidgen: ChangeIdGen,
):
    """Character-level diff within a single-run replacement."""
    out = []
    sm = SequenceMatcher(a=old_text, b=new_text, autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            if i2 > i1:
                r = clone_r_with_text(old_text[i1:i2], new_rPr, deleted=False)
                # Check if formatting changed for equal text
                if not equal_runs_style(old_rPr, new_rPr):
                    add_rPrChange(r, old_rPr, author, date_iso, cidgen.next())
                out.append(r)
        elif tag == 'delete':
            if i2 > i1:
                cid = cidgen.next()
                de = make_del_container(author, date_iso, cid)
                de.append(clone_r_with_text(old_text[i1:i2], old_rPr, deleted=True))
                out.append(de)
        elif tag == 'insert':
            if j2 > j1:
                cid = cidgen.next()
                ins = make_ins_container(author, date_iso, cid)
                ins.append(clone_r_with_text(new_text[j1:j2], new_rPr, deleted=False))
                out.append(ins)
        elif tag == 'replace':
            if i2 > i1:
                cid = cidgen.next()
                de = make_del_container(author, date_iso, cid)
                de.append(clone_r_with_text(old_text[i1:i2], old_rPr, deleted=True))
                out.append(de)
            if j2 > j1:
                cid = cidgen.next()
                ins = make_ins_container(author, date_iso, cid)
                ins.append(clone_r_with_text(new_text[j1:j2], new_rPr, deleted=False))
                out.append(ins)
    return out


def build_paragraph_with_diffs(
    old_p: etree._Element, new_p: etree._Element, author: str, date_iso: str, cidgen: ChangeIdGen
) -> etree._Element:
    """Construct a new <w:p> with tracked changes from old_p -> new_p.

    Properly tracks both paragraph properties (pPrChange) and run properties (rPrChange).
    """
    out_p = etree.Element(qn('w:p'))

    # Handle paragraph properties and track changes
    old_pPr = old_p.find(qn('w:pPr'))
    new_pPr = new_p.find(qn('w:pPr'))

    if new_pPr is not None:
        out_pPr = deepcopy(new_pPr)
        # Remove any existing pPrChange before comparison
        for existing_change in out_pPr.xpath('w:pPrChange', namespaces=NSMAP):
            out_pPr.remove(existing_change)
        if not equal_para_style(old_pPr, new_pPr):
            add_pPrChange(out_pPr, old_pPr, author, date_iso, cidgen.next())
        out_p.append(out_pPr)
    elif old_pPr is not None:
        # New has no pPr but old did - create pPr with pPrChange to track removal
        out_pPr = etree.Element(qn('w:pPr'))
        add_pPrChange(out_pPr, old_pPr, author, date_iso, cidgen.next())
        out_p.append(out_pPr)

    old_tokens = paragraph_runs_tokens(old_p)
    new_tokens = paragraph_runs_tokens(new_p)

    def token_key(tok):
        return (tok['kind'], tok['text'])

    sm = SequenceMatcher(a=[token_key(t) for t in old_tokens], b=[token_key(t) for t in new_tokens], autojunk=False)

    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        old_slice = old_tokens[i1:i2]
        new_slice = new_tokens[j1:j2]

        if tag == 'equal':
            # Text is equal - check for formatting changes
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
            # Try char-level diff for single text run replacements
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
            else:
                # General replacement: delete old, insert new
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
        return 'TABLE|' + text_of_element(elem)
    return 'OTHER|' + (text_of_element(elem) or '')


def build_body_with_diffs(
    old_body: etree._Element, new_body: etree._Element, author: str, date_iso: str, cidgen: ChangeIdGen
) -> etree._Element:
    """Create a new <w:body> with tracked changes."""
    old_blocks = [(e, k) for e, k in block_iter(old_body) if k != 'sectPr']
    new_blocks = [(e, k) for e, k in block_iter(new_body) if k != 'sectPr']

    old_keys = [blocks_text_key(e, k) for e, k in old_blocks]
    new_keys = [blocks_text_key(e, k) for e, k in new_blocks]

    body = etree.Element(qn('w:body'))

    sm = SequenceMatcher(a=old_keys, b=new_keys, autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
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
                cid = cidgen.next()
                de = make_del_container(author, date_iso, cid)
                de.append(deepcopy(oe))
                body.append(de)

        elif tag == 'insert':
            for ne, nk in new_slice:
                cid = cidgen.next()
                ins = make_ins_container(author, date_iso, cid)
                ins.append(deepcopy(ne))
                body.append(ins)

        elif tag == 'replace':
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

    # Append sectPr from new body
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

    old_parts = read_docx_xml_parts(old_path)
    new_parts = read_docx_xml_parts(new_path)

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

    redline_body = build_body_with_diffs(old_body, new_body, author, date_iso, cidgen)

    result_doc = deepcopy(new_doc)
    for child in list(result_doc):
        if child.tag == qn('w:body'):
            result_doc.remove(child)
    result_doc.append(redline_body)

    result_document_xml = serialize_xml(result_doc)

    # Ensure settings enable track revisions
    settings_xml = new_parts.get('word/settings.xml', None)
    new_parts['word/settings.xml'] = ensure_track_revisions(settings_xml)

    new_parts['word/document.xml'] = result_document_xml

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
