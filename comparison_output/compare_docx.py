#!/usr/bin/env python3
"""Compare two extracted DOCX directories using xmldiff."""

import os
import sys
from pathlib import Path
from xmldiff import main as xmldiff_main
from xml.etree import ElementTree as ET


def compare_xml_files(file1_path, file2_path, rel_path):
    """Compare two XML files using xmldiff."""
    print(f"\n{'='*80}")
    print(f"Comparing: {rel_path}")
    print(f"{'='*80}")
    
    # First, check if files are identical
    with open(file1_path, 'rb') as f1, open(file2_path, 'rb') as f2:
        content1 = f1.read()
        content2 = f2.read()
        
        if content1 == content2:
            print("✓ Files are IDENTICAL (byte-for-byte match)")
            return True
    
    # Files differ, use xmldiff to show differences
    print("✗ Files are DIFFERENT")
    print("\nDifferences detected by xmldiff:")
    print("-" * 80)
    
    try:
        # Get the diff
        diff = xmldiff_main.diff_files(str(file1_path), str(file2_path))
        
        if not diff:
            print("  (No structural differences found by xmldiff)")
            print("  Note: Files may differ only in whitespace or formatting")
        else:
            for i, change in enumerate(diff, 1):
                print(f"  {i}. {change}")
        
        # Also show a text comparison for key content files
        if rel_path.endswith('document.xml') or rel_path.endswith('styles.xml'):
            print(f"\n--- Content preview of {os.path.basename(file1_path)} ---")
            try:
                tree1 = ET.parse(file1_path)
                root1 = tree1.getroot()
                # Extract text content
                text1 = ET.tostring(root1, encoding='unicode', method='text')
                preview1 = text1[:500] if len(text1) > 500 else text1
                print(preview1)
                if len(text1) > 500:
                    print(f"... (truncated, total {len(text1)} characters)")
            except Exception as e:
                print(f"Could not parse XML: {e}")
            
            print(f"\n--- Content preview of {os.path.basename(file2_path)} ---")
            try:
                tree2 = ET.parse(file2_path)
                root2 = tree2.getroot()
                text2 = ET.tostring(root2, encoding='unicode', method='text')
                preview2 = text2[:500] if len(text2) > 500 else text2
                print(preview2)
                if len(text2) > 500:
                    print(f"... (truncated, total {len(text2)} characters)")
            except Exception as e:
                print(f"Could not parse XML: {e}")
        
        return False
        
    except Exception as e:
        print(f"  Error during comparison: {e}")
        return False


def main():
    base_dir = Path(__file__).parent
    dir1 = base_dir / "redline_2_pro_fixed_extracted"
    dir2 = base_dir / "old_2_new_2_ideal_redline_extracted"
    
    if not dir1.exists():
        print(f"Error: {dir1} does not exist")
        sys.exit(1)
    
    if not dir2.exists():
        print(f"Error: {dir2} does not exist")
        sys.exit(1)
    
    print("="*80)
    print("DOCX COMPARISON REPORT")
    print("="*80)
    print(f"File 1: redline_2_pro_fixed.docx")
    print(f"File 2: old_2_new_2_ideal_redline.docx")
    print("="*80)
    
    # Get all XML files from first directory
    xml_files_1 = sorted([p for p in dir1.rglob('*') if p.is_file()])
    xml_files_2 = sorted([p for p in dir2.rglob('*') if p.is_file()])
    
    # Get relative paths
    rel_paths_1 = {p.relative_to(dir1): p for p in xml_files_1}
    rel_paths_2 = {p.relative_to(dir2): p for p in xml_files_2}
    
    all_rel_paths = sorted(set(rel_paths_1.keys()) | set(rel_paths_2.keys()))
    
    identical_count = 0
    different_count = 0
    missing_count = 0
    
    for rel_path in all_rel_paths:
        if rel_path not in rel_paths_1:
            print(f"\n{'='*80}")
            print(f"File missing in redline_2_pro_fixed: {rel_path}")
            print(f"{'='*80}")
            missing_count += 1
        elif rel_path not in rel_paths_2:
            print(f"\n{'='*80}")
            print(f"File missing in old_2_new_2_ideal_redline: {rel_path}")
            print(f"{'='*80}")
            missing_count += 1
        else:
            is_identical = compare_xml_files(
                rel_paths_1[rel_path],
                rel_paths_2[rel_path],
                str(rel_path)
            )
            if is_identical:
                identical_count += 1
            else:
                different_count += 1
    
    # Summary
    print(f"\n{'='*80}")
    print("SUMMARY")
    print(f"{'='*80}")
    print(f"Total files compared: {len(all_rel_paths)}")
    print(f"Identical files: {identical_count}")
    print(f"Different files: {different_count}")
    print(f"Missing files: {missing_count}")
    print(f"{'='*80}")


if __name__ == '__main__':
    main()
