"""
IdentityService: dedupe facial del registro ciudadano (Hermes, off-chain).

Encapsula un FaceIndex. NO firma on-chain. NO guarda imágenes. Persiste solo
el embedding + el faceCommitment (idempotente). ADR-008.
"""

from __future__ import annotations

from app.face_index import DedupeResult, FaceIndex


class IdentityService:
    def __init__(self, threshold: float = 0.92):
        self.index = FaceIndex(threshold=threshold)

    def register_face(self, embedding: list[float], face_commitment: str) -> None:
        self.index.add(embedding, face_commitment)

    def dedupe(self, embedding: list[float]) -> DedupeResult:
        return self.index.query(embedding)
