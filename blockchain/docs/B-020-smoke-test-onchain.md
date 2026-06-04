---
id: B-020
title: "Smoke test on-chain manual con cast + console"
owner: "Gabriel"
backup: "Orlando"
effort: "1 h"
priority: P0
status: pending
depends_on: [B-019]
sprint: 1
layer: blockchain
---

# B-020 · Smoke test on-chain

## Por qué importa
Los unit tests pasaron en hardhat local. El E2E pasó en hardhat local. Pero **zkTanenbaum no es hardhat**: el sealing es distinto, el gas pricing es distinto, las race conditions son reales. Antes del demo del Día 7 corremos un smoke test sobre la red real para descubrir sorpresas en frío en lugar de en vivo frente al jurado.

## Conceptos clave
- **Smoke test**: serie corta de operaciones que validan que el sistema "no echa humo". No es exhaustivo: confirma que las funciones básicas responden.
- **`cast`**: CLI de Foundry, muy útil para llamar funciones rápido. Si no lo tenés, podés hacer todo desde `npx hardhat console`.
- **Reproducibilidad**: cada paso se documenta con el `tx_hash` para que la auditoría sea trivial.

## Pre-requisitos
- [ ] [B-019](./B-019-deploy-zktanenbaum.md) cerrada — direcciones en `deployments/zkTanenbaum.json`.
- [ ] Tener ≥ 0.5 TSYS en el deployer.
- [ ] (Opcional) `foundry-rs/cast` instalado. Alternativa: usar `npx hardhat console`.

## Paso a paso

### 1. Cargar contexto
```bash
cd blockchain
cat deployments/zkTanenbaum.json
```

Anotar `CitizenRegistry.address` (= `$REG`) y `Vote.address` (= `$VOTE`).

### 2. Ping al RPC
```bash
curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
  https://rpc-zk.tanenbaum.io
```

Esperado:
```json
{"jsonrpc":"2.0","id":1,"result":"0xdee1"}
```

Donde `0xdee1` = `57057`.

### 3. Sanity de los contratos
```bash
# CitizenRegistry — total ciudadanos (debe ser 0 en deploy fresco)
cast call $REG "totalCitizens()(uint256)" --rpc-url https://rpc-zk.tanenbaum.io

# Vote — registry (debe ser $REG)
cast call $VOTE "registry()(address)" --rpc-url https://rpc-zk.tanenbaum.io
```

### 4. Registro de un ciudadano de prueba
Usar el hash de un DNI ficticio (`12345678 | JUAN PEREZ | salt`):

```bash
node -e "const {ethers}=require('ethers'); console.log(ethers.keccak256(ethers.toUtf8Bytes('12345678|JUAN PEREZ|ssc-antipereza-2026-publico')))"
```

Salida: `0x...` (32 bytes). Anotar como `$ID1`.

```bash
cast send $REG "register(bytes32,string)" $ID1 "JUAN PEREZ" \
  --rpc-url https://rpc-zk.tanenbaum.io \
  --private-key $DEPLOYER_PRIVATE_KEY
```

Anotar el `tx_hash` del output. Verificar:
```bash
cast tx $TX_HASH_REGISTER --rpc-url https://rpc-zk.tanenbaum.io
```

### 5. Crear una propuesta
```bash
# deadline = now + 1 hour
DEADLINE=$(( $(date +%s) + 3600 ))

cast send $VOTE "createProposal(string,string,string[],uint64)" \
  "Smoke test on-chain" \
  "Propuesta de prueba post-deploy" \
  "[A favor,En contra]" \
  $DEADLINE \
  --rpc-url https://rpc-zk.tanenbaum.io \
  --private-key $DEPLOYER_PRIVATE_KEY
```

> **Nota Windows / PowerShell**: la sintaxis del array en cast puede tener problemas. Si falla, usar `npx hardhat console --network zkTanenbaum` y hacer `vote.createProposal(...)` desde TypeScript.

Anotar `tx_hash` y el `proposal_id` (lee con `cast call $VOTE "totalProposals()(uint256)"`).

### 6. Votar
```bash
cast send $VOTE "castVote(uint256,bytes32,uint8)" 1 $ID1 0 \
  --rpc-url https://rpc-zk.tanenbaum.io \
  --private-key $DEPLOYER_PRIVATE_KEY
```

### 7. Leer tally
```bash
cast call $VOTE "tally(uint256)(uint256[])" 1 --rpc-url https://rpc-zk.tanenbaum.io
```

Esperado: `[1, 0]`.

### 8. Cerrar propuesta
```bash
cast send $VOTE "closeProposal(uint256)" 1 \
  --rpc-url https://rpc-zk.tanenbaum.io \
  --private-key $DEPLOYER_PRIVATE_KEY
```

### 9. Verificar evento `ProposalClosed`
```bash
cast logs --address $VOTE \
  --from-block latest \
  --topic-0 $(cast keccak "ProposalClosed(uint256,uint256[],uint64)") \
  --rpc-url https://rpc-zk.tanenbaum.io | head
```

Esperado: 1 log con el topic correcto.

### 10. Documentar resultados
Crear `docs/sprints/SMOKE_TEST_ZKTANENBAUM.md`:

```markdown
# Smoke test post-deploy — zkTanenbaum

Fecha: 2026-05-19
Operador: Gabriel

| Paso | tx_hash | Resultado |
|------|---------|-----------|
| register JUAN PEREZ | 0x... | ✓ |
| createProposal | 0x... | proposalId=1 |
| castVote(1, ID1, 0) | 0x... | tally=[1,0] |
| closeProposal(1) | 0x... | evento ProposalClosed emitido |

Estado: ✅ Aprobado — listo para demo.
```

### 11. Commit
```bash
git add docs/sprints/SMOKE_TEST_ZKTANENBAUM.md
git commit -m "docs: smoke test post-deploy zkTanenbaum (B-020)"
```

## Verificación / Definition of Done

- ✅ Los 4 tx_hashes anotados.
- ✅ tally final = `[1, 0]`.
- ✅ Evento `ProposalClosed` visible en logs.
- ✅ Documento `SMOKE_TEST_ZKTANENBAUM.md` en repo.

## Errores comunes

- **`cast send` falla con `transaction underpriced`**
  Subir `gasPrice` explícito: `--gas-price 2gwei`.

- **`Error: insufficient funds`**
  Balance se agotó. Volver al faucet.

- **El array en `createProposal` no encodea**
  Sintaxis cast: `'["A","B"]'` puede confundir el shell. Mejor usar hardhat console.

- **El event `ProposalClosed` no aparece**
  Probablemente `closeProposal` revirtió. Confirmá con `cast receipt $TX_HASH_CLOSE`.

## Lecturas
- [Foundry — `cast`](https://book.getfoundry.sh/cast/)
- [Hardhat console](https://hardhat.org/hardhat-runner/docs/guides/hardhat-console)

## Notas para revisor
- ¿Cada `tx_hash` se anotó? Si no, no se puede auditar.
- Cancelar si zkTanenbaum está degradado — mejor admitir y postergar que demo en blanco.
- En el demo final, este flujo se replica desde la API (Sandro) en lugar de cast.
