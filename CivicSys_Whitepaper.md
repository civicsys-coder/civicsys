# CivicSys

### SSC ANTIPEREZA — The Citizen Oversight System

**Whitepaper v1.0 · June 2026**

> *AI advises. Citizens oversee. The blockchain signs.*

**Live on Syscoin zkSYS Testnet (zkTanenbaum, Chain ID 57057)** · Web: [civicsys.vercel.app](https://civicsys.vercel.app) · Code: [github.com/civicsys-coder/civicsys](https://github.com/civicsys-coder/civicsys) · Explorer: [explorer-zk.tanenbaum.io](https://explorer-zk.tanenbaum.io)

---

## 1. Abstract

**Mission.** CivicSys is a digital civic chamber where verified citizens deliberate and vote on real legislation, an AI council audits every proposal from deliberately opposing perspectives, and an AI accountability agent — *La Tóxica* — publicly measures the gap between what the people voted and what the legislature actually did. Every accountability report is anchored immutably on Syscoin's zkSYS rollup, so no one — not a congress, not a platform, not us — can quietly rewrite the record.

**The one-line moat:** AI does the cognitive labor of legislative oversight; the blockchain makes the result tamper-proof, timestamped, and Sybil-resistant. We call this **trustless civic intelligence** — and unlike most whitepapers, this one describes a system that is **already deployed and verifiable on-chain today**, with five live contracts, a working AI agent suite, and seven real Peruvian laws loaded with real public-sentiment data.

No speculative token. No vaporware. A working public good, honestly documented — including its current limitations.

---

## 2. Introduction — The Crisis of Representation in the AI Era

Democracy has an asymmetry problem. Between elections, a legislature acts continuously — passing laws, granting amnesties, restructuring pensions — while citizens have no continuous, verifiable channel to respond. The feedback loop that is supposed to discipline representation runs once every five years. Institutions know this. That is why we named the system **Antipereza** — "anti-laziness." Institutional laziness is not a metaphor; it is a rational strategy when nobody can prove, with evidence, that you ignored the people who elected you.

Two technologies have just matured enough to break that asymmetry:

- **Large language models** can now read legislation, weigh arguments from opposing perspectives, detect divergence, and draft accountability reports — continuously, at near-zero marginal cost. The cognitive labor of oversight, historically the bottleneck, is no longer scarce.
- **ZK-rollups anchored to Bitcoin-grade security** (Syscoin's zkSYS) make it economically trivial to give every citizen a non-transferable identity, an anonymous vote, and an immutable public record — without trusting any single server, company, or government.

Either technology alone is insufficient. AI without blockchain produces brilliant analysis that nobody can verify and anybody can censor. Blockchain without AI produces tamper-proof records that nobody has the time to read. **Together they produce something new: oversight that is both intelligent and unfalsifiable.**

**Why now?** Because the cost curves crossed (AI inference and L2 transactions are both effectively free at civic scale), because Syscoin's zkSYS testnet opened to builders in 2026, and because the crisis is no longer abstract: in Peru, congressional disapproval exceeds 90% (IEP/INEI, 2024–2025) while Congress passes laws that polls show majorities reject. The gap is real, measurable — and today, unmeasured.

CivicSys was built in two weeks by a seven-person team for the Syscoin Hackathon (Proof-of-Builders · UCV 2026). It is deployed, it works, and this document describes it as it is.

---

## 3. The Problem

### 3.1 The representation gap

The distance between what people want and what legislators do is the oldest complaint in politics. What is new is that we can now quantify it precisely — and the numbers are stark. Four documented examples from Peru (all real, all sourced, all loaded in CivicSys today):

| Law | What the people said | What Congress did |
|---|---|---|
| **Ley 31988** — Return to bicameralism | **90% rejected it** in the 2018 national referendum; 68% still reject it (IEP, Mar 2024) | Passed it anyway (Mar 2024), without a new referendum |
| **Ley 32419** — Amnesty for military/police (1980–2000 cases) | **61% against** (IEP, Sep 2025) | Passed and promulgated it (2025), defying Inter-American Court precedent |
| **Ley 32123** — Pension reform | **82% reject** a single fund administrator (Ipsos) | Passed it (Jun 2024); street protests later forced a partial rollback |
| **Ley 32330** — Trying 16–17-year-olds as adults | **~58% in favor** (IEP/Ipsos, 2025) | Passed it — and the Constitutional Court struck it down (Dec 2025) |

That last row matters: the gap is not always Congress versus the people. Sometimes the constitutional framework itself overrides an aligned majority. An honest oversight system must capture *that* nuance too — and CivicSys does.

### 3.2 Unverifiable accountability

When a gap like the above opens, what evidence survives? Press articles decay behind paywalls. Poll PDFs vanish. Official transcripts get amended. There is no neutral, timestamped, tamper-proof record that says: *on this date, the people's verified position was X, the legislature did Y, and here is the delta.* Political memory is short because political records are soft.

### 3.3 Digital identity and Sybil attacks

Every previous attempt at online civic participation collapses at the same wall: **one person, one voice** is unenforceable on the open internet. Online polls are bot farms with extra steps. Petition platforms count emails, not citizens. Any system whose votes can be multiplied is not evidence — it is noise wearing the costume of evidence.

### 3.4 Opacity and distrust — including distrust of AI

The final problem is reflexive: citizens do not trust institutions, and they are learning not to trust AI either — sycophantic chatbots that tell everyone what they want to hear, "neutral" models with invisible biases, agents that hallucinate facts. A civic AI that simply *asserts* its conclusions would reproduce the exact opacity it claims to fight.

**What's at stake:** if these four problems stay unsolved, the AI era makes representation *worse* — synthetic opinion drowns out real citizens, and institutions cherry-pick whichever "data" flatters them. The heroes of this story are not us and not our software. They are the citizens who still bother to care. They need better tools.

---

## 4. The CivicSys Solution

CivicSys closes the loop with four pieces, each mapping to one problem above:

```
Sovereign identity  →  Anonymous vote  →  AI deliberation  →  On-chain accountability
   (one person,         (no double          (opposing biases,      (the gap, signed,
    one Cédula)          voting, no           dissent on record)     forever)
                         exposure)
```

`[DIAGRAM: Citizen journey — four-step flow from Cédula Cívica issuance → anonymous nullifier vote → Concilio deliberation with dissent meter → La Tóxica gap report anchored on AccountabilityLog, with the zkSYS chain as the horizontal trust layer underneath all four steps]`

The citizen remains the protagonist at every step: the AI never votes, never decides, never publishes on its own. It advises, audits, and drafts. Citizens supervise. The blockchain signs.

### 4.1 Cédula Cívica — non-custodial soulbound identity

The **Cédula Cívica** ("civic ID card") is an ERC-721 token implementing **ERC-5192 (soulbound)**: `locked()` returns true permanently, and any transfer attempt reverts — identity cannot be sold, delegated, or accumulated.

- **One person, one Cédula, enforced on-chain twice.** Minting requires two unique commitments: a `dniHash` (keccak256 of the national ID number plus a public salt — computed client-side; the raw DNI never reaches the chain or our servers) and a `faceCommitment` (a biometric commitment checked against an off-chain facial dedupe index). Each can be used exactly once, ever — uniqueness is never released even if a Cédula is burned.
- **Non-custodial by construction.** The citizen's wallet is generated in the browser (viem `generatePrivateKey()`) and backed up as a keystore encrypted entirely client-side with the Web Crypto API: **PBKDF2-SHA256 (≥150,000 iterations, random salt) deriving an AES-GCM-256 key**. The server never sees a private key — there is nothing for us to lose, leak, or be subpoenaed for. MetaMask and Pali (Syscoin's native wallet) are supported for users who bring their own keys.

> **⚠️ Honest status:** biometric capture and facial dedupe are **demonstrative mocks** in the current build (a similarity-threshold index, default 0.92, returning only `{duplicate: bool}`). Production identity requires a signed attestation flow and a multisig-controlled attestor. This is documented in the repo's known-limitations register — not buried in fine print.

### 4.2 Anonymous, Sybil-resistant voting

Voting must satisfy two demands that sound contradictory: *prove you haven't voted twice* and *don't reveal who you are.* CivicSys resolves this with **nullifiers**:

```
nullifier = keccak256( identitySecret ‖ proposalId )
```

- The `identitySecret` lives only in the citizen's browser (it is never transmitted). For each proposal, it deterministically produces exactly one nullifier.
- The `AnonymousVote` contract records `nullifierUsed[proposalId][nullifier]` — a second vote with the same nullifier reverts (`"ya votaste"` — *you already voted*), yet the nullifier is computationally unlinkable to the citizen's address.
- A **relayer** submits the transaction, so the voter's wallet never appears as the on-chain sender — votes cannot be linked to identities by inspecting transaction origins.

> **⚠️ Honest status:** the ZK proof that a nullifier derives from a *valid Cédula* (Semaphore-style membership proof) is **mocked** — the contract currently accepts any non-zero nullifier, which means anonymous voting is not yet Sybil-gated end-to-end. The verbatim comment in `AnonymousVote.sol` says exactly this. Real ZK membership gating is the top item on our roadmap (Season 1), and zkSYS — a ZK-native chain — is precisely where that upgrade belongs.

### 4.3 Hermes — the AI deliberation layer

**Hermes** is CivicSys's AI runtime (Python 3.11 / FastAPI), defined by a public, auditable identity convention (`SOUL.md` — mission, constraints, tone) whose core constraints are worth quoting: *"I do not opine, vote, or decide. I only advise, summarize and delegate. I always cite source, date and a confidence level (0–1). If I lack sufficient data, I say 'I don't know' — I never invent."* Its public tone spec targets the ordinary citizen, journalists and academics — in Spanish **and Quechua**.

Hermes's flagship instrument is the **Concilio** — a council of **four AI advisors with deliberately opposing biases**, run in parallel (asyncio), each blind to the others' outputs:

| Advisor | Bias mandate | Temperature |
|---|---|---|
| **Ejecutor / Fiscal** | Feasibility, cost, implementation reality | 0.2 |
| **Garantista** | Rights, equity, human impact | 0.5 |
| **Escéptico / Contralor** | Risks, manipulation, failure modes | 0.7 |
| **Primeros Principios** | Raw data only, no narrative context | 0.6 |

A synthesis pass then compares the four voices, scores **divergence on a three-level scale (low 0.2 / medium 0.55 / high 0.9)**, and issues a verdict **with the dissent recorded** — never papered over. This is anti-sycophancy by architecture, not by prompt-pleading: the advisors *cannot* converge socially because they never see each other. Council sessions are kept in an inspectable ledger.

Hermes speaks Gemini (`gemini-3.5-flash`, primary), with Anthropic and OpenRouter as supported providers — endpoints are hardcoded by security policy (no configurable base URLs that could be hijacked). It is multichannel by design: **Discord is live today**; Telegram and WhatsApp channel adapters exist as stubs in the codebase.

### 4.4 La Tóxica — AI accountability, anchored on-chain (the flagship)

Every system above exists so that this agent can do its job. **La Tóxica** ("the toxic ex who remembers everything") is an AI accountability agent with one mandate: **compare what the citizens voted against what the legislature actually did, and make the gap impossible to forget.**

The pipeline, exactly as implemented:

1. **Ingest** the legislature's real action — session reports or transcripts (all untrusted text is sanitized before touching an LLM prompt; see §8).
2. **Compare** against the citizens' on-chain tally for the same proposal.
3. **Draft** a sharp-but-factual public accountability post (80–130 words), citing the vote numbers, the congressional action, and the delta.
4. **Wait for a human.** The draft is created with `approved: false`. **La Tóxica never auto-publishes** — a human approves every post. Period.
5. **Anchor on-chain.** Upon approval, the system calls `AccountabilityLog.anchor(proposalId, keccak256(post), summary)` — writing the proposal ID, the post's hash, a human-readable summary, and the block timestamp into an append-only contract that emits a public `ReportAnchored` event.

`[DIAGRAM: La Tóxica accountability flow — left: "People's verified vote (on-chain tally)"; right: "Congress's real action (sanitized session data)"; center: La Tóxica computes the gap → human approval gate → AccountabilityLog.anchor() → immutable record with explorer link]`

The anchor is the moat. Anyone can verify, forever, that *this* report about *this* law existed at *this* time with *this* content hash. Delete the tweet, take down the website, change the headline — the record survives. Accountability stops being a news cycle and becomes a ledger.

La Tóxica runs today as a Discord bot (discord.py) in Syscoin's **AI Playground** server, reporting live on seven real Peruvian laws.

---

## 5. Architecture & Technology

### 5.1 Why Syscoin zkSYS (zkTanenbaum)

CivicSys runs on **zkSYS**, Syscoin's ZK-rollup "edgechain" (testnet **zkTanenbaum**, Chain ID **57057**):

- **ZK-rollup on the ZKsync stack** — ZKsync OS with the AirBender RISC-V prover.
- **EVM-equivalent** — standard Solidity 0.8.24 compiled with stock solc (no zksolc, no custom toolchain). Our Hardhat pipeline works unmodified.
- **Bitcoin-anchored** — settlement to Syscoin's L1, which is merge-mined with Bitcoin. Civic records inherit security from the most battle-tested hash power on Earth, independent of Ethereum.
- **Civic-scale economics** — transactions cost a fraction of L1; finality is fast enough for mass voting; and the edgechain model means a sovereign "SSCA chain" remains a credible long-term path (see Roadmap).
- **ZK-native future** — the membership proofs we need for full anonymous gating (§4.2) belong naturally on a ZK chain.

### 5.2 System components

`[DIAGRAM: Architecture — Citizen browser (Next.js + Wagmi, client-side key generation/encryption) ↔ read-only BFF (Node/tRPC) ↔ FastAPI agent runtime (Hermes, Concilio, La Tóxica + Gemini) ↔ Postgres+pgvector; agents and frontend both reading/writing zkTanenbaum contracts via relayer for gasless UX; Discord bots flanking the agent runtime]`

| Layer | Technology (as shipped) | Role |
|---|---|---|
| **Smart contracts** | Solidity **0.8.24**, Hardhat, OpenZeppelin v5 (EVM `cancun`) | Identity, voting, registry, accountability anchor |
| **Frontend** | **Next.js 16.2.6 · React 19.2.4 · Tailwind v4 · Wagmi 3.6 / Viem 2.50** — live on Vercel | Registration, voting, verdict display; all key material client-side |
| **Backend BFF** | Node/TypeScript, tRPC — **read-only** | Serves chain/agent data to the UI; holds **no user keys, ever** |
| **AI runtime** | **Python 3.11 · FastAPI · web3.py 7** · Gemini (`gemini-3.5-flash`) | Hermes + Concilio + La Tóxica |
| **Bots** | **discord.py 2.4+** (CivicSys + La Tóxica) | Live civic interface in Discord |
| **Data** | Postgres + **pgvector** (SQLAlchemy async) | Sessions, embeddings, agent memory |
| **Relayer** | Backend wallet holding **testnet TSYS only** | Pays gas, submits anonymous votes & anchors |

### 5.3 The five contracts

| Contract | What it does | Key surface |
|---|---|---|
| `IdentitySBT` | Cédula Cívica — ERC-721 + ERC-5192 soulbound | `mint(dniHash, faceCommitment, uri)`, `locked()→true`, transfers revert, dual-uniqueness mappings |
| `CitizenRegistry` | Minimal registry of DNI-hash ↔ citizen | `register(dniHash)`, `isRegistered()`, `CitizenRegistered` event |
| `Vote` | Public consultative voting & tallies | `castVote(proposalId, choice)`, `tally()`, `close()` |
| `AnonymousVote` | Nullifier-based anonymous voting | `castAnonymous(proposalId, choice, nullifier)`, per-proposal nullifier registry |
| `AccountabilityLog` | La Tóxica's immutable anchor | `anchor(proposalId, reportHash, summary)` → append-only `Report[]`, `ReportAnchored` event |

All five are deployed and verifiable — addresses and explorer links in §7 and the Appendix.

---

## 6. AI + Blockchain Synergy — The Defensible Thesis

"AI + blockchain" is usually a buzzword collision. In CivicSys the synergy is load-bearing, in both directions:

**What AI gives the chain:** the chain can store a vote, but it cannot read a 200-page law, argue four opposing positions about it, detect that a session transcript contradicts a tally, or draft a report a citizen actually wants to read. AI converts raw civic data into *legible accountability* — continuously, in both Spanish and the citizen's attention span.

**What the chain gives AI:** an LLM's output is, by itself, just text from a black box. The chain gives it (a) **identity** — reports tied to a registered, Sybil-resistant civic process rather than to bots; (b) **immutability** — `keccak256(post)` anchored with a timestamp means the report can never be silently edited, by us or anyone; (c) **auditability** — inputs (on-chain tallies) and outputs (anchored hashes) are publicly checkable, so hallucination claims can be falsified against the record.

**Why this moat is defensible** (the winners-vs-losers test for AI-era startups):

1. **Proprietary data pipeline.** Anyone can call Gemini. Nobody else has a curated, source-cited dataset of real laws × real public sentiment (IEP, Ipsos, Datum, CPI, the 2018 referendum) × real congressional actions, structured for gap detection and growing with every proposal. Datasets compound; prompts don't.
2. **Trust cannot be forked.** A copycat can clone our code (it's open source — deliberately) but cannot clone an existing immutable accountability history, a citizen base with soulbound identities, or the credibility of dissent-on-record deliberation.
3. **Decentralized verification beats automation alone.** A pure-AI competitor (no chain) produces reports that institutions can dismiss as fabrications; a pure-chain competitor (no AI) produces records nobody reads. The combination is the product.
4. **Ethics as advantage, not compliance.** Human-in-the-loop publishing, public agent constraints (`SOUL.md`), prompt-injection sanitization, and documented limitations are exactly the properties journalists, NGOs and academics require before they cite a system. Our honesty is our distribution strategy.

**What CivicSys makes obsolete:** unauditable opinion polls as the only proxy for "what people want"; press releases as the only memory of legislative behavior; email-petition platforms with zero Sybil resistance; and the comfortable assumption that nobody is keeping score.

---

## 7. Live Deployment & Proof of Work — Not Vaporware

Most whitepapers describe intentions. This section describes **state**. Deployed **June 5, 2026** to zkTanenbaum (Chain ID 57057):

| Contract | Address (live, source-verified) |
|---|---|
| **AccountabilityLog** | [`0x12fbb1210ee31ff12085bc083f8258a74d8d6bf3`](https://explorer-zk.tanenbaum.io/address/0x12fbb1210ee31ff12085bc083f8258a74d8d6bf3#code) |
| **IdentitySBT** | [`0xa794fc9f20ba3a6a4698238effba3487e8f90c80`](https://explorer-zk.tanenbaum.io/address/0xa794fc9f20ba3a6a4698238effba3487e8f90c80#code) |
| **Vote** | [`0x1f0ecd77002e134da59247944e5a2fdb24987e24`](https://explorer-zk.tanenbaum.io/address/0x1f0ecd77002e134da59247944e5a2fdb24987e24#code) |
| **AnonymousVote** | [`0x1e9b1f239fdca5d90fe94a9049a06c88d1efdef4`](https://explorer-zk.tanenbaum.io/address/0x1e9b1f239fdca5d90fe94a9049a06c88d1efdef4#code) |
| **CitizenRegistry** | [`0x4f50fcd78f5951c6a7c0b8e940ed8003130bca5a`](https://explorer-zk.tanenbaum.io/address/0x4f50fcd78f5951c6a7c0b8e940ed8003130bca5a#code) |

> Deployer: `0x55cfaf9ec4426C3079Eb1B6Fdb6a52e2b2060261`. All five contracts are **verified** on the Blockscout explorer (source readable under the `Code` tab).

Also live, today:

- **Web dApp:** [civicsys.vercel.app](https://civicsys.vercel.app) — registration, anonymous voting, Concilio verdicts.
- **La Tóxica**, Discord-native, reporting on the seven laws inside Syscoin's **AI Playground** server, with human-approved posts anchoring to `AccountabilityLog`.
- **Open source monorepo** (contracts, agents, frontend, backend, docs, audits): [github.com/civicsys-coder/civicsys](https://github.com/civicsys-coder/civicsys).

Judges and developers are invited to do what this document keeps saying: **don't trust — verify.** Open the explorer, read the contracts, trigger La Tóxica in Discord, and diff this whitepaper against the code. The repository is the source of truth, and this document was written against it.

---

## 8. Security, Ethics & Governance

Security posture first, marketing never:

- **Non-custodial, end to end.** Keys are generated and encrypted in the browser (PBKDF2-SHA256 ≥150k iterations → AES-GCM-256, Web Crypto API); users may also connect MetaMask or Pali. The backend BFF is **read-only** and holds no user keys.
- **Prompt-injection defense.** Every piece of untrusted text (on-chain strings, transcripts, user input) passes through `sanitize_untrusted()` before reaching an LLM prompt: length truncation, control-character stripping, and masking of known injection tokens ("ignore previous", "system:", "you are now", …) replaced with `[BLOCKED:<n>chars]` placeholders.
- **Human-in-the-loop, enforced in code.** La Tóxica's drafts are born `approved: false`; publication and anchoring are explicit, separate, human actions.
- **Relayer, honestly scoped.** The relayer key custodies **valueless testnet TSYS only**, pays gas, and signs anchors. It is not custody of user funds. The production design (documented in ADRs) replaces it with **ERC-4337 account-abstraction paymasters** and a **2-of-3 multisig** for anchoring.
- **Audited, internally and adversarially.** A dedicated cybersecurity audit by the team's security engineer (Tatiana Portillo, May 2026); an internal **MNEMA adversarial audit** (four parallel adversarial auditors with a synthesis pass — the same anti-sycophancy pattern as the Concilio, May 30, 2026); plus static analysis (Slither, solhint) with findings tracked in-repo.
- **Known limitations, in writing.** The repo maintains a public limitations register (`docs/security/known-limitations.md`). The big four, restated plainly:

| # | Limitation (today) | Production path |
|---|---|---|
| 1 | ZK membership proof for anonymous voting is **mocked** (any non-zero nullifier accepted) | Semaphore-style ZK gating on zkSYS |
| 2 | Biometric verification & facial dedupe are **demonstrative mocks** | Signed attestor + multisig issuance |
| 3 | Single relayer key (testnet) | AA paymaster + 2-of-3 multisig + timelock |
| 4 | LLM outputs can err | Dissent-on-record synthesis, source citation, human approval gate, anchored hashes for ex-post falsification |

**Governance ethics:** the AI advises and never decides; agent identity and constraints (`SOUL.md`) are public and auditable; sources and confidence levels accompany inferences; and the project is open-source from day one. Mocking what we haven't built yet — and labeling it — is not a weakness. It is the only honest way to ship civic infrastructure.

---

## 9. Participation, Identity & Incentive Model

**CivicSys has no token, and this section will not pretend otherwise.** No supply schedules, no burn charts, no fabricated yields. What aligns participants instead:

- **The Cédula Cívica is the anti-token.** Soulbound, non-transferable, valueless by design — it cannot be bought, sold, or farmed. Its only utility is *standing*: one verified human, one voice. Speculation is structurally impossible, which is precisely what makes the resulting data credible.
- **Citizens** get an amplified, signed, permanent voice — and gasless participation via the relayer/paymaster model (citizens should never need to buy crypto to be counted).
- **Journalists, academics & NGOs** get an open, verifiable dataset: tallies, dissent metrics, and anchored accountability reports, queryable and citable.
- **Honest legislators** get something rare: quantifiable, Sybil-resistant evidence of public support when they side with their constituents.
- **Sustainability (no-token version):** public-good grants (Syscoin Foundation; GovTech funders), Pro subscriptions for newsrooms/NGOs (alerts, API), and white-label deployments for municipalities and universities. Revenue funds infrastructure; the civic record stays free, forever.

> **Forward-looking (clearly labeled, optional):** if the network matures to community governance, a **non-financial governance mechanism** weighted by soulbound participation (not capital) may be introduced — e.g., Cédula-gated proposal curation or council-parameter votes. Any such mechanism would be (a) non-transferable, (b) non-speculative, and (c) decided with the community. **$SYS remains the gas and settlement asset of the underlying chain; CivicSys does not issue, and does not plan to issue, a speculative token of its own.**

---

## 10. Real-World Validation — Seven Real Laws, Real Sentiment, Real Actions

CivicSys did not launch with lorem-ipsum proposals. It launched loaded with **seven real, current Peruvian laws**, each carrying real public-sentiment data (IEP, Ipsos, Datum, CPI, the 2018 referendum — scaled to a plausible civic turnout) and the legislature's real action, so La Tóxica reports *within the frame of reality*:

| Law | The people (sourced sentiment) | The legislature (real action) | The gap |
|---|---|---|---|
| **32419** — Amnesty, military/police | **61% against** (IEP Sep-2025) | Passed Jun 2025; promulgated Aug 2025, defying the Inter-American Court | **Total — 61 pts** |
| **31988** — Bicameralism | **90% rejected** (2018 referendum); 68% still against (IEP 2024) | Reinstated Mar 2024, no new referendum | **Mandate ignored** |
| **32330** — Minors 16–17 tried as adults | **~58% in favor** (IEP/Ipsos 2025) | Passed May 2025 → **Constitutional Court annulled it** (Dec 2025) | Opened by the TC, not Congress — nuance captured |
| **32123** — Pension reform | **82% reject** single administrator (Ipsos); 65.6% want withdrawal rights (CPI) | Passed Jun 2024; 2025 protests forced partial rollback | **High, partially self-corrected** |
| **15-day police detention** (bill) | **62% favor** a hard line (Ipsos Feb-2025) | Committee-approved Nov 2025; pending plenary | Aligned, pending |
| **32301** — NGO/foreign-cooperation control | 42% trust NGOs (IEP); IACHR/UN warnings | Passed Mar 2025; promulgated Apr 2025 | **Contested** |
| **32181** — Preliminary-detention repeal | 62% favor hard line (Ipsos) | Passed Dec 2024 → reversed by Ley 32255 (Mar 2025) | Gap, then self-corrected |

This table is the product in miniature: not "trust us," but *here are the sources, here is the action, here is the delta — and here is the hash.*

---

## 11. Roadmap — Seasons

Like any honest civic project, CivicSys ships in seasons, each with verifiable exits. Near-term seasons are concrete; the horizon is directional.

**Season 0 — Proof of Builders (done · June 2026).** Five contracts live on zkTanenbaum · Cédula + anonymous nullifier voting end-to-end · Concilio with recorded dissent · La Tóxica anchoring human-approved reports on-chain · seven real laws loaded · audits + limitations register published · everything open-source.

**Season 1 — Close the cryptographic gaps (next ~6 months).** Semaphore-style ZK membership proofs on zkSYS (un-mock the nullifier gate) · signed attestor + 2-of-3 multisig for identity issuance and anchoring · ERC-4337 paymaster for gasless citizens · biometric attestation pilot · public **Bias Observatory** for the Concilio (publish divergence metrics per law). *Target: 1,000 laws analyzed, 10,000 signed votes.*

**Season 2 — From product to infrastructure (6–24 months).** zkSYS mainnet · open dataset API for journalism/academia · white-label deployments (municipalities, universities, NGOs) · external security audits · Telegram/WhatsApp channels graduate from stubs to live · community governance pilot (soulbound-weighted, non-financial).

**Season 3 — The 10-year vision (2030+).** A sovereign **SSCA edgechain** on Syscoin's permissionless edgechain model; a Latin-American federation of civic chambers sharing the accountability standard; "anchored accountability" as an open protocol any democracy can adopt — so that *every* legislature on the continent operates knowing the gap will be measured, signed, and remembered. AI-augmented participatory democracy, with Bitcoin-grade memory.

---

## 12. Team & Vision

Seven builders · Universidad César Vallejo (UCV) · Proof-of-Builders, Syscoin Hackathon 2026:

| Member | Role |
|---|---|
| **Orlando Vázquez** | Blockchain developer — smart contracts, zkSYS integration |
| **Sandro Chávez** | Fullstack developer — Next.js, API, LLM integrations |
| **Eduardo Cuba** | Coordination & presenting |
| **Mario Alberto** | Networking & strategy |
| **Grecia Puma** | Communications |
| **Gabriel Sosa** | Testing & QA |
| **Tatiana Portillo** | Documentation & cybersecurity — audit, threat model |

With legal guidance on constitutional viability (Miguel Aikip): CivicSys is deliberately **consultative and non-binding** — it requires no constitutional reform anywhere it operates. We do not replace Congress; we illuminate it. We do not replace the citizen; we verify them.

**Vision in one breath:** a world where "the people disagreed, and here is the proof" is not an opinion but a queryable, timestamped, Bitcoin-anchored fact — in every democracy that wants one.

---

## 13. Conclusion & Call to Action

The gap between the governed and the governing has always existed. What changes with CivicSys is that it can no longer hide. AI reads, deliberates and drafts; citizens decide and supervise; the blockchain signs and remembers. The system is live, the code is open, the limitations are documented, and the first seven laws are already on the record.

**Verify it yourself:**

- 🌐 Use it: **[civicsys.vercel.app](https://civicsys.vercel.app)**
- 🔍 Audit it: **[explorer-zk.tanenbaum.io](https://explorer-zk.tanenbaum.io)** (addresses below)
- 🛠️ Fork it: **[github.com/civicsys-coder/civicsys](https://github.com/civicsys-coder/civicsys)**
- 💬 Meet La Tóxica: Syscoin's **AI Playground** Discord

The people vote. The AI deliberates with dissent. The blockchain signs. **And no one can hide the gap.**

---

## Appendix

### A. Deployed contracts — zkSYS Testnet (zkTanenbaum, Chain ID 57057)

| Contract | Address | Explorer (verified source) |
|---|---|---|
| AccountabilityLog | `0x12fbb1210ee31ff12085bc083f8258a74d8d6bf3` | [link](https://explorer-zk.tanenbaum.io/address/0x12fbb1210ee31ff12085bc083f8258a74d8d6bf3#code) |
| IdentitySBT | `0xa794fc9f20ba3a6a4698238effba3487e8f90c80` | [link](https://explorer-zk.tanenbaum.io/address/0xa794fc9f20ba3a6a4698238effba3487e8f90c80#code) |
| Vote | `0x1f0ecd77002e134da59247944e5a2fdb24987e24` | [link](https://explorer-zk.tanenbaum.io/address/0x1f0ecd77002e134da59247944e5a2fdb24987e24#code) |
| AnonymousVote | `0x1e9b1f239fdca5d90fe94a9049a06c88d1efdef4` | [link](https://explorer-zk.tanenbaum.io/address/0x1e9b1f239fdca5d90fe94a9049a06c88d1efdef4#code) |
| CitizenRegistry | `0x4f50fcd78f5951c6a7c0b8e940ed8003130bca5a` | [link](https://explorer-zk.tanenbaum.io/address/0x4f50fcd78f5951c6a7c0b8e940ed8003130bca5a#code) |

Deployer: `0x55cfaf9ec4426C3079Eb1B6Fdb6a52e2b2060261`. Deployment record: `blockchain/deployments/zkTanenbaum.json` (redeployed 2026-06-06 UTC; all five contracts source-verified on Blockscout).

### B. Network

| Field | Value |
|---|---|
| Network | zkSYS Testnet (zkTanenbaum) |
| Type | ZK-rollup edgechain (ZKsync OS · AirBender RISC-V prover), EVM-equivalent |
| Chain ID | 57057 |
| Symbol | TSYS (testnet) |
| RPC | `https://rpc-zk.tanenbaum.io` |
| Explorer | `https://explorer-zk.tanenbaum.io` |
| L1 base | Syscoin — EVM L1 merge-mined with Bitcoin |

### C. Links

- Web dApp: https://civicsys.vercel.app
- Source code (monorepo): https://github.com/civicsys-coder/civicsys
- Security docs in-repo: `docs/security/` (threat model, known-limitations register, audit reports, SAST findings)
- Agent identity (public): `agents/hermes/soul/SOUL.md`

### D. Data & references

Public-sentiment sources used in the seven-law dataset: **IEP** (Instituto de Estudios Peruanos), **Ipsos Perú**, **Datum Internacional**, **CPI**, and the **2018 Peruvian national referendum**; legislative actions per **Congreso de la República**, **El Peruano** (official gazette), **Tribunal Constitucional**, and **Inter-American Court of Human Rights** records; additional context from El Comercio, IDEHPUCP, Defensoría del Pueblo, HRW, OHCHR, La República e Infobae. Methodological framing for this document: A. Suto, *How to Write a Whitepaper for Your Web3 Project* (storytelling structure, community-as-hero, honest tokenomics); F. Paredes García, *Winners, Losers, and Strategies in the AI Revolution* (AI-native moats, proprietary data, ethics as advantage, 10-year horizon).

---

*CivicSys — SSC Antipereza · Whitepaper v1.0 · June 2026 · Open source (MIT) · Built for the Syscoin Hackathon, Proof-of-Builders UCV 2026*

*This document was written against the deployed code and on-chain state as of June 5, 2026. Where the project evolves, the repository — not this PDF — is the source of truth.*
