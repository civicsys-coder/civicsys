-- SSC ANTIPEREZA · Sprint 1 · Supabase init schema
--
-- Ejecutado automáticamente por el container Postgres en el primer arranque
-- (docker-entrypoint-initdb.d/01-init.sql).
--
-- Cuatro tablas:
--   proposals_cache  — cache on-chain refrescado por el backend Node
--   hermes_reports   — reportes generados por Hermes (markdown + metadata)
--   hermes_memory    — embeddings vectoriales para pgvector similarity
--   sessions         — audit log mínimo de interacciones cliente

CREATE EXTENSION IF NOT EXISTS vector;

-- ------------------------------------------------------------------
-- proposals_cache
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proposals_cache (
    id            BIGINT       NOT NULL,
    chain_id      INTEGER      NOT NULL,
    title         TEXT         NOT NULL,
    ipfs_cid      TEXT,
    open_at       TIMESTAMPTZ  NOT NULL,
    close_at      TIMESTAMPTZ  NOT NULL,
    closed        BOOLEAN      NOT NULL DEFAULT FALSE,
    yes           BIGINT       NOT NULL DEFAULT 0,
    no            BIGINT       NOT NULL DEFAULT 0,
    abstain       BIGINT       NOT NULL DEFAULT 0,
    refreshed_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, chain_id)
);

-- ------------------------------------------------------------------
-- hermes_reports
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hermes_reports (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id     BIGINT       NOT NULL,
    chain_id        INTEGER      NOT NULL,
    body_markdown   TEXT         NOT NULL,
    llm_provider    TEXT         NOT NULL,
    confidence      SMALLINT     NOT NULL CHECK (confidence BETWEEN 0 AND 10),
    tx_hash         TEXT,
    block_number    BIGINT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    FOREIGN KEY (proposal_id, chain_id) REFERENCES proposals_cache(id, chain_id)
);

CREATE INDEX IF NOT EXISTS idx_hermes_reports_proposal
    ON hermes_reports (proposal_id, chain_id, created_at DESC);

-- ------------------------------------------------------------------
-- hermes_memory  (pgvector embeddings · 384 dim = all-MiniLM-L6-v2)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hermes_memory (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id   UUID         NOT NULL REFERENCES hermes_reports(id) ON DELETE CASCADE,
    embedding   VECTOR(384)  NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hermes_memory_embedding
    ON hermes_memory USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ------------------------------------------------------------------
-- sessions  (audit log · no auth real Sprint 1)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    address     TEXT,
    action      TEXT         NOT NULL CHECK (action IN ('register', 'vote', 'view_report')),
    payload     JSONB,
    chain_id    INTEGER,
    tx_hash     TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_address_created
    ON sessions (address, created_at DESC);
