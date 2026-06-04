# Política de Seguridad — CivicSys (SSC)

> **Sistema de Supervisión Ciudadana · Proof-of-Builders UCV · Licencia MIT**
>
> *"La IA asesora. El ciudadano supervisa. El blockchain firma. Hermes orquesta — y todo queda trazable."*

Este documento define la política de seguridad del proyecto CivicSys. Cubre los procedimientos para reportar vulnerabilidades de manera responsable, el modelo de amenazas que el equipo reconoce activamente, y los marcos normativos que guían el desarrollo seguro del sistema. Su publicación refleja el compromiso del equipo con la transparencia técnica y la protección de la integridad deliberativa ciudadana.

---

## Tabla de Contenidos

1. [Versiones con Soporte de Seguridad](#1-versiones-con-soporte-de-seguridad)
2. [Reporte de Vulnerabilidades](#2-reporte-de-vulnerabilidades)
3. [Modelo de Amenazas](#3-modelo-de-amenazas)
4. [Marcos de Cumplimiento y Auditoría](#4-marcos-de-cumplimiento-y-auditoría)
5. [Historial de Incidentes y Transparencia](#5-historial-de-incidentes-y-transparencia)

---

## 1. Versiones con Soporte de Seguridad

La tabla siguiente indica qué versiones y entornos de red reciben parches y actualizaciones de seguridad activas. Los reportes de vulnerabilidades deben especificar la versión afectada para facilitar la triaje.

| Versión / Rama | Red / Entorno | Estado de Soporte | Notas |
|---|---|---|---|
| `v0.1.0` — Sprint 1 | zkTanenbaum Testnet (Chain ID 57057) | ✅ **Soporte activo** | Versión actual del hackathon. Recibe parches de seguridad prioritarios. |
| `main` (HEAD) | zkTanenbaum Testnet | ✅ **Soporte activo** | La rama de desarrollo principal recibe correcciones de forma continua. |
| Versiones anteriores a `v0.1.0` | Cualquier red | ❌ **Sin soporte** | No se emiten parches. Se recomienda migrar a `v0.1.0` o superior. |
| Despliegue en Syscoin Mainnet (L1 NEVM) | Syscoin Mainnet (Chain ID 57) | ⚠️ **No disponible aún** | Ninguna versión ha sido desplegada en mainnet. No se han emitido contratos con fondos reales. |

### Ciclo de vida del soporte

- **Sprint 1 (v0.1.0):** Soporte de seguridad activo durante el período del hackathon (mayo 2026) y el ciclo de revisión post-hackathon hasta la publicación de `v0.2.0`.
- **Versiones de producción futuras:** Se publicará una política de soporte de largo plazo (LTS) antes del primer despliegue en Syscoin Mainnet. Cualquier despliegue en mainnet será precedido de una auditoría externa de contratos inteligentes y de la publicación del reporte de auditoría en este repositorio.
- **Testnet:** Los entornos de zkTanenbaum Testnet no gestionan activos reales. Sin embargo, dado que el sistema procesa datos de identidad ciudadana (hashes de DNI), las vulnerabilidades de privacidad en testnet son tratadas con la misma severidad que en producción.

> ⚠️ **Advertencia de despliegue actual:** CivicSys v0.1.0 contiene limitaciones de seguridad conocidas documentadas en el Apéndice B de la Arquitectura Técnica (entre ellas, la visibilidad del voto en calldata L2 y el modelo de signer custodial único). Este sistema **no debe** utilizarse con datos de ciudadanos reales ni en contextos electorales vinculantes hasta que los hallazgos críticos HC-01 a HC-05 sean remediados y verificados.

---

## 2. Reporte de Vulnerabilidades

El equipo de CivicSys agradece las contribuciones de la comunidad de investigación de seguridad. Dado que el sistema afecta directamente la integridad de procesos deliberativos ciudadanos, tratamos cada reporte de vulnerabilidad con la máxima seriedad y prioridad.

### 2.1 Canal de Reporte

**No reportes vulnerabilidades de seguridad mediante Issues públicos de GitHub.** Los Issues públicos son visibles por cualquier actor, lo que puede crear una ventana de exposición antes de que el equipo pueda mitigar el problema.

Utiliza exclusivamente los siguientes canales privados:

- **GitHub Security Advisories (canal preferido):** Abre un reporte privado en la pestaña *Security → Advisories → Report a vulnerability* de este repositorio. Este canal es cifrado de extremo a extremo entre el reportero y los mantenedores del proyecto.
- **Correo electrónico cifrado (alternativa):** Envía el reporte a la dirección de seguridad del equipo técnico de Proof-of-Builders UCV. Si deseas cifrar el mensaje con PGP, solicita la clave pública del equipo a través de un Issue público (no incluyas detalles de la vulnerabilidad en ese Issue). La huella de la clave pública se publicará en este repositorio una vez configurada.
- **Para vulnerabilidades de severidad CRÍTICA** que representen un riesgo inminente para datos ciudadanos: contacta directamente al mantenedor principal del proyecto a través del perfil de GitHub indicado en el campo `CODEOWNERS` del repositorio.

### 2.2 Información Requerida en el Reporte

Para facilitar la triaje y la reproducción, incluye la siguiente información en tu reporte. Los reportes con mayor detalle técnico reciben respuesta más rápida:

**Información mínima requerida:**
- Descripción clara y concisa de la vulnerabilidad
- Componente(s) afectado(s): contrato inteligente (`CitizenRegistry.sol`, `Vote.sol`, `BallotFactory.sol`), agente Hermes, API FastAPI, MCP Server, configuración de entorno, u otro
- Versión o commit del código afectado
- Pasos para reproducir el problema (proof-of-concept, si es posible)
- Impacto técnico estimado: qué datos o funciones se ven comprometidos

**Información adicional recomendada:**
- Clasificación de severidad propuesta (Crítico / Alto / Medio / Bajo) con justificación
- Referencia a CVEs, CWEs, u otros identificadores estándar relacionados, si aplica
- Sugerencias de mitigación o remediación, si las tienes
- Si la vulnerabilidad corresponde a un hallazgo ya documentado en la evaluación de amenazas del proyecto (ej. HC-01, SC-05), indícalo explícitamente

### 2.3 Tiempos de Respuesta y SLAs

El equipo se compromete a los siguientes tiempos de respuesta una vez recibido el reporte:

| Etapa | Severidad Crítica / Alta | Severidad Media | Severidad Baja |
|---|---|---|---|
| **Acuse de recibo** | < 24 horas | < 48 horas | < 72 horas |
| **Confirmación o rechazo del reporte** | < 72 horas | < 5 días hábiles | < 7 días hábiles |
| **Comunicación de plan de remediación** | < 96 horas | < 7 días hábiles | < 14 días hábiles |
| **Publicación de parche** | < 7 días (o antes si existe exploit activo) | < 30 días | < 60 días |
| **Divulgación pública coordinada** | Tras la publicación del parche + 7 días | Tras la publicación del parche + 14 días | A criterio del equipo |

Los SLAs anteriores aplican durante el período activo del Sprint 1 (mayo 2026). Para sprints posteriores, los SLAs serán revisados y publicados en la sección de versiones.

> **Nota sobre el alcance del hackathon:** El proyecto se encuentra en fase de hackathon activo. El equipo opera con capacidad de respuesta de tiempo parcial. Si no recibes acuse de recibo en el plazo indicado, es aceptable hacer un seguimiento mediante un Issue público genérico (sin detalles de la vulnerabilidad) mencionando que tienes un reporte de seguridad pendiente de confirmación.

### 2.4 Proceso de Divulgación Coordinada

El equipo sigue el principio de **divulgación coordinada responsable (Coordinated Vulnerability Disclosure, CVD)**:

1. **Recepción:** El equipo acusa recibo del reporte en el canal privado.
2. **Validación:** El equipo reproduce y valida la vulnerabilidad. Si el reporte no es reproducible o está fuera de alcance, se notifica al reportero con explicación técnica.
3. **Remediación:** El equipo desarrolla y prueba el parche. El reportero es informado del progreso si así lo desea.
4. **Notificación pre-divulgación:** Antes de publicar el parche, el reportero recibe una copia del advisory para revisión y confirmación.
5. **Publicación coordinada:** El parche y el advisory de seguridad se publican simultáneamente. El reportero es acreditado en el advisory a menos que solicite anonimato.
6. **CVE / Registro:** Para vulnerabilidades de severidad Alta o Crítica, el equipo solicitará un identificador CVE si aplica.

### 2.5 Puerto Seguro (Safe Harbor)

El equipo de CivicSys reconoce el valor de la investigación de seguridad de buena fe. Si descubres una vulnerabilidad en este proyecto siguiendo estas pautas, nos comprometemos a:

- **No emprender acciones legales** contra el investigador por el descubrimiento y reporte de buena fe.
- **No divulgar la identidad del reportero** sin su consentimiento explícito.
- **Acreditar públicamente** al investigador en el advisory de seguridad correspondiente, si lo desea.

El "Safe Harbor" aplica siempre que la investigación cumpla estas condiciones:

- No se accede a datos de ciudadanos reales sin autorización explícita.
- No se ejecutan ataques de disponibilidad (DoS/DDoS) contra infraestructura compartida.
- No se exfiltran, publican ni venden claves privadas, API keys, o datos de identidad obtenidos durante la investigación.
- El reporte se realiza a través de los canales privados definidos antes de cualquier divulgación pública.
- Las vulnerabilidades encontradas no se explotan más allá de lo necesario para demostrar su existencia.

Este Safe Harbor refleja el compromiso ético del proyecto con la comunidad de seguridad, en coherencia con los valores de transparencia y bien público que orientan a CivicSys.

---

## 3. Modelo de Amenazas

Esta sección documenta el alcance del programa de seguridad de CivicSys: qué componentes están dentro del programa, qué tipos de ataques son considerados, y qué está explícitamente fuera de alcance.

### 3.1 Componentes en Alcance

Los siguientes componentes son parte del programa de seguridad activo y son elegibles para recibir reconocimiento en el programa de divulgación:

**Contratos Inteligentes (Solidity 0.8.24 · zkStack EVM):**
- `CitizenRegistry.sol` — Registro y pseudonimización de identidad ciudadana
- `Vote.sol` — Emisión, almacenamiento y conteo de votos
- `BallotFactory.sol` — Creación y gestión del ciclo de vida de propuestas
- Contrato verificador ZK (PLONK) desplegado en Syscoin NEVM (L1)
- Futuro: `AuditLog.sol` (anclaje de reportes on-chain, Sprint 2)

**Agente Hermes (Python 3.11):**
- `event_listener.py` — Escucha de eventos on-chain y cursor de sincronización
- `reporter.py` — Construcción de prompts y generación de reportes LLM
- `runtime.py` — Orquestación de flujo del agente
- `blockchain_client.py` — Firmado y envío de transacciones
- `llm_client.py` — Interfaz con la API de Anthropic Claude
- `mcp_server/` — Servidor MCP con exposición de tools
- Archivos de identidad del agente: `SOUL.md`, `INSTINCT.md`
- Sistema de memoria: `memory/sessions/`, `memory/MEMORY.md`, `memory/listener_state.json`

**API REST (FastAPI):**
- Todos los endpoints documentados: `/auth/register`, `/proposals`, `/vote`, `/reports/{id}`, `/health`
- Middleware de logging y filtrado de PII
- Gestión de variables de entorno con credenciales (`SIGNER_PRIVATE_KEY`, `ANTHROPIC_API_KEY`, `PUBLIC_SALT`)

**Configuración e infraestructura:**
- `.env.example` y gestión de secretos en el repositorio
- Dockerfiles y configuración de despliegue
- Pipeline CI/CD (si aplica)

### 3.2 Tipos de Vulnerabilidades Cubiertas

El programa cubre, sin limitarse a, los siguientes tipos de vulnerabilidades:

**Contratos inteligentes:**
- Acceso no autorizado a funciones privilegiadas (OWASP SC-Top-10: SC04)
- Reentrancia y manipulación de estado (OWASP SC-Top-10: SC01, SC02)
- Dependencia de timestamp manipulable por sequencer (OWASP SC-Top-10: SC03)
- Front-running y manipulación de orden de transacciones (OWASP SC-Top-10: SC05)
- Desbordamiento/subdesbordamiento en contadores de tally
- Comportamientos inesperados por diferencias de opcodes zkStack vs EVM estándar (OWASP SC-Top-10: SC09)
- Vulnerabilidades en el verificador ZK on-chain (fallas en pruebas PLONK)

**Agente de IA (Hermes):**
- Inyección de prompt directa e indirecta a través de datos on-chain (títulos, descripciones de propuestas)
- Exfiltración de claves o secretos a través del servidor MCP
- Manipulación del sistema de memoria del agente (envenenamiento de contexto)
- Generación y persistencia de reportes malformados o con alucinaciones presentadas como hechos verificados
- Abuso del endpoint `LLM_BASE_URL` como proxy man-in-the-middle

**Gestión de identidad y criptografía:**
- Deanonimización del padrón ciudadano por salt público o predecible en el cálculo de `citizen_id`
- Compromiso o exfiltración de `SIGNER_PRIVATE_KEY`
- Ausencia de rotación de claves y mecanismos de revocación
- Exposición de PII en logs, trazas, o archivos temporales

**API y sistema distribuido:**
- Inyección SQL / NoSQL (si se introduce base de datos en sprints futuros)
- Exposición de datos mock (`blockchain.service.ts`) como información blockchain real
- Race conditions en el EventListener que produzcan pérdida o duplicación de reportes
- Ataques de denegación de servicio sobre endpoints críticos sin rate limiting

**Puente L1-L2:**
- Manipulación de calldata en batch posting
- Validación insuficiente de la raíz de Merkle del batch en el contrato L1
- Riesgo de liquidez en la cuenta del sequencer para batch posting

### 3.3 Fuera de Alcance

Los siguientes elementos están explícitamente **fuera del alcance** del programa de seguridad de CivicSys. Los reportes sobre estas áreas serán cerrados sin acción, aunque agradecemos la notificación:

**Infraestructura de terceros no controlada por CivicSys:**
- Vulnerabilidades en el código base de zkStack / Matter Labs / ZKsync fuera de los contratos de CivicSys
- Vulnerabilidades en la red Syscoin L1 o en su protocolo de merge-mining con Bitcoin
- Vulnerabilidades en la infraestructura del sequencer/prover de zkTanenbaum (no operado por CivicSys)
- Vulnerabilidades en el modelo de lenguaje Claude (Anthropic claude-sonnet-4-6) o en la API de Anthropic
- Vulnerabilidades en los RPC endpoints públicos de zkTanenbaum (`rpc-zk.tanenbaum.io`)
- Vulnerabilidades en OpenZeppelin Contracts o en librerías de terceros (repórtalas directamente a sus respectivos proyectos)

**Limitaciones arquitectónicas documentadas y aceptadas (Sprint 1):**
- La visibilidad del voto en calldata L2 es una limitación conocida documentada (HC-03). No constituye un reporte nuevo. Su remediación está planificada para Sprint 2.
- La centralización del sequencer de zkTanenbaum (BC-L2-02) es una limitación del protocolo testnet, no una vulnerabilidad de CivicSys.
- La ausencia de multisig y timelock (HC-02) está documentada como deuda técnica del Sprint 1.
- El backend TypeScript con datos mock (SC-07) es un scaffold de hackathon documentado.

**Ataques que requieren acceso físico o privilegiado:**
- Ataques físicos al servidor o hardware donde corre el sistema
- Ataques de ingeniería social dirigidos a miembros del equipo
- Ataques que requieren comprometer previamente la máquina del usuario final (client-side)
- Ataques que requieren acceso root/administrador al servidor de despliegue sin explotar una vulnerabilidad en el software de CivicSys

**Otros:**
- Reportes sobre configuraciones de seguridad recomendadas pero no críticas (ej. cabeceras HTTP opcionales)
- Spam, rate limiting no explotable, o best practices sin impacto de seguridad demostrable
- Vulnerabilidades que solo afectan a versiones sin soporte activo
- Ataques de denegación de servicio que requieren recursos computacionales desproporcionados (ej. hashrate de minería)

### 3.4 Suposiciones del Entorno de Despliegue

El modelo de amenazas de CivicSys asume el siguiente entorno:

- El servidor donde corre Hermes (FastAPI + EventListener) es una instancia VPS o servidor dedicado con acceso administrado por el equipo técnico. No se asume un entorno hostil a nivel de hipervisor o hardware.
- Las variables de entorno con credenciales (`SIGNER_PRIVATE_KEY`, `ANTHROPIC_API_KEY`, `PUBLIC_SALT`) son gestionadas de forma segura y no son accesibles por procesos no autorizados en el servidor, **excepto** donde una vulnerabilidad en el software de CivicSys permita su extracción.
- Los usuarios del sistema (ciudadanos que interactúan vía frontend) son considerados actores no confiables capaces de enviar entradas maliciosas a todos los endpoints públicos, incluyendo campos de propuestas y parámetros de voto.
- El RPC endpoint de zkTanenbaum puede ser comprometido o responder con datos manipulados. El sistema no debe asumir su integridad sin validación cruzada.
- Los creadores de propuestas on-chain son actores no confiables y pueden embeber instrucciones adversariales en los campos de texto de propuestas (inyección de prompt indirecto).

---

## 4. Marcos de Cumplimiento y Auditoría

El diseño, desarrollo, y evaluación de seguridad de CivicSys se guía por los siguientes estándares internacionales y marcos de referencia. Su aplicación no es meramente declarativa: los controles implementados y el plan de remediación activo están mapeados explícitamente a cláusulas verificables de cada estándar.

### 4.1 Estándares Aplicados

**NIST SP 800-53 Rev. 5 — Controles de Seguridad y Privacidad**
[https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final)

Estándar base para la selección de controles técnicos y operacionales. Las áreas de mayor aplicabilidad en CivicSys son: gestión criptográfica (SC-12, SC-28), control de acceso (AC-3, AC-5, AC-6), auditoría y trazabilidad (AU-2, AU-3, AU-9, AU-12), integridad del sistema (SI-7, SI-10, SI-15), y gestión de riesgos del programa (PM-9, RA-3, RA-5). Los controles de identificación y autenticación (IA-3) informan el diseño del modelo de roles del signer. Los controles de respuesta a incidentes (IR-3, IR-4, IR-8) orientan el runbook de compromiso de claves.

**NIST Cybersecurity Framework 2.0 (CSF 2.0)**
[https://www.nist.gov/cyberframework](https://www.nist.gov/cyberframework)

Proporciona el lenguaje funcional de alto nivel para organizar las capacidades de seguridad del proyecto en las categorías GOVERN, IDENTIFY, PROTECT, DETECT, RESPOND y RECOVER. La función GOVERN es especialmente relevante para la gestión de riesgos de IA y blockchain en el contexto de un proyecto de bien público digital.

**NIST AI Risk Management Framework 1.0 (AI RMF)**
[https://airc.nist.gov/RMF](https://airc.nist.gov/RMF)

Marco específico para la gestión de riesgos en sistemas de IA. Aplica directamente al agente Hermes en sus funciones de generación de reportes deliberativos. Las funciones MAP, MEASURE y MANAGE del AI RMF orientan la implementación de controles contra inyección de prompt, monitoreo de comportamiento del agente, validación de salidas LLM, y el reconocimiento honesto de limitaciones no completamente mitigables (ej. inyección de prompt indirecta como problema abierto en la investigación al 2026). La función GOVERN-5.1 y GOVERN-6.1 orientan la evaluación de impacto en privacidad y la divulgación pública de incidentes.

**ISO/IEC 27001:2022 — Seguridad de la Información, Ciberseguridad y Privacidad**

Proporciona el marco de gestión del sistema de seguridad de la información (SGSI). Los controles del Anexo A aplicados incluyen: A.5.1 (políticas de seguridad), A.5.15 (control de acceso), A.5.26/A.5.27 (gestión y divulgación de incidentes), A.8.2/A.8.5 (identidad privilegiada), A.8.15 (logging), A.8.16 (monitoreo), A.8.17 (integridad de información), A.8.24 (uso de criptografía), A.8.29 (seguridad en desarrollo), y A.8.32 (protección de entornos de prueba). La cláusula A.8.8 (gestión de vulnerabilidades técnicas) es la base de esta política de divulgación.

**ISO/IEC 23894:2023 — Inteligencia Artificial: Orientación sobre Gestión de Riesgos**

Estándar específico de IA que complementa al NIST AI RMF con orientación técnica sobre identificación de riesgos (§6.3.2), tratamiento de riesgos en sistemas LLM (§6.3.3, §6.3.4), monitoreo continuo de comportamiento del agente (§6.3.5), y comunicación de riesgos a partes interesadas (§6.3.6). Orienta el diseño de los controles de sanitización de entradas on-chain a Hermes y la política de divulgación pública de incidentes que afecten la integridad deliberativa.

**OWASP Smart Contract Top 10 (2023)**
[https://owasp.org/www-project-smart-contract-top-10/](https://owasp.org/www-project-smart-contract-top-10/)

Guía de referencia para la identificación de vulnerabilidades en contratos inteligentes. Todos los hallazgos de contratos inteligentes en la evaluación de amenazas de CivicSys están mapeados a las categorías OWASP-SC correspondientes: SC01 (reentrancia), SC02 (control de acceso), SC03 (timestamp), SC04 (acceso no autorizado), SC05 (front-running), SC06 (circuit breaker), SC07 (oracle manipulation), SC09 (compatibilidad de versiones). La auditoría externa de contratos prevista para pre-mainnet utilizará este marco como referencia de scope mínimo.

### 4.2 Cómo Informan los Marcos la Práctica del Proyecto

**Gestión de riesgos documentada:** Los hallazgos críticos identificados (HC-01 a HC-05) son formalizados como entradas de un registro de riesgos vivo conforme a NIST AI RMF MAP-1.5 e ISO/IEC 23894:2023 §6.3.2. Cada entrada incluye propietario, fecha de remediación objetivo y estado de mitigación.

**Privacidad por diseño:** El flujo de datos de DNI ciudadano, desde su ingreso en el endpoint de registro hasta su transformación en `citizen_id` mediante `keccak256`, es documentado conforme a NIST SP 800-53 PT-2/PT-3 e ISO/IEC 27001:2022 A.5.34 para garantizar que ningún log o archivo temporal retenga PII.

**Transparencia sobre limitaciones de IA:** Conforme a NIST AI RMF GOVERN-5.1 y la función MAP del AI RMF, los reportes generados por Hermes incluyen metadatos que indican su origen en un agente LLM. Las limitaciones del `confidence_score` (heurística basada en margen de votos, no en calidad deliberativa) son documentadas en el propio reporte para que el ciudadano pueda contextualizarlas.

**Auditoría externa pre-mainnet:** Conforme a NIST SP 800-53 SA-11(1) e ISO/IEC 27001:2022 A.8.29, ninguna versión será desplegada en Syscoin Mainnet sin una auditoría formal de contratos inteligentes por un tercero especializado en zkStack. El reporte de auditoría será publicado en este repositorio.

**Divulgación honesta de no-mitigabilidades:** El proyecto documenta explícitamente las amenazas que no pueden ser completamente mitigadas mediante controles normativos estándar (sequencer centralizado en testnet, inyección de prompt indirecto como problema abierto en investigación de LLMs, dependencias del trusted setup ZK). Esta postura refleja el principio rector del proyecto y cumple con NIST AI RMF GOVERN-6.1.

### 4.3 Recursos de Referencia Adicionales

- NIST FIPS 202 — SHA-3 / Keccak: [https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.202.pdf](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.202.pdf)
- Matter Labs — Documentación técnica de zkStack: [https://docs.zksync.io/zksync-era/concepts/zk-rollup-architecture](https://docs.zksync.io/zksync-era/concepts/zk-rollup-architecture)
- Gabizon, Williamson, Ciobotaru — "PLONK" (IACR ePrint 2019/953): [https://eprint.iacr.org/2019/953](https://eprint.iacr.org/2019/953)
- OpenZeppelin — Access Control: [https://docs.openzeppelin.com/contracts/4.x/access-control](https://docs.openzeppelin.com/contracts/4.x/access-control)

---

## 5. Historial de Incidentes y Transparencia

Conforme a la política de divulgación pública definida en la sección 2.4 y a los estándares ISO/IEC 27001:2022 A.5.27 y NIST AI RMF GOVERN-6.1, cualquier incidente de seguridad que afecte la integridad de votos, reportes ciudadanos, o datos de identidad será documentado públicamente en este repositorio bajo el nombre `INCIDENT-YYYY-NNN.md`.

Cada registro de incidente incluirá:

1. Identificador y fecha de detección
2. Descripción técnica del incidente
3. Período de afectación (bloques on-chain o ventana temporal)
4. Propuestas o deliberaciones afectadas, si aplica
5. Causa raíz identificada
6. Medidas de remediación aplicadas
7. Controles preventivos implementados para evitar recurrencia

**Historial actual:** Ningún incidente de seguridad registrado a la fecha de publicación de este documento (mayo 2026).

---

## Acerca de Este Documento

Este archivo `SECURITY.md` fue elaborado conforme al control ISO/IEC 27001:2022 A.8.8 (Gestión de vulnerabilidades técnicas) y NIST CSF 2.0 GV.OC-03, como parte del plan de remediación P0 del proyecto CivicSys (referencia AI-PI-02 del informe de auditoría de ciberseguridad, mayo 2026).

**Revisión y actualización:** Este documento debe revisarse antes de cada release mayor, antes de cualquier despliegue en mainnet, y tras cualquier incidente de seguridad significativo.

---

*CivicSys — Sistema de Supervisión Ciudadana · Proof-of-Builders UCV*
*Licencia del sistema: MIT — bien público digital sobre Syscoin*
*Versión de este documento: 1.0 · Mayo 2026*
