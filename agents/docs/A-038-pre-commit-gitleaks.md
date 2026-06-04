---
id: A-038
title: "Pre-commit hook (gitleaks + ruff + mypy)"
owner: "Tatiana"
backup: "Sandro"
effort: "1 h"
priority: P0
status: pending
depends_on: [A-001]
sprint: 1
layer: agents
---

# A-038 · Pre-commit hooks

## Por qué importa
Sin hooks automáticos, la disciplina de no commitear secretos y lint pasa por la voluntad de cada dev. **En hackathon eso no escala**. Un pre-commit hook deja muerto el problema antes de que entre al repo.

## Conceptos clave
- **`pre-commit`** (https://pre-commit.com): framework Python que ejecuta hooks declarados en `.pre-commit-config.yaml`.
- **Hooks que usamos**:
  - `gitleaks` — busca patrones de keys/secrets.
  - `ruff` — lint y format Python.
  - `mypy` — type check.
  - `end-of-file-fixer`, `trailing-whitespace` — limpiezas.
- **`pre-commit install`** linkea automáticamente al `.git/hooks/`.

## Pre-requisitos
- [ ] [A-001](./A-001-setup-pyproject.md) cerrada.

## Paso a paso

### 1. Instalar pre-commit
```bash
pip install pre-commit
```

### 2. Crear `.pre-commit-config.yaml` en la raíz del repo
```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.6.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-merge-conflict
      - id: check-added-large-files
        args: [--maxkb=500]
      - id: detect-private-key

  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.4
    hooks:
      - id: gitleaks

  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.4.10
    hooks:
      - id: ruff
        args: [--fix, --exit-non-zero-on-fix]
        files: ^agents/
      - id: ruff-format
        files: ^agents/

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.10.0
    hooks:
      - id: mypy
        files: ^agents/(api|hermes|mcp_server)/
        additional_dependencies:
          - "pydantic>=2.6"
          - "pydantic-settings>=2.2"
          - "fastapi"
          - "structlog"
```

### 3. Instalar el hook
```bash
pre-commit install
```

### 4. Probar manualmente
```bash
pre-commit run --all-files
```

Esperado: todos los hooks corren sobre el repo entero. Probablemente el primer run reformatea código — commit-only-format y reintentar.

### 5. Probar que detecta secretos
```bash
echo "DEPLOYER_PRIVATE_KEY=0xa1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd" > prueba.txt
git add prueba.txt
git commit -m "test gitleaks"
```

Esperado: hook aborta el commit.

```bash
rm prueba.txt
```

### 6. Documentar para el equipo
Agregar a `docs/sprints/sprint1.md` (sección "Setup"):

```markdown
### Pre-commit hooks (obligatorio)
\```bash
pip install pre-commit
pre-commit install
\```
```

### 7. Commit
```bash
git add .pre-commit-config.yaml docs/sprints/sprint1.md
git commit -m "chore(security): pre-commit hooks (gitleaks/ruff/mypy) (A-038)"
```

## Verificación / Definition of Done

- ✅ `pre-commit run --all-files` pasa sin errores (después del primer fix).
- ✅ Intentar commitear una key detectada es rechazado.
- ✅ Todo el equipo corre `pre-commit install`.

## Errores comunes

- **`gitleaks` da falsos positivos**
  Crear `.gitleaks.toml` con allowlist para keys de test bien conocidas.

- **mypy falla en archivos generados (typechain-types)**
  Excluir en `pyproject.toml [tool.mypy] exclude`.

- **`pre-commit` rompe en máquinas viejas**
  Ofrecer fallback: `npm run lint` + `gitleaks detect` manuales.

## Lecturas
- [pre-commit docs](https://pre-commit.com/)
- [gitleaks rules](https://github.com/gitleaks/gitleaks#configuration)

## Notas para revisor
- Confirmar que TODOS los devs corrieron `pre-commit install`.
- Si alguien usa `--no-verify` en commit, investigar por qué.
