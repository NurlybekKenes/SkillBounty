# Build Context

> SkillBounty implementation status as of 2026-10-13. Local verification only; no Devnet deployment or public release.

## Stack

| Field         | Value                                                                            |
| ------------- | -------------------------------------------------------------------------------- |
| Template      | Solana Foundation Next.js + Kit + Anchor                                         |
| Frontend      | Next.js 16.4.0, React 19, TypeScript, Tailwind CSS 4                             |
| Solana        | Rust 1.89.0, Anchor CLI 1.1.2, Solana CLI 3.1.10, LiteSVM 0.10.0, Solana Kit 6.x |
| Host          | Windows 11 with Ubuntu 26.04.1 LTS under WSL 2                                   |
| Tool versions | Verified in Ubuntu on 2026-10-13                                                 |

## Build Status

| Field            | Value                                                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Local MVP        | Product UI, deterministic matching prototype, Anchor escrow, generated client and gated Devnet wallet flows implemented |
| Checks           | Anchor build passed; 7 LiteSVM tests passed; TypeScript, scoped ESLint and Windows production build passed              |
| Devnet deployed  | No                                                                                                                      |
| Mainnet deployed | No                                                                                                                      |
| Program ID       | `FfQi9opVmK3BaWz1tpdR3Gz5zDhV76afuvJmnuAsttcw`                                                                          |
| RPC              | Solana Devnet public endpoint (read-only availability check until deployment)                                           |

### Milestones

- [x] Responsive SkillBounty marketplace and explainable deterministic matching prototype
- [x] Install and verify pinned Rust, Solana and Anchor toolchain in Ubuntu WSL 2
- [x] Build escrow program and pass seven LiteSVM lifecycle/authorization tests
- [x] Generate Codama IDL client and wire create, load, assign, submit, approve, claim and refund flows
- [x] Gate wallet actions on program-executable availability; display human confirmation and defer signing to wallet
- [ ] Deploy program and verify the full lifecycle on Devnet (requires explicit user authorization)
- [ ] Persist real task details and deliverables off-chain; current draft is local-only
- [ ] Replace sample recommendations with validated candidate data and, if needed, a configured AI provider
- [ ] Publish accessible demo, record pitch/demo, complete team details and hackathon submission

## Boundaries and remaining risks

- Program tests run in LiteSVM, not against a deployed Devnet program.
- No transaction has been sent and no deployer wallet has been configured in this workspace.
- The generated deploy keypair is under ignored `anchor/target/deploy/`; never commit or expose it. Verify its public key matches the declared program ID before deployment.
- Sample tasks and candidate profiles are fictional. Matching is deterministic and does not make hiring decisions.
- The application hashes task briefs and deliverable references for on-chain state; full text and files remain off-chain.
- Production build was verified on Windows. An Ubuntu build attempted with Windows-installed `node_modules` failed because the Linux optional `lightningcss` binary is absent; use a clean Ubuntu `npm ci` to validate Linux packaging.
- This work is not an independent security audit and is not ready for mainnet.

## Verification evidence

- Ubuntu: Rust 1.89.0, Solana CLI 3.1.10, Anchor CLI 1.1.2, Node 24.19.0.
- `NO_DNA=1 anchor build --ignore-keys` completed and generated the IDL and deploy artifact.
- `NO_DNA=1 cargo test -- --nocapture`: 7 passed, 0 failed.
- Codama client generation completed from `anchor/target/idl/skill_bounty.json`.
- TypeScript `tsc --noEmit`: passed after UI integration.
- ESLint on changed UI files: passed after React effect correction.
- Next.js production build on Windows: passed; `/`, `/_not-found`, `/api/matches`, and `/icon.svg` generated.
