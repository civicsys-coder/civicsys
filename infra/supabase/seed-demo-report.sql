-- Seed de demo: 1 reporte Hermes para que /dashboard se vea poblado.
-- Aplicar:  docker exec -i ssca-postgres psql -U postgres -d civicsys < infra/supabase/seed-demo-report.sql
-- (La propuesta on-chain #1 sigue abierta; este reporte simula el flujo que Hermes
--  dispara al CERRAR una propuesta, para no dejar el dashboard vacío en la demo.)

-- Fila en proposals_cache requerida por la FK de hermes_reports.
INSERT INTO proposals_cache (id, chain_id, title, ipfs_cid, open_at, close_at, closed, yes, no, abstain)
VALUES (
  1, 31337,
  'Reforma del artículo 56 — transparencia presupuestaria',
  'bafy-placeholder-sprint1-mvp',
  '2026-06-04T04:35:29Z', '2026-06-11T04:35:29Z',
  TRUE, 1715, 527, 130
)
ON CONFLICT (id, chain_id) DO UPDATE
  SET closed = EXCLUDED.closed, yes = EXCLUDED.yes, no = EXCLUDED.no, abstain = EXCLUDED.abstain;

-- Reporte Hermes (idempotente: borra el de demo previo antes de insertar).
DELETE FROM hermes_reports WHERE proposal_id = 1 AND chain_id = 31337 AND tx_hash = '0xdemo-seed';

INSERT INTO hermes_reports (proposal_id, chain_id, body_markdown, llm_provider, confidence, tx_hash, block_number)
VALUES (
  1, 31337,
  E'# Reporte Hermes · Propuesta #1\n## Reforma del artículo 56 — transparencia presupuestaria\n\n**Veredicto del Concilio:** APROBAR con reservas · consenso 3/4 · confianza 8/10\n\n### Resultado de la votación ciudadana\n- Sí: 1.715 (72,3%) · No: 527 (22,2%) · Abstención: 130 (5,5%)\n- Quórum alcanzado. Mandato ciudadano: aprobación con amplio margen.\n\n### Concilio (4 lentes)\n- **Ejecutor / Fiscal (viabilidad):** implementable sin costo material; solo exige publicar la ejecución que ya se registra.\n- **Garantista (derechos):** amplía el acceso ciudadano a la ejecución presupuestaria; refuerza el control democrático.\n- **Escéptico / Contralor (riesgos):** riesgo de cumplimiento simbólico si no hay sanción por incumplir el plazo de publicación.\n- **Primeros Principios:** la transparencia presupuestaria es condición —no adorno— del control ciudadano.\n\n### Brecha congreso ↔ ciudadanía\nLa ciudadanía aprobó con 72,3%. Hermes recomienda publicar la ejecución trimestral en formato abierto y fijar una sanción por mora. Si el congreso no la reglamenta en 60 días, La Tóxica emitirá un post de accountability.\n\n_Generado por Hermes (gemini-3.5-flash). Fuente: tally on-chain + acta de sesión. Confianza 8/10._',
  'gemini-3.5-flash',
  8,
  '0xdemo-seed',
  854
);
