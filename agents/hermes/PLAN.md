# PLAN.md · Sprint actual

> **Visibilidad:** INTERNO del equipo · NO se expone al ciudadano final.
> Se actualiza por cron nocturno y manualmente al cerrar tareas.

## Sprint 1 · Prototipo inicial · Día 4–7 del hackathon

**Goal:** Demo end-to-end mínimo — registro DNI → voto on-chain en zkTanenbaum → reporte Hermes.

### Done

- [x] Análisis del project speech v3 y arquitectura de tres capas.
- [x] Estructura de monorepo CivicSys creada.
- [x] SOUL.md + INSTINCT.md v0.1 redactados.
- [x] README raíz + LICENSE MIT.

### In progress

- [ ] `CitizenRegistry.sol` — registro DNI+nombre hasheado on-chain (Orlando)
- [ ] `Vote.sol` — propuestas + voto por opción + tally (Orlando)
- [ ] Hardhat config para `zkTanenbaum` (Chain ID 57057) (Orlando)
- [ ] Deploy script + verificación en `explorer-zk.tanenbaum.io` (Orlando)
- [ ] FastAPI: rutas `/auth/register`, `/proposals`, `/vote`, `/reports/{id}` (Sandro)
- [ ] Cliente Web3 (ethers v6 + Python) con ABIs autogenerados (Sandro)
- [ ] Hermes runtime básico — listener de eventos + generador de reportes (Sandro)
- [ ] MCP server con tools: `get_proposal`, `cast_vote`, `generate_report` (Sandro)
- [ ] Tests unitarios contratos (Gabriel)
- [ ] Tests API + smoke test E2E (Gabriel)

### Blocked

- [ ] Consulta legal definitiva sobre hash de DNI (esperando Miguel Aikip)
- [ ] Subagentes jurídico/anticorrupción — diferidos a Sprint 2

### Owners y plazos (Día 4–7)

| Tarea                          | Owner    | Plazo  |
|--------------------------------|----------|--------|
| Contratos + deploy zkTanenbaum | Orlando  | Día 5  |
| API FastAPI base               | Sandro   | Día 5  |
| Hermes listener + reportes     | Sandro   | Día 6  |
| MCP server                     | Sandro   | Día 6  |
| Tests + QA inicial             | Gabriel  | Día 7  |
| Docs técnicos                  | Tatiana  | Día 7  |

### Criterios de aceptación (DoD Sprint 1)

1. Un usuario puede registrarse con DNI+nombre vía API → tx confirmada en zkTanenbaum.
2. Un usuario registrado puede emitir un voto sobre una propuesta de prueba → tx confirmada.
3. Hermes detecta el cierre de votación y genera un reporte automático con tx-hashes citados.
4. El MCP server expone las 3 tools y se conecta correctamente desde Claude Code.
5. README en cada subproyecto explica cómo correr ese módulo en local.
6. ≥80% cobertura de tests en los contratos.

### Riesgos del sprint

- **Gas en testnet**: necesitamos faucet de TSYS — fallback: solicitar a Syscoin Foundation.
- **RPC inestable**: configurar un fallback (Zeeve o RPC propio).
- **Hash DNI vs. privacidad**: confirmar con asesoría legal antes de demo pública.

### Notas de auto-mejora (Hermes)

Tras Sprint 1, Hermes debe generar autónomamente:
- `skill_generar_reporte_votacion.py` a partir de los reportes manuales emitidos.
- Pruebas de regresión sobre los reportes generados.
