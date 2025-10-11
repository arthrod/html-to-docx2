#!/usr/bin/env python3
"""Generate individual diff files for each XML file comparison."""

import argparse
import os
import sys
from pathlib import Path
from xmldiff import main as xmldiff_main, formatting


def generate_diff_file(file1_path, file2_path, output_path, rel_path):
    """Generate a diff file for two XML files."""
    
    # Check if files are identical first
    with open(file1_path, 'rb') as f1, open(file2_path, 'rb') as f2:
        content1 = f1.read()
        content2 = f2.read()
        
        if content1 == content2:
            with open(output_path, 'w', encoding='utf-8') as out:
                out.write(f"Comparing: {rel_path}\n")
                out.write("="*80 + "\n")
                out.write("✓ Files are IDENTICAL (byte-for-byte match)\n")
                out.write("No differences found.\n")
            return True
    
    # Files differ, generate diff
    with open(output_path, 'w', encoding='utf-8') as out:
        out.write(f"Comparing: {rel_path}\n")
        out.write("="*80 + "\n")
        out.write("✗ Files are DIFFERENT\n\n")
        
        try:
            # Get the diff using xmldiff
            diff = xmldiff_main.diff_files(str(file1_path), str(file2_path))
            
            if not diff:
                out.write("No structural differences found by xmldiff.\n")
                out.write("(Files may differ only in whitespace or formatting)\n")
            else:
                out.write(f"Total differences detected: {len(diff)}\n")
                out.write("-" * 80 + "\n\n")
                
                for i, change in enumerate(diff, 1):
                    out.write(f"{i}. {change}\n")
                
                out.write("\n" + "-" * 80 + "\n")
                out.write(f"End of diff for {rel_path}\n")
            
            return False
            
        except Exception as e:
            out.write(f"Error during comparison: {e}\n")
            return False


def main():
    parser = argparse.ArgumentParser(description='Generate XML diff files for DOCX comparison')
    parser.add_argument('--dir1', required=True, help='First extracted DOCX directory')
    parser.add_argument('--dir2', required=True, help='Second extracted DOCX directory')
    parser.add_argument('--name1', required=True, help='Name of first DOCX file (for display)')
    parser.add_argument('--name2', required=True, help='Name of second DOCX file (for display)')
    parser.add_argument('--output-dir', help='Output directory (default: ./diffs)')
    
    args = parser.parse_args()
    
    dir1 = Path(args.dir1)
    dir2 = Path(args.dir2)
    
    # Create diffs directory
    if args.output_dir:
        diffs_dir = Path(args.output_dir)
    else:
        diffs_dir = Path.cwd() / "diffs"
    diffs_dir.mkdir(exist_ok=True)
    
    if not dir1.exists():
        print(f"Error: {dir1} does not exist")
        sys.exit(1)
    
    if not dir2.exists():
        print(f"Error: {dir2} does not exist")
        sys.exit(1)
    
    print("="*80)
    print("GENERATING XML DIFF FILES")
    print("="*80)
    print(f"Source 1: {args.name1}")
    print(f"Source 2: {args.name2}")
    print(f"Output directory: {diffs_dir}")
    print("="*80)
    
    # Get all files from first directory
    all_files_1 = sorted([p for p in dir1.rglob('*') if p.is_file()])
    all_files_2 = sorted([p for p in dir2.rglob('*') if p.is_file()])
    
    # Get relative paths
    rel_paths_1 = {p.relative_to(dir1): p for p in all_files_1}
    rel_paths_2 = {p.relative_to(dir2): p for p in all_files_2}
    
    all_rel_paths = sorted(set(rel_paths_1.keys()) | set(rel_paths_2.keys()))
    
    identical_count = 0
    different_count = 0
    missing_count = 0
    
    # Create a master index file
    index_path = diffs_dir / "INDEX.txt"
    with open(index_path, 'w', encoding='utf-8') as index:
        index.write("XML DIFF FILES INDEX\n")
        index.write("="*80 + "\n\n")
        index.write(f"File 1: {args.name1}\n")
        index.write(f"File 2: {args.name2}\n\n")
        index.write("="*80 + "\n\n")
        
        for rel_path in all_rel_paths:
            # Create safe filename for diff output
            safe_name = str(rel_path).replace('/', '_').replace('\\', '_')
            diff_filename = f"diff_{safe_name}.txt"
            diff_path = diffs_dir / diff_filename
            
            if rel_path not in rel_paths_1:
                print(f"⚠️  Missing in File 1: {rel_path}")
                with open(diff_path, 'w', encoding='utf-8') as out:
                    out.write(f"File: {rel_path}\n")
                    out.write("="*80 + "\n")
                    out.write(f"⚠️  FILE MISSING IN {args.name1}\n")
                    out.write(f"File only exists in {args.name2}\n")
                index.write(f"⚠️  MISSING: {rel_path} -> {diff_filename}\n")
                missing_count += 1
                
            elif rel_path not in rel_paths_2:
                print(f"⚠️  Missing in File 2: {rel_path}")
                with open(diff_path, 'w', encoding='utf-8') as out:
                    out.write(f"File: {rel_path}\n")
                    out.write("="*80 + "\n")
                    out.write(f"⚠️  FILE MISSING IN {args.name2}\n")
                    out.write(f"File only exists in {args.name1}\n")
                index.write(f"⚠️  MISSING: {rel_path} -> {diff_filename}\n")
                missing_count += 1
                
            else:
                print(f"Comparing: {rel_path}")
                is_identical = generate_diff_file(
                    rel_paths_1[rel_path],
                    rel_paths_2[rel_path],
                    diff_path,
                    str(rel_path)
                )
                
                if is_identical:
                    index.write(f"✓ IDENTICAL: {rel_path} -> {diff_filename}\n")
                    identical_count += 1
                else:
                    index.write(f"✗ DIFFERENT: {rel_path} -> {diff_filename}\n")
                    different_count += 1
        
        # Summary at the end of index
        index.write("\n" + "="*80 + "\n")
        index.write("SUMMARY\n")
        index.write("="*80 + "\n")
        index.write(f"Total files compared: {len(all_rel_paths)}\n")
        index.write(f"Identical files: {identical_count}\n")
        index.write(f"Different files: {different_count}\n")
        index.write(f"Missing files: {missing_count}\n")
        index.write("="*80 + "\n")
    
    # Summary to console
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    print(f"Total files compared: {len(all_rel_paths)}")
    print(f"Identical files: {identical_count}")
    print(f"Different files: {different_count}")
    print(f"Missing files: {missing_count}")
    print(f"\nAll diff files saved to: {diffs_dir}")
    print(f"See {index_path} for complete index")
    print("="*80)


if __name__ == '__main__':
    main()
