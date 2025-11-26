#!/usr/bin/env python3
"""docx_redline.py.

Create a third .docx that shows tracked changes (insertions, deletions, and formatting changes)
between two .docx files while preserving styles.

Usage:
    python docx_redline.py --from old.docx --to new.docx --out redline.docx --author "Arthur"

Notes & scope:
- Paragraph-level alignment is performed over top-level body paragraphs. Non-paragraph top-level
  elements in the "to/new" document (e.g., tables) are preserved as-is and remain in place.
- Word-level redlines are produced for 1:1 paragraph replacements. N↔M replacements are modeled
  as deletions followed by insertions at the same location.
- Text inside tables is NOT redlined with this version; those paragraphs are left unchanged
  (they remain present in the output because we copy the "to/new" structure).
  If you need redlines inside tables, extend the walker to process p-elements inside w:tbl.
- Existing tracked changes in the inputs are effectively "accepted" for the purposes of comparison:
  insertions are kept, deletions are ignored.

This script uses only the standard library (zipfile, xml.etree), no external deps.
If the 'graphtage' package is available, you could adapt the SequenceMatcher parts to use it,
but this script does not require it.

Author: (you)
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
    # e.g., XML_ATTR('space') -> '{http://www.w3.org/XML/1998/namespace}space'
    return f'{{{NS["xml"]}}}{local}'


def W_ATTR(local: str) -> str:
    # e.g., W_ATTR('author') -> '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}author'
    return f'{{{NS["w"]}}}{local}'


def _utc_now_iso() -> str:
    # Word allows UTC timestamp; use 'Z' suffix
    return _dt.datetime.now(_dt.UTC).replace(microsecond=0).isoformat() + 'Z'


def _read_docx_xml(docx_path: str, part: str) -> ET.Element:
    with zipfile.ZipFile(docx_path, 'r') as z:
        data = z.read(part)
    return ET.fromstring(data)


def _read_docx_all(docx_path: str) -> tuple[ET.Element, Optional[ET.Element], dict[str, bytes]]:
    """Returns (document_root, styles_root, all_files_dict) where document_root is word/document.xml root element."""
    with zipfile.ZipFile(docx_path, 'r') as z:
        files = {name: z.read(name) for name in z.namelist()}
    if 'word/document.xml' not in files:
        msg = f'{docx_path!r} does not contain word/document.xml'
        raise ValueError(msg)
    doc = ET.fromstring(files['word/document.xml'])
    styles = ET.fromstring(files['word/styles.xml']) if 'word/styles.xml' in files else None
    return doc, styles, files


def _write_docx_from_base(
    base_files: dict[str, bytes], new_document_root: ET.Element, new_styles_root: Optional[ET.Element], out_path: str
) -> None:
    with zipfile.ZipFile(out_path, 'w', compression=zipfile.ZIP_DEFLATED) as outzip:
        for name, data in base_files.items():
            if name == 'word/document.xml':
                # replaced below
                continue
            if name == 'word/styles.xml' and new_styles_root is not None:
                # replaced below
                continue
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
    """Yield <w:r> elements in logical order for a paragraph, flattening <w:ins> (if include_ins)
    and skipping <w:del> (unless include_del).
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
        else:
            # ignore other nodes inside a paragraph here
            pass


def _run_text_in_order(r: ET.Element) -> str:
    """Concatenate text-bearing children of a run in order.
    We preserve whitespace and treat tabs/br as characters.
    """
    out = []
    for ch in r:
        if ch.tag == W('t') or ch.tag == W('delText'):
            out.append(ch.text or '')
        elif ch.tag == W('tab'):
            out.append('\t')
        elif ch.tag == W('br'):
            out.append('\n')
        # skip other elements (drawing, fields, etc.) for diff purposes
    return ''.join(out)


def _tokens_from_para(p: ET.Element) -> tuple[list[RunTok], Optional[ET.Element]]:
    """Convert a paragraph element into a sequence of word/space tokens with their run properties.
    Returns (tokens, pPr).
    """
    pPr = p.find('w:pPr', NS)
    tokens: list[RunTok] = []
    for r in _iter_runlike(p, include_ins=True, include_del=False):
        rPr = r.find('w:rPr', NS)
        text = _run_text_in_order(r)
        if not text:
            continue
        # Split into word and whitespace tokens, keep rPr per token
        tokens.extend(RunTok(tok, rPr) for tok in _word_ws_re.findall(text))
    return tokens, pPr


def _collect_top_level_paragraphs(doc_root: ET.Element) -> tuple[list[Para], ET.Element]:
    """Collect only top-level <w:p> that are direct children of <w:body>.
    Return ([Para], body_el).
    """
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
    r = ET.SubElement(parent, W('r'))
    if rPr is not None:
        r.append(_clone(rPr))
    t = ET.SubElement(r, W('delText') if deleted else W('t'))
    # Always preserve spaces to avoid collapsing
    t.set(XML_ATTR('space'), 'preserve')
    t.text = text
    return r


def _new_change_block(parent: ET.Element, tag: str, author: str, date: str, next_id: int) -> ET.Element:
    # tag is 'ins' or 'del'
    attrs = {W_ATTR('author'): author, W_ATTR('date'): date, W_ATTR('id'): str(next_id)}
    return ET.SubElement(parent, W(tag), attrs)


def _append_pPr(target_p: ET.Element, pPr: Optional[ET.Element]) -> None:
    if pPr is not None:
        target_p.append(_clone(pPr))


def _wrap_paragraph_as_insertion(p: ET.Element, author: str, date: str, next_id: int) -> ET.Element:
    """Return a new paragraph where all runs of p are wrapped inside a single <w:ins>."""
    newp = ET.Element(W('p'))
    _append_pPr(newp, p.find('w:pPr', NS))
    ins = _new_change_block(newp, 'ins', author, date, next_id)
    # Copy runs/hyperlinks within paragraph in order into the ins block
    for r in _iter_runlike(p, include_ins=True, include_del=False):
        text = _run_text_in_order(r)
        if not text:
            continue
        rPr = r.find('w:rPr', NS)
        # Split to preserve spacing faithfully
        for tok in _word_ws_re.findall(text):
            _new_run(ins, tok, rPr, deleted=False)
    return newp


def _deleted_paragraph_from_old(p_old: ET.Element, author: str, date: str, next_id: int) -> ET.Element:
    """Create a new paragraph consisting of a single <w:del> with the old paragraph's content as deleted runs."""
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
    return ET.tostring(a, encoding='utf-8') == ET.tostring(b, encoding='utf-8')


def _add_rPr_change(run_el: ET.Element, old_rPr: Optional[ET.Element], author: str, date: str, next_id: int) -> None:
    """For a run whose text is unchanged but formatting differs, append <w:rPrChange> with the prior formatting."""
    rPr = run_el.find('w:rPr', NS)
    if rPr is None:
        rPr = ET.SubElement(run_el, W('rPr'))
    ch = ET.Element(W('rPrChange'), {W_ATTR('author'): author, W_ATTR('date'): date, W_ATTR('id'): str(next_id)})
    if old_rPr is not None:
        # Insert the old formatting properties inside rPrChange:
        for child in list(old_rPr):
            ch.append(_clone(child))
    rPr.append(ch)


def _redline_1to1_paragraph(p_old: Para, p_new: Para, author: str, date: str, id_start: int) -> tuple[ET.Element, int]:
    """Build a new paragraph with word-level tracked changes between p_old and p_new.
    Returns (new_paragraph_element, next_id_after_use).
    """
    next_id = id_start
    newp = ET.Element(W('p'))
    _append_pPr(newp, p_new.pPr if p_new.pPr is not None else p_old.pPr)

    old_tokens = p_old.tokens
    new_tokens = p_new.tokens

    sm = difflib.SequenceMatcher(a=[t.text for t in old_tokens], b=[t.text for t in new_tokens])
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            # Emit new runs using NEW formatting; if formatting changed vs old, add rPrChange
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
    """Returns a NEW document root (<w:document>) whose <w:body> is rebuilt with track changes.
    Uses 'doc_new' as the structural base (preserves all non-paragraph direct children).
    """
    if now_iso is None:
        now_iso = _utc_now_iso()

    # Prepare top-level body structures
    old_paras, _ = _collect_top_level_paragraphs(doc_old)
    new_paras, _body_new = _collect_top_level_paragraphs(doc_new)

    # Map position of top-level paragraphs in doc_new to their indices among body children
    body_children = list(doc_new.find('w:body', NS))
    [i for i, ch in enumerate(body_children) if ch.tag == W('p')]

    # Paragraph-level diff (by textual content)
    sm = difflib.SequenceMatcher(a=[p.raw_text for p in old_paras], b=[p.raw_text for p in new_paras])

    # Plan: for each doc_new paragraph index j, how to output it; and where to inject deletion-only paragraphs.
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
            # no paragraph at position j in new doc; schedule deletions before j
            if i1 < i2:
                pending_deletions_at_index.setdefault(j1, []).extend(list(range(i1, i2)))
        elif tag == 'replace':
            len_old = i2 - i1
            len_new = j2 - j1
            if len_old == 1 and len_new == 1:
                plan_for_p2[j1] = ('replace_1to1', i1)
            else:
                # generalized: insert all new paras, and inject deletions before the first new position
                for j in range(j1, j2):
                    plan_for_p2[j] = ('insert_para', None)
                if i1 < i2:
                    pending_deletions_at_index.setdefault(j1, []).extend(list(range(i1, i2)))
        else:
            msg = f'Unexpected opcode: {tag}'
            raise RuntimeError(msg)

    # Rebuild a new body: iterate through original new body children to preserve non-paragraph items & order
    new_body = ET.Element(W('body'))
    next_change_id = 1

    # We'll need to detect the (last) sectPr from the new doc body to append at the end
    sectPr = None
    for ch in body_children:
        if ch.tag == W('sectPr'):
            sectPr = ch  # keep last sectPr
        elif ch.tag != W('p'):
            # preserve non-paragraph children (e.g., tables) as-is
            new_body.append(_clone(ch))
        else:
            # This is a paragraph in new doc; determine its paragraph index j among top-level paras
            j = len([x for x in new_body if x.tag == W('p')])  # not reliable because we added non-p too
            # The above line counts paragraphs we have already appended to new_body, not the index in new_paras.
            # We need the original index among NEW-paragraphs up to this child. Compute from body_children.
            # Calculate j by counting how many 'p' we've passed in the original sequence up to this child index.
            # We'll maintain a separate counter instead.
            # will handle below

    # Rebuild again with a correct streaming counter:
    new_body = ET.Element(W('body'))
    new_para_counter = 0
    for ch in body_children:
        if ch.tag == W('sectPr'):
            sectPr = ch
            continue
        if ch.tag != W('p'):
            new_body.append(_clone(ch))
            continue

        # Inject any pending deletions scheduled for BEFORE this new paragraph index
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
            i_old = maybe_i_old  # type: ignore
            para_old = old_paras[i_old]
            # Build word-level tracked paragraph
            para_new_index = new_para_counter
            para_new = new_paras[para_new_index]
            redlined_p, next_change_id = _redline_1to1_paragraph(para_old, para_new, author, now_iso, next_change_id)
            new_body.append(redlined_p)
        else:
            msg = f'Unknown action: {action}'
            raise RuntimeError(msg)

        new_para_counter += 1

    # Any deletions scheduled after the last paragraph?
    if new_para_counter in pending_deletions_at_index:
        for i_old in pending_deletions_at_index[new_para_counter]:
            delp = _deleted_paragraph_from_old(old_paras[i_old].el, author, now_iso, next_change_id)
            next_change_id += 1
            new_body.append(delp)

    # Append sectPr at the end if present
    if sectPr is not None:
        new_body.append(_clone(sectPr))

    # Build a new document root by cloning doc_new root and swapping its body
    out_doc = _clone(doc_new)
    # replace the body element
    parent = out_doc  # <w:document>
    # Find old body
    for i, child in enumerate(list(parent)):
        if child.tag == W('body'):
            parent.remove(child)
            parent.insert(i, new_body)
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

    # Write using "to/new" as the base package so relationships stay consistent
    _write_docx_from_base(new_files, out_doc, out_styles, args.out_path)


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        sys.stderr.write(f'Error: {e!s}\n')
        sys.exit(2)
