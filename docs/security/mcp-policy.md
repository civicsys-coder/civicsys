# Política de seguridad para el MCP Server de Hermes

**Fecha**: 2026-05-23
**Estado**: ACEPTADA (vinculante para cualquier implementación)
**Origen**: `docs/plans/executed/arquitectura/ADR-004-mcp-server-policy.md`
**Vulnerabilidad mitigada**: AI-PI-02 (auditoría Tatiana — exfiltración de contexto vía MCP)

## Por qué existe esta política antes que el código

El directorio `agents/mcp_server/` existe pero está vacío. Esta policy es **deuda preventiva**: cuando alguien implemente la primera tool MCP, debe cumplir todo lo que sigue. **Code review obligatorio** contra este documento.

## Autenticación

1. **Variable `MCP_AUTH_TOKEN` obligatoria** en el entorno. Si no está definida → el server **no arranca** (fail closed).
2. Si está pero tiene menos de 32 chars → el server **no arranca**.
3. Cada invocación de tool valida el token con `hmac.compare_digest` (constant-time compare — sin early-exit que filtre timing).
4. Loguear sólo prefijo y sufijo del token (`abcd***wxyz`), nunca completo.
5. Para producción: rotación periódica del token (≥cada 90 días) + observabilidad de uso por token-prefix.

## Allow-list de tools

### Permitidas en MCP server público

- `list_proposals()` → metadata pública on-chain.
- `get_proposal(id: int)` → metadata + tally público.
- `hermes_status()` → versión, chain_id, último block sincronizado. Sin secretos.
- `generate_report(proposal_id: int)` → idempotente, requiere propuesta cerrada.

### Permitidas con restricciones

- `register_citizen(dni_hash: str)` →
  - **NO acepta DNI raw**. Solo hash ya calculado del lado del cliente.
  - Verifica formato `bytes32` hex válido (66 chars, prefijo `0x`).
  - No persiste el hash en logs.
- `cast_vote(proposal_id: int, choice: int)` →
  - **NO firma tx desde el server**. Sólo devuelve calldata que el cliente debe firmar con su wallet.
  - Refleja la decisión arquitectural de no tener signer custodial Sprint 1/2.

### Tools PROHIBIDAS — no implementar nunca

Estas tools NO deben existir, ni siquiera como helpers. Si alguien necesita la funcionalidad, debe llegar por otro canal con controles distintos:

- `read_file(path: str)` ❌
- `read_env_var(name: str)` ❌
- `read_memory_session(id: int)` ❌
- `read_soul()` / `read_instinct()` ❌ — son archivos públicos del repo, no hace falta tool.
- `dump_memory()` ❌
- `exec_shell(cmd: str)` ❌
- `set_anthropic_key(key: str)` ❌
- `get_signer_address()` ❌
- Cualquier tool cuyos argumentos o retornos contengan: `SIGNER_*`, `*_PRIVATE_KEY`, `*_SECRET`, `*_API_KEY`, `*_TOKEN` (excepto el `MCP_AUTH_TOKEN` que valida la propia tool, nunca devuelto).

## Validación de inputs

- Cada tool define un Pydantic model para sus args. Pydantic valida tipos, rangos, longitudes.
- Si validation falla → respuesta de error genérica al cliente (`{"error": "INVALID_ARGS"}`), sin stack trace.
- Longitudes máximas razonables:
  - `proposal_id`: ≤ 2^32.
  - `dni_hash`: exactamente 66 chars (`0x` + 64 hex).
  - Strings en general: ≤ 500 chars (override por tool si justifica).

## Logging y observabilidad

Por cada invocación, log estructurado JSON:

```json
{
  "timestamp": "2026-05-23T22:00:00Z",
  "correlation_id": "uuid4",
  "client_token_prefix": "abcd",
  "tool": "generate_report",
  "args_summary": {"proposal_id": 1},
  "result_status": "ok",
  "duration_ms": 234
}
```

**NO loguear**:
- DNI raw (no debería llegar, pero defensa profunda).
- Token completo.
- Contenido del reporte LLM (puede contener PII filtrado).
- Errores con stack trace (esos van a logs internos separados, no al log público).

## Timeouts y rate limiting

- Default 30s por tool (alineado con INSTINCT.md).
- Hard timeout 60s (kill el call si la tool no responde — evita DoS).
- Rate limit por token: 30 req/min sliding window.
- Si superado: respuesta `429 RATE_LIMITED`, no kill connection.

## Transports

- **stdio**: para clientes de la misma máquina (Claude Code local). Aún así requiere `MCP_AUTH_TOKEN`.
- **SSE/HTTP**: para clientes remotos. Requiere TLS en producción. Prohibido HTTP plano en producción.
- **Prohibidos**: WebSocket sin auth, IPC sin token.

## Códigos de error estándar

Devuélvelos sin filtrar internals:

| Code | Significado |
|---|---|
| `AUTH_INVALID` | Token faltante o no coincide. |
| `TOOL_NOT_FOUND` | Tool no existe. |
| `TOOL_FORBIDDEN` | Tool existe pero el cliente no puede invocarla. |
| `INVALID_ARGS` | Pydantic validation falló. |
| `RATE_LIMITED` | Quota de minuto excedida. |
| `TIMEOUT` | Tool tardó más del límite. |
| `INTERNAL_ERROR` | Catch-all sin detalle al cliente. |

## Code review checklist obligatorio

Para mergear un PR que toque `agents/mcp_server/`:

- [ ] ¿La tool está en la allow-list o requiere ADR-004B?
- [ ] ¿Los args usan Pydantic model con limits?
- [ ] ¿El handler valida `MCP_AUTH_TOKEN` antes de hacer trabajo?
- [ ] ¿El log estructurado **no** incluye datos sensibles?
- [ ] ¿Hay tests unit que verifican rechazo sin token?
- [ ] ¿Hay tests unit que verifican rate limit?
- [ ] ¿La tool corre con timeout?
- [ ] ¿Si la tool retorna contenido del usuario, está sanitizado (delimitadores, etc.)?

## Si alguien implementa MCP server antes de ADR-004B

1. Abrir PR draft.
2. Mencionar ADR-004 explícitamente en la descripción del PR.
3. Pedir review específico contra esta policy.
4. No mergear sin ADR-004B aprobado (que detalla el server específico).

## Cuándo revisar esta policy

- Antes de cualquier commit en `agents/mcp_server/server.py` o equivalente.
- Si el equipo introduce un segundo token (multi-cliente) → considerar JWT scopes (ADR-004B).
- Si surge un nuevo vector de exfiltración no cubierto.
