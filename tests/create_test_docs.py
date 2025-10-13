import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

def add_hyperlink(paragraph, text, url):
    """
    A function that places a hyperlink within a paragraph object.
    """
    part = paragraph.part
    r_id = part.relate_to(url, docx.opc.constants.RELATIONSHIP_TYPE.HYPERLINK, is_external=True)

    hyperlink = docx.oxml.shared.OxmlElement('w:hyperlink')
    hyperlink.set(docx.oxml.shared.qn('r:id'), r_id)

    new_run = docx.oxml.shared.OxmlElement('w:r')
    rPr = docx.oxml.shared.OxmlElement('w:rPr')

    # Add the Hyperlink style
    style = docx.oxml.shared.OxmlElement('w:rStyle')
    style.set(docx.oxml.shared.qn('w:val'), 'Hyperlink')
    rPr.append(style)

    new_run.append(rPr)
    new_run.text = text
    hyperlink.append(new_run)

    r = paragraph.add_run()
    r._r.append(hyperlink)

    # Manual styling is still useful as a fallback
    r.font.color.rgb = RGBColor(0x05, 0x63, 0xc1)
    r.font.underline = True

    return hyperlink

def create_test_docs():
    """Creates all the test documents."""
    # Create the directory for the test files
    if not os.path.exists('tests/test_files'):
        os.makedirs('tests/test_files')

    # Create the test files
    create_basic_functionality_docs()
    create_character_level_diffs_docs()
    create_table_cell_redlining_docs()
    create_hyperlink_preservation_docs()
    create_style_and_formatting_docs()


def create_basic_functionality_docs():
    """Creates test documents for basic functionality."""
    # Test Case 1.1: Simple text insertion
    doc_old = Document()
    doc_old.add_paragraph('This is a test.')
    doc_old.save(os.path.join('tests', 'test_files', '1.1_old.docx'))
    doc_new = Document()
    doc_new.add_paragraph('This is a test insertion.')
    doc_new.save(os.path.join('tests', 'test_files', '1.1_new.docx'))

    # Test Case 1.2: Simple text deletion
    doc_old = Document()
    doc_old.add_paragraph('This is a test deletion.')
    doc_old.save('tests/test_files/1.2_old.docx')
    doc_new = Document()
    doc_new.add_paragraph('This is a test.')
    doc_new.save('tests/test_files/1.2_new.docx')

    # Test Case 1.3: Simple text replacement
    doc_old = Document()
    doc_old.add_paragraph('This is a test replacement.')
    doc_old.save('tests/test_files/1.3_old.docx')
    doc_new = Document()
    doc_new.add_paragraph('This is a test substitution.')
    doc_new.save('tests/test_files/1.3_new.docx')

    # Test Case 1.4: No changes
    doc_old = Document()
    doc_old.add_paragraph('This is a test with no changes.')
    doc_old.save('tests/test_files/1.4_old.docx')
    doc_new = Document()
    doc_new.add_paragraph('This is a test with no changes.')
    doc_new.save('tests/test_files/1.4_new.docx')


def create_character_level_diffs_docs():
    """Creates test documents for character-level diffs."""
    # Test Case 2.1: Character insertion within a word
    doc_old = Document()
    doc_old.add_paragraph('This is a test caracter.')
    doc_old.save('tests/test_files/2.1_old.docx')
    doc_new = Document()
    doc_new.add_paragraph('This is a test character.')
    doc_new.save('tests/test_files/2.1_new.docx')

    # Test Case 2.2: Character deletion within a word
    doc_old = Document()
    doc_old.add_paragraph('This is a test character.')
    doc_old.save('tests/test_files/2.2_old.docx')
    doc_new = Document()
    doc_new.add_paragraph('This is a test caracter.')
    doc_new.save('tests/test_files/2.2_new.docx')

    # Test Case 2.3: Character replacement within a word
    doc_old = Document()
    doc_old.add_paragraph('This is a test character.')
    doc_old.save('tests/test_files/2.3_old.docx')
    doc_new = Document()
    doc_new.add_paragraph('This is a test charactar.')
    doc_new.save('tests/test_files/2.3_new.docx')


def create_table_cell_redlining_docs():
    """Creates test documents for table cell redlining."""
    # Test Case 3.1: Text change in a table cell
    doc_old = Document()
    table = doc_old.add_table(rows=1, cols=1)
    table.cell(0, 0).text = 'This is a test.'
    doc_old.save('tests/test_files/3.1_old.docx')
    doc_new = Document()
    table = doc_new.add_table(rows=1, cols=1)
    table.cell(0, 0).text = 'This is a test change.'
    doc_new.save('tests/test_files/3.1_new.docx')

    # Test Case 3.2: Add a row to a table
    doc_old = Document()
    table = doc_old.add_table(rows=1, cols=1)
    table.cell(0, 0).text = 'This is a test.'
    doc_old.save('tests/test_files/3.2_old.docx')
    doc_new = Document()
    table = doc_new.add_table(rows=2, cols=1)
    table.cell(0, 0).text = 'This is a test.'
    table.cell(1, 0).text = 'This is a new row.'
    doc_new.save('tests/test_files/3.2_new.docx')

    # Test Case 3.3: Delete a row from a table
    doc_old = Document()
    table = doc_old.add_table(rows=2, cols=1)
    table.cell(0, 0).text = 'This is a test.'
    table.cell(1, 0).text = 'This is a row to be deleted.'
    doc_old.save('tests/test_files/3.3_old.docx')
    doc_new = Document()
    table = doc_new.add_table(rows=1, cols=1)
    table.cell(0, 0).text = 'This is a test.'
    doc_new.save('tests/test_files/3.3_new.docx')

    # Test Case 3.4: Add a column to a table
    doc_old = Document()
    table = doc_old.add_table(rows=1, cols=1)
    table.cell(0, 0).text = 'This is a test.'
    doc_old.save('tests/test_files/3.4_old.docx')
    doc_new = Document()
    table = doc_new.add_table(rows=1, cols=2)
    table.cell(0, 0).text = 'This is a test.'
    table.cell(0, 1).text = 'This is a new column.'
    doc_new.save('tests/test_files/3.4_new.docx')

    # Test Case 3.5: Delete a column from a table
    doc_old = Document()
    table = doc_old.add_table(rows=1, cols=2)
    table.cell(0, 0).text = 'This is a test.'
    table.cell(0, 1).text = 'This is a column to be deleted.'
    doc_old.save('tests/test_files/3.5_old.docx')
    doc_new = Document()
    table = doc_new.add_table(rows=1, cols=1)
    table.cell(0, 0).text = 'This is a test.'
    doc_new.save('tests/test_files/3.5_new.docx')

    # Test Case 3.6: Changes in a nested table
    doc_old = Document()
    table = doc_old.add_table(rows=1, cols=1)
    cell = table.cell(0, 0)
    nested_table = cell.add_table(rows=1, cols=1)
    nested_table.cell(0, 0).text = 'This is a test.'
    doc_old.save('tests/test_files/3.6_old.docx')
    doc_new = Document()
    table = doc_new.add_table(rows=1, cols=1)
    cell = table.cell(0, 0)
    nested_table = cell.add_table(rows=1, cols=1)
    nested_table.cell(0, 0).text = 'This is a test change.'
    doc_new.save('tests/test_files/3.6_new.docx')


def create_hyperlink_preservation_docs():
    """Creates test documents for hyperlink preservation."""
    # Test Case 4.1: Unchanged hyperlink
    doc_old = Document()
    p = doc_old.add_paragraph('This is a ')
    add_hyperlink(p, 'hyperlink', 'http://test.com')
    doc_old.save('tests/test_files/4.1_old.docx')
    doc_new = Document()
    p = doc_new.add_paragraph('This is a ')
    add_hyperlink(p, 'hyperlink', 'http://test.com')
    doc_new.save('tests/test_files/4.1_new.docx')

    # Test Case 4.2: Change hyperlink text
    doc_old = Document()
    p = doc_old.add_paragraph('This is a ')
    add_hyperlink(p, 'hyperlink', 'http://test.com')
    doc_old.save('tests/test_files/4.2_old.docx')
    doc_new = Document()
    p = doc_new.add_paragraph('This is a ')
    add_hyperlink(p, 'changed hyperlink', 'http://test.com')
    doc_new.save('tests/test_files/4.2_new.docx')

    # Test Case 4.3: Add a hyperlink
    doc_old = Document()
    doc_old.add_paragraph('This is a test.')
    doc_old.save('tests/test_files/4.3_old.docx')
    doc_new = Document()
    p = doc_new.add_paragraph('This is a ')
    add_hyperlink(p, 'hyperlink', 'http://test.com')
    doc_new.save('tests/test_files/4.3_new.docx')

    # Test Case 4.4: Delete a hyperlink
    doc_old = Document()
    p = doc_old.add_paragraph('This is a ')
    add_hyperlink(p, 'hyperlink', 'http://test.com')
    doc_old.save('tests/test_files/4.4_old.docx')
    doc_new = Document()
    doc_new.add_paragraph('This is a test.')
    doc_new.save('tests/test_files/4.4_new.docx')


def create_style_and_formatting_docs():
    """Creates test documents for style and formatting."""
    # Test Case 5.1: Change bold text
    doc_old = Document()
    p = doc_old.add_paragraph()
    r = p.add_run()
    r.text = 'This is a '
    r = p.add_run()
    r.text = 'bold'
    r.bold = True
    r = p.add_run()
    r.text = ' word.'
    doc_old.save('tests/test_files/5.1_old.docx')
    doc_new = Document()
    p = doc_new.add_paragraph()
    r = p.add_run()
    r.text = 'This is a '
    r = p.add_run()
    r.text = 'bold'
    r = p.add_run()
    r.text = ' word.'
    doc_new.save('tests/test_files/5.1_new.docx')

    # Test Case 5.2: Change italic text
    doc_old = Document()
    p = doc_old.add_paragraph()
    r = p.add_run()
    r.text = 'This is an '
    r = p.add_run()
    r.text = 'italic'
    r.italic = True
    r = p.add_run()
    r.text = ' word.'
    doc_old.save('tests/test_files/5.2_old.docx')
    doc_new = Document()
    p = doc_new.add_paragraph()
    r = p.add_run()
    r.text = 'This is an '
    r = p.add_run()
    r.text = 'italic'
    r = p.add_run()
    r.text = ' word.'
    doc_new.save('tests/test_files/5.2_new.docx')

    # Test Case 5.3: Change underlined text
    doc_old = Document()
    p = doc_old.add_paragraph()
    r = p.add_run()
    r.text = 'This is an '
    r = p.add_run()
    r.text = 'underlined'
    r.underline = True
    r = p.add_run()
    r.text = ' word.'
    doc_old.save('tests/test_files/5.3_old.docx')
    doc_new = Document()
    p = doc_new.add_paragraph()
    r = p.add_run()
    r.text = 'This is an '
    r = p.add_run()
    r.text = 'underlined'
    r = p.add_run()
    r.text = ' word.'
    doc_new.save('tests/test_files/5.3_new.docx')

    # Test Case 5.4: Change font size and color
    doc_old = Document()
    p = doc_old.add_paragraph()
    r = p.add_run()
    r.text = 'This is a word with a '
    r = p.add_run()
    r.text = 'different'
    font = r.font
    font.size = Pt(20)
    font.color.rgb = RGBColor(0xFF, 0x00, 0x00)
    r = p.add_run()
    r.text = ' font.'
    doc_old.save('tests/test_files/5.4_old.docx')
    doc_new = Document()
    p = doc_new.add_paragraph()
    r = p.add_run()
    r.text = 'This is a word with a '
    r = p.add_run()
    r.text = 'different'
    r = p.add_run()
    r.text = ' font.'
    doc_new.save('tests/test_files/5.4_new.docx')

    # Test Case 5.5: Change paragraph alignment
    doc_old = Document()
    p = doc_old.add_paragraph('This is a centered paragraph.')
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc_old.save('tests/test_files/5.5_old.docx')
    doc_new = Document()
    p = doc_new.add_paragraph('This is a centered paragraph.')
    doc_new.save('tests/test_files/5.5_new.docx')

    # Test Case 5.6: Changes in a numbered list
    doc_old = Document()
    doc_old.add_paragraph('First item in a numbered list.', style='List Number')
    doc_old.add_paragraph('Second item in a numbered list.', style='List Number')
    doc_old.save('tests/test_files/5.6_old.docx')
    doc_new = Document()
    doc_new.add_paragraph('First item in a numbered list.', style='List Number')
    doc_new.save('tests/test_files/5.6_new.docx')

    # Test Case 5.7: Changes in a bulleted list
    doc_old = Document()
    doc_old.add_paragraph('First item in a bulleted list.', style='List Bullet')
    doc_old.add_paragraph('Second item in a bulleted list.', style='List Bullet')
    doc_old.save('tests/test_files/5.7_old.docx')
    doc_new = Document()
    doc_new.add_paragraph('First item in a bulleted list.', style='List Bullet')
    doc_new.save('tests/test_files/5.7_new.docx')


if __name__ == '__main__':
    create_test_docs()
