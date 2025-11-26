#!/usr/bin/env python3
"""Unpack and format XML contents of Office files (.docx, .pptx, .xlsx)."""

import random
import sys
import zipfile
from pathlib import Path

import defusedxml.minidom

def unpack_document(input_file, output_dir):
    """Unpack and format XML contents of an Office file."""
    # Extract and format
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(input_file, 'r') as zip_ref:
        zip_ref.extractall(output_path)

    # Pretty print all XML files
    xml_files = list(output_path.rglob('*.xml')) + list(output_path.rglob('*.rels'))
    for xml_file in xml_files:
        try:
            content = xml_file.read_text(encoding='utf-8')
            if content.strip():
                dom = defusedxml.minidom.parseString(content)
                xml_file.write_bytes(dom.toprettyxml(indent='  ', encoding='utf-8'))
        except Exception:
            # Ignore errors for files that are not valid XML
            pass

    # For .docx files, suggest an RSID for tracked changes
    if str(input_file).endswith('.docx'):
        suggested_rsid = ''.join(random.choices('0123456789ABCDEF', k=8))
        # The original script printed this, but we'll just return it for programmatic use
        return suggested_rsid
    return None

if __name__ == '__main__':
    # Get command line arguments
    if len(sys.argv) != 3:
        print('Usage: python unpack.py <office_file> <output_dir>')
        sys.exit(1)

    in_file, out_dir = sys.argv[1], sys.argv[2]
    unpack_document(in_file, out_dir)
