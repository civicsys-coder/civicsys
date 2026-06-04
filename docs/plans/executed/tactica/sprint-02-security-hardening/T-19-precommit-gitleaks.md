# T-19 — `.pre-commit-config.yaml` con gitleaks

**Prio**: infra · **Bloqueada por**: — · **ADR**: —

## Qué hacer

Crear `.pre-commit-config.yaml` en la raíz del repo:

```yaml
# Pre-commit hooks — instalación manual del operador con:
#   pip install pre-commit && pre-commit install
# La instalación del binario gitleaks queda diferida (Task A-038 en Sprint 1).

repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.4
    hooks:
      - id: gitleaks
        name: gitleaks (scan for secrets)
        description: Detect hardcoded secrets in commits
```

Este archivo no instala nada automáticamente — sólo declara la config. El operador debe correr `pre-commit install` localmente. Eso evita romper CI si los runners no tienen `pre-commit` instalado.

Documentar en `agents/README.md` (sección "Modelo de seguridad" creada en T-06):

> Para activar gitleaks pre-commit localmente:
> ```bash
> pip install pre-commit
> pre-commit install
> ```

## Criterio de done

- [ ] `.pre-commit-config.yaml` existe en la raíz.
- [ ] Config válida (`pre-commit validate-config` si pre-commit instalado).
- [ ] README de agents documenta la instalación opcional.

## Comando de verificación

```bash
test -f .pre-commit-config.yaml && grep -q "gitleaks" .pre-commit-config.yaml && echo OK
```
