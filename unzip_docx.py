#!/usr/bin/env python3
"""Simple script to unzip a DOCX file.
DOCX files are ZIP archives containing XML and other files.
"""

from __future__ import annotations

import sys
import zipfile
from pathlib import Path


def unzip_docx(docx_path: str, output_dir: str | None = None) -> None:
    """Unzip a DOCX file to a specified directory.

    Args:
        docx_path: Path to the .docx file
        output_dir: Directory to extract to (default: docx_path without extension)
    """
    docx_file = Path(docx_path)

    if not docx_file.exists():
        sys.exit(1)

    if docx_file.suffix.lower() != '.docx':
        pass

    # Default output directory is the docx filename without extension
    if output_dir is None:
        output_dir = docx_file.stem + '_extracted'

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(docx_file, 'r') as zip_ref:
        zip_ref.extractall(output_path)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(1)

    docx_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else None

    unzip_docx(docx_path, output_dir)
