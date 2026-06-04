# 🏛️ CivicSys — Guía de uso (para el equipo)

**CivicSys** es una **cámara cívica digital** sobre la blockchain **Syscoin / zkTanenbaum**:
la **IA asesora**, el **ciudadano supervisa y vota**, y el **blockchain firma**. Tiene
**dos bots de Discord** y una **web pública**.

---

## 🔗 Todo lo que necesitás

| Recurso | Link |
|---|---|
| 🌐 **Web** | https://civicsys.vercel.app |
| 🏛️ **Bot CivicSys** (invitar al server) | `https://discord.com/oauth2/authorize?client_id=1511974349689716836&scope=bot+applications.commands&permissions=83968` |
| 🔥 **Bot La Tóxica** (invitar al server) | `https://discord.com/oauth2/authorize?client_id=1511982329038635170&scope=bot+applications.commands&permissions=83968` |
| 💧 **Faucet** (gas de prueba TSYS) | https://faucet-zk.tanenbaum.io/ |
| 📚 **Docs de Syscoin** | https://docs.syscoin.org |

**Red blockchain:** zkSYS Testnet (zkTanenbaum) · Chain ID **57057** · RPC `https://rpc-zk.tanenbaum.io` · símbolo **TSYS**.

> Para meter un bot a un server necesitás permiso de **«Administrar servidor»**. En tu
> propio server podés agregarlo vos; en el de **Syscoin/AI Playground** lo tiene que
> autorizar un **organizador/admin** (pasale la URL de invitación).

---

## 1) 🤖 Los dos bots de Discord

> Los comandos funcionan de **3 formas**: **slash** (`/concilio`), **prefijo** (`!concilio`)
> y **@mención**. Si los `/` todavía no aparecen, usá `!` (funciona al instante).

### 🏛️ CivicSys (Hermes) — participación ciudadana

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `/ayuda` | Lista de comandos | `!ayuda` |
| `/propuestas` | Las propuestas activas y cómo va la votación | `!propuestas` |
| `/concilio <id>` | ⭐ **El Concilio**: 4 consejeros IA con miradas opuestas (Ejecutor, Garantista, Escéptico, Primeros Principios) debaten la propuesta y dan un **veredicto con disenso** | `!concilio 1` |
| `/preguntar <texto>` | Le preguntás lo que quieras a Hermes | `!preguntar ¿cuál tiene más apoyo?` |
| `/votar <id>` | Te da el link para **votar** (firmás con tu wallet, on-chain) | `!votar 1` |
| `/registrarse` | Te explica cómo sacar tu **Cédula Cívica** (registro seguro en la web) | `!registrarse` |
| **@mención** | Charlás libre con Hermes | `@CivicSys ¿qué opinás de la propuesta 2?` |

### 🔥 La Tóxica — accountability (senado vs pueblo)

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `/ayuda` | Qué hace La Tóxica | `!ayuda` |
| `/toxica <id>` | **Reporte de rendición de cuentas**: compara cómo votó el **senado** vs el **pueblo** y marca la brecha (es un **borrador**, lo aprueba un humano antes de publicar) | `!toxica 1` |
| `/brecha <id>` | Solo el resumen de la brecha | `!brecha 1` |

> ⏳ El Concilio tarda ~15–30 s (consulta a la IA varias veces). El bot muestra «pensando…».

---

## 2) 🌐 La web — https://civicsys.vercel.app

| Página | Para qué sirve |
|---|---|
| **Inicio** | Presentación + accesos a todo |
| **Conectar wallet** (arriba a la derecha) | Conectás MetaMask o Pali (ver §3) |
| **/registro** | Sacás tu **Cédula Cívica**: DNI (se hashea en TU navegador), rostro, wallet no-custodial y minteás tu identidad. **Tu DNI y tu clave nunca salen de tu dispositivo.** |
| **/votacion** | Votás **Sí / No / Abstención** — anónimo (nullifier), sin doble voto |
| **/hermes** | Consola del agente Hermes + convocar al Concilio |
| **/sistema** | Estado del «enjambre» (los 4 consejeros) |
| **/toxica** | La Tóxica, versión web |
| **/dashboard** | Reportes de Hermes (se generan cuando una propuesta cierra) |

---

## 3) 👛 Antes de empezar: instalá tu wallet

Necesitás **MetaMask** o **Pali Wallet** (extensión del navegador, gratis):

1. **MetaMask**: https://metamask.io/download · o **Pali**: https://paliwallet.com
2. Creá la wallet y **guardá tu frase de recuperación EN PAPEL** (no la compartas con NADIE).
3. Agregá la red **zkSYS Testnet**: RPC `https://rpc-zk.tanenbaum.io` · Chain ID `57057` · símbolo `TSYS`.
4. Pedí gas de prueba en el **faucet**: https://faucet-zk.tanenbaum.io/ (pegás tu address).

> Guía detallada paso a paso: `docs/wallet-setup-pali-metamask.md`.

---

## 4) 🚀 Flujo completo (paso a paso)

1. **Instalá la wallet** + agregá la red zkTanenbaum + pedí gas en el faucet (§3).
2. Entrá a **https://civicsys.vercel.app** → **Conectar wallet**.
3. **/registro** → sacá tu **Cédula Cívica** (DNI + rostro + wallet, todo en tu navegador).
4. **Votá** una propuesta en **/votacion** (o desde Discord: `!votar 1` → te da el link).
5. Pedile el análisis a Hermes: en Discord **`!concilio 1`** → ves el debate de los 4 consejeros + veredicto.
6. Mirá la **accountability**: **`!toxica 1`** → La Tóxica compara senado vs pueblo.

---

## 5) 🔒 Seguridad (¡leelo!)

- **NUNCA** compartas tu **frase de recuperación**, **clave privada** ni **DNI** por chat/DM.
  Ni a un bot, ni a «soporte», ni a nadie.
- Ningún bot ni la web legítima te los pide. El registro de DNI/wallet es **solo en la web, en tu navegador**.
- El voto es **anónimo** (un *nullifier* evita el doble voto sin revelar quién sos) y
  **no-custodial** (firmás vos con tu wallet; el sistema nunca ve tu clave).

---

## 6) ❓ Problemas comunes

| Síntoma | Solución |
|---|---|
| El bot no responde | Esperá unos segundos (el Concilio tarda ~20 s). Si sigue, avisá al equipo. |
| No aparecen los comandos `/` | Usá el prefijo `!` (ej. `!concilio 1`) o esperá ~1 h al sync de Discord |
| «Wrong network» en la web | Cambiá la wallet a **zkSYS Testnet (Chain 57057)** |
| La transacción falla / no tengo gas | Pedí **TSYS** en el faucet |
| Me piden mi frase o clave privada | 🚨 **ES ESTAFA.** No la des nunca. |

---

## 7) 🎤 Guion sugerido para la presentación

1. `!propuestas` → muestra las propuestas y los votos.
2. **`!concilio 1`** → ⭐ los 4 consejeros IA debaten con **IA real** y Hermes sintetiza un veredicto **con disenso registrado**.
3. **`!toxica 1`** → La Tóxica: **senado vs pueblo** + la brecha.
4. `@CivicSys ¿…?` → chat libre con el agente.
5. Web: mostrá **/registro** (identidad no-custodial) y **/votacion** (voto anónimo on-chain).

---

*CivicSys · SSC ANTIPEREZA · Hackathon Syscoin 2026 · $SYS es el camino 🚀*
