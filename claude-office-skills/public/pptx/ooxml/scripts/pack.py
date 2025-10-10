#!/usr/bin/env python3
"""Tool to pack a directory into a .docx, .pptx, or .xlsx file with XML formatting undone.

Example usage:
    python pack.py <input_directory> <office_file> [--force]
"""

import argparse
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path
from typing import Optional

import defusedxml.minidom


def main() -> None:
    parser = argparse.ArgumentParser(description='Pack a directory into an Office file')
    parser.add_argument('input_directory', help='Unpacked Office document directory')
    parser.add_argument('output_file', help='Output Office file (.docx/.pptx/.xlsx)')
    parser.add_argument('--force', action='store_true', help='Skip validation')
    args = parser.parse_args()

    try:
        success = pack_document(args.input_directory, args.output_file, validate=not args.force)

        # Show warning if validation was skipped
        if args.force:
            pass
        # Exit with error if validation failed
        elif not success:
            sys.exit(1)

    except ValueError as e:
        sys.exit(f'Error: {e}')


def pack_document(input_dir, output_file, validate=False) -> bool:
    """Pack a directory into an Office file (.docx/.pptx/.xlsx).

    Args:
        input_dir: Path to unpacked Office document directory
        output_file: Path to output Office file
        validate: If True, validates with soffice (default: False)

    Returns:
        bool: True if successful, False if validation failed
    """
    input_dir = Path(input_dir)
    output_file = Path(output_file)

    if not input_dir.is_dir():
        msg = f'{input_dir} is not a directory'
        raise ValueError(msg)
    if output_file.suffix.lower() not in {'.docx', '.pptx', '.xlsx'}:
        msg = f'{output_file} must be a .docx, .pptx, or .xlsx file'
        raise ValueError(msg)

    # Work in temporary directory to avoid modifying original
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_content_dir = Path(temp_dir) / 'content'
        shutil.copytree(input_dir, temp_content_dir)

        # Process XML files to remove pretty-printing whitespace
        for pattern in ['*.xml', '*.rels']:
            for xml_file in temp_content_dir.rglob(pattern):
                condense_xml(xml_file)

        # Create final Office file as zip archive
        output_file.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(output_file, 'w', zipfile.ZIP_DEFLATED) as zf:
            for f in temp_content_dir.rglob('*'):
                if f.is_file():
                    zf.write(f, f.relative_to(temp_content_dir))

        # Validate if requested
        if validate and not validate_document(output_file):
            output_file.unlink()  # Delete the corrupt file
            return False

    return True


def validate_document(doc_path) -> Optional[bool]:
    """Validate document by converting to HTML with soffice."""
    # Determine the correct filter based on file extension
    match doc_path.suffix.lower():
        case '.docx':
            filter_name = 'html:HTML'
        case '.pptx':
            filter_name = 'html:impress_html_Export'
        case '.xlsx':
            filter_name = 'html:HTML (StarCalc)'

    with tempfile.TemporaryDirectory() as temp_dir:
        try:
            result = subprocess.run(
                ['soffice', '--headless', '--convert-to', filter_name, '--outdir', temp_dir, str(doc_path)],
                capture_output=True,
                timeout=10,
                text=True,
                check=False,
            )
            if not (Path(temp_dir) / f'{doc_path.stem}.html').exists():
                result.stderr.strip() or 'Document validation failed'
                return False
            return True
        except FileNotFoundError:
            return True
        except subprocess.TimeoutExpired:
            return False
        except Exception:
            return False


def condense_xml(xml_file) -> None:
    """Strip unnecessary whitespace and remove comments."""
    with open(xml_file, encoding='utf-8') as f:
        dom = defusedxml.minidom.parse(f)

    # Process each element to remove whitespace and comments
    for element in dom.getElementsByTagName('*'):
        # Skip w:t elements and their processing
        if element.tagName.endswith(':t'):
            continue

        # Remove whitespace-only text nodes and comment nodes
        for child in list(element.childNodes):
            if (
                child.nodeType == child.TEXT_NODE and child.nodeValue and child.nodeValue.strip() == ''
            ) or child.nodeType == child.COMMENT_NODE:
                element.removeChild(child)

    # Write back the condensed XML
    with open(xml_file, 'wb') as f:
        f.write(dom.toxml(encoding='UTF-8'))


if __name__ == '__main__':
    main()
