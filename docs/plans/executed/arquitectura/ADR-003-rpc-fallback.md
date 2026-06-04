# ADR-003 — Estrategia RPC fallback

**Fecha**: 2026-05-23
**Estado**: ACEPTADO (Sprint 02 = failover simple; Sprint 03+ = cross-validation)
**Decisor**: Orlando
**Input**: DA-3 del plan estratégico

## Contexto

Tatiana (AI-BC-01) advierte que un único `RPC_URL` (`https://rpc-zk.tanenbaum.io`) bajo control del operador de la testnet representa un punto único de falla y de manipulación. Si ese RPC devuelve datos falsos (tally incorrecto, logs manipulados), Hermes opera sobre realidad fabricada.

El `blockchain/.env.example` ya declara `RPC_FALLBACK=` (placeholder vacío) — la previsión arquitectural está. Falta implementación.

## Opciones evaluadas

### A. Failover simple (RECOMENDADA Sprint 02)

- Primary → si timeout o respuesta 5xx, retry una vez en fallback.
- Si fallback también falla, error claro al cliente.
- No compara respuestas: confiar en quien responda primero.

### B. Validación cruzada completa

- Para cada query crítica (tally, isRegistered, ProposalClosed event), consultar ambos RPCs.
- Si difieren, alertar y abortar la operación.
- Para queries no críticas (chain_id, block_number), seguir con primary.

### C. Híbrido (Sprint 03+)

- Failover (Opción A) para lecturas no críticas.
- Cross-validation (Opción B) para tally + isRegistered + events de cierre.

## Decisión

**Opción A para Sprint 02**. **Opción C como plan Sprint 03**.

## Justificación

1. **Opción A cierra el vector "RPC primary down"**, que es el más probable: testnet operada por terceros tiene downtime esperable.

2. **Opción A NO cierra el vector "RPC primary devuelve datos falsos sin error"** — eso requiere B o C. Pero ese ataque requiere:
   - Operador de la testnet hostil O comprometido (no probable en hackathon controlado).
   - Coordinación entre operadores de primary y fallback (más improbable).
   - Por lo tanto: vector residual aceptado en Sprint 02, documentado en `known-limitations.md`.

3. **Opción C requiere logic de consensus** (qué hacer si difieren? alertar + abortar vs. priorizar uno) — eso es decisión de producto. Sprint 03 cuando se opere en producción con auditoría obligatoria.

## Consecuencias

### Positivas

- AI-BC-01 parcialmente cerrado (cobertura "RPC down": 100%; cobertura "RPC malicioso silencioso": 0%).
- Mejor UX cuando el RPC primary tiene downtime.
- Diseño extensible a Opción C sin refactor mayor.

### Negativas

- El vector "RPC malicioso silencioso" queda abierto en Sprint 02. Documentado.
- Sin alertas si los dos RPCs difieren (porque no se comparan).

## Diseño técnico

### Settings

```python
class Settings(BaseSettings):
    rpc_url: str             # primary
    rpc_fallback: str | None = None
    rpc_timeout_seconds: int = 30
```

### Provider con failover

```python
from web3 import Web3, HTTPProvider
import logging

logger = logging.getLogger(__name__)

def make_rpc_provider(primary: str, fallback: str | None = None, timeout: int = 30) -> Web3:
    """Returns Web3 instance with failover provider."""
    primary_provider = HTTPProvider(primary, request_kwargs={"timeout": timeout})
    w3 = Web3(primary_provider)
    if fallback:
        w3 = _wrap_with_fallback(w3, fallback, timeout)
    return w3

def _wrap_with_fallback(w3: Web3, fallback_url: str, timeout: int) -> Web3:
    """Wraps middleware: si primary tira HTTPError o ConnectionError, reintenta en fallback."""
    # ... (implementation con middleware web3)
```

Alternativa más simple sin middleware:

```python
def call_with_fallback(primary_fn, fallback_fn):
    try:
        return primary_fn()
    except (httpx.TimeoutException, httpx.HTTPStatusError) as e:
        logger.warning("primary rpc failed: %s — trying fallback", e)
        return fallback_fn()
```

(Decisión final del implementador, basada en lo que web3.py 7 soporta natively.)

### Tests obligatorios

- `test_rpc_failover_when_primary_timeout`: respx mockea primary con timeout, fallback responde, assert que el resultado vino del fallback.
- `test_rpc_failover_when_primary_5xx`: idem con HTTP 500.
- `test_rpc_no_fallback_if_primary_ok`: primary responde, fallback no se llama (verify call count = 0).
- `test_rpc_both_fail_raises`: ambos fallan, exception clara.
- `test_rpc_no_fallback_configured`: si `rpc_fallback=None`, falla en primary se propaga sin reintento.

### Doc

- `docs/security/known-limitations.md` documenta que Sprint 02 no detecta RPC malicioso silencioso (sólo RPC down).
- Mensaje en logs cuando se activa el fallback (observability básica).

## Diseño futuro (Sprint 03+)

Para Opción C, agregar:

```python
async def call_critical_with_validation(
    primary_fn, fallback_fn
) -> CriticalCallResult:
    p_result, f_result = await asyncio.gather(primary_fn(), fallback_fn(), return_exceptions=True)
    if isinstance(p_result, Exception) and isinstance(f_result, Exception):
        raise BothRpcsFailed(p_result, f_result)
    if isinstance(p_result, Exception):
        return CriticalCallResult(value=f_result, source="fallback_only")
    if isinstance(f_result, Exception):
        return CriticalCallResult(value=p_result, source="primary_only")
    if p_result != f_result:
        raise RpcDivergence(primary=p_result, fallback=f_result)
    return CriticalCallResult(value=p_result, source="both_agreed")
```

Llamado solo para: `tally()`, `isRegistered()`, `eth_getLogs(ProposalClosed)`.

## Referencias

- Documento Tatiana: AI-BC-01.
- NIST SP 800-53 SC-5(2) (Capacity, Bandwidth, and Redundancy), SI-13 (Predictable Failure Prevention).
- web3.py middleware docs: https://web3py.readthedocs.io/en/stable/middleware.html

## Cuándo revisar este ADR

- Cuando un segundo RPC público de zkTanenbaum esté disponible (configurarlo).
- Antes de deploy a producción (entonces activar Opción C).
