---
id: A-005
title: "models/auth.py — RegisterRequest, AuthStatus, RegisterResponse"
owner: "junior"
backup: "Sandro"
effort: "45 min"
priority: P0
status: pending
depends_on: [A-001]
sprint: 1
layer: agents
---

# A-005 · Modelo `auth.py`

## Por qué importa
Los modelos Pydantic son **el contrato HTTP** de la API. Si los modelos están bien, FastAPI genera schemas OpenAPI automáticos, valida inputs antes de tocar la lógica, y los frontends/SDKs pueden consumir la API con tipos.

Los modelos de auth son especialmente sensibles porque la `RegisterRequest` **incluye DNI**. Tenemos que asegurar que ese DNI:

- Se valida con regex (no caracteres raros).
- Nunca aparece en una `Response`.
- No se serializa accidentalmente en logs.

## Conceptos clave
- **`BaseModel` Pydantic v2**: valida en construcción, autodocumenta.
- **`Field`**: agrega metadata (descripción, ejemplos, regex, min/max length).
- **`model_config = ConfigDict(extra="forbid")`**: rechazar campos extras (defensa contra body inflado).
- **Response models distintos a Request models**: nunca devolver el mismo objeto que entró, especialmente con PII.

## Pre-requisitos
- [ ] [A-001](./A-001-setup-pyproject.md) cerrada.

## Paso a paso

### 1. Crear `api/models/auth.py`
```python
"""Schemas de auth (registro y verificación de ciudadanos).

Diseño:
- `RegisterRequest` contiene DNI (sensible) — solo se usa en la entrada del POST.
- `RegisterResponse` NUNCA expone DNI.
- `AuthStatus` para el GET de status — solo lee el hash, ya no toca DNI.
"""
from __future__ import annotations

from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field


class RegisterRequest(BaseModel):
    """Body del POST /auth/register.

    NUNCA loguear instancias de este modelo. El DNI es PII y debe
    descartarse apenas se calcula el hash.
    """
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    dni: Annotated[str, Field(
        pattern=r"^\d{8}$",
        description="DNI peruano (8 dígitos numéricos). NO se persiste.",
        examples=["12345678"],
    )]
    full_name: Annotated[str, Field(
        min_length=5,
        max_length=120,
        description="Nombre completo. Se normaliza UPPER sin tildes antes de hashear.",
        examples=["Juan Pérez"],
    )]


class RegisterResponse(BaseModel):
    """Response del POST /auth/register.

    NO contiene `dni` ni `full_name` original — solo lo derivable post-hash.
    """
    model_config = ConfigDict(extra="forbid")

    citizen_id: Annotated[str, Field(
        pattern=r"^0x[0-9a-fA-F]{64}$",
        description="keccak256(dni||nombre_normalizado||PUBLIC_SALT) en hex",
    )]
    normalized_name: Annotated[str, Field(
        max_length=120,
        description="Nombre tal como quedó on-chain (UPPER, sin tildes)",
    )]
    tx_hash: Annotated[str, Field(
        pattern=r"^0x[0-9a-fA-F]{64}$",
        description="Tx hash de la transacción register en zkTanenbaum",
    )]
    explorer_url: Annotated[str, Field(
        description="URL al explorer (para mostrar al ciudadano)",
        examples=["https://explorer-zk.tanenbaum.io/tx/0x..."],
    )]
    block_number: int = Field(ge=0)


class AuthStatusResponse(BaseModel):
    """Response del GET /auth/status/{citizen_id}.

    Solo opera sobre el hash. Sin PII.
    """
    model_config = ConfigDict(extra="forbid")

    citizen_id: Annotated[str, Field(pattern=r"^0x[0-9a-fA-F]{64}$")]
    is_registered: bool
    registered_at: int | None = Field(
        default=None,
        description="Block timestamp si está registrado; null si no.",
    )


class RegisterErrorResponse(BaseModel):
    """Schema de error para el POST /auth/register.

    Diseñado para NO incluir el DNI que el usuario envió.
    """
    model_config = ConfigDict(extra="forbid")

    code: Annotated[str, Field(
        pattern=r"^[A-Z_]+$",
        examples=["INVALID_DNI", "ALREADY_REGISTERED", "BLOCKCHAIN_ERROR"],
    )]
    message: str = Field(max_length=300)
```

### 2. Patrones de uso (para que el junior tenga ejemplos)

**En una ruta FastAPI:**
```python
from fastapi import APIRouter, HTTPException
from api.models.auth import RegisterRequest, RegisterResponse

router = APIRouter()

@router.post("/auth/register", response_model=RegisterResponse)
async def register(body: RegisterRequest) -> RegisterResponse:
    # Validación HTTP automática ya pasó. body.dni y body.full_name son válidos.
    ...
```

**Validar manual:**
```python
>>> RegisterRequest(dni="12345678", full_name="Juan Pérez")
RegisterRequest(dni='12345678', full_name='Juan Pérez')

>>> RegisterRequest(dni="123", full_name="Juan")  # ValidationError
```

### 3. Test rápido
Crear `tests/test_models_auth.py`:

```python
import pytest
from pydantic import ValidationError

from api.models.auth import RegisterRequest, RegisterResponse, AuthStatusResponse


def test_register_request_happy():
    r = RegisterRequest(dni="12345678", full_name="Juan Pérez")
    assert r.dni == "12345678"
    assert r.full_name == "Juan Pérez"


@pytest.mark.parametrize("dni", ["", "1234567", "abc12345", "123456789"])
def test_register_request_dni_invalido(dni):
    with pytest.raises(ValidationError):
        RegisterRequest(dni=dni, full_name="Juan Pérez")


def test_register_request_rechaza_campo_extra():
    with pytest.raises(ValidationError):
        RegisterRequest(dni="12345678", full_name="Juan Pérez", malicious="payload")


def test_register_response_requiere_hex():
    with pytest.raises(ValidationError):
        RegisterResponse(
            citizen_id="not-hex",
            normalized_name="JUAN",
            tx_hash="0x" + "a" * 64,
            explorer_url="https://x",
            block_number=1,
        )


def test_auth_status_response():
    s = AuthStatusResponse(citizen_id="0x" + "1" * 64, is_registered=True, registered_at=1700000000)
    assert s.is_registered
```

```bash
pytest tests/test_models_auth.py -v
```

### 4. Commit
```bash
git add agents/api/models/auth.py agents/tests/test_models_auth.py
git commit -m "feat(agents): modelos Pydantic auth (RegisterRequest/Response) (A-005)"
```

## Verificación / Definition of Done

```bash
pytest tests/test_models_auth.py -v
mypy api/models/auth.py
```

- ✅ Todos los tests pasan.
- ✅ Mypy sin errores.
- ✅ `extra="forbid"` en todos los models (rechaza payloads inflados).
- ✅ `RegisterResponse` no contiene `dni` ni `full_name` original.

## Errores comunes

- **`pattern` no funciona en Pydantic v2**
  En v2 es `pattern=r"..."` dentro de `Field`. NO confundir con v1 (`regex=`).

- **`Annotated[str, Field(...)]` no aparece en docs**
  Si usás `dni: str = Field(...)` directo, también funciona. Mantenemos `Annotated` por consistencia con FastAPI moderno.

- **`extra="ignore"` por accidente**
  Si alguien lo cambia, el body puede crecer con campos arbitrarios. **Mantener `forbid`** salvo discusión explícita.

## Lecturas
- [Pydantic v2 — Fields](https://docs.pydantic.dev/latest/concepts/fields/)
- [FastAPI — Path/Body params](https://fastapi.tiangolo.com/tutorial/body/)
- [`docs/security/threat-model-sprint1.md` § T2](../../docs/security/threat-model-sprint1.md)

## Notas para revisor
- Confirmar que NINGUNA `Response` incluye `dni`. Hacé un grep: `grep -i "dni" api/models/auth.py | grep -i "response"`.
- Validar que `explorer_url` se valide como URL válida (Sprint 2: usar `HttpUrl` de Pydantic; Sprint 1 con string OK).
- Considerar usar `EmailStr`/`HttpUrl` en Sprint 2 para mejor validación.
