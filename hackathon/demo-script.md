# SkillBounty — product demo script (draft)

**Target duration:** 2:30. The local prototype includes a generated wallet client and gated Devnet escrow controls. Do not describe a transaction as live or show a fabricated explorer receipt: the program is not deployed. Record only after the app is deployed to a judge-accessible URL.

## 0:00–0:20 — Problem

“For students and junior specialists, the first real project is hard to get. A CV rarely shows how someone will handle a real brief. Small teams also need a way to find help for a focused task without running a full hiring process.”

## 0:20–0:40 — What it does

“SkillBounty turns a small, well-scoped task into a chance to demonstrate work. It recommends candidates using visible skill evidence, while the employer makes every selection and acceptance decision.”

## 0:40–1:40 — Current working prototype

1. Open the SkillBounty marketplace. Point out the Devnet-only label and demo-data notice.
2. Open “Map activation drop-off.” Explain the scope, sample reward, required skills, and estimate.
3. Show candidate recommendations and explain one score: overlapping skills and sample project context. State that this is a deterministic prototype, not a hiring decision or hosted AI model.
4. Open “Post a project.” Show the local draft flow and clarify that drafts are not saved to a server or published on-chain.
5. Show the escrow workspace. Explain that it checks program availability and disables transaction controls until the program is deployed. Do not sign or broadcast any transaction during the recording unless a separately authorized, verified Devnet deployment exists.

## 1:40–2:10 — Solana design

“The Anchor program implements employer-funded SOL escrow, a worker submission hash, employer approval, payout, and an expiry refund. We built it and passed seven LiteSVM tests, and the typed wallet client is wired into the app. The program is not deployed to Devnet yet, so this is not a live payment flow. Personal details, the task brief, and work files stay off-chain.”

## 2:10–2:30 — Next milestone

“Our next milestone is to validate the escrow lifecycle on Devnet, then test this flow with local students and small teams. We are looking for early-career analysts and teams with small, well-bounded data tasks.”

## Recording gate

- Replace local URL with a public, working demo URL.
- Only show a real wallet-confirmed Devnet transaction and explorer page after deployment and verification. Keep the explicit current-state wording above until then.
- Capture at 1080p with a clean browser profile. Keep candidate examples identified as sample data.
