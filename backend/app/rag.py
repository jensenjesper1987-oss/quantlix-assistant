from __future__ import annotations

from dataclasses import dataclass
import logging
import os
from pathlib import Path
import re
from typing import Iterable

import voyageai

logger = logging.getLogger(__name__)
HEADING_RE = re.compile(r"^(#{1,6})\s+(.+)$", re.MULTILINE)
INDEX_FILE_SUFFIXES = (".md", ".mdx", ".txt", ".rst", ".tsx")


@dataclass(frozen=True)
class Chunk:
    doc_id: str
    anchor: str
    text: str


def chunk_markdown(markdown: str, doc_id: str) -> list[Chunk]:
    """Chunk markdown text by headings for retrieval."""
    matches = list(HEADING_RE.finditer(markdown))
    if not matches:
        return [Chunk(doc_id=doc_id, anchor="root", text=markdown.strip())]

    chunks: list[Chunk] = []
    for idx, match in enumerate(matches):
        start = match.start()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(markdown)
        heading = match.group(2).strip()
        anchor = heading.lower().replace(" ", "-")
        body = markdown[start:end].strip()
        if body:
            chunks.append(Chunk(doc_id=doc_id, anchor=anchor, text=body))
    return chunks


def _iter_indexable_files(root: Path) -> Iterable[Path]:
    for path in root.rglob("*"):
        if path.is_file() and path.suffix.lower() in INDEX_FILE_SUFFIXES:
            yield path


def _l2_norm(values: list[float]) -> float:
    total = 0.0
    for value in values:
        total += value * value
    return total ** 0.5


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    if len(a) != len(b):
        return 0.0
    dot = 0.0
    for left, right in zip(a, b):
        dot += left * right
    denom = _l2_norm(a) * _l2_norm(b)
    if denom == 0:
        return 0.0
    return dot / denom


def _get_voyage_client() -> voyageai.Client:
    return voyageai.Client(api_key=os.environ["VOYAGE_API_KEY"])


def _upsert_vectors(chunks: list[Chunk], vectors: list[list[float]]) -> None:
    try:
        import psycopg  # type: ignore[import-not-found]
    except ImportError as exc:
        raise RuntimeError(
            "psycopg is required at runtime to upsert into pgvector."
        ) from exc

    dsn = os.environ["DATABASE_URL"]
    with psycopg.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE EXTENSION IF NOT EXISTS vector;
                CREATE TABLE IF NOT EXISTS doc_chunks (
                  id BIGSERIAL PRIMARY KEY,
                  doc_id TEXT NOT NULL,
                  anchor TEXT NOT NULL,
                  content TEXT NOT NULL,
                  embedding vector(1024) NOT NULL
                );
                """
            )
            for chunk, vector in zip(chunks, vectors):
                cur.execute(
                    """
                    INSERT INTO doc_chunks (doc_id, anchor, content, embedding)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (chunk.doc_id, chunk.anchor, chunk.text, vector),
                )
        conn.commit()


def index_markdown_dir(path: str) -> int:
    root = Path(path)
    if not root.exists() or not root.is_dir():
        raise ValueError("Invalid docs path: %s" % path)

    all_chunks: list[Chunk] = []
    for markdown_path in _iter_indexable_files(root):
        text = markdown_path.read_text(encoding="utf-8")
        rel_doc_id = str(markdown_path.relative_to(root))
        all_chunks.extend(chunk_markdown(text, rel_doc_id))

    if not all_chunks:
        return 0

    client = _get_voyage_client()
    texts = [chunk.text for chunk in all_chunks]
    response = client.embed(texts=texts, model="voyage-3-large")
    vectors: list[list[float]] = [list(item) for item in response.embeddings]
    _upsert_vectors(all_chunks, vectors)
    logger.info("Indexed %s chunks", len(all_chunks))
    return len(all_chunks)


async def retrieve(query: str, k: int = 5) -> list[dict[str, str]]:
    try:
        import psycopg  # type: ignore[import-not-found]
    except ImportError as exc:
        raise RuntimeError("psycopg is required at runtime for retrieval") from exc

    embedding = _get_voyage_client().embed(texts=[query], model="voyage-3-large")
    query_vector: list[float] = list(embedding.embeddings[0])
    rows: list[tuple[str, str, str, list[float]]] = []

    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT doc_id, anchor, content, embedding FROM doc_chunks LIMIT 2000")
            for row in cur.fetchall():
                rows.append((row[0], row[1], row[2], row[3]))

    scored: list[tuple[float, dict[str, str]]] = []
    for doc_id, anchor, content, vector in rows:
        scored.append((
            _cosine_similarity(query_vector, list(vector)),
            {"doc_id": doc_id, "anchor": anchor, "text": content},
        ))

    scored.sort(key=lambda item: item[0], reverse=True)
    return [item[1] for item in scored[:k]]
