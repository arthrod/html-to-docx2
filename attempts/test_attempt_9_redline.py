"""Tests for redline helpers in attempt_9_pro_new.py."""

from __future__ import annotations

import importlib.util
import re
from pathlib import Path

import pytest

SPEC = importlib.util.spec_from_file_location(
    "attempt_9_pro_new",
    Path(__file__).with_name("attempt_9_pro_new.py"),
)
mod = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(mod)


def test_now_iso_is_word_valid_zulu():
    stamp = mod.now_iso()
    assert re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", stamp)
    assert "+00:00" not in stamp


def test_paragraph_runs_tokens_includes_hyperlink_text():
    xml = (
        '<w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        '<w:hyperlink w:anchor="x"><w:r><w:t>Link A</w:t></w:r></w:hyperlink>'
        "</w:p>"
    )
    p = mod.ET.fromstring(xml)
    tokens = mod.paragraph_runs_tokens(p)
    assert [t["text"] for t in tokens] == ["Link A"]


def test_mark_paragraph_delete_reuses_one_change_id():
    xml = (
        '<w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        "<w:r><w:t>gone</w:t></w:r></w:p>"
    )
    p = mod.ET.fromstring(xml)
    cidgen = mod.ChangeIdGen(start=10)
    marked = mod.mark_paragraph_delete(p, "Ada", "2026-01-01T00:00:00Z", cidgen)
    ids = [el.get(mod.qn("w:id")) for el in marked.iter() if el.get(mod.qn("w:id"))]
    assert ids == ["11", "11"]
