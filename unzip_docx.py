#!/usr/bin/env python3
"""Simple script to unzip DOCX files and other files.
DOCX files are ZIP archives containing XML and other files.
Can handle multiple files and optionally display their contents.
"""

from __future__ import annotations

import argparse
import os
import sys
import zipfile
from pathlib import Path


def unzip_docx(file_path: str, output_dir: str | None = None) -> str:
    """Unzip a DOCX file or process other files to a specified directory.

    Args:
        file_path: Path to the file
        output_dir: Directory to extract to (default: file_path without extension)
    
    Returns:
        Path to the extracted directory or file path
    """
    input_file = Path(file_path)

    if not input_file.exists():
        print(f"Error: File '{file_path}' not found")
        return ""

    # Handle DOCX files (ZIP archives)
    if input_file.suffix.lower() == '.docx':
        # Default output directory is the docx filename without extension
        if output_dir is None:
            output_dir = input_file.stem + '_extracted'

        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        try:
            with zipfile.ZipFile(input_file, 'r') as zip_ref:
                zip_ref.extractall(output_path)
            print(f"Extracted '{file_path}' to '{output_path}'")
            return str(output_path)
        except zipfile.BadZipFile:
            print(f"Error: '{file_path}' is not a valid ZIP/DOCX file")
            return ""
    else:
        # For non-DOCX files, just return the file path for content extraction
        print(f"Processing non-DOCX file: '{file_path}'")
        return str(input_file)


def display_file_contents(file_or_folder_path: str, original_file: str, output_file=None, include_only=None) -> str:
    """Display the contents of an extracted folder or individual file.
    
    Args:
        file_or_folder_path: Path to the extracted folder or file
        original_file: Name of the original file
        output_file: File object to write to (if None, prints to console)
        include_only: List of file patterns to include (if None, includes all)
    
    Returns:
        String representation of the file/folder contents
    """
    if not file_or_folder_path:
        return ""
        
    path = Path(file_or_folder_path)
    if not path.exists():
        print(f"Error: Path '{file_or_folder_path}' not found")
        return ""
    
    content_lines = []
    content_lines.append(f"\n{'='*60}")
    content_lines.append(f"CONTENTS OF: {original_file}")
    
    if path.is_file():
        content_lines.append(f"FILE PATH: {file_or_folder_path}")
    else:
        content_lines.append(f"EXTRACTED TO: {file_or_folder_path}")
    content_lines.append(f"{'='*60}")
    
    # Handle single files (non-DOCX)
    if path.is_file():
        # Check if file should be included based on include_only filter
        if include_only:
            should_include = False
            for pattern in include_only:
                if pattern.startswith('*.'):
                    # Handle extension patterns like *.py
                    ext = pattern[1:]  # Remove the *
                    if path.suffix.lower() == ext.lower():
                        should_include = True
                        break
                elif pattern.lower() == path.name.lower():
                    # Handle exact name patterns like app.xml
                    should_include = True
                    break
            if not should_include:
                return ""
        
        try:
            # Determine if it's a text file based on extension
            text_extensions = {'.py', '.txt', '.md', '.json', '.xml', '.html', '.css', '.js', '.yml', '.yaml', '.ini', '.cfg', '.conf', '.log'}
            if path.suffix.lower() in text_extensions:
                content = path.read_text(encoding='utf-8')
                content_lines.append(f"📄 {path.name} [Text file, {len(content)} characters]")
                # Show file contents
                lines = content.split('\n')
                for i, line in enumerate(lines, 1):
                    content_lines.append(f"    {i:4d}: {line}")
            else:
                size = path.stat().st_size
                content_lines.append(f"📄 {path.name} [Binary file, {size} bytes]")
        except Exception as e:
            content_lines.append(f"📄 {path.name} [Could not read file: {e}]")
        
        # Join content and write/print
        full_content = '\n'.join(content_lines)
        if output_file:
            output_file.write(full_content + '\n')
        else:
            print(full_content)
        return full_content
    
    def show_file_contents(file_path: Path, indent: str = ""):
        """Recursively show file contents."""
        if file_path.is_file():
            # Check if file should be included based on include_only filter
            if include_only:
                should_include = False
                for pattern in include_only:
                    if pattern.startswith('*.'):
                        # Handle extension patterns like *.py
                        ext = pattern[1:]  # Remove the *
                        if file_path.suffix.lower() == ext.lower():
                            should_include = True
                            break
                    elif pattern.lower() == file_path.name.lower():
                        # Handle exact name patterns like app.xml
                        should_include = True
                        break
                if not should_include:
                    return
            
            content_lines.append(f"{indent}📄 {file_path.name}")
            try:
                # Try to read as text for various file types
                text_extensions = {'.xml', '.rels', '.txt', '.py', '.md', '.json', '.html', '.css', '.js', '.yml', '.yaml'}
                if file_path.suffix.lower() in text_extensions:
                    content = file_path.read_text(encoding='utf-8')
                    # Show first few lines if content is long
                    lines = content.split('\n')
                    if len(lines) > 20:
                        for i, line in enumerate(lines[:20], 1):
                            content_lines.append(f"{indent}    {i:4d}: {line}")
                        content_lines.append(f"{indent}    ... (truncated, {len(lines)-20} more lines)")
                    else:
                        for i, line in enumerate(lines, 1):
                            content_lines.append(f"{indent}    {i:4d}: {line}")
                else:
                    # Binary file - just show size
                    size = file_path.stat().st_size
                    content_lines.append(f"{indent}    [Binary file, {size} bytes]")
                content_lines.append(f"{indent}")
            except Exception as e:
                content_lines.append(f"{indent}    [Could not read file: {e}]")
                content_lines.append(f"{indent}")
        elif file_path.is_dir():
            # Only show directory if it contains files we want to include
            if include_only:
                has_included_files = False
                for item in file_path.iterdir():
                    if item.is_file():
                        for pattern in include_only:
                            if pattern.startswith('*.'):
                                ext = pattern[1:]
                                if item.suffix.lower() == ext.lower():
                                    has_included_files = True
                                    break
                            elif pattern.lower() == item.name.lower():
                                has_included_files = True
                                break
                        if has_included_files:
                            break
                    elif item.is_dir():
                        # Recursively check subdirectories
                        def check_subdir(subdir):
                            for subitem in subdir.rglob('*'):
                                if subitem.is_file():
                                    for pattern in include_only:
                                        if pattern.startswith('*.'):
                                            ext = pattern[1:]
                                            if subitem.suffix.lower() == ext.lower():
                                                return True
                                        elif pattern.lower() == subitem.name.lower():
                                            return True
                            return False
                        if check_subdir(item):
                            has_included_files = True
                            break
                if not has_included_files:
                    return
            
            content_lines.append(f"{indent}📁 {file_path.name}/")
            for item in sorted(file_path.iterdir()):
                show_file_contents(item, indent + "  ")
    
    for item in sorted(path.iterdir()):
        show_file_contents(item)
    
    # Join all content lines
    full_content = '\n'.join(content_lines)
    
    # Write to file or print to console
    if output_file:
        output_file.write(full_content + '\n')
    else:
        print(full_content)
    
    return full_content


def main():
    parser = argparse.ArgumentParser(
        description='Unzip DOCX files and optionally display their contents',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  %(prog)s file1.docx
  %(prog)s "file1.docx,file2.docx,script.py"
  %(prog)s file1.docx --prompt-it
  %(prog)s "file1.docx,script.py" --prompt-it
  %(prog)s file1.docx --prompt-it --save-output my_output.txt
  %(prog)s "file1.docx,file2.docx" --prompt-it --include-only "app.xml,core.xml,document.xml,*.py"
        '''
    )
    
    parser.add_argument('files', 
                       help='File(s) to process. DOCX files will be unzipped, other files will have their content displayed. Multiple files can be separated by commas')
    parser.add_argument('--prompt-it', 
                       action='store_true',
                       help='Display the full contents of extracted folders')
    parser.add_argument('--save-output', 
                       metavar='FILE',
                       help='Save content output to a file (default: output.txt when using --prompt-it)')
    parser.add_argument('--include-only',
                       metavar='PATTERNS',
                       help='Comma-separated list of file patterns to include (e.g., "app.xml,core.xml,*.py"). Supports exact names and *.ext patterns')
    parser.add_argument('--output-dir', 
                       help='Base output directory (individual files will create subdirectories)')
    
    args = parser.parse_args()
    
    # Parse file list
    if ',' in args.files:
        file_list = [f.strip() for f in args.files.split(',')]
    else:
        file_list = [args.files.strip()]
    
    # Remove empty strings
    file_list = [f for f in file_list if f]
    
    if not file_list:
        print("Error: No files specified")
        sys.exit(1)
    
    # Parse include_only patterns
    include_only = None
    if args.include_only:
        include_only = [pattern.strip() for pattern in args.include_only.split(',')]
        include_only = [pattern for pattern in include_only if pattern]
        print(f"Including only files matching: {', '.join(include_only)}")
    
    # Create output directory for organization
    output_base_dir = Path("docx_analysis_output")
    output_base_dir.mkdir(exist_ok=True)
    
    print(f"Processing {len(file_list)} file(s)...")
    print(f"Output will be organized in: {output_base_dir}")
    
    extracted_items = []
    
    for file_path in file_list:
        print(f"\nProcessing: {file_path}")
        
        # Determine output directory for this file
        if args.output_dir:
            base_output_dir = Path(args.output_dir)
        else:
            base_output_dir = output_base_dir
            
        base_name = Path(file_path).stem
        
        # For DOCX files, create extraction folder
        if Path(file_path).suffix.lower() == '.docx':
            output_dir = str(base_output_dir / f"{base_name}_extracted")
        else:
            output_dir = None
        
        processed_path = unzip_docx(file_path, output_dir)
        if processed_path:
            extracted_items.append((processed_path, file_path))
    
    # If --prompt-it is specified, display contents
    if args.prompt_it:
        # Determine output file (save in organized folder)
        if args.save_output:
            output_filename = args.save_output
        else:
            output_filename = str(output_base_dir / "analysis_output.txt")
        
        header = f"\n{'='*80}\nDISPLAYING FILE CONTENTS\n{'='*80}"
        
        if args.save_output:
            # Save to specified file only
            try:
                with open(output_filename, 'w', encoding='utf-8') as f:
                    f.write(header + '\n')
                    for item_path, original_file in extracted_items:
                        display_file_contents(item_path, original_file, f, include_only)
                print(f"Content saved to: {output_filename}")
            except Exception as e:
                print(f"Error saving to file: {e}")
                # Fallback to console output
                print(header)
                for item_path, original_file in extracted_items:
                    display_file_contents(item_path, original_file, None, include_only)
        else:
            # Save to default file and display to console
            try:
                with open(output_filename, 'w', encoding='utf-8') as f:
                    f.write(header + '\n')
                    for item_path, original_file in extracted_items:
                        display_file_contents(item_path, original_file, f, include_only)
                print(f"Content saved to: {output_filename}")
                print("(Also displaying to console)")
                # Also display to console
                print(header)
                for item_path, original_file in extracted_items:
                    display_file_contents(item_path, original_file, None, include_only)
            except Exception as e:
                print(f"Error saving to file: {e}")
                # Fallback to console output only
                print(header)
                for item_path, original_file in extracted_items:
                    display_file_contents(item_path, original_file, None, include_only)
    
    print(f"\nCompleted processing {len(file_list)} file(s)")


if __name__ == '__main__':
    main()