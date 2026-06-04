"""
FaceIndex: índice de embeddings faciales con similitud coseno.

Sprint 03: implementación in-memory para el dedupe del registro. La interfaz
(add/query) está pensada para respaldarse luego con pgvector (ADR-008) sin
cambiar los callers. NO almacena imágenes — solo el embedding derivado.
"""

from __future__ import annotations

import math
from dataclasses import dataclass


def cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0.0 or nb == 0.0:
        return 0.0
    return dot / (na * nb)


@dataclass
class DedupeResult:
    duplicate: bool
    similarity: float
    top_match: str | None


class FaceIndex:
    def __init__(self, threshold: float = 0.92):
        self.threshold = threshold
        self._items: list[tuple[list[float], str]] = []  # (embedding, faceCommitment)

    def add(self, embedding: list[float], face_commitment: str) -> None:
        # idempotente por commitment
        if any(fc == face_commitment for _, fc in self._items):
            return
        self._items.append((list(embedding), face_commitment))

    def query(self, embedding: list[float]) -> DedupeResult:
        best_sim = 0.0
        best_fc: str | None = None
        for emb, fc in self._items:
            sim = cosine_similarity(embedding, emb)
            if sim > best_sim:
                best_sim, best_fc = sim, fc
        return DedupeResult(
            duplicate=best_fc is not None and best_sim >= self.threshold,
            similarity=round(best_sim, 6),
            top_match=best_fc if best_sim >= self.threshold else None,
        )
