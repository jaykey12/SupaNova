from __future__ import annotations

import hashlib
import math
import re
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.db_models import KbDocumentModel
from app.models.schemas import KnowledgeBaseDocumentCreate, KnowledgeBaseMatch

_TOKEN_REGEX = re.compile(r"[a-zA-Z0-9']+")
_EMBEDDING_DIMENSION = 1536


@dataclass
class KnowledgeBaseDocument:
    id: str
    title: str
    content: str
    source: str | None
    created_at: datetime
    vector: dict[str, float]


class KnowledgeBaseServiceProtocol(Protocol):
    async def add_document(self, payload: KnowledgeBaseDocumentCreate) -> KnowledgeBaseDocument: ...
    async def search(self, query: str, top_k: int = 3, min_score: float = 0.05) -> list[KnowledgeBaseMatch]: ...


def _tokenize(text: str) -> list[str]:
    return _TOKEN_REGEX.findall(text.lower())


def _term_frequency(tokens: list[str]) -> dict[str, float]:
    if not tokens:
        return {}
    counts: dict[str, int] = {}
    for token in tokens:
        counts[token] = counts.get(token, 0) + 1
    total = float(len(tokens))
    return {token: count / total for token, count in counts.items()}


def _cosine_similarity(left: dict[str, float], right: dict[str, float]) -> float:
    if not left or not right:
        return 0.0

    dot_product = 0.0
    for key, value in left.items():
        dot_product += value * right.get(key, 0.0)

    left_magnitude = math.sqrt(sum(value * value for value in left.values()))
    right_magnitude = math.sqrt(sum(value * value for value in right.values()))

    if left_magnitude == 0 or right_magnitude == 0:
        return 0.0

    return dot_product / (left_magnitude * right_magnitude)


def _build_local_embedding(text: str, dimension: int = _EMBEDDING_DIMENSION) -> list[float]:
    """Deterministic local embedding so pgvector search works without external services."""
    tokens = _tokenize(text)
    if not tokens:
        return [0.0] * dimension

    vector = [0.0] * dimension
    for token in tokens:
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        index = int.from_bytes(digest[:4], byteorder="big") % dimension
        sign = 1.0 if digest[4] % 2 == 0 else -1.0
        vector[index] += sign

    magnitude = math.sqrt(sum(value * value for value in vector))
    if magnitude == 0:
        return vector

    return [value / magnitude for value in vector]


class KnowledgeBaseService:
    """In-memory MVP knowledge base with local vector similarity search."""

    def __init__(self) -> None:
        self._documents: dict[str, KnowledgeBaseDocument] = {}

    async def add_document(self, payload: KnowledgeBaseDocumentCreate) -> KnowledgeBaseDocument:
        doc_id = str(uuid.uuid4())
        vector = _term_frequency(_tokenize(payload.content))
        document = KnowledgeBaseDocument(
            id=doc_id,
            title=payload.title,
            content=payload.content,
            source=payload.source,
            created_at=datetime.now(timezone.utc),
            vector=vector,
        )
        self._documents[doc_id] = document
        return document

    async def search(self, query: str, top_k: int = 3, min_score: float = 0.05) -> list[KnowledgeBaseMatch]:
        query_vector = _term_frequency(_tokenize(query))
        scored_matches: list[tuple[float, KnowledgeBaseDocument]] = []

        for document in self._documents.values():
            score = _cosine_similarity(query_vector, document.vector)
            if score >= min_score:
                scored_matches.append((score, document))

        scored_matches.sort(key=lambda item: item[0], reverse=True)

        response: list[KnowledgeBaseMatch] = []
        for score, document in scored_matches[:top_k]:
            response.append(
                KnowledgeBaseMatch(
                    document_id=document.id,
                    title=document.title,
                    source=document.source,
                    score=round(score, 4),
                    snippet=document.content[:280],
                )
            )

        return response


class DatabaseKnowledgeBaseService:
    """PostgreSQL-backed KB service with pgvector cosine-distance search."""

    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._session_factory = session_factory

    async def add_document(self, payload: KnowledgeBaseDocumentCreate) -> KnowledgeBaseDocument:
        embedding = _build_local_embedding(payload.content)
        model = KbDocumentModel(
            title=payload.title,
            content=payload.content,
            source=payload.source,
            embedding=embedding,
        )

        async with self._session_factory() as session:
            session.add(model)
            await session.commit()
            await session.refresh(model)

            return KnowledgeBaseDocument(
                id=str(model.id),
                title=model.title,
                content=model.content,
                source=model.source,
                created_at=model.created_at,
                vector=_term_frequency(_tokenize(model.content)),
            )

    async def search(self, query: str, top_k: int = 3, min_score: float = 0.05) -> list[KnowledgeBaseMatch]:
        query_embedding = _build_local_embedding(query)

        async with self._session_factory() as session:
            result = await session.execute(
                select(
                    KbDocumentModel,
                    KbDocumentModel.embedding.cosine_distance(query_embedding).label("distance"),
                )
                .where(KbDocumentModel.embedding.is_not(None))
                .order_by("distance")
                .limit(top_k)
            )

            matches: list[KnowledgeBaseMatch] = []
            for document, distance in result.all():
                score = 1 - float(distance)
                if score < min_score:
                    continue
                matches.append(
                    KnowledgeBaseMatch(
                        document_id=str(document.id),
                        title=document.title,
                        source=document.source,
                        score=round(score, 4),
                        snippet=document.content[:280],
                    )
                )

            return matches
