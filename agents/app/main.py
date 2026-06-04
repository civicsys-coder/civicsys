"""FastAPI app para Hermes runtime + API del agente."""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import logging
import os
import re
import time

from app import council, mockdata
from app.agent import HermesAgent
from app.channels.coordinator import ChannelCoordinator
from app.channels.discord import DiscordChannel
from app.channels.telegram import TelegramChannel
from app.channels.whatsapp import WhatsAppChannel
from app.council import HermesCouncil
from app.identity import IdentityService
from app.llm import LLMClient
from app.settings import get_settings
from app.toxica import LaToxica

app = FastAPI(title="CivicSys Agents (Hermes)", version="0.3.0")

# El frontend (Next.js) llama a Hermes directamente desde el navegador.
# Orígenes: los de CORS_ORIGINS (coma-separados) + cualquier deploy de Vercel (*.vercel.app).
_cors_env = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _cors_env.split(",") if o.strip()],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Observabilidad ────────────────────────────────────────────────────────
# Logs estructurados a stdout (los recoge `docker logs` / Railway). REGLA: nunca
# se logea la API key, ni embeddings, ni el cuerpo de los requests (solo método,
# ruta, status, latencia y metadata no sensible).
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s hermes.%(name)s · %(message)s",
)
log = logging.getLogger("api")


@app.middleware("http")
async def _log_requests(request: Request, call_next):
    t0 = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        log.exception("✗ %s %s — excepción no manejada", request.method, request.url.path)
        raise
    dt = (time.perf_counter() - t0) * 1000
    log.info("%s %s → %s (%.0f ms)", request.method, request.url.path, response.status_code, dt)
    return response


@app.on_event("startup")
async def _log_startup() -> None:
    s = get_settings()
    log.info(
        "Hermes startup · chain=%s · modelo=%s · gemini_key=%s · db=%s",
        s.chain_id,
        s.llm_model_gemini,
        _gemini_key(s) is not None,  # bool, NUNCA la key
        "set" if s.database_url else "missing",
    )


def _gemini_key(s) -> str | None:
    """Devuelve la key Gemini solo si está realmente configurada (no el placeholder)."""
    k = s.gemini_api_key
    return k if (k and not k.startswith("<")) else None


def _build_llm() -> LLMClient:
    s = get_settings()
    return LLMClient(
        gemini_key=_gemini_key(s),
        anthropic_key=s.anthropic_api_key or None,
        openrouter_key=s.openrouter_api_key,
        model_gemini=s.llm_model_gemini,
        model_anthropic=s.llm_model_anthropic,
        timeout=float(s.llm_timeout_seconds),
    )


def build_agent() -> HermesAgent:
    return HermesAgent(llm=_build_llm())


def build_council() -> HermesCouncil:
    return HermesCouncil(llm=_build_llm())


class AskRequest(BaseModel):
    message: str


class ConcilioRequest(BaseModel):
    proposal_id: int | None = None
    message: str | None = None


@app.get("/agents/health")
async def health():
    s = get_settings()
    return {
        "status": "ok",
        "chain_id": s.chain_id,
        "agent": "hermes",
        "version": "0.3.0",
        "llm": {"model": s.llm_model_gemini, "gemini_key": _gemini_key(s) is not None},
    }


@app.get("/agents/proposals")
async def proposals():
    return {"proposals": mockdata.PROPOSALS}


@app.post("/agents/hermes/ask")
async def ask(req: AskRequest):
    result = await build_agent().ask(req.message)
    log.info(
        "ask (len=%s) → provider=%s conf=%s steps=%s",
        len(req.message), result.provider, result.confidence, len(result.steps),
    )
    return {
        "answer": result.answer,
        "provider": result.provider,
        "confidence": result.confidence,
        "steps": [
            {"tool": s.tool, "args": s.args, "observation": s.observation}
            for s in result.steps
        ],
        "data": result.data,
    }


def _resolve_proposal(req: ConcilioRequest) -> dict:
    pid = req.proposal_id
    if pid is None and req.message:
        m = re.search(r"#?\s*(\d{1,3})", req.message)
        pid = int(m.group(1)) if m else None
    return mockdata.get_proposal(pid or 1) or mockdata.PROPOSALS[0]


@app.post("/agents/concilio")
async def concilio(req: ConcilioRequest):
    p = _resolve_proposal(req)
    d = await build_council().deliberate(p)
    log.info(
        "concilio prop=%s → veredicto=%s conf=%s divergencia=%s %sms",
        p["id"], d["verdict"]["provider"], d["verdict"]["confidence"],
        d["divergence"]["level"], d["elapsed_ms"],
    )
    return d


@app.get("/agents/status")
async def status():
    s = get_settings()
    return {
        "system": {
            **council.get_system_metrics(),
            "model": s.llm_model_gemini,
            "gemini_key": _gemini_key(s) is not None,
            "chain_id": s.chain_id,
            "proposals": len(mockdata.PROPOSALS),
        },
        "swarm": council.get_swarm_state(),
        "evolution": council.get_evolution(),
    }


# ── Identidad: dedupe facial off-chain (Sprint 03, ADR-008) ──
# Singleton a nivel módulo para que register-face y dedupe-face compartan estado.
_identity = IdentityService()


# Hardening post-auditoría MNEMA (Sprint 03):
#  - El umbral es config del servidor, NO controlable por el cliente (evita
#    debilitar el dedupe o usar la similitud como señal de gradiente).
#  - dedupe-face NO devuelve el faceCommitment coincidente (topMatch) ni la
#    similitud cruda: eso era un oráculo de deanonimización del padrón. Solo
#    un booleano.
#  - faceCommitment se valida como bytes32 hex.
_FACE_COMMITMENT_RE = re.compile(r"^0x[0-9a-fA-F]{64}$")


class DedupeFaceRequest(BaseModel):
    embedding: list[float] = Field(min_length=384, max_length=384)


class RegisterFaceRequest(BaseModel):
    embedding: list[float] = Field(min_length=384, max_length=384)
    faceCommitment: str = Field(pattern=r"^0x[0-9a-fA-F]{64}$")


@app.post("/agents/identity/dedupe-face")
async def dedupe_face(req: DedupeFaceRequest):
    res = _identity.dedupe(req.embedding)
    # Solo el booleano: sin topMatch ni similarity cruda (anti-enumeración).
    return {"duplicate": res.duplicate}


@app.post("/agents/identity/register-face")
async def register_face(req: RegisterFaceRequest):
    _identity.register_face(req.embedding, req.faceCommitment)
    return {"ok": True}


# ── Hermes multicanal (Sprint 05): registro único across Telegram/Discord/WhatsApp ──
_coordinator = ChannelCoordinator()
for _ch in (TelegramChannel(), DiscordChannel(), WhatsAppChannel()):
    _coordinator.register_channel(_ch)


class ChannelRegisterRequest(BaseModel):
    channel: str
    person_ref: str


@app.post("/agents/channels/register")
async def channel_register(req: ChannelRegisterRequest):
    r = _coordinator.register_person(req.channel, req.person_ref)
    return {"accepted": r.accepted, "reason": r.reason, "channel": r.channel}


@app.get("/agents/channels/status")
async def channels_status():
    return _coordinator.stats()


# ── Hermes «La Tóxica» (Sprint 06): accountability legislativo ──
class ToxicaAnalyzeRequest(BaseModel):
    proposal_id: int
    transcript: str


@app.post("/agents/toxica/analyze")
async def toxica_analyze(req: ToxicaAnalyzeRequest):
    p = mockdata.get_proposal(req.proposal_id) or mockdata.PROPOSALS[0]
    tally = {"yes": p["yes"], "no": p["no"], "abstain": p["abstain"]}
    # Usa el contexto REAL del Congreso de la propuesta (si existe) → La Tóxica compara
    # la acción legislativa real contra el voto ciudadano real. Fallback: transcript del request.
    transcript = p.get("congress_context") or req.transcript
    r = await LaToxica(llm=_build_llm()).analyze_session(req.proposal_id, transcript, tally)
    log.info("toxica prop=%s → provider=%s approved=%s", r.proposal_id, r.provider, r.approved)
    # Devuelve el BORRADOR (approved=False). Publicar es una acción humana aparte.
    return {
        "proposal_id": r.proposal_id,
        "citizen_position": r.citizen_position,
        "congress_action": r.congress_action,
        "gap_summary": r.gap_summary,
        "public_post": r.public_post,
        "provider": r.provider,
        "approved": r.approved,
    }
