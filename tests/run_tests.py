import os
import shutil
import subprocess
import sys
import unittest
from create_test_docs import create_test_docs
from test_style_preservation import TestStyleAndFormattingPreservation

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

class TestRedlineDocx(unittest.TestCase):
    """Test cases for redline_docx_enhanced.py."""

    def setUp(self):
        """Set up the test environment."""
        self.script_path = 'redline_docx/redline_docx_enhanced.py'
        self.test_files_dir = 'tests/test_files'
        self.output_dir = 'tests/output'
        if os.path.exists(self.output_dir):
            shutil.rmtree(self.output_dir)
        os.makedirs(self.output_dir)
        create_test_docs()

    def run_script(self, old_file, new_file, out_file, author=None, date=None, extra_args=None):
        """Helper function to run the script."""
        command = [
            'python',
            self.script_path,
            os.path.join(self.test_files_dir, old_file),
            os.path.join(self.test_files_dir, new_file),
            os.path.join(self.output_dir, out_file),
        ]
        if author:
            command.extend(['--author', author])
        if date:
            command.extend(['--date', date])
        if extra_args:
            command.extend(extra_args)

        return subprocess.run(command, capture_output=True, text=True)

    def test_basic_functionality(self):
        """Test basic functionality."""
        import zipfile
        from lxml import etree

        # Test Case 1.1: Simple text insertion
        out_path_1_1 = os.path.join(self.output_dir, '1.1_out.docx')
        result = self.run_script('1.1_old.docx', '1.1_new.docx', '1.1_out.docx')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(os.path.exists(out_path_1_1))

        # Verify the XML output for insertion
        with zipfile.ZipFile(out_path_1_1) as docx_zip:
            doc_xml_bytes = docx_zip.read('word/document.xml')
            root = etree.fromstring(doc_xml_bytes)
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            insertions = root.xpath('//w:ins', namespaces=ns)
            self.assertTrue(len(insertions) > 0, "No <w:ins> tag found for insertion.")

        # Test Case 1.2: Simple text deletion
        out_path_1_2 = os.path.join(self.output_dir, '1.2_out.docx')
        result = self.run_script('1.2_old.docx', '1.2_new.docx', '1.2_out.docx')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(os.path.exists(out_path_1_2))

        # Verify the XML output for deletion
        with zipfile.ZipFile(out_path_1_2) as docx_zip:
            doc_xml_bytes = docx_zip.read('word/document.xml')
            root = etree.fromstring(doc_xml_bytes)
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            deletions = root.xpath('//w:del', namespaces=ns)
            self.assertTrue(len(deletions) > 0, "No <w:del> tag found for deletion.")

        # Test Case 1.3: Simple text replacement
        result = self.run_script('1.3_old.docx', '1.3_new.docx', '1.3_out.docx')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(os.path.exists(os.path.join(self.output_dir, '1.3_out.docx')))

        # Test Case 1.4: No changes
        result = self.run_script('1.4_old.docx', '1.4_new.docx', '1.4_out.docx')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(os.path.exists(os.path.join(self.output_dir, '1.4_out.docx')))

    def test_character_level_diffs(self):
        """Test character-level diffs."""
        # Test Case 2.1: Character insertion within a word
        result = self.run_script('2.1_old.docx', '2.1_new.docx', '2.1_out.docx')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(os.path.exists(os.path.join(self.output_dir, '2.1_out.docx')))

        # Test Case 2.2: Character deletion within a word
        result = self.run_script('2.2_old.docx', '2.2_new.docx', '2.2_out.docx')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(os.path.exists(os.path.join(self.output_dir, '2.2_out.docx')))

        # Test Case 2.3: Character replacement within a word
        result = self.run_script('2.3_old.docx', '2.3_new.docx', '2.3_out.docx')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(os.path.exists(os.path.join(self.output_dir, '2.3_out.docx')))

    def test_table_cell_redlining(self):
        """Test table cell redlining."""
        # Test Case 3.1: Text change in a table cell
        result = self.run_script('3.1_old.docx', '3.1_new.docx', '3.1_out.docx')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(os.path.exists(os.path.join(self.output_dir, '3.1_out.docx')))

        # Test Case 3.2: Add a row to a table
        result = self.run_script('3.2_old.docx', '3.2_new.docx', '3.2_out.docx')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(os.path.exists(os.path.join(self.output_dir, '3.2_out.docx')))

        # Test Case 3.3: Delete a row from a table
        result = self.run_script('3.3_old.docx', '3.3_new.docx', '3.3_out.docx')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(os.path.exists(os.path.join(self.output_dir, '3.3_out.docx')))

        # Test Case 3.4: Add a column to a table
        result = self.run_script('3.4_old.docx', '3.4_new.docx', '3.4_out.docx')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(os.path.exists(os.path.join(self.output_dir, '3.4_out.docx')))

        # Test Case 3.5: Delete a column from a table
        result = self.run_script('3.5_old.docx', '3.5_new.docx', '3.5_out.docx')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(os.path.exists(os.path.join(self.output_dir, '3.5_out.docx')))

        # Test Case 3.6: Changes in a nested table
        result = self.run_script('3.6_old.docx', '3.6_new.docx', '3.6_out.docx')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(os.path.exists(os.path.join(self.output_dir, '3.6_out.docx')))

    def test_hyperlink_preservation(self):
        """Test hyperlink preservation."""
        # Test Case 4.1: Unchanged hyperlink
        result = self.run_script('4.1_old.docx', '4.1_new.docx', '4.1_out.docx')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(os.path.exists(os.path.join(self.output_dir, '4.1_out.docx')))

        # Test Case 4.2: Change hyperlink text
        result = self.run_script('4.2_old.docx', '4.2_new.docx', '4.2_out.docx')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(os.path.exists(os.path.join(self.output_dir, '4.2_out.docx')))

        # Test Case 4.3: Add a hyperlink
        result = self.run_script('4.3_old.docx', '4.3_new.docx', '4.3_out.docx')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(os.path.exists(os.path.join(self.output_dir, '4.3_out.docx')))

        # Test Case 4.4: Delete a hyperlink
        result = self.run_script('4.4_old.docx', '4.4_new.docx', '4.4_out.docx')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(os.path.exists(os.path.join(self.output_dir, '4.4_out.docx')))

    def test_style_and_formatting(self):
        """Test style and formatting."""
        # Test Case 5.1: Change bold text
        result = self.run_script('5.1_old.docx', '5.1_new.docx', '5.1_out.docx')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(os.path.exists(os.path.join(self.output_dir, '5.1_out.docx')))

        # Test Case 5.2: Change italic text
        result = self.run_script('5.2_old.docx', '5.2_new.docx', '5.2_out.docx')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(os.path.exists(os.path.join(self.output_dir, '5.2_out.docx')))

        # Test Case 5.3: Change underlined text
        result = self.run_script('5.3_old.docx', '5.3_new.docx', '5.3_out.docx')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(os.path.exists(os.path.join(self.output_dir, '5.3_out.docx')))

        # Test Case 5.4: Change font size and color
        result = self.run_script('5.4_old.docx', '5.4_new.docx', '5.4_out.docx')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(os.path.exists(os.path.join(self.output_dir, '5.4_out.docx')))

        # Test Case 5.5: Change paragraph alignment
        result = self.run_script('5.5_old.docx', '5.5_new.docx', '5.5_out.docx')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(os.path.exists(os.path.join(self.output_dir, '5.5_out.docx')))

        # Test Case 5.6: Changes in a numbered list
        result = self.run_script('5.6_old.docx', '5.6_new.docx', '5.6_out.docx')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(os.path.exists(os.path.join(self.output_dir, '5.6_out.docx')))

        # Test Case 5.7: Changes in a bulleted list
        result = self.run_script('5.7_old.docx', '5.7_new.docx', '5.7_out.docx')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(os.path.exists(os.path.join(self.output_dir, '5.7_out.docx')))

    def test_error_handling(self):
        """Test error handling."""
        # Test Case 6.1: Non-existent input files
        result = self.run_script('non_existent.docx', 'non_existent.docx', '6.1_out.docx')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('No such file or directory', result.stderr)

        # Test Case 6.2: Invalid .docx file
        invalid_docx_path = os.path.join(self.test_files_dir, 'invalid.docx')
        with open(invalid_docx_path, 'w') as f:
            f.write('This is not a docx file.')
        result = self.run_script('invalid.docx', '1.1_new.docx', '6.2_out.docx')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('File is not a zip file', result.stderr)
        os.remove(invalid_docx_path)

        # Test Case 6.3: Invalid command-line arguments
        result = self.run_script('1.1_old.docx', '1.1_new.docx', '6.3_out.docx', extra_args=['--invalid-arg'])
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('unrecognized arguments', result.stderr)

    def test_command_line_arguments(self):
        """Test command-line arguments."""
        # Test Case 7.1: Custom author
        result = self.run_script('1.1_old.docx', '1.1_new.docx', '7.1_out.docx', author='Test Author')
        self.assertEqual(result.returncode, 0, result.stderr)
        out_path_71 = os.path.join(self.output_dir, '7.1_out.docx')
        self.assertTrue(os.path.exists(out_path_71))

        # Check author metadata in tracked changes
        import zipfile
        from lxml import etree

        with zipfile.ZipFile(out_path_71) as docx_zip:
            with docx_zip.open('word/document.xml') as doc_xml:
                tree = etree.parse(doc_xml)
                # Find all tracked change elements (e.g., w:ins, w:del)
                tracked_changes = tree.xpath('//w:ins | //w:del', namespaces={'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'})
                self.assertTrue(tracked_changes, "No tracked changes found in DOCX output")
                for change in tracked_changes:
                    author = change.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}author')
                    self.assertEqual(author, 'Test Author', f"Tracked change author mismatch: {author}")

        # Test Case 7.2: Custom date
        result = self.run_script('1.1_old.docx', '1.1_new.docx', '7.2_out.docx', date='2025-01-01T12:00:00Z')
        self.assertEqual(result.returncode, 0, result.stderr)
        out_path_72 = os.path.join(self.output_dir, '7.2_out.docx')
        self.assertTrue(os.path.exists(out_path_72))

        # Check date metadata in tracked changes
        with zipfile.ZipFile(out_path_72) as docx_zip:
            with docx_zip.open('word/document.xml') as doc_xml:
                tree = etree.parse(doc_xml)
                tracked_changes = tree.xpath('//w:ins | //w:del', namespaces={'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'})
                self.assertTrue(tracked_changes, "No tracked changes found in DOCX output")
                for change in tracked_changes:
                    date = change.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}date')
                    self.assertEqual(date, '2025-01-01T12:00:00Z', f"Tracked change date mismatch: {date}")

        # Test Case 7.3: Verbose flag
        result = self.run_script('1.1_old.docx', '1.1_new.docx', '7.3_out.docx', extra_args=['--verbose'])
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('DEBUG', result.stderr)

        # Test Case 7.4: Quiet flag
        result = self.run_script('1.1_old.docx', '1.1_new.docx', '7.4_out.docx', extra_args=['--quiet'])
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout, '')
        self.assertEqual(result.stderr, '')


if __name__ == '__main__':
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    suite.addTests(loader.loadTestsFromTestCase(TestRedlineDocx))
    suite.addTests(loader.loadTestsFromTestCase(TestStyleAndFormattingPreservation))
    runner = unittest.TextTestRunner()
    runner.run(suite)
