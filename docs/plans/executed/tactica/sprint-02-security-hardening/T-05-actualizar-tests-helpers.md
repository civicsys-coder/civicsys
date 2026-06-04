# T-05 — Actualizar tests Python que dependen del salt literal viejo

**Prio**: P0 · **Bloqueada por**: T-04 · **ADR**: ADR-001

## Qué hacer

Editar `agents/tests/test_helpers.py:5`:

**Antes** (línea 5):
```python
def test_compute_hash_matches_keccak_format():
    h = compute_citizen_hash("12345678", "ssc-antipereza-2026-publico")
    assert h.startswith("0x")
    assert len(h) == 66
```

**Después**:
```python
def test_compute_hash_matches_keccak_format():
    # Salt arbitrario para test — NO es el secreto de prod (que vive en .env).
    h = compute_citizen_hash("12345678", "test-salt-deterministic-value")
    assert h.startswith("0x")
    assert len(h) == 66
```

Buscar otros tests con dependencia al literal viejo:

```bash
grep -rn "ssc-antipereza-2026-publico" agents/tests/ blockchain/test/ backend/src/
```

Y reemplazar con valores arbitrarios de test (`"test-salt-..."` o constante).

## Criterio de done

- [ ] `pytest agents/tests/test_helpers.py -v` verde.
- [ ] `grep -rn "ssc-antipereza-2026-publico" agents/tests/ blockchain/test/ backend/src/` → no encuentra.
- [ ] `pytest agents/tests/` global verde.

## Comando de verificación

```bash
cd agents && python -m pytest tests/test_helpers.py -v && cd ..
! grep -rn "ssc-antipereza-2026-publico" agents/tests/ blockchain/test/ backend/src/ 2>/dev/null && echo OK
```
