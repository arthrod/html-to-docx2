
from __future__ import annotations

import datetime as dt
import logging
import uuid
from copy import deepcopy
from difflib import SequenceMatcher
from typing import Optional

from lxml import etree

from .document import Document

# Configure logging
logger = logging.getLogger(__name__)

# Namespaces from redline_docx_enhanced.py
NS_W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
NS_XML = 'http://www.w3.org/XML/1998/namespace'
NSMAP = {'w': NS_W, 'r': NS_R, 'xml': NS_XML}


def _qn(tag: str) -> str:
    """Expand a QName like 'w:p' to '{namespace}p'."""
    if ':' not in tag:
        raise ValueError(f'Invalid QName format: {tag!r} (expected "prefix:local")')
    prefix, local = tag.split(':', 1)
    if prefix not in NSMAP:
        raise ValueError(f'Unknown namespace prefix: {prefix!r}')
    return f'{{{NSMAP[prefix]}}}{local}'


class _ChangeIdGen:
    """Generate unique change IDs for tracked changes."""

    def __init__(self, start: Optional[int] = None) -> None:
        if start is None:
            start = int(uuid.uuid4().int & 0x7FFFFFFF)
        self.cur = start
        logger.debug(f'Initialized ChangeIdGen with start={start}')

    def next(self) -> int:
        self.cur += 1
        return self.cur


class Redliner:
    """Applies redline diffs to DOCX documents."""

    def __init__(self, old_doc: Document, new_doc: Document):
        self.old_doc = old_doc
        self.new_doc = new_doc
        self.cidgen = _ChangeIdGen()

    def redline(self, author: str = 'AutoDiff', date_iso: Optional[str] = None):
        """Perform redline comparison and update the new document."""
        if date_iso is None:
            date_iso = self._now_iso()

        # Bridge from minidom to lxml. Note that this approach may omit node attributes,
        # comments, or processing instructions, especially with non-standard XML.
        old_body_minidom = self.old_doc['word/document.xml'].get_node(tag='w:body')
        new_body_minidom = self.new_doc['word/document.xml'].get_node(tag='w:body')

        old_body_lxml = etree.fromstring(old_body_minidom.toxml())
        new_body_lxml = etree.fromstring(new_body_minidom.toxml())

        # Perform diff
        redline_body_lxml = _build_body_with_diffs(
            old_body_lxml, new_body_lxml, author, date_iso, self.cidgen
        )

        # Bridge back from lxml to minidom
        redline_body_str = etree.tostring(redline_body_lxml, encoding='unicode')

        # Parse the redline body string into minidom
        from xml.dom import minidom
        redline_body_minidom = minidom.parseString(redline_body_str).documentElement

        # Get the existing <w:body> node in the new document
        doc_minidom = self.new_doc['word/document.xml'].dom
        body_nodes = [node for node in doc_minidom.getElementsByTagName('w:body')]
        if body_nodes:
            body_node = body_nodes[0]
            # Remove all child nodes from the body
            while body_node.hasChildNodes():
                body_node.removeChild(body_node.firstChild)
            # Append each child from the redline body
            for child in redline_body_minidom.childNodes:
                # Import node to the target document
                imported = doc_minidom.importNode(child, deep=True)
                body_node.appendChild(imported)
        else:
            # Fallback: replace the body node entirely if not found
            self.new_doc['word/document.xml'].replace_node(new_body_minidom, redline_body_str)

        self._ensure_track_revisions()

    def _now_iso(self) -> str:
        """Return current UTC timestamp in ISO 8601 format ending with 'Z'."""
        return dt.datetime.now(dt.UTC).replace(microsecond=0).isoformat().replace('+00:00', 'Z')

    def _ensure_track_revisions(self):
        """Enable <w:trackRevisions/> in settings.xml of the new document."""
        editor = self.new_doc['word/settings.xml']
        try:
            # Check if it already exists
            editor.get_node(tag='w:trackRevisions')
        except ValueError:
            # Not found, so add it
            settings_root = editor.get_node(tag='w:settings')
            editor.append_to(settings_root, '<w:trackRevisions/>')


# Diffing logic adapted from redline_docx_enhanced.py
# These are kept as module-level functions to minimize changes to the original logic.

def _text_of_element(elem: etree._Element) -> str:
    texts = [t.text or '' for t in elem.xpath('.//w:t', namespaces=NSMAP)]
    return ''.join(texts)


def _block_iter(container: etree._Element):
    for child in container:
        if child.tag == _qn('w:p'):
            yield child, 'p'
        elif child.tag == _qn('w:tbl'):
            yield child, 'tbl'
        elif child.tag == _qn('w:sectPr'):
            yield child, 'sectPr'
        else:
            yield child, 'other'


def _extract_runs_from_hyperlink(hyperlink: etree._Element) -> list[etree._Element]:
    return hyperlink.xpath('./w:r', namespaces=NSMAP)


def _process_single_run(r: etree._Element, hyperlink: Optional[etree._Element]) -> list[dict]:
    rPr = r.find(_qn('w:rPr'))
    rPr_copy = deepcopy(rPr) if rPr is not None else None
    if t_nodes := r.findall(_qn('w:t')):
        full_text = ''.join([t.text or '' for t in t_nodes])
        return [{
            'kind': 'hyperlink' if hyperlink is not None else 'text',
            'text': full_text, 'rPr': rPr_copy, 'run_xml': r, 'hyperlink': hyperlink
        }]
    if r.find(_qn('w:tab')) is not None:
        return [{'kind': 'tab', 'text': '\t', 'rPr': rPr_copy, 'run_xml': r, 'hyperlink': hyperlink}]
    if r.find(_qn('w:br')) is not None:
        return [{'kind': 'br', 'text': '\n', 'rPr': rPr_copy, 'run_xml': r, 'hyperlink': hyperlink}]
    return [{'kind': 'other', 'text': '', 'rPr': rPr_copy, 'run_xml': r, 'hyperlink': hyperlink}]


def _paragraph_runs_tokens(p: etree._Element, preserve_hyperlinks: bool = True):
    tokens = []
    for child in p:
        if child.tag == _qn('w:r'):
            tokens.extend(_process_single_run(child, None))
        elif child.tag == _qn('w:hyperlink'):
            hyperlink_arg = child if preserve_hyperlinks else None
            for r in _extract_runs_from_hyperlink(child):
                tokens.extend(_process_single_run(r, hyperlink_arg))
    return tokens


def _tokens_text_key(tokens: list[dict]) -> str:
    parts = []
    for tok in tokens:
        if tok['kind'] in {'text', 'hyperlink'}:
            parts.append(tok['text'])
        elif tok['kind'] == 'tab':
            parts.append('\t')
        elif tok['kind'] == 'br':
            parts.append('\n')
        else:
            parts.append('\ufffc')
    return ''.join(parts)


def _clone_r_with_text(text: str, rPr: Optional[etree._Element], *, deleted: bool = False) -> etree._Element:
    r = etree.Element(_qn('w:r'))
    if rPr is not None:
        r.append(deepcopy(rPr))
    t = etree.Element(_qn('w:delText') if deleted else _qn('w:t'))
    if text and (text[:1].isspace() or text[-1:].isspace()):
        t.set(f'{{{NS_XML}}}space', 'preserve')
    t.text = text
    r.append(t)
    return r


def _clone_r_special(kind: str, rPr: Optional[etree._Element], *, deleted: bool = False) -> etree._Element:
    r = etree.Element(_qn('w:r'))
    if rPr is not None:
        r.append(deepcopy(rPr))
    if kind == 'tab':
        r.append(etree.Element(_qn('w:tab')))
    elif kind == 'br':
        r.append(etree.Element(_qn('w:br')))
    return r


def _wrap_run_in_hyperlink(r: etree._Element, hyperlink_template: etree._Element) -> etree._Element:
    hl = etree.Element(_qn('w:hyperlink'))
    for attr_name in [_qn('r:id'), _qn('w:anchor'), _qn('w:tooltip')]:
        if attr_name in hyperlink_template.attrib:
            hl.set(attr_name, hyperlink_template.get(attr_name))
    hl.append(r)
    return hl


def _make_ins_container(author: str, date_iso: str, cid: int) -> etree._Element:
    ins = etree.Element(_qn('w:ins'))
    ins.set(_qn('w:id'), str(cid))
    ins.set(_qn('w:author'), author)
    ins.set(_qn('w:date'), date_iso)
    return ins


def _make_del_container(author: str, date_iso: str, cid: int) -> etree._Element:
    de = etree.Element(_qn('w:del'))
    de.set(_qn('w:id'), str(cid))
    de.set(_qn('w:author'), author)
    de.set(_qn('w:date'), date_iso)
    return de


def _add_rPrChange(new_r: etree._Element, old_rPr: Optional[etree._Element], author: str, date_iso: str, cid: int) -> None:
    if old_rPr is None:
        return
    rPr = new_r.find(_qn('w:rPr'))
    if rPr is None:
        rPr = etree.Element(_qn('w:rPr'))
        new_r.insert(0, rPr)
    rPrChange = etree.Element(_qn('w:rPrChange'))
    rPrChange.set(_qn('w:id'), str(cid))
    rPrChange.set(_qn('w:author'), author)
    rPrChange.set(_qn('w:date'), date_iso)
    prior = deepcopy(old_rPr)
    prior.tag = _qn('w:rPr')
    rPrChange.append(prior)
    rPr.append(rPrChange)


def _equal_runs_style(a_rPr: Optional[etree._Element], b_rPr: Optional[etree._Element]) -> bool:
    def as_c14n(e):
        return etree.tostring(e, method='c14n') if e is not None else b''
    return as_c14n(a_rPr) == as_c14n(b_rPr)


def _equal_p_style(a_pPr: Optional[etree._Element], b_pPr: Optional[etree._Element]) -> bool:
    def as_c14n(e):
        return etree.tostring(e, method='c14n') if e is not None else b''
    return as_c14n(a_pPr) == as_c14n(b_pPr)


def _create_deleted_run_element(
    text: str, rPr: Optional[etree._Element], author: str, date_iso: str,
    cidgen: _ChangeIdGen, hyperlink: Optional[etree._Element]
) -> etree._Element:
    """Create a <w:del> container for a run."""
    de = _make_del_container(author, date_iso, cidgen.next())
    r = _clone_r_with_text(text, rPr, deleted=True)
    if hyperlink is not None:
        r = _wrap_run_in_hyperlink(r, hyperlink)
    de.append(r)
    return de


def _create_inserted_run_element(
    text: str, rPr: Optional[etree._Element], author: str, date_iso: str,
    cidgen: _ChangeIdGen, hyperlink: Optional[etree._Element]
) -> etree._Element:
    """Create a <w:ins> container for a run."""
    ins = _make_ins_container(author, date_iso, cidgen.next())
    r = _clone_r_with_text(text, rPr, deleted=False)
    if hyperlink is not None:
        r = _wrap_run_in_hyperlink(r, hyperlink)
    ins.append(r)
    return ins


def _diff_run_text_charlevel(
    old_text: str, new_text: str, new_rPr: Optional[etree._Element], old_rPr: Optional[etree._Element],
    author: str, date_iso: str, cidgen: _ChangeIdGen, hyperlink: Optional[etree._Element] = None
) -> list[etree._Element]:
    out = []
    sm = SequenceMatcher(a=old_text, b=new_text, autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            if i2 > i1:
                r = _clone_r_with_text(old_text[i1:i2], new_rPr, deleted=False)
                if hyperlink is not None:
                    r = _wrap_run_in_hyperlink(r, hyperlink)
                out.append(r)
        elif tag == 'delete':
            if i2 > i1:
                out.append(_create_deleted_run_element(
                    old_text[i1:i2], old_rPr, author, date_iso, cidgen, hyperlink
                ))
        elif tag == 'insert':
            if j2 > j1:
                out.append(_create_inserted_run_element(
                    new_text[j1:j2], new_rPr, author, date_iso, cidgen, hyperlink
                ))
        elif tag == 'replace':
            if i2 > i1:
                out.append(_create_deleted_run_element(
                    old_text[i1:i2], old_rPr, author, date_iso, cidgen, hyperlink
                ))
            if j2 > j1:
                out.append(_create_inserted_run_element(
                    new_text[j1:j2], new_rPr, author, date_iso, cidgen, hyperlink
                ))
    return out


def _build_changed_run_container(
    tokens: list[dict], author: str, date_iso: str, cidgen: _ChangeIdGen, is_insertion: bool
) -> etree._Element | None:
    """Build a <w:ins> or <w:del> container for a slice of tokens."""
    if not tokens:
        return None

    container = _make_ins_container(author, date_iso, cidgen.next()) if is_insertion else _make_del_container(author, date_iso, cidgen.next())
    deleted_flag = not is_insertion

    for tok in tokens:
        if tok['kind'] in {'text', 'hyperlink'}:
            r = _clone_r_with_text(tok['text'], tok['rPr'], deleted=deleted_flag)
            if tok.get('hyperlink') is not None:
                r = _wrap_run_in_hyperlink(r, tok['hyperlink'])
            container.append(r)
        elif tok['kind'] in {'tab', 'br'}:
            container.append(_clone_r_special(tok['kind'], tok['rPr'], deleted=deleted_flag))
        else:
            container.append(deepcopy(tok['run_xml']))
    return container


def _build_paragraph_with_diffs(
    old_p: etree._Element, new_p: etree._Element, author: str, date_iso: str, cidgen: _ChangeIdGen
) -> etree._Element:
    out_p = etree.Element(_qn('w:p'))
    old_pPr = old_p.find(_qn('w:pPr'))
    new_pPr = new_p.find(_qn('w:pPr'))
    if new_pPr is not None:
        out_pPr = deepcopy(new_pPr)
        if not _equal_p_style(old_pPr, new_pPr):
            pPrChange = etree.Element(_qn('w:pPrChange'))
            pPrChange.set(_qn('w:id'), str(cidgen.next()))
            pPrChange.set(_qn('w:author'), author)
            pPrChange.set(_qn('w:date'), date_iso)
            if old_pPr is not None:
                pPrChange.append(deepcopy(old_pPr))
            out_pPr.append(pPrChange)
        out_p.append(out_pPr)
    elif old_pPr is not None:
        pPrChange = etree.Element(_qn('w:pPrChange'))
        pPrChange.set(_qn('w:id'), str(cidgen.next()))
        pPrChange.set(_qn('w:author'), author)
        pPrChange.set(_qn('w:date'), date_iso)
        pPrChange.append(deepcopy(old_pPr))
        out_pPr = etree.Element(_qn('w:pPr'))
        out_pPr.append(pPrChange)
        out_p.append(out_pPr)

    old_tokens = _paragraph_runs_tokens(old_p, preserve_hyperlinks=True)
    new_tokens = _paragraph_runs_tokens(new_p, preserve_hyperlinks=True)
    sm = SequenceMatcher(a=[(t['kind'], t['text']) for t in old_tokens], b=[(t['kind'], t['text']) for t in new_tokens], autojunk=False)

    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        old_slice = old_tokens[i1:i2]
        new_slice = new_tokens[j1:j2]
        if tag == 'equal':
            for o, n in zip(old_slice, new_slice):
                if o['kind'] in {'tab', 'br'}:
                    r = _clone_r_special(o['kind'], n['rPr'])
                    if not _equal_runs_style(o['rPr'], n['rPr']):
                        _add_rPrChange(r, o['rPr'], author, date_iso, cidgen.next())
                    out_p.append(r)
                elif o['kind'] in {'text', 'hyperlink'}:
                    r = _clone_r_with_text(n['text'], n['rPr'], deleted=False)
                    if not _equal_runs_style(o['rPr'], n['rPr']):
                        _add_rPrChange(r, o['rPr'], author, date_iso, cidgen.next())
                    if n.get('hyperlink') is not None:
                        r = _wrap_run_in_hyperlink(r, n['hyperlink'])
                    out_p.append(r)
                else:
                    out_p.append(deepcopy(n['run_xml']))
        elif tag == 'delete':
            if de := _build_changed_run_container(old_slice, author, date_iso, cidgen, is_insertion=False):
                out_p.append(de)
        elif tag == 'insert':
            if ins := _build_changed_run_container(new_slice, author, date_iso, cidgen, is_insertion=True):
                out_p.append(ins)
        elif tag == 'replace':
            if (len(old_slice) == 1 and len(new_slice) == 1 and
                old_slice[0]['kind'] in {'text', 'hyperlink'} and
                new_slice[0]['kind'] in {'text', 'hyperlink'}):
                pieces = _diff_run_text_charlevel(
                    old_slice[0]['text'], new_slice[0]['text'],
                    new_slice[0]['rPr'], old_slice[0]['rPr'],
                    author, date_iso, cidgen,
                    hyperlink=new_slice[0].get('hyperlink')
                )
                for node in pieces:
                    out_p.append(node)
            else:
                if de := _build_changed_run_container(old_slice, author, date_iso, cidgen, is_insertion=False):
                    out_p.append(de)
                if ins := _build_changed_run_container(new_slice, author, date_iso, cidgen, is_insertion=True):
                    out_p.append(ins)
    return out_p


def _build_table_with_diffs(
    old_tbl: etree._Element, new_tbl: etree._Element, author: str, date_iso: str, cidgen: _ChangeIdGen
) -> etree._Element:
    result_tbl = deepcopy(new_tbl)
    old_rows = old_tbl.xpath('./w:tr', namespaces=NSMAP)
    new_rows = result_tbl.xpath('./w:tr', namespaces=NSMAP)
    for i, new_row in enumerate(new_rows):
        if i < len(old_rows):
            _diff_table_row(old_rows[i], new_row, author, date_iso, cidgen)
        else:
            _mark_row_as_inserted(new_row, author, date_iso, cidgen)
    if len(old_rows) > len(new_rows):
        for i in range(len(new_rows), len(old_rows)):
            deleted_row = deepcopy(old_rows[i])
            _mark_row_as_deleted(deleted_row, author, date_iso, cidgen)
            result_tbl.append(deleted_row)
    return result_tbl


def _diff_table_row(
    old_row: etree._Element, new_row: etree._Element, author: str, date_iso: str, cidgen: _ChangeIdGen
) -> None:
    old_cells = old_row.xpath('./w:tc', namespaces=NSMAP)
    new_cells = new_row.xpath('./w:tc', namespaces=NSMAP)
    common_len = min(len(old_cells), len(new_cells))
    for i in range(common_len):
        _diff_table_cell(old_cells[i], new_cells[i], author, date_iso, cidgen)
    if len(new_cells) > len(old_cells):
        for i in range(common_len, len(new_cells)):
            new_cell = new_cells[i]
            content_to_wrap = [child for child in list(new_cell) if child.tag != _qn('w:tcPr')]
            if not content_to_wrap:
                continue
            for child in content_to_wrap:
                new_cell.remove(child)
            ins = _make_ins_container(author, date_iso, cidgen.next())
            for child in content_to_wrap:
                ins.append(child)
            new_cell.append(ins)
    if len(old_cells) > len(new_cells):
        for i in range(common_len, len(old_cells)):
            old_cell = old_cells[i]
            deleted_cell = deepcopy(old_cell)
            content_to_wrap = [child for child in list(deleted_cell) if child.tag != _qn('w:tcPr')]

            for child in content_to_wrap:
                deleted_cell.remove(child)

            if content_to_wrap:
                de = _make_del_container(author, date_iso, cidgen.next())
                for child in content_to_wrap:
                    de.append(child)
                deleted_cell.append(de)

            new_row.append(deleted_cell)


def _diff_table_cell(
    old_cell: etree._Element, new_cell: etree._Element, author: str, date_iso: str, cidgen: _ChangeIdGen
) -> None:
    old_blocks = [(e, k) for e, k in _block_iter(old_cell) if k in {'p', 'tbl'}]
    new_blocks = [(e, k) for e, k in _block_iter(new_cell) if k in {'p', 'tbl'}]
    old_keys = [_block_text_key(e, k) for e, k in old_blocks]
    new_keys = [_block_text_key(e, k) for e, k in new_blocks]
    for child in list(new_cell):
        if child.tag != _qn('w:tcPr'):
            new_cell.remove(child)
    sm = SequenceMatcher(a=old_keys, b=new_keys, autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        old_slice = old_blocks[i1:i2]
        new_slice = new_blocks[j1:j2]
        if tag == 'equal':
            for (oe, ok), (ne, nk) in zip(old_slice, new_slice):
                if ok == 'p' and nk == 'p':
                    new_cell.append(_build_paragraph_with_diffs(oe, ne, author, date_iso, cidgen))
                elif ok == 'tbl' and nk == 'tbl':
                    new_cell.append(_build_table_with_diffs(oe, ne, author, date_iso, cidgen))
                else:
                    new_cell.append(deepcopy(ne))
        elif tag == 'delete':
            for oe, ok in old_slice:
                de = _make_del_container(author, date_iso, cidgen.next())
                de.append(deepcopy(oe))
                new_cell.append(de)
        elif tag == 'insert':
            for ne, nk in new_slice:
                ins = _make_ins_container(author, date_iso, cidgen.next())
                ins.append(deepcopy(ne))
                new_cell.append(ins)
        elif tag == 'replace':
            if (len(old_slice) == 1 and len(new_slice) == 1 and
                old_slice[0][1] == 'p' and new_slice[0][1] == 'p'):
                new_cell.append(_build_paragraph_with_diffs(old_slice[0][0], new_slice[0][0], author, date_iso, cidgen))
            else:
                for oe, ok in old_slice:
                    de = _make_del_container(author, date_iso, cidgen.next())
                    de.append(deepcopy(oe))
                    new_cell.append(de)
                for ne, nk in new_slice:
                    ins = _make_ins_container(author, date_iso, cidgen.next())
                    ins.append(deepcopy(ne))
                    new_cell.append(ins)


def _mark_row_as_inserted(row: etree._Element, author: str, date_iso: str, cidgen: _ChangeIdGen) -> None:
    for cell in row.xpath('./w:tc', namespaces=NSMAP):
        content_to_wrap = [child for child in list(cell) if child.tag != _qn('w:tcPr')]
        if not content_to_wrap:
            continue
        for child in content_to_wrap:
            cell.remove(child)
        ins = _make_ins_container(author, date_iso, cidgen.next())
        for child in content_to_wrap:
            ins.append(child)
        cell.append(ins)


def _mark_row_as_deleted(row: etree._Element, author: str, date_iso: str, cidgen: _ChangeIdGen) -> None:
    for cell in row.xpath('./w:tc', namespaces=NSMAP):
        content_to_wrap = [child for child in list(cell) if child.tag != _qn('w:tcPr')]
        if not content_to_wrap:
            continue
        for child in content_to_wrap:
            cell.remove(child)
        de = _make_del_container(author, date_iso, cidgen.next())
        for child in content_to_wrap:
            de.append(child)
        cell.append(de)


def _block_text_key(elem: etree._Element, kind: str) -> str:
    if kind == 'p':
        return _tokens_text_key(_paragraph_runs_tokens(elem))
    if kind == 'tbl':
        return f'TABLE|{_text_of_element(elem)}'
    return f'OTHER|{_text_of_element(elem) or ""}'


def _build_body_with_diffs(
    old_body: etree._Element, new_body: etree._Element, author: str, date_iso: str, cidgen: _ChangeIdGen
) -> etree._Element:
    old_blocks = [(e, k) for e, k in _block_iter(old_body) if k != 'sectPr']
    new_blocks = [(e, k) for e, k in _block_iter(new_body) if k != 'sectPr']
    old_keys = [_block_text_key(e, k) for e, k in old_blocks]
    new_keys = [_block_text_key(e, k) for e, k in new_blocks]
    body = etree.Element(_qn('w:body'))
    sm = SequenceMatcher(a=old_keys, b=new_keys, autojunk=False)

    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        old_slice = old_blocks[i1:i2]
        new_slice = new_blocks[j1:j2]
        if tag == 'equal':
            for (oe, ok), (ne, nk) in zip(old_slice, new_slice):
                if ok == 'p' and nk == 'p':
                    body.append(_build_paragraph_with_diffs(oe, ne, author, date_iso, cidgen))
                elif ok == 'tbl' and nk == 'tbl':
                    body.append(_build_table_with_diffs(oe, ne, author, date_iso, cidgen))
                else:
                    body.append(deepcopy(ne))
        elif tag == 'delete':
            for oe, ok in old_slice:
                de = _make_del_container(author, date_iso, cidgen.next())
                de.append(deepcopy(oe))
                body.append(de)
        elif tag == 'insert':
            for ne, nk in new_slice:
                ins = _make_ins_container(author, date_iso, cidgen.next())
                ins.append(deepcopy(ne))
                body.append(ins)
        elif tag == 'replace':
            if (len(old_slice) == 1 and len(new_slice) == 1 and
                old_slice[0][1] == 'p' and new_slice[0][1] == 'p'):
                body.append(_build_paragraph_with_diffs(old_slice[0][0], new_slice[0][0], author, date_iso, cidgen))
            elif (len(old_slice) == 1 and len(new_slice) == 1 and
                  old_slice[0][1] == 'tbl' and new_slice[0][1] == 'tbl'):
                body.append(_build_table_with_diffs(old_slice[0][0], new_slice[0][0], author, date_iso, cidgen))
            else:
                for oe, ok in old_slice:
                    de = _make_del_container(author, date_iso, cidgen.next())
                    de.append(deepcopy(oe))
                    body.append(de)
                for ne, nk in new_slice:
                    ins = _make_ins_container(author, date_iso, cidgen.next())
                    ins.append(deepcopy(ne))
                    body.append(ins)

    sect = new_body.find(_qn('w:sectPr'))
    if sect is not None:
        body.append(deepcopy(sect))
    return body
