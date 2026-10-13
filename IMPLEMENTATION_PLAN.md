# SkillBounty — implementation plan and progress

**Product:** SkillBounty — paid micro-projects where AI recommends candidates based on demonstrated skills and Solana records escrow, acceptance, and payment.

**Hackathon:** Colosseum Crypto World's Fair — Superteam Kazakhstan track.
**Approved:** 2026-10-08.
**Status:** Local MVP implementation complete; deployment and public hackathon delivery remain.

## Product scope for the hackathon MVP

One end-to-end demo: a startup posts a small analytics task; the app ranks a small set of sample candidates and explains the match; the employer selects a candidate and funds the bounty on Devnet; the worker submits a result; the employer approves it; the program releases SOL and leaves a verifiable task receipt.

AI recommends, but does not make the hiring or acceptance decision. Wallet holders sign their own transactions. No real funds, mainnet, DAO, token, NFT, automatic work grading, or on-chain personal data are in scope.

## Phases and acceptance criteria

| Phase                      | Work                                                                                   | Acceptance criteria                                                               | Status                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0. Toolchain               | Node 24+, WSL/Ubuntu, Rust, Solana CLI, Anchor; pin compatible versions                | Tool versions recorded; app and program build locally                             | **Complete:** Ubuntu 26.04.1 LTS under WSL 2; Rust 1.89.0, Solana CLI 3.1.10, Anchor CLI 1.1.2, and Node 24.19.0 verified. WSL launch from the current restricted shell may return Access Denied; elevated run succeeded.                                                                                                                                                                         |
| 1. Project skeleton        | Official Solana Next.js + Kit + Anchor template, repo instructions, environment sample | App launches; no secret values committed; one repository                          | **Complete:** official template scaffolded; dependencies installed; Node/Next versions updated; env sample, README, and wallet provider retained.                                                                                                                                                                                                                                                 |
| 2. Escrow program          | Create/fund, assign, submit, approve/pay, expired refund; preserve task receipt        | Program builds; tests cover valid flow and authorization/state failures           | **Complete and verified locally:** Anchor build succeeds; seven LiteSVM tests pass. Covers employer approval, seven-day review timeout payout, expiry refund, full escrow-balance release, and on-curve worker validation. Not yet verified against Devnet.                                                                                                                                       |
| 3. Product UI and matching | Employer and worker flow; AI brief parsing and explainable match                       | A sample bounty can be posted and candidates compared; human makes final choices  | **Demo complete:** bounties, draft intake, explainable deterministic match endpoint, candidate evidence, loading/error states, and local draft preview. No hosted LLM or off-chain persistence is wired.                                                                                                                                                                                          |
| 4. Integration             | Wallet, program client, Devnet, transaction status and explorer links                  | End-to-end bounty/payment demo on Devnet                                          | **Local client integration complete; Devnet blocked pending deployment:** generated Codama client checks program availability and wires create/fund, load, assign, submit, approve/pay, timeout claim and expired refund. Wallet remains the signer; confirmation summarizes action, recipient and SOL. Buttons unlock only if the program is executable on Devnet. No transaction has been sent. |
| 5. Safety and verification | Input/account validation, failure states, build and contract checks                    | No private data on-chain; no unauthorised payout; expected failure cases verified | **Local checks complete:** TypeScript, scoped ESLint, Windows production build, Anchor build, and seven LiteSVM tests pass. No independent audit or live Devnet validation. Linux production build was attempted using Windows-installed `node_modules` and failed because its optional Linux `lightningcss` binary is absent; run clean Ubuntu `npm ci` for Linux packaging verification.        |
| 6. Hackathon package       | README, product demo (≤3 min), pitch (≤2 min), submission checklist                    | Direct repo URL, accessible demo, complete team profiles and videos               | **Draft package prepared; deadline passed:** description, demo/pitch scripts, and checklist exist in `hackathon/`. The global deadline was October 12, 2026; Kazakhstan registration closed October 8. Confirm late consideration with organizers before planning a submission. Public demo, recordings, team profiles, repository push, and Devnet verification also remain.                     |

## Architecture

- `app/`: root Next.js App Router, TypeScript, Tailwind, Solana Kit and Wallet Standard (the official template was generated at repository root to keep one deployable app).
- `anchor/programs/skill_bounty`: Anchor program, task state PDA and program-controlled SOL escrow PDA.
- `app/api` and `app/lib`: off-chain task descriptions, candidate evidence and deliverable links; the matching endpoint returns structured recommendations only.
- Current match endpoint is an explainable rule-based prototype over fictional profiles; no LLM provider or external data feed is configured.
- On-chain record: parties, amount, deadline, status, brief hash, submission hash, and payout/refund result. No CV, legal name, private task text, or work files.

## Security boundaries

- Devnet only during the hackathon. Clearly label test SOL.
- Employer signs funding and acceptance; assigned worker signs submission.
- Only the recorded employer may approve or reclaim an unsubmitted bounty; the worker may release submitted escrow only after a seven-day employer review period.
- Enforce positive amount, future deadline, expected PDA relationships, signer identities, and legal state transitions.
- AI output cannot trigger a transaction or choose/reject a candidate automatically.
- Keep API keys in local environment variables; commit only `.env.example`.

## Current environment and remaining work

- Local Git repository contains the uncommitted MVP files; `origin` points to `https://github.com/NurlybekKenes/SkillBounty.git`; no push has been made.
- Node 24.19.0 is pinned in `.nvmrc` and `package.json`. Ubuntu 26.04.1 LTS exists under WSL 2. Tool versions verified: Rust 1.89.0, Anchor CLI 1.1.2, Solana CLI 3.1.10, Node 24.19.0.
- Local Anchor build output produced program ID `FfQi9opVmK3BaWz1tpdR3Gz5zDhV76afuvJmnuAsttcw`, matching the generated Codama client. The deploy keypair is ignored under `anchor/target/`; do not commit or reveal it.
- Windows production build passes. Ubuntu build is not verified yet: this workspace's `node_modules` was installed on Windows and lacks the Linux optional `lightningcss` binary. A clean Ubuntu `npm ci` is needed for a Linux build check.
- The linked Kazakhstan listing specified October 8, 2026 as the regional registration deadline, which has passed as of October 9. The global Colosseum listing still states October 12, 2026 as the submission deadline; confirm directly with organizers whether late regional registration is accepted.
- GitHub pushes, Devnet deployments, and hackathon submission are not included in this local implementation without separate authorization. Devnet deployment is the main remaining dependency for end-to-end escrow verification.

## Decision log

- Start from the official `solana-foundation/templates/kit/nextjs-anchor` template.
- Use SOL on Devnet for the short demo; postpone stablecoin support.
- Preserve on-chain task receipts as attestations, not as proof that work quality is objectively true.
- Keep the initial use case to small analytics tasks and sample candidates.
- User selected the Ocean Terminal palette and Geist Sans + Geist Mono. Gradient usage was declined.
- Keep the web app strictly on Devnet until the user explicitly authorizes another target; the template's cluster setting is no longer user-selectable.

## Implementation log — 2026-10-08

- Generated from the official Solana Foundation Next.js + Kit + Anchor template; preserved the existing Git directory and approved plan.
- Replaced the sample vault program with a SkillBounty escrow/receipt state machine, including a seven-day worker payout fallback when an employer does not review submitted work, handling of unsolicited escrow lamports, and on-curve worker validation. Six LiteSVM scenario tests are source-only until the Anchor toolchain is installed.
- Added a responsive demo marketplace, local-only project draft form, deterministic matching endpoint, sample profiles, wallet connection UI, brand tokens, and project/setup documentation.
- Validation: production build passed on Node 24.19.0 / Next.js 16.4.0 after latest UI/token edits; ESLint passed; `tsc --noEmit` passed; localhost UI and API passed valid and invalid payload checks at 375, 768, and 1280px without horizontal overflow; `npm audit --omit=dev` found 0 vulnerabilities; `git diff --check` is clean. The latest build needed execution outside the sandbox because Windows denied SWC access to the OneDrive workspace path.
- Limitation: npm's full audit reports five high findings caused by a dev-only `braces` dependency in `eslint-config-next`'s chain. The advisory lists no patched release; do not install substitute packages without a trusted upstream fix.
- Prepared a fact-checked hackathon submission draft and separate demo/pitch scripts. They explicitly identify the unbuilt/unverified on-chain integration and missing public demo; no videos, team credentials, public push, or entry were fabricated.
- Static source review identified and addressed escrow liveness/lamport hygiene and authority concerns: worker claim after a seven-day review timeout, release of the full PDA balance to the recorded beneficiary, and rejection of off-curve worker addresses. These changes have not been compiled or tested yet.

## Follow-up — 2026-10-09

- User restarted Windows. WSL remained unavailable, so the Ubuntu install was retried with elevated permission. It again requested a restart, and WSL status/list still return access denied. Contract compilation, tests, IDL generation, and integration remain blocked pending Windows/WSL availability.

### WSL follow-up — 2026-10-09

- Both WSL optional features were previously confirmed enabled, and the update reported no pending restart. WSL 3.0.1/kernel 6.1 are installed, but Windows reports `HypervisorPresent: False`, and listing online distros fails with `Wsl/InstallDistro/ERROR_ACCESS_DENIED`. Elevated feature and firmware checks are blocked in this session. Phase 0 needs firmware virtualization (Intel VT-x) and the Windows hypervisor available. On this Lenovo, check BIOS/UEFI for Intel Virtualization Technology, then verify Windows hypervisor boot configuration with an administrator; install Ubuntu and the pinned toolchain after WSL can enumerate distributions. This unblocks Anchor compilation, contract tests, IDL generation, and Devnet integration.

### Ubuntu and integration follow-up — 2026-10-13

- User installed Ubuntu independently. Elevated WSL access confirmed Ubuntu 26.04.1 LTS on WSL 2 and the pinned Rust 1.89.0, Solana CLI 3.1.10, Anchor CLI 1.1.2, and Node 24.19.0 toolchain.
- Corrected `solana_version` in `anchor/Anchor.toml` to the accepted version format, adapted four CPI account arguments to Anchor 1.1.2, and generated the program keypair/IDL. Program ID is `FfQi9opVmK3BaWz1tpdR3Gz5zDhV76afuvJmnuAsttcw`.
- Fixed a LiteSVM test balance assertion to account for the worker transaction fee. Contract validation now reports 7 passed, 0 failed; Anchor build succeeds.
- Generated the Codama JavaScript client and integrated a Devnet escrow workspace: executable-program check, create/fund from a saved local draft, load by task ID, assign worker, submit off-chain reference hash, approve/payout, timeout claim, expiry refund, and explorer links. Each action presents a confirmation before it calls the wallet; transactions are never auto-signed.
- TypeScript check, scoped ESLint, and Windows Next.js production build pass after the UI changes.
- Linux production build was attempted but stopped because this shared `node_modules` was installed on Windows and lacks `lightningcss-linux-x64-gnu`; lockfile includes the optional package. A clean Linux `npm ci` remains needed to verify the Ubuntu web build.
- The program is not deployed to Devnet and no transaction has been submitted. Current Windows non-elevated WSL invocation can still return `Wsl/E_ACCESSDENIED`; elevated WSL commands worked. Devnet deployment and end-to-end chain verification remain separate steps requiring explicit authorization.
- Updated README, Anchor README, build context, and this plan to reflect verified status and remaining work.
