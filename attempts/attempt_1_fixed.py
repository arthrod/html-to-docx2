#!/usr/bin/env python3
"""docx_redline_fixed.py.

Create a third .docx that shows tracked changes (insertions, deletions, and formatting changes)
between two .docx files while preserving styles correctly.

Based on attempt_1.py with fixes for:
- Paragraph property changes (pPrChange) tracking
- Run property changes (rPrChange) for all formatting changes including when old has no formatting
- Proper element ordering according to OOXML spec
- Style references (pStyle, rStyle) preservation

Usage:
    python attempt_1_fixed.py --from old.docx --to new.docx --out redline.docx --author "Arthur"

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


def _read_docx_xml(docx_path: str, part: str) -> ET.Element:
    with zipfile.ZipFile(docx_path, 'r') as z:
        data = z.read(part)
    return ET.fromstring(data)


def _read_docx_all(docx_path: str) -> tuple[ET.Element, Optional[ET.Element], dict[str, bytes]]:
    """Returns (document_root, styles_root, all_files_dict)."""
    with zipfile.ZipFile(docx_path, 'r') as z:
        files = {name: z.read(name) for name in z.namelist()}
    if 'word/document.xml' not in files:
        msg = f'{docx_path!r} does not contain word/document.xml'
        raise ValueError(msg)
    doc = ET.fromstring(files['word/document.xml'])
    styles = ET.fromstring(files['word/styles.xml']) if 'word/styles.xml' in files else None
    return doc, styles, files


def _write_docx_from_base(
    base_files: dict[str, bytes], new_document_root: ET.Element, new_styles_root: Optional[ET.Element],
    out_path: str, enable_track_revisions: bool = True
) -> None:
    with zipfile.ZipFile(out_path, 'w', compression=zipfile.ZIP_DEFLATED) as outzip:
        for name, data in base_files.items():
            if name == 'word/document.xml':
                continue
            if name == 'word/styles.xml' and new_styles_root is not None:
                continue
            if name == 'word/settings.xml' and enable_track_revisions:
                # Modify settings to enable track revisions
                data = _ensure_track_revisions(data)
            outzip.writestr(name, data)

        # Write the new document.xml
        buf = io.BytesIO()
        ET.ElementTree(new_document_root).write(buf, encoding='utf-8', xml_declaration=True)
        outzip.writestr('word/document.xml', buf.getvalue())

        # Write new styles.xml if we have it
        if new_styles_root is not None:
            sbuf = io.BytesIO()
            ET.ElementTree(new_styles_root).write(sbuf, encoding='utf-8', xml_declaration=True)
            outzip.writestr('word/styles.xml', sbuf.getvalue())


def _ensure_track_revisions(settings_data: bytes) -> bytes:
    """Ensure trackRevisions is enabled in settings.xml."""
    root = ET.fromstring(settings_data)
    # Check if trackRevisions already exists
    existing = root.find('w:trackRevisions', NS)
    if existing is None:
        # Add trackRevisions element
        track_rev = ET.Element(W('trackRevisions'))
        # Try to insert after proofState if it exists, otherwise at beginning
        proof_state = root.find('w:proofState', NS)
        if proof_state is not None:
            idx = list(root).index(proof_state)
            root.insert(idx + 1, track_rev)
        else:
            root.insert(0, track_rev)

    buf = io.BytesIO()
    ET.ElementTree(root).write(buf, encoding='utf-8', xml_declaration=True)
    return buf.getvalue()


def _clone(el: Optional[ET.Element]) -> Optional[ET.Element]:
    return copy.deepcopy(el) if el is not None else None


# ---------- Paragraph and run extraction ----------


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
    """Yield <w:r> elements in logical order for a paragraph."""
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
    """Concatenate text-bearing children of a run in order."""
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
    """Convert a paragraph element into a sequence of word/space tokens."""
    pPr = p.find('w:pPr', NS)
    tokens: list[RunTok] = []
    for r in _iter_runlike(p, include_ins=True, include_del=False):
        rPr = r.find('w:rPr', NS)
        text = _run_text_in_order(r)
        if not text:
            continue
        tokens.extend(RunTok(tok, rPr) for tok in _word_ws_re.findall(text))
    return tokens, pPr


def _collect_top_level_paragraphs(doc_root: ET.Element) -> tuple[list[Para], ET.Element]:
    """Collect only top-level <w:p> that are direct children of <w:body>."""
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


# ---------- Styles merge ----------


def _merge_styles(styles_old: Optional[ET.Element], styles_new: Optional[ET.Element]) -> Optional[ET.Element]:
    """Merge styles from styles_old into styles_new by styleId if missing."""
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
            out.append(_clone(st))
            have.add(sid)
    return out


# ---------- Building WordprocessingML with track changes ----------


def _new_run(parent: ET.Element, text: str, rPr: Optional[ET.Element], deleted: bool = False) -> ET.Element:
    """Create a new run element with text and optional run properties."""
    r = ET.SubElement(parent, W('r'))
    if rPr is not None:
        r.append(_clone(rPr))
    t = ET.SubElement(r, W('delText') if deleted else W('t'))
    t.set(XML_ATTR('space'), 'preserve')
    t.text = text
    return r


def _new_change_block(parent: ET.Element, tag: str, author: str, date: str, next_id: int) -> ET.Element:
    """Create a new ins or del element."""
    attrs = {W_ATTR('author'): author, W_ATTR('date'): date, W_ATTR('id'): str(next_id)}
    return ET.SubElement(parent, W(tag), attrs)


def _append_pPr(target_p: ET.Element, pPr: Optional[ET.Element]) -> None:
    if pPr is not None:
        target_p.append(_clone(pPr))


def _same_rpr(a: Optional[ET.Element], b: Optional[ET.Element]) -> bool:
    """Compare run properties by XML serialization."""
    if (a is None) and (b is None):
        return True
    if (a is None) != (b is None):
        return False
    return ET.tostring(a, encoding='utf-8') == ET.tostring(b, encoding='utf-8')


def _same_ppr(a: Optional[ET.Element], b: Optional[ET.Element]) -> bool:
    """Compare paragraph properties by XML serialization."""
    if (a is None) and (b is None):
        return True
    if (a is None) != (b is None):
        return False
    return ET.tostring(a, encoding='utf-8') == ET.tostring(b, encoding='utf-8')


def _add_rPr_change(run_el: ET.Element, old_rPr: Optional[ET.Element], author: str, date: str, next_id: int) -> None:
    """Add rPrChange to track run formatting changes.

    This properly handles all cases:
    - old_rPr exists, new_rPr exists: stores old in rPrChange
    - old_rPr is None, new_rPr exists: stores empty rPr in rPrChange
    - old_rPr exists, new_rPr is None: creates new rPr with rPrChange containing old
    """
    rPr = run_el.find('w:rPr', NS)

    # Create rPrChange element
    ch = ET.Element(W('rPrChange'), {W_ATTR('author'): author, W_ATTR('date'): date, W_ATTR('id'): str(next_id)})

    if old_rPr is not None:
        # Store the old formatting inside rPrChange
        old_rPr_copy = _clone(old_rPr)
        # Remove any existing rPrChange from the copy (shouldn't be there, but safety)
        existing_change = old_rPr_copy.find('w:rPrChange', NS)
        if existing_change is not None:
            old_rPr_copy.remove(existing_change)
        for child in list(old_rPr_copy):
            ch.append(child)
    # else: empty rPrChange indicates the old had no formatting

    if rPr is None:
        # Create a new rPr element and add rPrChange to it
        rPr = ET.Element(W('rPr'))
        run_el.insert(0, rPr)

    # Add rPrChange at the end of rPr (proper OOXML ordering)
    rPr.append(ch)


def _add_pPr_change(pPr_el: ET.Element, old_pPr: Optional[ET.Element], author: str, date: str, next_id: int) -> None:
    """Add pPrChange to track paragraph formatting changes."""
    ch = ET.Element(W('pPrChange'), {W_ATTR('author'): author, W_ATTR('date'): date, W_ATTR('id'): str(next_id)})

    if old_pPr is not None:
        # Store the old paragraph properties inside pPrChange
        old_pPr_copy = _clone(old_pPr)
        # Remove any existing pPrChange from the copy
        existing_change = old_pPr_copy.find('w:pPrChange', NS)
        if existing_change is not None:
            old_pPr_copy.remove(existing_change)
        for child in list(old_pPr_copy):
            ch.append(child)

    # Add pPrChange at the end of pPr (proper OOXML ordering)
    pPr_el.append(ch)


def _wrap_paragraph_as_insertion(p: ET.Element, author: str, date: str, next_id: int) -> ET.Element:
    """Return a new paragraph where all runs are wrapped inside a single <w:ins>."""
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
    """Create a paragraph with deleted content from old paragraph."""
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


def _redline_1to1_paragraph(p_old: Para, p_new: Para, author: str, date: str, id_start: int) -> tuple[ET.Element, int]:
    """Build a new paragraph with word-level tracked changes between p_old and p_new.

    Now properly tracks both run property changes (rPrChange) and paragraph property changes (pPrChange).
    """
    next_id = id_start
    newp = ET.Element(W('p'))

    # Handle paragraph properties and track changes
    new_pPr = _clone(p_new.pPr) if p_new.pPr is not None else None
    old_pPr = p_old.pPr

    if new_pPr is not None:
        # Check if paragraph properties changed
        if not _same_ppr(old_pPr, new_pPr):
            _add_pPr_change(new_pPr, old_pPr, author, date, next_id)
            next_id += 1
        newp.append(new_pPr)
    elif old_pPr is not None:
        # New paragraph has no properties but old did - create pPr with pPrChange
        new_pPr = ET.Element(W('pPr'))
        _add_pPr_change(new_pPr, old_pPr, author, date, next_id)
        next_id += 1
        newp.append(new_pPr)

    old_tokens = p_old.tokens
    new_tokens = p_new.tokens

    sm = difflib.SequenceMatcher(a=[t.text for t in old_tokens], b=[t.text for t in new_tokens])

    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            # Emit runs with new formatting; track formatting changes with rPrChange
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
            # Delete old, then insert new
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


# ---------- High-level diff orchestration ----------


def build_redlined_document(
    doc_old: ET.Element, doc_new: ET.Element, author: str, now_iso: Optional[str] = None
) -> ET.Element:
    """Returns a NEW document root with track changes."""
    if now_iso is None:
        now_iso = _utc_now_iso()

    old_paras, _ = _collect_top_level_paragraphs(doc_old)
    new_paras, _body_new = _collect_top_level_paragraphs(doc_new)

    body_children = list(doc_new.find('w:body', NS))

    sm = difflib.SequenceMatcher(a=[p.raw_text for p in old_paras], b=[p.raw_text for p in new_paras])

    plan_for_p2: dict[int, tuple[str, Optional[int]]] = {}
    pending_deletions_at_index: dict[int, list[int]] = {}

    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            for j in range(j1, j2):
                # Even for equal text, track formatting changes
                plan_for_p2[j] = ('check_formatting', i1 + (j - j1))
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
        else:
            msg = f'Unexpected opcode: {tag}'
            raise RuntimeError(msg)

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

        # Inject pending deletions
        if new_para_counter in pending_deletions_at_index:
            for i_old in pending_deletions_at_index[new_para_counter]:
                old_p_el = old_paras[i_old].el
                delp = _deleted_paragraph_from_old(old_p_el, author, now_iso, next_change_id)
                next_change_id += 1
                new_body.append(delp)

        action, maybe_i_old = plan_for_p2.get(new_para_counter, ('as_is', None))

        if action == 'as_is':
            new_body.append(_clone(ch))
        elif action == 'check_formatting':
            # Text is equal but need to check for formatting changes
            i_old = maybe_i_old
            para_old = old_paras[i_old]
            para_new = new_paras[new_para_counter]
            redlined_p, next_change_id = _redline_1to1_paragraph(para_old, para_new, author, now_iso, next_change_id)
            new_body.append(redlined_p)
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
        else:
            msg = f'Unknown action: {action}'
            raise RuntimeError(msg)

        new_para_counter += 1

    # Deletions after the last paragraph
    if new_para_counter in pending_deletions_at_index:
        for i_old in pending_deletions_at_index[new_para_counter]:
            delp = _deleted_paragraph_from_old(old_paras[i_old].el, author, now_iso, next_change_id)
            next_change_id += 1
            new_body.append(delp)

    if sectPr is not None:
        new_body.append(_clone(sectPr))

    out_doc = _clone(doc_new)
    for i, child in enumerate(list(out_doc)):
        if child.tag == W('body'):
            out_doc.remove(child)
            out_doc.insert(i, new_body)
            break
    else:
        msg = 'No w:body in document'
        raise RuntimeError(msg)

    return out_doc


# ---------- CLI ----------


def main() -> None:
    ap = argparse.ArgumentParser(description='Produce a tracked-changes DOCX that redlines two DOCX files.')
    ap.add_argument('--from', dest='from_path', required=True, help='Old / base DOCX path')
    ap.add_argument('--to', dest='to_path', required=True, help='New / target DOCX path')
    ap.add_argument('--out', dest='out_path', required=True, help='Output DOCX path')
    ap.add_argument('--author', dest='author', default='Comparison', help='Track-changes author name')
    ap.add_argument(
        '--date',
        dest='date',
        default=None,
        help='ISO datetime for changes (default: now UTC, e.g., 2025-10-10T12:00:00Z)',
    )
    args = ap.parse_args()

    old_doc, old_styles, _old_files = _read_docx_all(args.from_path)
    new_doc, new_styles, new_files = _read_docx_all(args.to_path)

    date_iso = args.date or _utc_now_iso()

    out_doc = build_redlined_document(old_doc, new_doc, author=args.author, now_iso=date_iso)
    out_styles = _merge_styles(old_styles, new_styles)

    _write_docx_from_base(new_files, out_doc, out_styles, args.out_path, enable_track_revisions=True)


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        sys.stderr.write(f'Error: {e!s}\n')
        sys.exit(2)
