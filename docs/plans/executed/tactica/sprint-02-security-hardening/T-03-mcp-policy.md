# T-03 — Política MCP en `docs/security/mcp-policy.md`

**Prio**: P0 · **Bloqueada por**: T-01 · **ADR**: ADR-004

## Qué hacer

1. Crear `docs/security/mcp-policy.md` que transcribe la sección "Política — qué cualquier implementación de MCP Server debe cumplir" del `ADR-004-mcp-server-policy.md`.

2. Crear `agents/mcp_server/README.md` con:
   - Breve descripción ("Servidor MCP de Hermes — pendiente de implementación").
   - Link a `docs/security/mcp-policy.md`.
   - Tabla de tools permitidas / restringidas / prohibidas.
   - Nota: "antes de implementar cualquier tool, releer la policy completa".

## Criterio de done

- [ ] Existe `docs/security/mcp-policy.md`.
- [ ] Existe `agents/mcp_server/README.md` con link a la policy.
- [ ] El README cubre allow-list + prohibiciones del ADR-004.

## Comando de verificación

```bash
test -f docs/security/mcp-policy.md && test -f agents/mcp_server/README.md && grep -q "mcp-policy.md" agents/mcp_server/README.md && echo OK
```
