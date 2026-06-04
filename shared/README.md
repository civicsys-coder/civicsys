# shared/

Source of truth cross-stack para tipos, schemas zod y ABIs generados de los
contratos. Lo consumen `backend/` (Node + tRPC) y `frontend/civicsys/` (Next.js).

## Contenido

| Carpeta | Qué hay | Generado o manual |
|---|---|---|
| `types/` | `index.ts` con interfaces TypeScript | manual |
| `schemas/` | `zod.ts` con schemas runtime | manual |
| `abis/` | `CitizenRegistry.json` y `Vote.json` | generado por `blockchain/scripts/deploy-local.ts` |

## Regenerar ABIs

```bash
cd ../blockchain && pnpm exec hardhat run scripts/deploy-local.ts --network localhost
```

Los ABIs se copian automáticamente a `shared/abis/` como parte del deploy.
