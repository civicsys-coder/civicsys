# ADR-002 — Anclaje L1 de integridad de reportes

**Fecha**: 2026-05-23
**Estado**: ACEPTADO (Sprint 02 = HMAC; Sprint 03+ = AuditLog.sol)
**Decisor**: Orlando
**Input**: DA-2 del plan estratégico

## Contexto

Tatiana (HC-05) advierte que los reportes generados por Hermes podrían quedar en filesystem sin firma criptográfica. Un atacante con acceso al filesystem (VPS comprometido) podría alterar el reporte sin huella, manipulando el registro histórico de deliberaciones.

Estado del código Mayo 2026: `Reporter.render()` retorna `ReportOutput` in-memory. No persiste todavía. El gap se cierra antes de que la persistencia se introduzca.

## Opciones evaluadas

### A. Solo HMAC off-chain (RECOMENDADA Sprint 02)

- Al persistir `sessions/proposal_N.json`, computar HMAC-SHA256 con `MEMORY_INTEGRITY_KEY`.
- Guardar MAC en archivo paralelo `sessions/proposal_N.json.hmac`.
- Al leer el reporte (servir API, cargar memoria), verificar HMAC; si falla, no servir + alertar.
- `MEMORY_INTEGRITY_KEY` en `.env` local (no commiteado).

### B. AuditLog.sol on-chain

- Contrato simple en zkTanenbaum: `logReport(bytes32 hash, uint256 proposalId, uint256 timestamp) external`.
- Hermes invoca tras render con wallet del **operador** (no signer custodial — debe ser explícito).
- Verificación: `keccak256(file)` vs evento `ReportLogged(proposalId, hash, timestamp)` en explorer.

### C. Híbrido (Sprint 03+)

- HMAC inmediato (cubre filesystem) + AuditLog opcional cuando exista publisher.
- Mejor cobertura: HMAC detecta atacante externo con shell access; AuditLog detecta colusión del operador.

## Decisión

**Opción A para Sprint 02**. **Opción C como plan Sprint 03** condicional a introducción de wallet operador.

## Justificación

1. **HMAC cierra el vector descrito por Tatiana en HC-05**: "atacante con acceso al filesystem". HMAC detecta cualquier mutación con clave en env separado del filesystem.

2. **AuditLog.sol requiere un signer** — y el plan estratégico explícitamente difiere la introducción de signers en Sprint 02 (`docs/plans/estrategia/.../04-mitigaciones-y-deuda-aceptada.md` D-01). Si introducimos signer en Sprint 02 para AuditLog, abrimos vector HC-02 que el mismo plan ataca por separado.

3. **AuditLog opcional NO bloquea HMAC**: en Sprint 03+ podemos sumar el `AuditLog.sol` sin cambiar la API de persistencia (sólo agregamos un paso post-write).

## Consecuencias

### Positivas

- HC-05 cerrado a nivel "atacante externo con filesystem".
- Cero overhead on-chain Sprint 02.
- Diseño futuro de AuditLog ya pensado (no se rehace).

### Negativas

- Si el operador del VPS quiere alterar reportes y rota la clave HMAC consistentemente, HMAC no detecta. Cobertura del vector "colusión interna" queda en AuditLog futuro.
- Una clave adicional para gestionar en operación.

## Diseño técnico (HMAC, Sprint 02)

### Módulo `agents/app/security.py` (nuevo)

```python
import hmac, hashlib, secrets

def compute_hmac(content: bytes, key: bytes) -> str:
    """Returns hex-encoded HMAC-SHA256."""
    return hmac.new(key, content, hashlib.sha256).hexdigest()

def verify_hmac(content: bytes, expected_hex: str, key: bytes) -> bool:
    """Constant-time compare to avoid timing attacks."""
    computed = compute_hmac(content, key)
    return hmac.compare_digest(computed, expected_hex)
```

### Settings

```python
class Settings(BaseSettings):
    ...
    memory_integrity_key: SecretStr  # required, hex string ≥ 64 chars
```

### Persistencia

```python
class Reporter:
    def persist(self, output: ReportOutput, path: Path, key: bytes):
        path.write_text(json.dumps(output.to_dict(), indent=2), encoding="utf-8")
        mac = compute_hmac(path.read_bytes(), key)
        path.with_suffix(path.suffix + ".hmac").write_text(mac, encoding="utf-8")

    def load(self, path: Path, key: bytes) -> ReportOutput:
        content = path.read_bytes()
        mac_expected = path.with_suffix(path.suffix + ".hmac").read_text().strip()
        if not verify_hmac(content, mac_expected, key):
            raise IntegrityError(f"HMAC verification failed for {path}")
        return ReportOutput.from_dict(json.loads(content))
```

### Tests obligatorios

- `test_compute_and_verify_hmac_roundtrip`
- `test_verify_hmac_detects_mutation` (alterar 1 byte → falla)
- `test_verify_hmac_detects_wrong_key`
- `test_persist_writes_both_files`
- `test_load_raises_on_missing_hmac_file`

### Doc

- `docs/security/runbook-rotacion-hmac-key.md`: cuándo y cómo rotar la clave.

## Diseño futuro (AuditLog.sol, Sprint 03+)

### Contrato (boceto)

```solidity
contract AuditLog {
    event ReportLogged(uint256 indexed proposalId, bytes32 reportHash, uint256 timestamp);

    function logReport(uint256 proposalId, bytes32 reportHash) external {
        emit ReportLogged(proposalId, reportHash, block.timestamp);
    }
}
```

Sin `onlyOwner`: cualquiera puede llamar (transparencia). El consumidor verifica que la wallet emisora coincide con la del operador conocido (publicada en CLAUDE.md o `docs/security/`).

### Operador como signer

- Wallet conocida públicamente del operador de Hermes (no signer custodial — es un EOA del operador humano del VPS).
- Llamar `logReport` requiere tx con gas — el operador paga TSYS testnet.
- En código: invocar via viem o web3.py al deploy address de `AuditLog.sol`.

## Referencias

- Documento Tatiana: HC-05, AI-MI-03, AI-MI-04.
- NIST SP 800-53 AU-9 (Protection of Audit Information), SI-7 (Software, Firmware, and Information Integrity).
- ISO/IEC 27001:2022 A.8.17 (Clock synchronization), A.8.34 (Protection of information systems during audit testing).

## Cuándo revisar este ADR

- Cuando se introduzca persistencia real de reportes en Sprint 02 o 03 (verificar que HMAC está en el código desde el día 1).
- Cuando se introduzca wallet operador para servicios de Hermes (entonces activar AuditLog.sol).
