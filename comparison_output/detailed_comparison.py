#!/usr/bin/env python3
"""Detailed comparison of DOCX document.xml files."""

import sys
from pathlib import Path
from xml.etree import ElementTree as ET
from collections import Counter


def remove_namespace(tag):
    """Remove namespace from XML tag."""
    return tag.split('}')[-1] if '}' in tag else tag


def extract_text_content(element):
    """Extract all text from an XML element."""
    texts = []
    for text_elem in element.iter():
        if text_elem.text:
            texts.append(text_elem.text)
        if text_elem.tail:
            texts.append(text_elem.tail)
    return ''.join(texts)


def analyze_document_structure(xml_path):
    """Analyze the structure of a Word document.xml file."""
    tree = ET.parse(xml_path)
    root = tree.getroot()
    
    # Find the body
    body = None
    for elem in root.iter():
        if remove_namespace(elem.tag) == 'body':
            body = elem
            break
    
    if not body:
        return None
    
    structure = {
        'paragraphs': [],
        'deletions': [],
        'insertions': [],
        'total_paragraphs': 0,
        'total_deletions': 0,
        'total_insertions': 0,
    }
    
    for child in body:
        tag = remove_namespace(child.tag)
        
        if tag == 'p':
            text = extract_text_content(child)
            structure['paragraphs'].append({
                'type': 'paragraph',
                'text': text.strip(),
                'length': len(text.strip())
            })
            structure['total_paragraphs'] += 1
            
        elif tag == 'del':
            # Track deletions
            for p in child.iter():
                if remove_namespace(p.tag) == 'p':
                    text = extract_text_content(p)
                    structure['deletions'].append({
                        'type': 'deletion',
                        'text': text.strip(),
                        'length': len(text.strip())
                    })
                    structure['total_deletions'] += 1
                    
        elif tag == 'ins':
            # Track insertions
            for p in child.iter():
                if remove_namespace(p.tag) == 'p':
                    text = extract_text_content(p)
                    structure['insertions'].append({
                        'type': 'insertion',
                        'text': text.strip(),
                        'length': len(text.strip())
                    })
                    structure['total_insertions'] += 1
    
    return structure


def main():
    base_dir = Path(__file__).parent
    doc1 = base_dir / "redline_2_pro_fixed_extracted" / "word" / "document.xml"
    doc2 = base_dir / "old_2_new_2_ideal_redline_extracted" / "word" / "document.xml"
    
    print("="*80)
    print("DETAILED DOCX STRUCTURE COMPARISON")
    print("="*80)
    print(f"File 1: redline_2_pro_fixed.docx")
    print(f"File 2: old_2_new_2_ideal_redline.docx")
    print("="*80)
    
    struct1 = analyze_document_structure(doc1)
    struct2 = analyze_document_structure(doc2)
    
    print("\n📊 DOCUMENT STATISTICS")
    print("-" * 80)
    print(f"{'Metric':<40} {'File 1':>15} {'File 2':>15} {'Diff':>10}")
    print("-" * 80)
    print(f"{'Total Paragraphs':<40} {struct1['total_paragraphs']:>15} {struct2['total_paragraphs']:>15} {struct1['total_paragraphs']-struct2['total_paragraphs']:>10}")
    print(f"{'Total Deletions (redline)':<40} {struct1['total_deletions']:>15} {struct2['total_deletions']:>15} {struct1['total_deletions']-struct2['total_deletions']:>10}")
    print(f"{'Total Insertions (redline)':<40} {struct1['total_insertions']:>15} {struct2['total_insertions']:>15} {struct1['total_insertions']-struct2['total_insertions']:>10}")
    
    print("\n\n🗑️  DELETED CONTENT (REDLINE DELETIONS)")
    print("-" * 80)
    print(f"\nFile 1 has {len(struct1['deletions'])} deletion(s):")
    for i, del_item in enumerate(struct1['deletions'], 1):
        preview = del_item['text'][:100] + '...' if len(del_item['text']) > 100 else del_item['text']
        print(f"  {i}. [{del_item['length']} chars] {preview}")
    
    print(f"\nFile 2 has {len(struct2['deletions'])} deletion(s):")
    for i, del_item in enumerate(struct2['deletions'], 1):
        preview = del_item['text'][:100] + '...' if len(del_item['text']) > 100 else del_item['text']
        print(f"  {i}. [{del_item['length']} chars] {preview}")
    
    print("\n\n➕ INSERTED CONTENT (REDLINE INSERTIONS)")
    print("-" * 80)
    print(f"\nFile 1 has {len(struct1['insertions'])} insertion(s):")
    for i, ins_item in enumerate(struct1['insertions'], 1):
        preview = ins_item['text'][:100] + '...' if len(ins_item['text']) > 100 else ins_item['text']
        print(f"  {i}. [{ins_item['length']} chars] {preview}")
    
    print(f"\nFile 2 has {len(struct2['insertions'])} insertion(s):")
    for i, ins_item in enumerate(struct2['insertions'], 1):
        preview = ins_item['text'][:100] + '...' if len(ins_item['text']) > 100 else ins_item['text']
        print(f"  {i}. [{ins_item['length']} chars] {preview}")
    
    print("\n\n📝 REGULAR PARAGRAPHS (NON-REDLINE)")
    print("-" * 80)
    
    # Compare paragraph counts
    file1_para_count = len([p for p in struct1['paragraphs'] if p['length'] > 0])
    file2_para_count = len([p for p in struct2['paragraphs'] if p['length'] > 0])
    
    print(f"File 1: {file1_para_count} non-empty paragraphs")
    print(f"File 2: {file2_para_count} non-empty paragraphs")
    print(f"Difference: {file1_para_count - file2_para_count} paragraphs")
    
    # Show first few paragraphs from each
    print("\nFirst 5 non-empty paragraphs from File 1:")
    count = 0
    for p in struct1['paragraphs']:
        if p['length'] > 0:
            preview = p['text'][:80] + '...' if len(p['text']) > 80 else p['text']
            print(f"  {count+1}. {preview}")
            count += 1
            if count >= 5:
                break
    
    print("\nFirst 5 non-empty paragraphs from File 2:")
    count = 0
    for p in struct2['paragraphs']:
        if p['length'] > 0:
            preview = p['text'][:80] + '...' if len(p['text']) > 80 else p['text']
            print(f"  {count+1}. {preview}")
            count += 1
            if count >= 5:
                break
    
    print("\n" + "="*80)
    print("KEY FINDINGS")
    print("="*80)
    
    if struct1['total_paragraphs'] != struct2['total_paragraphs']:
        diff = struct1['total_paragraphs'] - struct2['total_paragraphs']
        print(f"⚠️  File 1 has {abs(diff)} {'more' if diff > 0 else 'fewer'} paragraphs than File 2")
    
    if struct1['total_deletions'] != struct2['total_deletions']:
        diff = struct1['total_deletions'] - struct2['total_deletions']
        print(f"⚠️  File 1 has {abs(diff)} {'more' if diff > 0 else 'fewer'} redline deletions than File 2")
    
    if struct1['total_insertions'] != struct2['total_insertions']:
        diff = struct1['total_insertions'] - struct2['total_insertions']
        print(f"⚠️  File 1 has {abs(diff)} {'more' if diff > 0 else 'fewer'} redline insertions than File 2")
    
    print("\n")


if __name__ == '__main__':
    main()
