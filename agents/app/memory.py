"""
HermesMemoryStore: gestiona embeddings vectoriales en pgvector.

Sprint 1: solo INSERT (cada reporte genera su embedding stub).
Sprint 2 agregará similarity search real con sentence-transformers.
"""

from typing import Protocol
import hashlib


class Embedder(Protocol):
    def encode(self, text: str) -> list[float]: ...


class HashEmbedder:
    """
    Embedder placeholder Sprint 1: usa hash determinista para generar 384 floats.
    NO es semántico — solo asegura tamaño correcto + determinismo para tests.
    Sprint 2 lo reemplaza con sentence-transformers all-MiniLM-L6-v2.
    """

    DIM = 384

    def encode(self, text: str) -> list[float]:
        # Hash de 384*8 bytes -> 384 floats normalizados a [-1, 1]
        result: list[float] = []
        seed = text.encode("utf-8")
        for i in range(self.DIM):
            h = hashlib.sha256(seed + i.to_bytes(4, "big")).digest()
            # Tomar 4 bytes, convertir a int signed, normalizar a [-1, 1]
            val = int.from_bytes(h[:4], "big", signed=False)
            result.append((val / (2**32 - 1)) * 2.0 - 1.0)
        return result


class HermesMemoryStore:
    def __init__(self, embedder: Embedder):
        self.embedder = embedder

    def compute_embedding(self, text: str) -> list[float]:
        """Calcula el embedding del texto con el embedder configurado."""
        vec = self.embedder.encode(text)
        return [float(x) for x in vec]
