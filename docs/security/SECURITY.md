# Política de divulgación responsable — CivicSys

CivicSys (Sistema de Supervisión Ciudadana Antipereza) acepta y agradece reportes de seguridad sobre cualquier componente del monorepo.

## Cómo reportar una vulnerabilidad

**Canal preferido**: abrir un *Security Advisory* privado en GitHub del repo (botón "Report a vulnerability" en la pestaña Security del repo público).

**Canal alternativo**: enviar email cifrado a `security@civicsys.example` (placeholder — reemplazar con la dirección real del equipo cuando se decida).

**No** uses issues públicos para reportes de seguridad — los issues quedan indexados antes de que se pueda mitigar.

## Qué incluir en el reporte

1. **Descripción del problema** en lo posible reproducible.
2. **Componente afectado**: `blockchain/contracts/...`, `agents/app/...`, `backend/src/...`, `frontend/civicsys/...`.
3. **Impacto técnico**: qué daño puede causar.
4. **Pasos para reproducir** (proof of concept si lo tenés).
5. **Evidencia** (logs, screenshots, tx hashes en testnet).
6. **Severidad estimada** según OWASP / CVSS — opcional.

## Qué NO hacer

- No probar la vulnerabilidad contra datos ciudadanos reales o un deploy productivo.
- No publicar el reporte antes de coordinar la divulgación.
- No usar testnets como vector de mass-testing — coordiná con el equipo.

## SLA del equipo

- **Acuse de recibo**: dentro de 48 horas hábiles.
- **Triage inicial**: dentro de 5 días hábiles.
- **Mitigación de severidad crítica**: dentro de 7 días desde la confirmación.
- **Mitigación de severidad alta**: dentro de 30 días.
- **Comunicación pública / CVE**: tras coordinación con el reportador (típicamente 30-90 días post-fix, según el caso).

Estos SLAs aplican mientras CivicSys sea un proyecto de hackathon / pre-producción. Si avanzamos a producción, los SLAs se endurecen.

## Alcance (Scope)

**Componentes en scope para reportes de seguridad**:

- Smart contracts en `blockchain/contracts/` desplegados a Anvil local o zkTanenbaum testnet.
- Backend Node BFF (`backend/src/`).
- Backend Python Hermes (`agents/app/`, `agents/hermes/`, futuro `agents/mcp_server/`).
- Frontend Next.js (`frontend/civicsys/`).
- Configuración y archivos `.env.example` del repo.
- Documentación que afecte la postura de seguridad (`docs/security/`, `CLAUDE.md`).

**Componentes FUERA de scope** (reportá a sus mantenedores):

- Código de zkStack / Matter Labs (verificador PLONK, sequencer, prover).
- Red Syscoin L1 (NEVM merge-minada con Bitcoin).
- Modelo base Claude de Anthropic o cualquier modelo upstream.
- Dependencias de terceros (reportá vía sus canales — viem, web3.py, FastAPI, etc.).
- Infraestructura de despliegue del proveedor (Hetzner, Cloudflare, etc.).

## Programa de bug bounty

CivicSys es un proyecto de hackathon académico (PoB-UCV 2026, licencia MIT) **sin programa de bug bounty activo**. Cualquier compensación es voluntaria y excepcional, no garantizada. Los reportadores que ayuden a mejorar la postura del proyecto serán reconocidos en `CHANGELOG.md` o equivalente (con su consentimiento).

## Lista de reconocimientos

(Sección que se completa con reportadores acreditados; en blanco al lanzamiento.)

## Referencias normativas

Esta política se alinea con:

- ISO/IEC 29147:2018 — Vulnerability disclosure.
- ISO/IEC 27001:2022 A.8.8 — Management of technical vulnerabilities.
- NIST SP 800-53 Rev.5 RA-5(11) — Public disclosure program.

## Última actualización

2026-05-23.
