import os
import shutil
import subprocess
import sys
import unittest
import zipfile
from pathlib import Path

from lxml import etree
from typer.testing import CliRunner

# Add the project root and tests folder to the Python path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, BASE_DIR)
sys.path.insert(0, os.path.join(BASE_DIR, 'tests'))

from create_test_docs import create_test_docs
from claude_office_skills.public.docx.scripts import typer_redline_cli

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

    def _resolve_path(self, candidate: str) -> str:
        """Return an absolute path for docx inputs/outputs used by the script."""
        if os.path.isabs(candidate) or os.path.exists(candidate):
            return candidate
        return os.path.join(self.test_files_dir, candidate)

    def run_script(self, old_file, new_file, out_file, author=None, date=None, extra_args=None):
        """Helper function to run the script."""
        command = [
            sys.executable,
            self.script_path,
            self._resolve_path(old_file),
            self._resolve_path(new_file),
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

    def test_style_definitions_are_merged(self):
        """Custom paragraph styles from the old doc should remain usable after redlining."""
        out_path = os.path.join(self.output_dir, '6.1_out.docx')
        result = self.run_script('6.1_old.docx', '6.1_new.docx', '6.1_out.docx')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(os.path.exists(out_path))

        ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        with zipfile.ZipFile(out_path) as docx_zip:
            styles_root = etree.fromstring(docx_zip.read('word/styles.xml'))
            self.assertTrue(
                styles_root.xpath("//w:style[@w:styleId='CustomParaStyle']", namespaces=ns),
                'Custom paragraph style missing from merged styles.xml'
            )

            doc_root = etree.fromstring(docx_zip.read('word/document.xml'))
            self.assertTrue(
                doc_root.xpath('//w:pPrChange//w:pStyle[@w:val="CustomParaStyle"]', namespaces=ns),
                'Paragraph style change should reference the original custom style'
            )

    def test_character_style_preserved_with_format_change(self):
        """Character styles used only in the old doc should still be referenced in rPrChange nodes."""
        out_path = os.path.join(self.output_dir, '6.2_out.docx')
        result = self.run_script('6.2_old.docx', '6.2_new.docx', '6.2_out.docx')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(os.path.exists(out_path))

        ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        with zipfile.ZipFile(out_path) as docx_zip:
            styles_root = etree.fromstring(docx_zip.read('word/styles.xml'))
            self.assertTrue(
                styles_root.xpath("//w:style[@w:styleId='CustomCharStyle']", namespaces=ns),
                'Custom character style missing from merged styles.xml'
            )

            doc_root = etree.fromstring(docx_zip.read('word/document.xml'))
            self.assertTrue(
                doc_root.xpath(
                    "//w:r[w:t='Styled run with unique character style.']"
                    '/w:rPr/w:rPrChange/w:rPr/w:rStyle[@w:val="CustomCharStyle"]',
                    namespaces=ns,
                ),
                'Run-level style change should retain the original custom character style',
            )

    def test_paragraph_style_persists_across_sequential_runs(self):
        """Redlining twice should keep custom paragraph styles available for new changes."""
        first_out = os.path.join(self.output_dir, '6.3_first_redline.docx')
        result_first = self.run_script('6.1_old.docx', '6.1_new.docx', '6.3_first_redline.docx')
        self.assertEqual(result_first.returncode, 0, result_first.stderr)
        self.assertTrue(os.path.exists(first_out))

        chained_out = os.path.join(self.output_dir, '6.3_second_redline.docx')
        result_second = self.run_script(first_out, '6.3_new.docx', '6.3_second_redline.docx')
        self.assertEqual(result_second.returncode, 0, result_second.stderr)
        self.assertTrue(os.path.exists(chained_out))

        ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        with zipfile.ZipFile(chained_out) as docx_zip:
            styles_root = etree.fromstring(docx_zip.read('word/styles.xml'))
            para_styles = styles_root.xpath("//w:style[@w:styleId='CustomParaStyle']", namespaces=ns)
            self.assertTrue(para_styles, 'Custom paragraph style missing after second redline run')

            doc_root = etree.fromstring(docx_zip.read('word/document.xml'))
            self.assertTrue(
                doc_root.xpath('//w:pPrChange//w:pStyle[@w:val="CustomParaStyle"]', namespaces=ns),
                'Sequential redline should retain paragraph style references in change records',
            )

    def test_character_styles_persist_through_chained_runs(self):
        """Character styles merged once should continue to exist after another redline."""
        first_out = os.path.join(self.output_dir, '6.4_first_redline.docx')
        result_first = self.run_script('6.2_old.docx', '6.2_new.docx', '6.4_first_redline.docx')
        self.assertEqual(result_first.returncode, 0, result_first.stderr)
        self.assertTrue(os.path.exists(first_out))

        chained_out = os.path.join(self.output_dir, '6.4_second_redline.docx')
        result_second = self.run_script(first_out, '6.4_new.docx', '6.4_second_redline.docx')
        self.assertEqual(result_second.returncode, 0, result_second.stderr)
        self.assertTrue(os.path.exists(chained_out))

        ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        with zipfile.ZipFile(chained_out) as docx_zip:
            styles_root = etree.fromstring(docx_zip.read('word/styles.xml'))
            self.assertTrue(
                styles_root.xpath("//w:style[@w:styleId='CustomCharStyle']", namespaces=ns),
                'Custom character style missing after chained redline runs',
            )

            doc_root = etree.fromstring(docx_zip.read('word/document.xml'))
            self.assertTrue(
                doc_root.xpath(
                    "//w:rPrChange//w:rPr/w:rStyle[@w:val='CustomCharStyle']",
                    namespaces=ns,
                ),
                'Run-level change tracking should continue to reference the merged character style',
            )

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

    def test_multi_run_formatting_layers(self):
        """Verify multiple styled runs retain formatting in tracked changes."""
        out_path = os.path.join(self.output_dir, '10.1_out.docx')
        result = self.run_script('10.1_old.docx', '10.1_new.docx', '10.1_out.docx')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(os.path.exists(out_path))

        ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        with zipfile.ZipFile(out_path) as docx_zip:
            doc_root = etree.fromstring(docx_zip.read('word/document.xml'))
            self.assertTrue(doc_root.xpath('//w:ins//w:rPr/w:b', namespaces=ns))
            self.assertTrue(doc_root.xpath('//w:ins//w:rPr/w:i', namespaces=ns))
            self.assertTrue(doc_root.xpath('//w:del//w:rPr/w:u', namespaces=ns))

    def test_progressive_style_merge_with_tables_and_lists(self):
        """Custom styles should merge even when tables and lists are present."""
        out_path = os.path.join(self.output_dir, '15.1_out.docx')
        result = self.run_script('15.1_old.docx', '15.1_new.docx', '15.1_out.docx')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(os.path.exists(out_path))

        ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        with zipfile.ZipFile(out_path) as docx_zip:
            styles_root = etree.fromstring(docx_zip.read('word/styles.xml'))
            self.assertTrue(
                styles_root.xpath("//w:style[@w:styleId='DensePara']", namespaces=ns),
                'DensePara style should be merged from the original document',
            )
            self.assertTrue(
                styles_root.xpath("//w:style[@w:styleId='AccentChar']", namespaces=ns),
                'AccentChar style should be merged from the original document',
            )

            doc_root = etree.fromstring(docx_zip.read('word/document.xml'))
            self.assertTrue(
                doc_root.xpath('//w:tbl//w:tr', namespaces=ns),
                'Table rows should persist after redlining complex styles',
            )
            numbering_nodes = doc_root.xpath('//w:numPr', namespaces=ns)
            list_styles = doc_root.xpath("//w:pStyle[@w:val='ListNumber']", namespaces=ns)
            self.assertTrue(
                numbering_nodes or list_styles,
                'List numbering should remain present alongside merged styles',
            )

    def test_high_complexity_style_chain(self):
        """Sequential redlines with complex styles should keep merged definitions."""
        first_out = os.path.join(self.output_dir, '20.1_first_out.docx')
        result_first = self.run_script('20.1_old.docx', '20.1_new.docx', '20.1_first_out.docx')
        self.assertEqual(result_first.returncode, 0, result_first.stderr)
        self.assertTrue(os.path.exists(first_out))

        chained_out = os.path.join(self.output_dir, '20.2_second_out.docx')
        result_second = self.run_script(first_out, '20.2_new.docx', '20.2_second_out.docx')
        self.assertEqual(result_second.returncode, 0, result_second.stderr)
        self.assertTrue(os.path.exists(chained_out))

        ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        with zipfile.ZipFile(chained_out) as docx_zip:
            styles_root = etree.fromstring(docx_zip.read('word/styles.xml'))
            self.assertTrue(
                styles_root.xpath("//w:style[@w:styleId='SequencePara']", namespaces=ns),
                'SequencePara should still be present after chained runs',
            )
            self.assertTrue(
                styles_root.xpath("//w:style[@w:styleId='SequenceAccent']", namespaces=ns),
                'SequenceAccent should still be present after chained runs',
            )

            doc_root = etree.fromstring(docx_zip.read('word/document.xml'))
            self.assertTrue(
                doc_root.xpath('//w:rStyle[@w:val="SequenceAccent"]', namespaces=ns),
                'Run-level content should continue to use the merged accent style',
            )
            self.assertTrue(
                doc_root.xpath('//w:pStyle[@w:val="SequencePara"]', namespaces=ns),
                'Paragraph content should keep the custom paragraph style reference after chaining',
            )

    def test_typer_cli_generates_redline(self):
        """Typer CLI should wrap unpack, redline, and pack helpers."""
        runner = CliRunner()
        out_path = Path(self.output_dir) / 'cli_redline.docx'
        result = runner.invoke(
            typer_redline_cli.app,
            [
                '--original', self._resolve_path('1.1_old.docx'),
                '--modified', self._resolve_path('1.1_new.docx'),
                '--destination-file', str(out_path),
                '--author', 'TyperTest',
            ],
        )

        self.assertEqual(result.exit_code, 0, result.output)
        self.assertTrue(out_path.exists())

        ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        with zipfile.ZipFile(out_path) as docx_zip:
            doc_root = etree.fromstring(docx_zip.read('word/document.xml'))
            self.assertTrue(doc_root.xpath('//w:ins', namespaces=ns))
            settings_root = etree.fromstring(docx_zip.read('word/settings.xml'))
            self.assertTrue(settings_root.xpath('//w:trackRevisions', namespaces=ns))

    def test_typer_cli_default_destination(self):
        """When destination is omitted, a *_redlined.docx file should be created."""
        runner = CliRunner()
        source_old = Path(self._resolve_path('1.2_old.docx')).resolve()
        source_new = Path(self._resolve_path('1.2_new.docx')).resolve()
        with runner.isolated_filesystem():
            old_copy = Path('local_old.docx')
            new_copy = Path('local_new.docx')
            shutil.copy(source_old, old_copy)
            shutil.copy(source_new, new_copy)

            result = runner.invoke(
                typer_redline_cli.app,
                [
                    '--original', str(old_copy),
                    '--modified', str(new_copy),
                ],
            )

            self.assertEqual(result.exit_code, 0, result.output)
            default_out = Path('local_new_redlined.docx')
            self.assertTrue(default_out.exists(), 'Default destination should be alongside modified doc')


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
    unittest.main()
