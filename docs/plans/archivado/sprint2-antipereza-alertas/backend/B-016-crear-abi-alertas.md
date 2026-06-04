# B-016 · Crear archivo abi/AlertasABI.ts con el ABI del contrato de alertas

**id:** B-016
**title:** Crear archivo abi/AlertasABI.ts con el ABI del contrato de alertas
**owner:** [Responsable]
**backup:** [Backup/Pair]
**effort:** 10 min
**priority:** P0
**status:** pending
**depends_on:** B-008
**sprint:** 1
**layer:** backend

---

## Por qué importa
Permite interactuar correctamente con el contrato de alertas desde el backend.

## Conceptos clave
- ABI
- Contrato de alertas

## Pre-requisitos
- ABI exportado del contrato

## Paso a paso
1. Crear archivo abi/AlertasABI.ts.
2. Copiar el ABI del contrato de alertas.

## Verificación / Definition of Done
- ABI disponible y exportado para uso en servicios.

## Errores comunes
- ABI desactualizado respecto al contrato real.

## Lecturas
- https://docs.ethers.org/v6/

## Notas para revisor
- Confirmar que el ABI corresponde al contrato desplegado.