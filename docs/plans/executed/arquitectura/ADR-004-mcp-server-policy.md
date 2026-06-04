# ADR-004 — Política de autenticación y allow-list del MCP Server

**Fecha**: 2026-05-23
**Estado**: ACEPTADO
**Decisor**: Orlando
**Input**: DA-4 del plan estratégico

## Contexto

Tatiana (AI-PI-02) advierte que el MCP Server expondría tools vía stdio/SSE a LLM clients externos. Sin autenticación ni allow-list, un cliente malicioso podría invocar tools para extraer secretos (`SIGNER_PRIVATE_KEY`, `ANTHROPIC_API_KEY`), contenido de memoria del agente o variables sensibles.

Estado real Mayo 2026: el directorio `agents/mcp_server/` está **vacío**. Las tasks de implementación (`A-026..A-032` en `agents/docs/`) están planificadas pero no ejecutadas.

Este ADR no implementa el server — escribe la **política obligatoria** que **cualquier implementación futura** debe cumplir. Es deuda preventiva: el código todavía no existe, pero la política sí.

## Opciones evaluadas

### A. Bearer token estático (RECOMENDADA)

- `MCP_AUTH_TOKEN` en env (single secret, ≥64 chars random).
- Cliente envía header `Authorization: Bearer <token>` (HTTP/SSE) o argumento equivalente (stdio).
- Server rechaza con error específico si token no coincide o no presente.

### B. JWT con scopes

- Server emite JWTs firmados.
- Payload incluye `tools_allowed: ["register_citizen", ...]`.
- Cliente envía JWT en cada call.

### C. mTLS

- Certificados mutuos cliente/servidor.

## Decisión

**Opción A (Bearer token estático)** + allow-list explícita + logging estructurado + prohibiciones absolutas (lista negra de tools).

## Justificación

- **A es lo más simple** que cierra el vector descrito por Tatiana: sin token, no se invocan tools.
- **JWT con scopes** es overkill para hackathon — agrega complejidad de emisión/rotación.
- **mTLS** requiere PKI propia — desproporcionado.
- La verdadera defensa profunda no está en el scheme de auth, sino en **qué tools NO se implementan** (lista negra absoluta).

## Política — qué cualquier implementación de MCP Server debe cumplir

### Autenticación

1. Variable `MCP_AUTH_TOKEN` obligatoria en env. Si no está → server **no arranca** (fail closed).
2. Si `MCP_AUTH_TOKEN` está pero es vacío o tiene menos de 32 chars → server **no arranca**.
3. Todo invoke de tool valida el token con `hmac.compare_digest` (constant-time).
4. Token expuesto en logs **únicamente con sanitización** (prefijo + `***` + sufijo, ej. `abcd***wxyz`).

### Allow-list de tools

**Permitidas en MCP server público**:

- `list_proposals()` → devuelve metadata pública on-chain.
- `get_proposal(id: int)` → metadata + tally público.
- `hermes_status()` → ¿está vivo? versión, chain_id.
- `generate_report(proposal_id: int)` → idempotente, requiere propuesta cerrada.

**Permitidas con restricciones**:

- `register_citizen(dni_hash: str)` → **NO acepta DNI raw**, solo hash ya calculado del lado del cliente. Verifica formato bytes32 hex válido.
- `cast_vote(proposal_id: int, choice: int)` → **NO firma tx desde el server**. Sólo devuelve calldata que el cliente debe firmar con su wallet. (Reflejo de la decisión de no tener signer custodial.)

### Tools PROHIBIDAS — no implementar bajo ningún concepto

- `read_file(path: str)` ❌
- `read_env_var(name: str)` ❌
- `read_memory_session(id: int)` ❌
- `read_soul()` / `read_instinct()` ❌ — esos archivos son públicos y están en repo, no hace falta tool.
- `dump_memory()` ❌
- `exec_shell(cmd: str)` ❌
- `set_anthropic_key(key: str)` ❌
- Cualquier tool que reciba o retorne `SIGNER_*`, `*_PRIVATE_KEY`, `*_SECRET`, `*_API_KEY`.

### Validación de inputs

- Tool args validados con Pydantic models. Si validation falla → error tool al cliente, sin stack trace.
- Strings con longitud máxima razonable (ej. proposal_id ≤ 32 bits unsigned; dni_hash exactamente 66 chars `0x` + 64 hex).
- Numeric inputs en rangos esperados.

### Logging y observabilidad

Por cada invocación, log estructurado JSON:

```json
{
  "timestamp": "2026-05-23T22:00:00Z",
  "correlation_id": "uuid4",
  "client_token_prefix": "abcd",
  "tool": "generate_report",
  "args_summary": {"proposal_id": 1},
  "result_status": "ok" | "error",
  "duration_ms": 234
}
```

**NO loggear**:
- DNI raw (no debería llegar, pero defensa profunda).
- Token completo.
- Contenido de `args_summary` que pueda contener PII.

### Timeouts

- Default 30s por tool (alineado con INSTINCT.md).
- Hard timeout 60s (kill el call si la tool no responde).
- Rate limit por token: 30 req/min sliding window.

### Transports

- **stdio**: para clientes de la misma máquina (claude-code local). Aún así requiere `MCP_AUTH_TOKEN`.
- **SSE/HTTP**: para clientes remotos. Requiere TLS en producción (no expone HTTP plano).
- **Prohibido en Sprint 02**: WebSocket sin TLS, IPC sin auth.

### Error handling

- Errores genéricos al cliente (no exponer stack traces ni paths internos).
- Errores detallados solo en logs.
- Códigos de error: `AUTH_INVALID`, `TOOL_NOT_FOUND`, `TOOL_FORBIDDEN`, `RATE_LIMITED`, `TIMEOUT`, `INTERNAL_ERROR`.

## Consecuencias

### Positivas

- AI-PI-02 cerrado a nivel "diseño" — cualquier implementación futura debe pasar code review contra esta policy.
- Lista negra evita el vector más peligroso (exfiltración de secrets) por diseño, no por implementación.
- Política referenciable en `docs/security/mcp-policy.md`.

### Negativas

- Bearer token estático: si se filtra, hay que rotarlo manualmente. Aceptable para Sprint 02.
- No hay scopes granulares — si el mismo token se usa para múltiples clientes, no se puede distinguir cuál hizo qué. Compensado con `client_token_prefix` en logs (ayuda a forense).

## Implementación mínima en Sprint 02

- `docs/security/mcp-policy.md` (esta política transcrita).
- `agents/mcp_server/README.md` referencia la policy.
- **No se implementa el server** en Sprint 02 (queda para sprint 02b o 03).
- Cuando se implemente: code review obligatorio contra esta policy + ADR-004B con detalles de implementación.

## Si alguien implementa MCP server antes de ADR-004B

- Crear PR draft.
- Pedir review específicamente contra ADR-004.
- No mergear sin ADR-004B aprobado.

## Referencias

- Documento Tatiana: AI-PI-02, AI-PI-03.
- NIST SP 800-53 AC-3 (Access Enforcement), AC-17 (Remote Access), SI-10 (Information Input Validation).
- MCP spec: https://spec.modelcontextprotocol.io/

## Cuándo revisar este ADR

- Antes de que el primer commit toque `agents/mcp_server/server.py` o equivalente.
- Si el equipo introduce un segundo token (multi-cliente) → considerar JWT scopes.
