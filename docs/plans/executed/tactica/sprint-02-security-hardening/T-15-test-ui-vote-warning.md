# T-15 — Test del componente VoteVisibilityWarning

**Prio**: P2 · **Bloqueada por**: T-14 · **ADR**: —

## Qué hacer

Crear `frontend/civicsys/src/components/VoteVisibilityWarning.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { VoteVisibilityWarning } from "./VoteVisibilityWarning";

describe("VoteVisibilityWarning", () => {
  it("renderiza con role alert", () => {
    render(<VoteVisibilityWarning />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("muestra el texto de visibilidad", () => {
    render(<VoteVisibilityWarning />);
    expect(screen.getByText(/visible públicamente/i)).toBeInTheDocument();
  });

  it("incluye link a known-limitations.md", () => {
    render(<VoteVisibilityWarning />);
    const link = screen.getByText(/known-limitations\.md/i);
    expect(link).toHaveAttribute("href", expect.stringContaining("known-limitations.md"));
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("tiene data-testid para integración", () => {
    render(<VoteVisibilityWarning />);
    expect(screen.getByTestId("vote-visibility-warning")).toBeInTheDocument();
  });
});
```

Si testing-library no está instalada en el frontend o vitest, este test puede simplificarse a un snapshot test. Verificar primero con `cat frontend/civicsys/package.json | grep testing-library`.

## Criterio de done

- [ ] `pnpm --filter civicsys run test` verde con 4 tests del componente.
- [ ] Coverage frontend no baja del baseline Sprint 1 (80% statements).

## Comando de verificación

```bash
cd frontend/civicsys && pnpm test -- --run src/components/VoteVisibilityWarning.test.tsx
```
