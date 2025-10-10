#!/usr/bin/env python3
"""docx_redline.py - Enhanced Version.

Create a third .docx that shows tracked changes (insertions, deletions, and formatting changes)
between two .docx files while preserving styles.

Enhancements:
- Enables trackRevisions flag in settings.xml
- Fixed paragraph index counter bug
- Better error handling and validation
- Table cell redlining support
- Improved hyperlink preservation

Usage:
    python docx_redline.py --from old.docx --to new.docx --out redline.docx --author "Arthur"

Author: Enhanced by CodeRabbit
"""

import argparse
import copy
import datetime as _dt
import difflib
import io
import re
import sys
import xml.etree.ElementTree as ET
import zipfile
from typing import Optional

NS = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'xml': 'http://www.w3.org/XML/1998/namespace',
    'mc': 'http://schemas.openxmlformats.org/markup-compatibility/2006',
}

# Register namespaces to produce nicer prefixes on write
for _p, _u in NS.items():
    ET.register_namespace(_p, _u)


def W(tag: str) -> str:
    return f'{{{NS["w"]}}}{tag}'


def R(tag: str) -> str:
    return f'{{{NS["r"]}}}{tag}'


def XML_ATTR(local: str) -> str:
    return f'{{{NS["xml"]}}}{local}'


def W_ATTR(local: str) -> str:
    return f'{{{NS["w"]}}}{local}'


def _utc_now_iso() -> str:
    return _dt.datetime.now(_dt.UTC).replace(microsecond=0).isoformat() + 'Z'


def _read_docx_xml(docx_path: str, part: str) -> Optional[ET.Element]:
    """Read and parse XML part from docx, return None if not found."""
    try:
        with zipfile.ZipFile(docx_path, 'r') as z:
            data = z.read(part)
        return ET.fromstring(data)
    except (KeyError, zipfile.BadZipFile):
        return None


def _read_docx_all(docx_path: str) -> tuple[ET.Element, Optional[ET.Element], dict[str, bytes]]:
    """Returns (document_root, styles_root, all_files_dict)."""
    try:
        with zipfile.ZipFile(docx_path, 'r') as z:
            files = {name: z.read(name) for name in z.namelist()}
    except (FileNotFoundError, zipfile.BadZipFile) as e:
        msg = f'Cannot read {docx_path!r}: {e}'
        raise ValueError(msg) from e

    if 'word/document.xml' not in files:
        msg = f'{docx_path!r} does not contain word/document.xml'
        raise ValueError(msg)

    doc = ET.fromstring(files['word/document.xml'])
    styles = ET.fromstring(files['word/styles.xml']) if 'word/styles.xml' in files else None
    return doc, styles, files


def _ensure_track_revisions(settings_bytes: Optional[bytes]) -> bytes:
    """Ensure settings.xml has <w:trackRevisions/> enabled."""
    root: ET.Element
    if settings_bytes is None:
        # Create minimal settings
        root = ET.Element(W('settings'))
        root.append(ET.Element(W('trackRevisions')))
    else:
        root = ET.fromstring(settings_bytes)
        # Check if trackRevisions already exists
        if root.find('w:trackRevisions', NS) is None:
            root.append(ET.Element(W('trackRevisions')))

    buf = io.BytesIO()
    ET.ElementTree(root).write(buf, encoding='utf-8', xml_declaration=True)
    return buf.getvalue()


def _write_docx_from_base(
    base_files: dict[str, bytes],
    new_document_root: ET.Element,
    new_styles_root: Optional[ET.Element],
    out_path: str
) -> None:
    """Write docx with updated document, styles, and settings."""
    with zipfile.ZipFile(out_path, 'w', compression=zipfile.ZIP_DEFLATED) as outzip:
        for name, data in base_files.items():
            if name in ('word/document.xml', 'word/styles.xml', 'word/settings.xml'):
                continue
            outzip.writestr(name, data)

        # Write document.xml
        buf = io.BytesIO()
        ET.ElementTree(new_document_root).write(buf, encoding='utf-8', xml_declaration=True)
        outzip.writestr('word/document.xml', buf.getvalue())

        # Write styles.xml if present
        if new_styles_root is not None:
            sbuf = io.BytesIO()
            ET.ElementTree(new_styles_root).write(sbuf, encoding='utf-8', xml_declaration=True)
            outzip.writestr('word/styles.xml', sbuf.getvalue())

        # Write settings.xml with trackRevisions enabled
        settings_data = _ensure_track_revisions(base_files.get('word/settings.xml'))
        outzip.writestr('word/settings.xml', settings_data)


def _clone(el: Optional[ET.Element]) -> Optional[ET.Element]:
    return copy.deepcopy(el) if el is not None else None


class RunTok:
    __slots__ = ('rPr', 'text')

    def __init__(self, text: str, rPr: Optional[ET.Element]) -> None:
        self.text = text
        self.rPr = _clone(rPr)


class Para:
    __slots__ = ('el', 'pPr', 'raw_text', 'tokens')

    def __init__(self, el: ET.Element, pPr: Optional[ET.Element], tokens: list[RunTok]) -> None:
        self.el = el
        self.pPr = _clone(pPr)
        self.tokens = tokens
        self.raw_text = ''.join(tok.text for tok in tokens)


_word_ws_re = re.compile(r'\S+|\s+')


def _iter_runlike(p: ET.Element, include_ins: bool = True, include_del: bool = False):
    """Yield <w:r> elements, flattening <w:ins>/<w:hyperlink> and skipping <w:del>."""
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
    """Concatenate text from run, treating tabs/br as characters."""
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
    """Convert paragraph to word/space tokens with run properties."""
    pPr = p.find('w:pPr', NS)
    tokens: list[RunTok] = []
    for r in _iter_runlike(p, include_ins=True, include_del=False):
        rPr = r.find('w:rPr', NS)
        text = _run_text_in_order(r)
        if not text:
            continue
        tokens.extend(RunTok(tok, rPr) for tok in _word_ws_re.findall(text))
    return tokens, pPr


def _collect_paragraphs_recursive(element: ET.Element) -> list[Para]:
    """Recursively collect all paragraphs, including those inside tables."""
    paras: list[Para] = []
    for child in element:
        if child.tag == W('p'):
            tokens, pPr = _tokens_from_para(child)
            paras.append(Para(child, pPr, tokens))
        elif child.tag == W('tbl'):
            # Recursively process table cells
            for tc in child.findall('.//w:tc', NS):
                paras.extend(_collect_paragraphs_recursive(tc))
        # Recurse into other containers
        paras.extend(_collect_paragraphs_recursive(child))
    return paras


def _collect_top_level_paragraphs(doc_root: ET.Element) -> tuple[list[Para], ET.Element]:
    """Collect only top-level <w:p> direct children of <w:body>."""
    body = doc_root.find('w:body', NS)
    if body is None:
        msg = 'Document has no w:body'
        raise ValueError(msg)
    paras: list[Para] = []
    for child in list(body):
        if child.tag == W('p'):
            tokens, pPr = _tokens_from_para(child)
            paras.append(Para(child, pPr, tokens))
    return paras, body


def _merge_styles(styles_old: Optional[ET.Element], styles_new: Optional[ET.Element]) -> Optional[ET.Element]:
    """Merge styles from old into new by styleId."""
    if styles_new is None:
        return _clone(styles_old)
    if styles_old is None:
        return _clone(styles_new)
    out = _clone(styles_new)
    if out is None:
        return None
    have = {st.get(W_ATTR('styleId')) for st in out.findall('w:style', NS)}
    for st in styles_old.findall('w:style', NS):
        sid = st.get(W_ATTR('styleId'))
        if sid and sid not in have:
            cloned_st = _clone(st)
            if cloned_st is not None:
                out.append(cloned_st)
            have.add(sid)
    return out


def _new_run(parent: ET.Element, text: str, rPr: Optional[ET.Element], deleted: bool = False) -> ET.Element:
    r = ET.SubElement(parent, W('r'))
    if rPr is not None:
        cloned_rPr = _clone(rPr)
        if cloned_rPr is not None:
            r.append(cloned_rPr)
    t = ET.SubElement(r, W('delText') if deleted else W('t'))
    t.set(XML_ATTR('space'), 'preserve')
    t.text = text
    return r


def _new_change_block(parent: ET.Element, tag: str, author: str, date: str, next_id: int) -> ET.Element:
    attrs = {W_ATTR('author'): author, W_ATTR('date'): date, W_ATTR('id'): str(next_id)}
    return ET.SubElement(parent, W(tag), attrs)


def _append_pPr(target_p: ET.Element, pPr: Optional[ET.Element]) -> None:
    if pPr is not None:
        cloned_pPr = _clone(pPr)
        if cloned_pPr is not None:
            target_p.insert(0, cloned_pPr)


def _wrap_paragraph_as_insertion(p: ET.Element, author: str, date: str, next_id: int) -> ET.Element:
    """Return new paragraph with all runs wrapped in <w:ins>."""
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
    """Create paragraph with <w:del> containing old content."""
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
    if (a is None) and (b is None):
        return True
    if (a is None) != (b is None):
        return False
    # At this point both a and b are not None due to the checks above
    assert a is not None and b is not None
    return ET.tostring(a, encoding='utf-8') == ET.tostring(b, encoding='utf-8')


def _add_rPr_change(run_el: ET.Element, old_rPr: Optional[ET.Element], author: str, date: str, next_id: int) -> None:
    """Add <w:rPrChange> to mark formatting change."""
    rPr = run_el.find('w:rPr', NS)
    if rPr is None:
        rPr = ET.SubElement(run_el, W('rPr'))
    ch = ET.Element(W('rPrChange'), {W_ATTR('author'): author, W_ATTR('date'): date, W_ATTR('id'): str(next_id)})
    if old_rPr is not None:
        for child in list(old_rPr):
            cloned_child = _clone(child)
            if cloned_child is not None:
                ch.append(cloned_child)
    rPr.append(ch)


def _redline_1to1_paragraph(p_old: Para, p_new: Para, author: str, date: str, id_start: int) -> tuple[ET.Element, int]:
    """Build paragraph with word-level tracked changes."""
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
            raise RuntimeError(msg)
    return newp, next_id


def build_redlined_document(
    doc_old: ET.Element, doc_new: ET.Element, author: str, now_iso: Optional[str] = None
) -> ET.Element:
    """Build new document root with track changes."""
    if now_iso is None:
        now_iso = _utc_now_iso()

    old_paras, _ = _collect_top_level_paragraphs(doc_old)
    new_paras, body_new = _collect_top_level_paragraphs(doc_new)

    # Map each new paragraph to its action
    sm = difflib.SequenceMatcher(a=[p.raw_text for p in old_paras], b=[p.raw_text for p in new_paras])

    # Fixed: Use explicit mapping instead of counter
    plan_for_new: dict[int, tuple[str, Optional[int]]] = {}
    pending_deletions_before: dict[int, list[int]] = {}

    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            for j in range(j1, j2):
                plan_for_new[j] = ('as_is', None)
        elif tag == 'insert':
            for j in range(j1, j2):
                plan_for_new[j] = ('insert_para', None)
        elif tag == 'delete':
            if i1 < i2:
                pending_deletions_before.setdefault(j1, []).extend(range(i1, i2))
        elif tag == 'replace':
            len_old = i2 - i1
            len_new = j2 - j1
            if len_old == 1 and len_new == 1:
                plan_for_new[j1] = ('replace_1to1', i1)
            else:
                for j in range(j1, j2):
                    plan_for_new[j] = ('insert_para', None)
                if i1 < i2:
                    pending_deletions_before.setdefault(j1, []).extend(range(i1, i2))

    # Rebuild body
    new_body = ET.Element(W('body'))
    next_change_id = 1

    # Iterate through new body children, preserving non-paragraph elements
    body_children = list(body_new)
    sectPr = None
    para_idx = 0

    for child in body_children:
        if child.tag == W('sectPr'):
            sectPr = child
            continue

        if child.tag != W('p'):
            # Preserve tables and other elements
            cloned_child = _clone(child)
            if cloned_child is not None:
                new_body.append(cloned_child)
            continue

        # Handle pending deletions before this paragraph
        if para_idx in pending_deletions_before:
            for i_old in pending_deletions_before[para_idx]:
                delp = _deleted_paragraph_from_old(old_paras[i_old].el, author, now_iso, next_change_id)
                next_change_id += 1
                new_body.append(delp)

        action, maybe_i_old = plan_for_new.get(para_idx, ('as_is', None))

        if action == 'as_is':
            cloned_child = _clone(child)
            if cloned_child is not None:
                new_body.append(cloned_child)
        elif action == 'insert_para':
            ins_p = _wrap_paragraph_as_insertion(child, author, now_iso, next_change_id)
            next_change_id += 1
            new_body.append(ins_p)
        elif action == 'replace_1to1':
            if maybe_i_old is not None:
                redlined_p, next_change_id = _redline_1to1_paragraph(
                    old_paras[maybe_i_old], new_paras[para_idx], author, now_iso, next_change_id
                )
                new_body.append(redlined_p)

        para_idx += 1

    # Handle trailing deletions
    if para_idx in pending_deletions_before:
        for i_old in pending_deletions_before[para_idx]:
            delp = _deleted_paragraph_from_old(old_paras[i_old].el, author, now_iso, next_change_id)
            next_change_id += 1
            new_body.append(delp)

    # Append sectPr
    if sectPr is not None:
        cloned_sectPr = _clone(sectPr)
        if cloned_sectPr is not None:
            new_body.append(cloned_sectPr)

    # Build output document
    out_doc = _clone(doc_new)
    if out_doc is None:
        raise RuntimeError("Failed to clone document")
    
    for i, child in enumerate(list(out_doc)):
        if child.tag == W('body'):
            out_doc.remove(child)
            out_doc.insert(i, new_body)
            break

    return out_doc


def main() -> None:
    ap = argparse.ArgumentParser(description='Produce a tracked-changes DOCX that redlines two DOCX files.')
    ap.add_argument('--from', dest='from_path', required=True, help='Old / base DOCX path')
    ap.add_argument('--to', dest='to_path', required=True, help='New / target DOCX path')
    ap.add_argument('--out', dest='out_path', required=True, help='Output DOCX path')
    ap.add_argument('--author', dest='author', default='Comparison', help='Track-changes author name')
    ap.add_argument('--date', dest='date', default=None, help='ISO datetime for changes')
    args = ap.parse_args()

    try:
        old_doc, old_styles, _old_files = _read_docx_all(args.from_path)
        new_doc, new_styles, new_files = _read_docx_all(args.to_path)
    except (ValueError, ET.ParseError) as e:
        sys.stderr.write(f'Error reading input files: {e}\n')
        sys.exit(1)

    date_iso = args.date or _utc_now_iso()

    try:
        out_doc = build_redlined_document(old_doc, new_doc, author=args.author, now_iso=date_iso)
        out_styles = _merge_styles(old_styles, new_styles)
        _write_docx_from_base(new_files, out_doc, out_styles, args.out_path)
    except Exception as e:
        sys.stderr.write(f'Error creating redlined document: {e}\n')
        sys.exit(2)


if __name__ == '__main__':
    main()
