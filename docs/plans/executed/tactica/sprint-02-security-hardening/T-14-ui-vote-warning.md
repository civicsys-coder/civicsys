# T-14 — UI warning sobre visibilidad de voto

**Prio**: P2 · **Bloqueada por**: T-01 · **ADR**: — (HC-03/SC-04)

## Qué hacer

1. Identificar la página/componente del frontend Next.js donde el ciudadano confirma su voto. Probablemente está en `frontend/civicsys/src/app/vote/` o similar (verificar con `grep -rn "castVote" frontend/civicsys/src/`).

2. Crear componente `frontend/civicsys/src/components/VoteVisibilityWarning.tsx`:

```tsx
import Link from "next/link";

export function VoteVisibilityWarning() {
  return (
    <div
      role="alert"
      className="rounded-md border border-amber-400 bg-amber-50 p-4 text-sm text-amber-900 my-4"
      data-testid="vote-visibility-warning"
    >
      <p className="font-semibold">Aviso de transparencia</p>
      <p className="mt-1">
        Tu voto será visible públicamente en el explorador de zkTanenbaum
        hasta que se implemente commit-reveal (planificado Sprint 3+).
      </p>
      <p className="mt-1">
        Más detalle:{" "}
        <Link
          href="https://github.com/SandroChavez/CivicSys/blob/main/docs/security/known-limitations.md"
          className="underline"
          target="_blank"
          rel="noreferrer"
        >
          docs/security/known-limitations.md
        </Link>
      </p>
    </div>
  );
}
```

3. Incluir `<VoteVisibilityWarning />` antes del botón de confirmar voto.

## Criterio de done

- [ ] Componente renderiza con `data-testid="vote-visibility-warning"`.
- [ ] La página de voto lo incluye visible antes del CTA de votar.
- [ ] Manual: abrir la página en local y confirmar que el banner aparece.

## Comando de verificación

```bash
cd frontend/civicsys && pnpm dev   # abrir la página de voto en navegador local
# (verificación manual)
```
