#!/usr/bin/env python3
"""redline_docx_v2.py - Client for the DOCX redlining skill.

This script uses the claude_office_skills_v2 framework to create a tracked-changes
(redline) .docx by comparing two .docx files.

Usage:
    python redline_docx_v2.py old.docx new.docx output.docx --author "Legal Team" --verbose
"""

import argparse
import logging
import sys
import tempfile
from pathlib import Path

# Adjust the path to import from the claude-office-skills library
sys.path.append(str(Path(__file__).resolve().parents[1]))

from claude_office_skills_v2.public.docx.scripts.document import Document
from claude_office_skills_v2.public.docx.scripts.redliner import Redliner
from claude_office_skills_v2.public.docx.ooxml.scripts.unpack import unpack_document
from claude_office_skills_v2.public.docx.ooxml.scripts.pack import pack_document

# Configure logging
logger = logging.getLogger(__name__)


def make_redline_docx(
    old_path: str,
    new_path: str,
    out_path: str,
    author: str = 'AutoDiff',
    date_iso: str | None = None
) -> None:
    """Create redlined .docx by comparing two .docx files using the Redliner skill.

    Args:
        old_path: Path to old/original .docx
        new_path: Path to new/revised .docx
        out_path: Path for output .docx
        author: Author name for tracked changes
        date_iso: ISO timestamp (uses current time if None)
    """
    logger.info(f'Comparing {old_path} -> {new_path}')

    with tempfile.TemporaryDirectory() as old_unpacked, tempfile.TemporaryDirectory() as new_unpacked:
        try:
            unpack_document(old_path, old_unpacked)
            unpack_document(new_path, new_unpacked)
            old_doc = Document(old_unpacked)
            new_doc = Document(new_unpacked)
        except Exception as e:
            msg = f'Failed to load documents: {e}'
            raise RuntimeError(msg) from e

    # Perform the redline operation
    try:
        redliner = Redliner(old_doc, new_doc)
        redliner.redline(author=author, date_iso=date_iso)
    except Exception as e:
        msg = f'Failed to build redlined content: {e}'
        raise RuntimeError(msg) from e

    # Save the modified document
    logger.info(f'Writing redlined document to {out_path}')
    try:
        # Save all modified XML files from memory to the temp directory
        for editor in new_doc._editors.values():
            editor.save()
        # Pack the modified temporary directory into the output .docx
        pack_document(new_doc.unpacked_path, out_path, validate=False)
    except Exception as e:
        msg = f'Failed to write {out_path}: {e}'
        raise OSError(msg) from e

    logger.info(f'✓ Redline complete: {out_path}')


def main(argv=None) -> int:
    """Main entry point."""
    p = argparse.ArgumentParser(
        description='Generate redlined .docx with Word Track Changes',
        epilog='Enhanced version using the claude_office_skills framework.'
    )
    p.add_argument('old', help='Old/original .docx file')
    p.add_argument('new', help='New/revised .docx file')
    p.add_argument('out', help='Output redlined .docx file')
    p.add_argument('--author', default='AutoDiff', help='Author name for tracked changes')
    p.add_argument('--date', default=None, help='ISO timestamp for changes (default: now)')
    p.add_argument('--verbose', '-v', action='store_true', help='Enable verbose logging')
    p.add_argument('--quiet', '-q', action='store_true', help='Suppress all output except errors')

    args = p.parse_args(argv)

    if args.quiet:
        log_level = logging.ERROR
    elif args.verbose:
        log_level = logging.DEBUG
    else:
        log_level = logging.INFO

    logging.basicConfig(
        level=log_level,
        format='%(levelname)s: %(message)s'
    )

    try:
        make_redline_docx(args.old, args.new, args.out, author=args.author, date_iso=args.date)
        return 0
    except (FileNotFoundError, ValueError, RuntimeError, OSError) as e:
        logger.error(f'Error: {e}')
        return 1
    except Exception as e:
        logger.error(f'An unexpected error occurred: {e}', exc_info=args.verbose)
        return 99


if __name__ == '__main__':
    sys.exit(main())
