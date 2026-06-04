# B-008 · Crear constants.ts con addresses de contratos y ABIs

**id:** B-008
**title:** Crear constants.ts con addresses de contratos y ABIs
**owner:** [Responsable]
**backup:** [Backup/Pair]
**effort:** 10 min
**priority:** P0
**status:** pending
**depends_on:** B-001
**sprint:** 1
**layer:** backend

---

## Por qué importa
Centraliza la configuración de contratos y ABIs para fácil mantenimiento y reutilización.

## Conceptos clave
- Constants
- ABIs

## Pre-requisitos
- Proyecto Node.js inicializado

## Paso a paso
1. Crear archivo constants.ts en /lib o raíz.
2. Agregar addresses y ABIs relevantes.

## Verificación / Definition of Done
- constants.ts creado y usado en el código.

## Errores comunes
- Duplicar addresses o ABIs en varios archivos.

## Lecturas
- https://docs.ethers.org/v6/

## Notas para revisor
- Confirmar que constants.ts es la única fuente de addresses/ABIs.