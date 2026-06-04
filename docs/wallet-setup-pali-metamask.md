# Instalar tu wallet para CivicSys (Pali o MetaMask)

Para registrarte y votar necesitás una **wallet de cripto** (una extensión del navegador).
Es gratis y toma ~3 minutos. Sirve cualquiera de las dos: **Pali Wallet** (la wallet
oficial de Syscoin) o **MetaMask** (la más conocida). Elegí UNA.

> 🔒 **Regla de oro de seguridad:** tu **frase de recuperación** (12/24 palabras) y tu
> **clave privada** son SOLO tuyas. **Nadie** legítimo te las va a pedir — ni CivicSys, ni
> Hermes, ni un bot de Discord, ni un "soporte". Si alguien te las pide, es una estafa.
> Anotá la frase en papel, nunca la pegues en un chat ni en una web.

---

## Datos de la red (los vas a necesitar)

**zkSYS Testnet (zkTanenbaum)** — la red de prueba del hackathon:

| Campo | Valor |
|---|---|
| Nombre | `zkSYS Testnet (zkTanenbaum)` |
| RPC URL | `https://rpc-zk.tanenbaum.io` |
| Chain ID | `57057` |
| Símbolo | `TSYS` |
| Explorador | `https://explorer-zk.tanenbaum.io` |

> Para la demo local (sin testnet) se usa **Anvil**: RPC `http://localhost:8545`, Chain ID `31337`, símbolo `ETH`.

---

## Opción A — MetaMask (recomendada si nunca usaste cripto)

1. Entrá a <https://metamask.io/download> → **Install MetaMask for Chrome** (o tu navegador).
   *Verificá que el sitio sea `metamask.io`* (hay extensiones falsas).
2. Abrí la extensión → **Crear una billetera nueva** → poné una contraseña.
3. **Guardá tu frase de recuperación** (12 palabras) en papel. Confirmala. **No la compartas jamás.**
4. Agregá la red zkSYS:
   - MetaMask → menú de redes (arriba a la izquierda) → **Agregar red** → **Agregar red manualmente**.
   - Completá con los datos de la tabla de arriba (RPC, Chain ID 57057, símbolo TSYS, explorador) → **Guardar**.
5. Conseguí gas de prueba: andá a <https://faucet-zk.tanenbaum.io/>, pegá tu address (la copiás desde MetaMask) y pedí TSYS.
6. Listo: entrá a CivicSys → **Conectar wallet** → elegí MetaMask → aprobá.

## Opción B — Pali Wallet (wallet nativa de Syscoin)

1. Entrá a <https://paliwallet.com> → instalá la extensión (Chrome/Brave/Edge).
2. Abrí Pali → **Create new wallet** → contraseña → **guardá la frase de recuperación** en papel.
3. Pali maneja dos modos: **UTXO** (Syscoin clásico) y **NEVM/EVM**. Para CivicSys (zkSYS EVM) usá el modo **EVM**.
4. Agregá / seleccioná la red **zkSYS Testnet (zkTanenbaum)** con los datos de la tabla (Chain ID 57057, RPC `https://rpc-zk.tanenbaum.io`).
5. Pedí gas en <https://faucet-zk.tanenbaum.io/> con tu address.
6. Entrá a CivicSys → **Conectar wallet** → Pali → aprobá.

---

## ¿Y la wallet "no-custodial" de la Cédula?

En el **registro de la Cédula Cívica** (`/registro`), CivicSys **genera una wallet aparte
en tu navegador** y la **cifra con una contraseña tuya** (la clave privada se queda en tu
dispositivo, cifrada — el servidor nunca la ve). Esa es tu identidad cívica.

MetaMask/Pali la usás para **firmar transacciones** (votar, mintear). Son cosas
complementarias: una wallet para firmar, la Cédula para identidad soberana.

---

## Problemas comunes

| Síntoma | Fix |
|---|---|
| "Wrong network" en CivicSys | Cambiá la red de la wallet a zkSYS Testnet (Chain ID 57057) — o Anvil 31337 en local |
| No tengo gas / la tx falla | Pedí TSYS en el faucet `faucet-zk.tanenbaum.io` |
| No aparece el botón conectar | Refrescá la página después de instalar la extensión |
| Me piden mi frase/clave | 🚨 **ESTAFA.** Nadie legítimo la pide. No la des. |
