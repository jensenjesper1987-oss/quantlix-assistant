from __future__ import annotations

# pylint: disable=wrong-import-position,import-error

import argparse
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.rag import index_markdown_dir

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def main() -> None:
    parser = argparse.ArgumentParser(description="Index markdown docs into pgvector")
    parser.add_argument("docs_path", help="Path to markdown documentation directory")
    args = parser.parse_args()

    indexed = index_markdown_dir(args.docs_path)
    logger.info("Indexed %s chunks from %s", indexed, args.docs_path)


if __name__ == "__main__":
    main()
