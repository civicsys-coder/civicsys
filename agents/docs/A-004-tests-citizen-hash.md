---
id: A-004
title: "tests/test_citizen_hash.py — edge cases y determinismo"
owner: "Gabriel"
backup: "junior"
effort: "1 h"
priority: P0
status: pending
depends_on: [A-003]
sprint: 1
layer: agents
---

# A-004 · Tests de `citizen_hash`

## Por qué importa
Bugs en `citizen_hash` se traducen a **bugs de identidad ciudadana**: ciudadanos que no pueden votar, votos duplicados, o (peor) revelar DNIs por logs. Los tests acá son el "control de calidad" de la pieza más sensible del Sprint 1.

## Conceptos clave
- **Determinismo**: si llamás 1000 veces con los mismos args, da el mismo output. Si no, hay un bug.
- **Vectores de prueba**: hashes precomputados que documentan el comportamiento esperado. Si el hash cambia, sabemos exactamente qué se rompió.
- **Edge cases del input**: tildes, espacios, mayúsculas, caracteres no latinos, símbolos. Cada uno necesita un test.
- **`pytest.parametrize`**: ejecutar el mismo test con muchos inputs distintos. Más compacto que muchos `def test_...`.

## Pre-requisitos
- [ ] [A-003](./A-003-citizen-hash-helper.md) cerrada.

## Paso a paso

### 1. Crear `tests/test_citizen_hash.py`
```python
"""Tests para api.services.citizen_hash.

Cobertura: normalización, validación, determinismo, vectores fijos.
"""
import pytest

from api.services.citizen_hash import (
    InvalidDNIError,
    InvalidNameError,
    citizen_id,
    citizen_id_hex,
    normalize_name,
    validate_dni,
)

SALT = "ssc-antipereza-2026-publico"


# ---------- normalize_name ----------

@pytest.mark.parametrize("raw,expected", [
    ("JUAN PEREZ",          "JUAN PEREZ"),
    ("juan perez",          "JUAN PEREZ"),
    ("Juan Pérez",          "JUAN PEREZ"),
    ("  Juan   Pérez  ",    "JUAN PEREZ"),
    ("José María Núñez",    "JOSE MARIA NUNEZ"),
    ("ÁNGEL CRUZ",          "ANGEL CRUZ"),
    ("ñoño Cruz",           "NONO CRUZ"),
])
def test_normalize_name_happy(raw, expected):
    assert normalize_name(raw) == expected


@pytest.mark.parametrize("raw", [
    "",
    "A",
    "ABC",
    "AB",
    "JU",
])
def test_normalize_name_too_short(raw):
    with pytest.raises(InvalidNameError, match="corto"):
        normalize_name(raw)


def test_normalize_name_too_long():
    with pytest.raises(InvalidNameError, match="largo"):
        normalize_name("A" * 121)


@pytest.mark.parametrize("raw", [
    "Juan Pérez 123",
    "Juan-Pérez",
    "Juan@Pérez",
    "Juan.Pérez",
])
def test_normalize_name_rejects_non_alpha(raw):
    with pytest.raises(InvalidNameError):
        normalize_name(raw)


def test_normalize_name_non_string():
    with pytest.raises(InvalidNameError):
        normalize_name(123)  # type: ignore[arg-type]


# ---------- validate_dni ----------

@pytest.mark.parametrize("dni", [
    "12345678",
    "00000000",
    "99999999",
])
def test_validate_dni_happy(dni):
    assert validate_dni(dni) == dni


@pytest.mark.parametrize("dni", [
    "",
    "1234567",      # 7 dígitos
    "123456789",    # 9 dígitos
    "1234567a",     # letra
    "1234 5678",    # espacio
    " 12345678",    # espacio prefix
    "12345678 ",
])
def test_validate_dni_rechaza(dni):
    with pytest.raises(InvalidDNIError):
        validate_dni(dni)


def test_validate_dni_non_string():
    with pytest.raises(InvalidDNIError):
        validate_dni(12345678)  # type: ignore[arg-type]


# ---------- citizen_id determinismo ----------

def test_citizen_id_es_deterministico():
    a = citizen_id("12345678", "JUAN PEREZ", SALT)
    b = citizen_id("12345678", "JUAN PEREZ", SALT)
    assert a == b


def test_citizen_id_normaliza_antes_de_hashear():
    """JUAN PEREZ y juan perez deben dar el mismo hash."""
    a = citizen_id("12345678", "JUAN PEREZ", SALT)
    b = citizen_id("12345678", "  juan  pérez  ", SALT)
    assert a == b


def test_citizen_id_difiere_por_dni():
    a = citizen_id("12345678", "JUAN PEREZ", SALT)
    b = citizen_id("12345679", "JUAN PEREZ", SALT)
    assert a != b


def test_citizen_id_difiere_por_nombre():
    a = citizen_id("12345678", "JUAN PEREZ", SALT)
    b = citizen_id("12345678", "MARIO LOPEZ", SALT)
    assert a != b


def test_citizen_id_difiere_por_salt():
    a = citizen_id("12345678", "JUAN PEREZ", "salt-A")
    b = citizen_id("12345678", "JUAN PEREZ", "salt-B")
    assert a != b


def test_citizen_id_rechaza_salt_vacio():
    with pytest.raises(ValueError, match="salt"):
        citizen_id("12345678", "JUAN PEREZ", "")


def test_citizen_id_es_32_bytes():
    h = citizen_id("12345678", "JUAN PEREZ", SALT)
    assert isinstance(h, bytes)
    assert len(h) == 32


# ---------- citizen_id_hex ----------

def test_citizen_id_hex_formato():
    h = citizen_id_hex("12345678", "JUAN PEREZ", SALT)
    assert h.startswith("0x")
    assert len(h) == 66  # 0x + 64 hex chars


def test_citizen_id_hex_es_lowercase():
    h = citizen_id_hex("12345678", "JUAN PEREZ", SALT)
    assert h == h.lower()


# ---------- Vector de prueba fijo ----------

def test_vector_conocido():
    """Si este test cambia, ALGO cambió en la pipeline de hashing.
    Coordina con Orlando antes de modificar el expected."""
    h = citizen_id_hex("12345678", "JUAN PEREZ", "ssc-antipereza-2026-publico")
    # Calculado manualmente con `python -c "from eth_utils import keccak; print('0x' + keccak(b'12345678|JUAN PEREZ|ssc-antipereza-2026-publico').hex())"`
    # Verificar este valor en la primera ejecución y dejarlo fijo.
    assert h == "0x..." # ← reemplazar con el hash real al correr la primera vez


# ---------- Privacidad ----------

def test_dni_no_aparece_en_excepcion():
    """Si validate_dni falla, el mensaje no debe incluir el DNI."""
    try:
        validate_dni("ABC12345")
    except InvalidDNIError as e:
        assert "ABC12345" not in str(e)


def test_normalize_name_no_revela_input_en_error():
    try:
        normalize_name("Juan@Pérez")
    except InvalidNameError as e:
        # OK que diga "caracteres invalidos" pero NO el input completo
        assert "Juan" not in str(e)
```

### 2. Computar el vector de prueba real
```bash
cd agents
python -c "
from eth_utils import keccak
print('0x' + keccak(b'12345678|JUAN PEREZ|ssc-antipereza-2026-publico').hex())
"
```

Pegar el hash en `test_vector_conocido` reemplazando `0x...`.

### 3. Ejecutar
```bash
pytest tests/test_citizen_hash.py -v
```

Esperado:
```
tests/test_citizen_hash.py::test_normalize_name_happy[JUAN PEREZ-JUAN PEREZ] PASSED
tests/test_citizen_hash.py::test_normalize_name_happy[juan perez-JUAN PEREZ] PASSED
...
35 passed in 0.1s
```

### 4. Coverage
```bash
pytest tests/test_citizen_hash.py --cov=api.services.citizen_hash --cov-report=term-missing
```

Esperado: coverage ≥ 95% de `citizen_hash.py`.

### 5. Commit
```bash
git add agents/tests/test_citizen_hash.py
git commit -m "test(agents): citizen_hash edge cases + vector fijo (A-004)"
```

## Verificación / Definition of Done

- ✅ Todos los tests pasan (~30).
- ✅ Coverage de `citizen_hash.py` ≥ 95%.
- ✅ El test `test_vector_conocido` tiene un hash real, no `0x...`.
- ✅ Test de privacidad confirma que excepciones no leakean inputs.

## Errores comunes

- **`AssertionError` en `test_normalize_name_rejects_non_alpha`**
  Si tu implementación acepta guiones u otros, ajustá la decisión con Tatiana. Si fue intencional, modificá los tests.

- **Vector fijo falla en CI pero pasa local**
  Probable: env var `PUBLIC_SALT` distinta. El test hardcodea el salt, no depende de env — si difiere, hay bug.

- **Test "no revela input" pasa con cualquier mensaje**
  Releé tu `InvalidNameError` — si dice "Nombre no válido: Juan@Pérez", filtra el input antes de hacer raise.

## Lecturas
- [pytest parametrize](https://docs.pytest.org/en/stable/how-to/parametrize.html)
- [Unicode NFKD](https://en.wikipedia.org/wiki/Unicode_equivalence)
- [`docs/security/threat-model-sprint1.md`](../../docs/security/threat-model-sprint1.md)

## Notas para revisor
- ¿Hay test para "ñ" en el nombre? Debe pasar (ñ es alpha).
- ¿El vector fijo está reemplazado? Si no, el test se rompe en CI.
- Confirmar que el test de privacidad realmente verifica que `"12345678"` no aparece en el mensaje de error de DNI inválido.
