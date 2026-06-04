---
id: A-003
title: "services/citizen_hash.py — keccak256(DNI || nombre || salt)"
owner: "junior"
backup: "Sandro"
effort: "1 h"
priority: P0
status: pending
depends_on: [A-001]
sprint: 1
layer: agents
---

# A-003 · Helper `citizen_hash.py`

## Por qué importa
Esta función es **la piedra de toque de la privacidad** del Sprint 1. La API recibe DNI + nombre, calcula `citizenId = keccak256(dni || nombre_normalizado || PUBLIC_SALT)` y **descarta el DNI inmediatamente**. Solo el hash viaja a `CitizenRegistry.register()`.

Si esta función está mal:
- El DNI puede filtrarse en logs (T2 del [threat model](../../docs/security/threat-model-sprint1.md)).
- Dos personas con el mismo nombre y DNI distinto colisionan (T4).
- El hash en off-chain y on-chain no coincide → nadie puede votar.

Esta función *no* es opcional ni "una utility menor": es código de seguridad.

## Conceptos clave
- **`keccak256`**: hash de 32 bytes. Es el mismo que usa Solidity (no confundir con SHA3 estándar — son distintos en finalización).
- **Normalización Unicode (NFKD)**: descompone tildes en letra + acento, después borramos los acentos. Resultado: `José → JOSE`.
- **`bytes` vs `str`**: el hash trabaja sobre bytes. UTF-8 encoding garantiza determinismo cross-platform.
- **`PUBLIC_SALT`**: público pero unico para CivicSys. Hace que la pre-imagen no sea trivial (no podés tomar mi DNI de otra app y testear si coincide).
- **Equivalencia con Solidity**: si Solidity hace `keccak256(abi.encodePacked(dni, name, salt))`, Python debe hacer `keccak(dni_bytes + name_bytes + salt_bytes)` con el **mismo separador o ninguno**. Nosotros usamos un separador `|` para evitar ambigüedad (`abc + def == ab + cdef`).

## Pre-requisitos
- [ ] [A-001](./A-001-setup-pyproject.md) cerrada.
- [ ] `eth-utils` instalado (parte de A-001).

## Paso a paso

### 1. Crear `api/services/citizen_hash.py`
```python
"""Hashing determinístico de identidad ciudadana.

Reglas:
- DNI peruano: 8 dígitos numéricos.
- Nombre: UPPER, sin tildes, sin espacios dobles.
- Separador entre campos: `|` (evita colisiones por concatenación).
- citizen_id = keccak256(f"{dni}|{normalized_name}|{public_salt}").

IMPORTANTE: el DNI no se loguea, persiste ni retorna. Se usa solo
para computar el hash y se descarta.
"""
from __future__ import annotations

import re
import unicodedata

from eth_utils import keccak

DNI_PATTERN = re.compile(r"^\d{8}$")
NAME_MIN_LEN = 5
NAME_MAX_LEN = 120


class InvalidDNIError(ValueError):
    """DNI no cumple el formato peruano (8 dígitos)."""


class InvalidNameError(ValueError):
    """Nombre fuera de rango de longitud o caracteres inválidos."""


def normalize_name(name: str) -> str:
    """UPPER, sin tildes, espacios colapsados a uno.

    >>> normalize_name(" José  María Núñez ")
    'JOSE MARIA NUNEZ'
    """
    if not isinstance(name, str):
        raise InvalidNameError("name debe ser str")
    nfkd = unicodedata.normalize("NFKD", name)
    no_accents = "".join(c for c in nfkd if not unicodedata.combining(c))
    cleaned = " ".join(no_accents.upper().split())
    if len(cleaned) < NAME_MIN_LEN:
        raise InvalidNameError(f"nombre demasiado corto ({len(cleaned)} chars)")
    if len(cleaned) > NAME_MAX_LEN:
        raise InvalidNameError(f"nombre demasiado largo ({len(cleaned)} chars)")
    # Rechazar caracteres no alfa (incluye números, puntuación)
    if not all(c.isalpha() or c == " " for c in cleaned):
        raise InvalidNameError("nombre contiene caracteres no alfabéticos")
    return cleaned


def validate_dni(dni: str) -> str:
    """Valida formato de DNI peruano. Retorna el str si OK, raise si no."""
    if not isinstance(dni, str):
        raise InvalidDNIError("DNI debe ser str")
    if not DNI_PATTERN.match(dni):
        raise InvalidDNIError("DNI debe ser 8 dígitos numéricos")
    return dni


def citizen_id(dni: str, name: str, public_salt: str) -> bytes:
    """Calcula citizenId on-chain.

    Returns: 32 bytes (bytes32 en Solidity).

    Nota: el DNI se descarta apenas vuelve esta función — no se persiste
    en ningún lado. El caller es responsable de no loguear el `dni` que pasó.
    """
    validate_dni(dni)
    normalized = normalize_name(name)
    if not public_salt:
        raise ValueError("public_salt no puede estar vacío")
    payload = f"{dni}|{normalized}|{public_salt}".encode("utf-8")
    return keccak(payload)


def citizen_id_hex(dni: str, name: str, public_salt: str) -> str:
    """Misma operación, retorna `0x…` hex string para usar con web3.py."""
    return "0x" + citizen_id(dni, name, public_salt).hex()
```

### 2. Verificar consistencia con Solidity
Solidity hace internamente:
```solidity
keccak256(abi.encodePacked(dni, "|", normalizedName, "|", salt))
```

PERO desde **Python pasamos el hash precomputado** al contrato (la firma de `CitizenRegistry.register` es `(bytes32 id, string name)`, NO calcula el hash en Solidity). Así que **la consistencia se garantiza** porque Solidity solo guarda el hash que nosotros le pasamos.

Para que la API y el contrato coincidan, los dos deben usar exactamente el mismo `PUBLIC_SALT`. Por eso lo tenemos en `agents/.env` y `blockchain/.env` con el mismo default.

### 3. Test sanity manual
```bash
cd agents
python -c "
from api.services.citizen_hash import citizen_id_hex, normalize_name
print(normalize_name('José  María   Núñez'))
print(citizen_id_hex('12345678', 'José María Núñez', 'ssc-antipereza-2026-publico'))
"
```

Esperado:
```
JOSE MARIA NUNEZ
0xa1b2c3d4...
```

(El hash exacto será deterministico — anotalo para verificar con Solidity en B-012).

### 4. Privacidad: NO loguear el DNI
Buscar en tu propio código que **nunca** hay un `print(dni)` ni `logger.info(f"… {dni}")`. La función no debe imprimir nada.

### 5. Commit
```bash
git add agents/api/services/citizen_hash.py
git commit -m "feat(agents): helper citizen_hash con normalización Unicode (A-003)"
```

## Verificación / Definition of Done

Los tests de [A-004](./A-004-tests-citizen-hash.md) cubren:
- ✅ Hash es determinístico para mismas entradas.
- ✅ `JOSÉ MARÍA` y `Jose Maria` producen el mismo hash.
- ✅ Rechaza DNI con letras o longitud ≠ 8.
- ✅ Rechaza nombre vacío o > 120 chars.
- ✅ Hash coincide con cálculo manual (vector de prueba).

```bash
cd agents
python -m pytest tests/test_citizen_hash.py -v
```

## Errores comunes

- **`ImportError: cannot import name 'keccak' from 'eth_utils'`**
  La API cambió en `eth-utils 4.x`. Sigue siendo `from eth_utils import keccak`. Verificá la versión.

- **Hash distinto entre dev y prod**
  Probable: el `PUBLIC_SALT` está en otro valor en otro entorno. Confirmá `.env` en blockchain y agents.

- **Nombres con apóstrofes o guiones fallan**
  Decisión: en Sprint 1 rechazamos. Para Sprint 2, decidir si "D'Onofrio" y "Sánchez-Cerro" son válidos. Si sí, ajustar el `all(c.isalpha() or c == " ")` para incluir `'` y `-`.

- **DNI con espacios al inicio o fin**
  La función NO los limpia (puede ser bug en frontend). Si quieren, agregar `dni.strip()` al inicio de `validate_dni`. Discutirlo con Tatiana antes.

## Lecturas
- [eth-utils — keccak](https://eth-utils.readthedocs.io/en/stable/utilities.html#eth_utils.keccak)
- [Unicode normalization NFKD](https://www.unicode.org/reports/tr15/)
- [`docs/security/threat-model-sprint1.md` § T2, T4](../../docs/security/threat-model-sprint1.md)

## Notas para revisor
- ⚠️ Confirmar que la función NUNCA loguea/imprime el `dni`.
- Probar el round-trip con el contrato: hash en Python → `register` en Solidity → `isRegistered(id)` debe ser true.
- Verificar que el salt es leído del settings, no hardcoded en strings.
