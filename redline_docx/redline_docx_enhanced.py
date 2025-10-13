#!/usr/bin/env python3
"""redline_docx_enhanced.py - Client for the DOCX redlining skill.

This script uses the claude-office-skills framework to create a tracked-changes
(redline) .docx by comparing two .docx files.

Usage:
    python redline_docx_enhanced.py old.docx new.docx output.docx --author "Legal Team" --verbose
"""

import argparse
import logging
import sys
from pathlib import Path

# Adjust the path to import from the claude-office-skills library
sys.path.append(str(Path(__file__).resolve().parents[1]))

from claude_office_skills.public.docx.scripts.document import Document
from claude_office_skills.public.docx.scripts.redliner import Redliner

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s: %(message)s'
)
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

    try:
        # The Document class handles unpacking the .docx files into a temporary directory
        old_doc = Document(old_path)
        new_doc = Document(new_path)
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
        # Pack the modified temporary directory into the output .docx
        new_doc.save(out_path, validate=False) # Validation may fail due to the lxml/minidom bridge
    except Exception as e:
        msg = f'Failed to write {out_path}: {e}'
        raise OSError(msg) from e

    logger.info(f'✓ Redline complete: {out_path}')


def main(argv=None) -> int:
    """Main entry point."""
    p = argparse.ArgumentParser(
        description='Generate redlined .docx with Word Track Changes',
        epilog='Enhanced version using the claude-office-skills framework.'
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
        logger.setLevel(logging.ERROR)
    elif args.verbose:
        logger.setLevel(logging.DEBUG)
    else:
        logger.setLevel(logging.INFO)

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
