import os
import shutil
import subprocess
import sys
import unittest
import zipfile
from lxml import etree

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from tests.create_test_docs import create_style_preservation_docs

class TestStyleAndFormattingPreservation(unittest.TestCase):
    """Test cases for style and formatting preservation."""

    def setUp(self):
        """Set up the test environment."""
        self.script_path = 'redline_docx/redline_docx_enhanced.py'
        self.test_files_dir = 'tests/test_files'
        self.output_dir = 'tests/output'
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)
        create_style_preservation_docs()

    def tearDown(self):
        """Clean up the test environment."""
        if os.path.exists(self.test_files_dir):
            shutil.rmtree(self.test_files_dir)
        if os.path.exists(self.output_dir):
            shutil.rmtree(self.output_dir)

    def run_script(self, old_file, new_file, out_file):
        """Helper function to run the script."""
        command = [
            'python',
            self.script_path,
            os.path.join(self.test_files_dir, old_file),
            os.path.join(self.test_files_dir, new_file),
            os.path.join(self.output_dir, out_file),
        ]
        return subprocess.run(command, capture_output=True, text=True)

    def test_paragraph_alignment_change(self):
        """Test preservation of paragraph alignment changes."""
        result = self.run_script('style_p_align_old.docx', 'style_p_align_new.docx', 'style_p_align_out.docx')
        self.assertEqual(result.returncode, 0, result.stderr)

        with zipfile.ZipFile(os.path.join(self.output_dir, 'style_p_align_out.docx')) as docx:
            doc_xml = docx.read('word/document.xml')
            root = etree.fromstring(doc_xml)
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            pPrChange = root.xpath('//w:pPrChange', namespaces=ns)
            self.assertTrue(len(pPrChange) > 0, "No <w:pPrChange> tag found for alignment change.")

    def test_run_bold_style_change(self):
        """Test preservation of bold style changes."""
        result = self.run_script('style_r_bold_old.docx', 'style_r_bold_new.docx', 'style_r_bold_out.docx')
        self.assertEqual(result.returncode, 0, result.stderr)

        with zipfile.ZipFile(os.path.join(self.output_dir, 'style_r_bold_out.docx')) as docx:
            doc_xml = docx.read('word/document.xml')
            root = etree.fromstring(doc_xml)
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            rPrChange = root.xpath('//w:rPrChange', namespaces=ns)
            self.assertTrue(len(rPrChange) > 0, "No <w:rPrChange> tag found for bold style change.")

    def test_run_italic_to_bold_style_change(self):
        """Test preservation of italic to bold style changes."""
        result = self.run_script('style_r_italic_old.docx', 'style_r_italic_new.docx', 'style_r_italic_out.docx')
        self.assertEqual(result.returncode, 0, result.stderr)

        with zipfile.ZipFile(os.path.join(self.output_dir, 'style_r_italic_out.docx')) as docx:
            doc_xml = docx.read('word/document.xml')
            root = etree.fromstring(doc_xml)
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            rPrChange = root.xpath('//w:rPrChange', namespaces=ns)
            self.assertTrue(len(rPrChange) > 0, "No <w:rPrChange> tag found for italic to bold style change.")

    def test_run_combined_style_change(self):
        """Test preservation of combined style changes."""
        result = self.run_script('style_r_combined_old.docx', 'style_r_combined_new.docx', 'style_r_combined_out.docx')
        self.assertEqual(result.returncode, 0, result.stderr)

        with zipfile.ZipFile(os.path.join(self.output_dir, 'style_r_combined_out.docx')) as docx:
            doc_xml = docx.read('word/document.xml')
            root = etree.fromstring(doc_xml)
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            rPrChange = root.xpath('//w:rPrChange', namespaces=ns)
            self.assertTrue(len(rPrChange) > 0, "No <w:rPrChange> tag found for combined style change.")

if __name__ == '__main__':
    unittest.main()
