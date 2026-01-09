from __future__ import annotations

"""Typer-based CLI for generating DOCX redlines.

This command-line interface wraps the unpack, redline, and pack helpers
to compare an original DOCX against a modified version and emit a tracked
changes document. It is intentionally small and composable so it can be
embedded in other tooling or invoked directly from tests.
"""

import logging
import tempfile
from pathlib import Path

import typer

from .document import Document
from .redliner import Redliner
from ..ooxml.scripts.pack import pack_document
from ..ooxml.scripts.unpack import unpack_document

app = typer.Typer(add_completion=False, no_args_is_help=True, help="Generate DOCX redlines")


def _default_destination(modified: Path) -> Path:
    """Return the default destination path for a redlined document.

    The file is placed next to the modified document with a `_redlined`
    suffix so the source artifacts are left untouched.
    """

    return modified.with_name(f"{modified.stem}_redlined{modified.suffix}")


@app.command()
def redline(
    original: Path = typer.Option(..., "--original", "-o", exists=True, readable=True, resolve_path=True, help="Path to the original DOCX"),
    modified: Path = typer.Option(..., "--modified", "-m", exists=True, readable=True, resolve_path=True, help="Path to the modified DOCX"),
    destination_file: Path | None = typer.Option(
        None,
        "--destination-file",
        "-d",
        resolve_path=True,
        help="Optional output path; defaults to <modified>_redlined.docx",
    ),
    author: str = typer.Option("AutoDiff", "--author", "-a", help="Tracked changes author"),
    date: str | None = typer.Option(None, "--date", help="ISO 8601 timestamp to stamp tracked changes"),
) -> None:
    """Create a redlined DOCX that shows the delta between two files."""

    dest = destination_file or _default_destination(modified)
    dest.parent.mkdir(parents=True, exist_ok=True)

    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    logging.info("Building redline: %s -> %s", original, dest)

    with tempfile.TemporaryDirectory() as tmpdir:
        old_dir = Path(tmpdir) / "old"
        new_dir = Path(tmpdir) / "new"

        unpack_document(original, old_dir)
        unpack_document(modified, new_dir)

        old_doc = Document(old_dir)
        new_doc = Document(new_dir)

        redliner = Redliner(old_doc, new_doc)
        redliner.redline(author=author, date_iso=date)

        for editor in new_doc._editors.values():
            editor.save()

        pack_document(new_doc.unpacked_path, dest, validate=False)

    typer.echo(f"Redlined document written to {dest}")


def main() -> None:
    app()


if __name__ == "__main__":
    main()
