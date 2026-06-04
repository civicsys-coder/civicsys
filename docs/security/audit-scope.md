# RFP — Auditoría externa de smart contracts CivicSys

**Estado**: borrador — pendiente de presupuesto + decisión de operar mainnet.

Este documento describe el alcance esperado para una auditoría externa profesional de los smart contracts de CivicSys, requerida antes de cualquier despliegue en mainnet con datos ciudadanos reales.

## Contexto del proyecto

CivicSys es el Sistema de Supervisión Ciudadana Antipereza (Hackathon PoB-UCV 2026). Voto consultivo on-chain + agente IA (Hermes) que genera reportes citables. Despliegue actual: testnet zkTanenbaum (Chain ID 57057, zkStack-based, EVM-compatible). Repositorio público bajo MIT.

## Alcance solicitado

### En scope

- **Contratos**:
  - `blockchain/contracts/CitizenRegistry.sol` (≈30 LOC).
  - `blockchain/contracts/Vote.sol` (≈90 LOC).
  - `blockchain/contracts/interfaces/ICitizenRegistry.sol`.
  - `blockchain/contracts/interfaces/IVote.sol`.
  - Cualquier `AuditLog.sol` que se incorpore (ver `docs/plans/executed/arquitectura/ADR-002-audit-log-l1.md`).

- **Diferencias zkStack vs EVM estándar**:
  - Análisis del comportamiento de los contratos en presencia de:
    - SELFDESTRUCT deshabilitado (no se usa en el código actual).
    - CALLCODE con comportamiento diferente.
    - Manejo de gas en zksolc.

- **Lógica de votación**:
  - Verificar idempotencia de `castVote` y `register`.
  - Análisis de las condiciones de cierre de propuesta (`close`).
  - Verificación del orden de checks en `castVote` (registry → no doble voto → ventana de tiempo).
  - Análisis de manipulación de `block.timestamp` por sequencer centralizado.

- **AccessControl**:
  - Confirmar que `register()` permite self-registration (decisión de diseño documentada).
  - Confirmar que `close()` puede ser llamado por cualquiera tras `closeAt` (decisión de diseño).
  - Identificar si futuras versiones requieren `onlyOwner` u `OZ AccessControl`.

- **Fuzzing**:
  - `tally()` con valores extremos (uint256 overflow no esperable con Solidity 0.8.x, pero verificar).
  - `castVote()` bajo carga concurrente (race conditions L2).
  - Comportamiento del contrato durante un reorg del sequencer (ventana finalidad soft → hard).

### Out of scope

- Código de zkStack / Matter Labs (verificador PLONK, sequencer, prover) — auditado por sus dueños.
- Backend Node BFF y Backend Python Hermes — esos NO operan claves privadas; el riesgo se documenta separadamente.
- Frontend Next.js — auditoría web tradicional separada si se requiere.
- Modelo base Claude de Anthropic.

## Metodología esperada

1. **Análisis estático**: slither + Mythril + cualquier herramienta especializada en zkStack.
2. **Revisión manual línea por línea**: análisis de cada función pública/external.
3. **Property testing**: especificar invariantes (ej. "para cada voto válido emitido, el tally incrementa en exactamente 1 en la opción correcta") y verificar con fuzzing o property-based testing.
4. **Diferencial vs OWASP Smart Contract Top 10** (2023): chequeo de cada categoría.
5. **Análisis específico zkStack**: rendimiento, compatibilidad opcodes, casos extremos del verificador on-chain.
6. **Reporte ejecutivo + técnico** publicable.

## Entregables esperados

- **Reporte ejecutivo** (≤10 páginas) con resumen de findings por severidad.
- **Reporte técnico** con cada finding documentado: descripción, impacto, reproducción, recomendación.
- **Sesión de Q&A** post-entrega (1-2 horas) con el equipo.
- **Re-test** tras aplicar fixes (opcional, según presupuesto).

## Severidades esperadas

Usar OWASP-SC scoring o equivalente:
- **CRITICAL**: pérdida directa de fondos, votación manipulada.
- **HIGH**: vulnerabilidad explotable con acceso normal.
- **MEDIUM**: vulnerabilidad explotable con condiciones específicas.
- **LOW**: informativo, mejor práctica.

## Tiempo estimado

Por el tamaño de los contratos (≈120 LOC total): 1-2 semanas de trabajo del auditor. Calendar elapsed 4-6 semanas con Q&A + re-test.

## Presupuesto estimado

USD 15-30k (rango bajo dada la baja complejidad de los contratos). Auditores especializados zkStack pueden tener premium; presupuestar hasta USD 50k si se requiere zkStack expertise específica.

## Auditores candidatos (sugeridos)

- Trail of Bits — generalista, alta calidad.
- ConsenSys Diligence — generalista, fuerte en EVM.
- OpenZeppelin Security — buena para contratos basados en sus libs.
- Code4rena — modelo de competition audit; precio variable.
- Cantina — modelo de competition + manual review.
- Auditores zkStack-specific (Matter Labs no audita externos directamente; buscar firmas que hayan publicado audits sobre zkSync Era).

## Cronograma propuesto

| Hito | Cuándo |
|---|---|
| Solicitud de propuestas | TBD post-hackathon |
| Selección de auditor | TBD + 2 semanas |
| Kickoff | TBD + 4 semanas |
| Reporte preliminar | TBD + 6 semanas |
| Fixes + re-test | TBD + 8 semanas |
| Reporte final + publicación | TBD + 10 semanas |

## Documentación pre-audit a entregar

- README del repo + arquitectura técnica.
- Plan estratégico + ADRs del Sprint 02.
- Output de slither/solhint local (`docs/security/sast-findings.md`).
- Test suite + reporte de coverage (>96% branches Sprint 1 baseline).
- Threat model (`threat-model.md`).
- Acceso a entorno de testnet desplegado.

## Contacto

Eduardo Cuba (coordinador PoB-UCV) o el lead técnico designado al momento del kickoff.
