# MCP Server — Hermes (pendiente de implementación)

Este directorio está reservado para el servidor MCP (Model Context Protocol) que expondrá las tools de Hermes a clientes LLM externos (Claude Code, otros agentes).

## Estado actual

**Sin implementar**. El directorio existe sólo como reserva — no hay código ni dependencias activas.

## Antes de implementar — LEE PRIMERO

La política de seguridad obligatoria vive en:

📌 [`../../docs/security/mcp-policy.md`](../../docs/security/mcp-policy.md)

Cualquier implementación de MCP server **debe** cumplir esa policy. Si la primera tool MCP llega a code review sin cumplirla, el PR se rechaza y vuelve al autor.

## Resumen — qué exige la policy

- **Auth Bearer obligatoria**: `MCP_AUTH_TOKEN` en env (≥32 chars). Sin él → server no arranca.
- **Allow-list de tools**: `list_proposals`, `get_proposal`, `hermes_status`, `generate_report`, `register_citizen` (con DNI hash, no raw), `cast_vote` (devuelve calldata, no firma).
- **Tools PROHIBIDAS** (no implementar): `read_file`, `read_env_var`, `dump_memory`, `exec_shell`, cualquier acceso a `SIGNER_PRIVATE_KEY` o `ANTHROPIC_API_KEY`.
- **Validación Pydantic** de todos los args.
- **Logging estructurado** sin PII ni tokens completos.
- **Rate limit** 30 req/min por token.
- **Timeout** hard 60s.

Ver la policy completa para detalle.

## ADRs relacionados

- [`ADR-004-mcp-server-policy.md`](../../docs/plans/executed/arquitectura/ADR-004-mcp-server-policy.md) — política base.
- ADR-004B (pendiente — emitir antes de implementar): detalles del server, librería MCP, estructura de tests.

## Referencias

- MCP spec: https://spec.modelcontextprotocol.io/
- Tasks futuras: `A-026` a `A-032` en `agents/docs/`.
