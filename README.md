# SkillBounty

SkillBounty connects early-career talent to small, paid projects from real teams. Explainable matching recommends candidates; the employer decides who to assign and whether to accept the result. Solana escrow records the reward and releases it after approval.

**Hackathon target scope:** analytics micro-projects, sample candidate profiles, user-signed Solana Devnet escrow, and an on-chain receipt containing hashes and task state. Matching uses fictional data. The generated client is integrated; live escrow actions unlock only after program deployment.

## Current build status

- Next.js 16 + TypeScript + Tailwind 4 + Solana Kit wallet connection scaffold.
- Brand: Ocean Terminal, Geist Sans + Geist Mono.
- Explainable demo matching endpoint at `POST /api/matches` (rule-based, not a hosted LLM).
- Anchor program implements create/fund, assign, submit, employer approval/payout, worker claim after a seven-day review timeout, and expired refund. Anchor build and seven LiteSVM tests pass locally.
- The Codama client is generated and integrated with the wallet UI. It checks Devnet program availability, creates escrow for a saved draft, loads a bounty by task ID, and exposes lifecycle actions for the appropriate connected wallet. Sample bounties remain demo-only.
- The program is not deployed to Devnet. Until deployment, the interface explains this and disables transaction actions. No on-chain transaction has been sent.
- See [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) for phases, checks, and blockers.

## Run the web app

Requires Node.js `24.19.0` (pinned in `.nvmrc` and `package.json`).

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. The wallet selector targets Solana Devnet by default. Any SOL shown in the demo is test SOL; the sample tasks and profiles are not on-chain records.

## Solana program

The Anchor workspace is under `anchor/`. On Windows, use Ubuntu through WSL with Rust, Solana CLI, and Anchor CLI installed. Then run:

```bash
npm run setup
npm run anchor-test
```

The repo pins Rust `1.89.0`, Anchor CLI `1.1.2`, and Solana CLI `3.1.10` (`anchor/Anchor.toml`).

`setup` builds the Anchor program and generates the typed client under `app/generated/skill_bounty/` from the IDL. This workspace was built and tested in Ubuntu under WSL with the pinned toolchain; `cargo test` reports seven passing tests. The generated client matches program ID `FfQi9opVmK3BaWz1tpdR3Gz5zDhV76afuvJmnuAsttcw`.

Before deployment, verify the generated program keypair in the ignored `anchor/target/deploy/` directory matches `declare_id!` and `Anchor.toml`, then build and review deployment settings. Devnet deployment requires separate explicit user authorization. The generated secret keypair is ignored and must never be committed or shared.

## On-chain data and trust boundaries

The bounty account stores employer and worker wallet addresses, amount, deadline, status, a brief hash, a submission hash, and timestamps. It never stores CVs, names, task briefs, or deliverable files. Keep those off-chain. If an account is sent unsolicited SOL, the program releases the full escrow balance to the payout or refund recipient so the extra lamports are not stranded.

The program allows only the employer to assign, approve payment, or refund after expiry; only the recorded worker can submit or claim after the seven-day review window. A refund is allowed only after the task deadline and before work is submitted. The matching score is informational and cannot hire, accept, or move funds.

All wallet transactions must be reviewed and signed by the wallet owner. Do not use mainnet for the hackathon demo.

## Project structure

```text
app/                       Next.js UI, API route, wallet and RPC providers
app/api/matches/           Explainable demo recommendation endpoint
app/lib/demo-data.ts       Fictional sample tasks and SOL formatting
app/lib/matching.ts        Deterministic skill-overlap ranking
app/generated/skill_bounty Codama output after Anchor build
anchor/programs/skill_bounty/ Anchor escrow program and LiteSVM tests
brand.md                   Palette, type, and product voice
IMPLEMENTATION_PLAN.md     Approved phase plan and status
```

## Product demo sequence

1. Explore the sample analytics bounties.
2. Review the candidate match score and the specific overlapping skills/evidence.
3. Save a project draft, connect an employer wallet on Devnet, and fund the escrow once the program has been deployed.
4. The assigned worker submits a hash of the off-chain deliverable.
5. The employer reviews the work and signs approval; the program releases SOL and keeps the task receipt.

## Hackathon checklist

The final Colosseum submission, team registration, hosted demo, and video links are separate external actions. Do not submit or publish without explicit authorization. The code remains local until then.
