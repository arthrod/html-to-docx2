# XML Diff Files - Complete Documentation

## Overview

This directory contains individual diff files for each XML file found in the two DOCX archives:
- **File 1:** `redline_2_pro_fixed.docx`
- **File 2:** `old_2_new_2_ideal_redline.docx`

Each diff file contains **ONLY the differences** detected by xmldiff, not the full XML content.

---

## Quick Summary

| Status | Count | Description |
|--------|-------|-------------|
| ✓ **Identical** | 8 files | Byte-for-byte matches |
| ✗ **Different** | 4 files | Contains structural differences |
| ⚠️ **Missing** | 0 files | No missing files |
| **Total** | **12 files** | All XML files compared |

---

## Files Index

See **`INDEX.txt`** for the complete list of diff files.

---

## Different Files (4)

### 1. `diff_docProps_app.xml.txt`
**Status:** ✗ Different  
**Type:** Document application properties (metadata)  
**Differences:** 5 changes  
**Impact:** Low - Auto-generated statistics (word count, page count, etc.)

### 2. `diff_docProps_core.xml.txt`
**Status:** ✗ Different  
**Type:** Document core properties (metadata)  
**Differences:** 2 changes
- Revision number differs (File 1: "3", File 2: "1")
- Last modified timestamp differs  

**Impact:** Low - Metadata only

### 3. `diff_word_settings.xml.txt` ⚙️
**Status:** ✗ Different  
**Type:** Document settings  
**Differences:** 6 changes
- Proof state (spelling/grammar check status)
- Track revisions settings
- Revision IDs  

**Impact:** Medium - Settings affect document behavior but not visible content

### 4. `diff_word_document.xml.txt` ⭐ **CRITICAL**
**Status:** ✗ Different  
**Type:** Main document content  
**Differences:** **7,829 changes** (!!)  
**File size:** 1.1 MB

**Why so many differences?**

This is the main content file, and the massive difference count is due to:

1. **Redline markup structure:**
   - File 1 uses `<w:del>` and `<w:ins>` tags for tracked changes
   - File 2 has plain paragraphs without markup
   - Each redline tag requires dozens of XML transformations

2. **Paragraph differences:**
   - File 1: 27 total paragraphs (including redline)
   - File 2: 32 paragraphs (clean structure)

3. **Content changes:**
   - 3 deleted sections in File 1
   - 2 inserted sections in File 1
   - Hundreds of attribute changes for revision tracking

**Impact:** High - This represents the actual content differences between documents

---

## Identical Files (8)

The following files are byte-for-byte identical:

1. ✓ `[Content_Types].xml` - Content type definitions
2. ✓ `_rels/.rels` - Package relationships
3. ✓ `word/_rels/document.xml.rels` - Document relationships
4. ✓ `word/fontTable.xml` - Font definitions
5. ✓ `word/people.xml` - Document collaborators
6. ✓ `word/styles.xml` - Style definitions
7. ✓ `word/theme/theme1.xml` - Theme/colors
8. ✓ `word/webSettings.xml` - Web view settings

---

## How to Read Diff Files

Each diff file follows this format:

```
Comparing: path/to/file.xml
================================================================================
✓ Files are IDENTICAL (byte-for-byte match)
No differences found.
```

Or for different files:

```
Comparing: path/to/file.xml
================================================================================
✗ Files are DIFFERENT

Total differences detected: N
--------------------------------------------------------------------------------

1. UpdateTextIn(node='xpath', text='new value')
2. InsertNode(target='xpath', tag='tag_name', position=N)
3. DeleteNode(node='xpath')
...

--------------------------------------------------------------------------------
End of diff for path/to/file.xml
```

### Diff Operation Types

- **UpdateTextIn:** Text content changed
- **InsertNode:** New XML element added
- **DeleteNode:** XML element removed
- **InsertAttrib:** New attribute added to element
- **UpdateAttrib:** Attribute value changed
- **MoveNode:** Element moved to different location
- **RenameNode:** Element tag name changed

---

## Key Finding

**The documents represent different states of tracked changes:**

- **File 1** (`redline_2_pro_fixed.docx`): Contains active tracked changes (redline markup)
- **File 2** (`old_2_new_2_ideal_redline.docx`): Clean document without tracked changes

The 7,829 differences in `word/document.xml` are primarily due to the XML structure required for Word's Track Changes feature, not necessarily 7,829 content changes.

**Actual content changes:**
- 3 sections deleted
- 2 sections inserted
- ~5 paragraph count difference

---

## File Locations

```
comparison_output/
├── diffs/                                    # You are here
│   ├── INDEX.txt                             # Master index
│   ├── README.md                             # This file
│   ├── diff_[Content_Types].xml.txt
│   ├── diff__rels_.rels.txt
│   ├── diff_docProps_app.xml.txt
│   ├── diff_docProps_core.xml.txt
│   ├── diff_word__rels_document.xml.rels.txt
│   ├── diff_word_document.xml.txt            # 1.1 MB - Main content diff
│   ├── diff_word_fontTable.xml.txt
│   ├── diff_word_people.xml.txt
│   ├── diff_word_settings.xml.txt
│   ├── diff_word_styles.xml.txt
│   ├── diff_word_theme_theme1.xml.txt
│   └── diff_word_webSettings.xml.txt
│
├── redline_2_pro_fixed_extracted/           # Extracted File 1
├── old_2_new_2_ideal_redline_extracted/     # Extracted File 2
├── comparison_report.txt                     # Full comparison output
├── detailed_report.txt                       # Structured analysis
└── COMPARISON_SUMMARY.md                     # High-level summary
```

---

## Tools Used

- **unzip_docx.py** - Custom Python script to extract DOCX archives
- **xmldiff** - Python library for XML comparison
- **Python 3** - For processing and analysis

---

## Generated On

2025-10-10

---

## Notes

- All diff files contain **only the differences**, not full XML content
- Empty/identical files show minimal output
- Large diff files (like `word/document.xml`) indicate structural differences, not necessarily content volume
- Diff files are plain text and can be viewed in any text editor
