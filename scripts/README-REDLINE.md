# DOCX Redlining Script

Generate Word documents with tracked changes (redlines) that preserve original formatting and styles.

## Overview

`diff-redline.js` compares two DOCX files and creates a new DOCX showing all differences as tracked changes, similar to Word's "Compare Documents" feature but with better style preservation.

## Usage

```bash
node scripts/diff-redline.js <baseline.docx> <current.docx> <output.docx>
```

### Example

```bash
node scripts/diff-redline.js original.docx modified.docx redlined.docx
```

## What It Does

1. **Extracts both DOCX files** - Unpacks the ZIP archives to access internal XML
2. **Parses document structure** - Identifies paragraphs, runs, and their formatting
3. **Compares content** - Uses word-level diffing to find changes
4. **Generates tracked changes** - Creates proper OOXML with:
   - `<w:del>` tags for deletions (show as strikethrough)
   - `<w:ins>` tags for insertions (show as underlined)
   - Author attribution (`w:author="Claude"`)
   - Timestamps for each change
5. **Preserves styles** - Maintains:
   - Character formatting (bold, italic, font, color, etc.)
   - Paragraph styles (headings, alignment, spacing)
   - Original RSIDs (revision identifiers)
6. **Enables track changes** - Updates `settings.xml` to turn on Track Changes
7. **Creates output DOCX** - Packages everything into a valid Word document

## Style Preservation Strategy

### Character-Level Formatting
- Extracts `<w:rPr>` (run properties) from each text run
- Preserves bold, italic, underline, font family, font size, color, etc.
- Maintains original formatting in both deletions and insertions

### Paragraph-Level Formatting
- Preserves `<w:pPr>` (paragraph properties)
- Maintains heading styles, alignment, indentation, spacing
- Keeps list formatting (numbered/bulleted lists)

### Minimal Edits Principle
- Only marks text that actually changed
- Reuses unchanged `<w:r>` elements with original RSIDs
- Splits changes at word boundaries for cleaner review

## Technical Details

### OOXML Tracked Changes Format

**Deletion:**
```xml
<w:del w:id="12345678" w:author="Claude" w:date="2024-10-09T12:00:00Z">
  <w:r w:rsidDel="12345678">
    <w:rPr><!-- original formatting --></w:rPr>
    <w:delText>deleted text</w:delText>
  </w:r>
</w:del>
```

**Insertion:**
```xml
<w:ins w:id="87654321" w:author="Claude" w:date="2024-10-09T12:00:00Z">
  <w:r w:rsidR="87654321">
    <w:rPr><!-- original formatting --></w:rPr>
    <w:t>inserted text</w:t>
  </w:r>
</w:ins>
```

### Diff Algorithm

1. **Paragraph-level diff** - Identifies added/removed/changed paragraphs
2. **Word-level diff** - For changed paragraphs, finds specific word changes
3. **Run-level mapping** - Maps changes back to original formatted runs
4. **Style preservation** - Carries formatting from source runs to tracked changes

## Integration with Existing Scripts

This script reuses utilities from `diff-utils.js`:
- `extractDocx()` - Unpacks DOCX files
- `getAllFiles()` - Recursively lists files for repacking
- `isXMLFile()` - Identifies XML files for processing

## NPM Script Integration

Add to `package.json`:

```json
{
  "scripts": {
    "diff:redline": "node scripts/diff-redline.js"
  }
}
```

Usage:
```bash
npm run diff:redline baseline.docx current.docx output.docx
```

## Limitations & Future Enhancements

### Current Limitations
- Text-only comparison (tables, images, and complex structures use baseline version)
- Single author ("Claude") for all changes
- English text optimized (RTL languages may need adjustment)

### Potential Enhancements
- Table cell-level comparison
- Image diff detection
- Comment preservation
- Multiple author support
- Custom author name parameter
- Batch processing of multiple files
- HTML diff output (side-by-side view)

## Viewing Tracked Changes

Open the output DOCX in:
- **Microsoft Word** - Full tracked changes support
- **LibreOffice Writer** - Good support for viewing tracked changes
- **Google Docs** - Basic support (may not show all formatting)

To accept/reject changes in Word:
1. Open the document
2. Go to **Review** tab
3. Use **Accept** or **Reject** buttons
4. Or click **Show Markup** to configure display options

## Validation

Use the redlining validator to ensure changes are properly tracked:

```bash
python claude-office-skills/public/docx/ooxml/scripts/validation/redlining.py \
  --unpacked unpacked_dir \
  --original original.docx \
  --verbose
```

## Troubleshooting

**Error: "Cannot read property 'match' of undefined"**
- One of the DOCX files may be corrupted
- Ensure both files are valid DOCX documents

**Output DOCX won't open**
- Check temp directory wasn't cleaned up mid-process
- Verify both input files are valid DOCX (not DOC or other formats)

**Tracked changes not showing**
- Enable Track Changes view in Word (Review > Tracking > Display for Review)
- Verify `settings.xml` has `<w:trackRevisions/>` element

**Formatting lost**
- Check that original document uses standard OOXML formatting
- Complex custom styles may not be fully preserved

## Related Files

- `diff-docx.js` - Markdown report generator (existing)
- `diff-utils.js` - Shared utilities for DOCX manipulation
- `diff-redline.js` - This redlining script (new)
