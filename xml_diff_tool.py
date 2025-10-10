#!/usr/bin/env python3

import sys
import tempfile
from typing import Optional

from lxml import etree


def clean_namespaces(xml_file):
    """Remove namespace prefixes to avoid xpath issues."""
    try:
        # Parse with lxml to handle namespaces properly
        parser = etree.XMLParser(recover=True, remove_blank_text=False)
        tree = etree.parse(xml_file, parser)

        # Create a new tree without namespace prefixes
        root = tree.getroot()

        # Function to recursively remove namespace prefixes
        def remove_namespace_prefix(elem) -> None:
            # Remove namespace from tag
            if '}' in elem.tag:
                elem.tag = elem.tag.split('}')[1]

            # Remove namespace prefixes from attribute names
            new_attrib = {}
            for key, value in elem.attrib.items():
                new_key = key.split('}')[1] if '}' in key else key
                new_attrib[new_key] = value
            elem.attrib.clear()
            elem.attrib.update(new_attrib)

            # Process children recursively
            for child in elem:
                remove_namespace_prefix(child)

        remove_namespace_prefix(root)

        # Write cleaned XML to temporary file
        temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.xml', delete=False, encoding='utf-8')
        tree_str = etree.tostring(root, encoding='unicode', pretty_print=True)
        temp_file.write(tree_str)
        temp_file.close()

        return temp_file.name

    except Exception:
        return None


def create_xml_diff(file1, file2, output_file) -> Optional[bool]:
    """Create XML diff using xmldiff after cleaning namespaces."""
    import os
    import subprocess

    # Clean both files
    clean_file1 = clean_namespaces(file1)
    clean_file2 = clean_namespaces(file2)

    if not clean_file1 or not clean_file2:
        return False

    try:
        # Run xmldiff on cleaned files
        result = subprocess.run(
            ['xmldiff', '--ratio-mode', 'faster', '--fast-match', '-f', 'xml', clean_file1, clean_file2],
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )

        if result.returncode == 0:
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(result.stdout)
            return True
        return False

    except Exception:
        return False
    finally:
        # Clean up temporary files
        if clean_file1 and os.path.exists(clean_file1):
            os.unlink(clean_file1)
        if clean_file2 and os.path.exists(clean_file2):
            os.unlink(clean_file2)


if __name__ == '__main__':
    if len(sys.argv) != 4:
        sys.exit(1)

    file1, file2, output = sys.argv[1], sys.argv[2], sys.argv[3]

    if create_xml_diff(file1, file2, output):
        pass
    else:
        sys.exit(1)
