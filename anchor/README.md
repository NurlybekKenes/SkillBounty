# SkillBounty Anchor program

The `skill_bounty` program manages a SOL bounty escrow and durable task receipt.

## Instructions

- `create_bounty(task_id, amount, deadline, brief_hash)` initializes the employer's bounty account and funds its escrow PDA.
- `assign_worker(worker)` can only be called by the employer while the bounty is open and before the deadline.
- `submit_work(submission_hash)` can only be called by the assigned worker before the deadline.
- `approve_and_pay()` can only be called by the employer after submission; it releases the escrow balance to the assigned worker.
- `claim_after_review_timeout()` lets the assigned worker release the escrow if the employer does not review within seven days.
- `refund_expired()` returns funds to the employer only after expiry and only before submission.

The bounty account stores wallet addresses, amount, deadline, status, timestamps, and hashes. Task briefs, CVs, names, and deliverables stay off-chain. Any unsolicited SOL sent to the escrow PDA is released with the recorded bounty to its intended recipient, avoiding dust locked at the PDA.

## Build and test

On Ubuntu / WSL with Rust, Solana CLI, and Anchor CLI installed:

```bash
anchor build --ignore-keys
cd programs/skill_bounty && cargo test
```

Tests use LiteSVM and load `anchor/target/deploy/skill_bounty.so`. Verified in Ubuntu under WSL with Rust 1.89.0, Solana CLI 3.1.10, and Anchor CLI 1.1.2: Anchor build succeeds and seven tests pass. The generated Codama client is under `app/generated/skill_bounty/`.

## Deployment setup

Program address is `FfQi9opVmK3BaWz1tpdR3Gz5zDhV76afuvJmnuAsttcw`. Build generation created its keypair in the ignored `anchor/target/deploy/` directory; verify this keypair matches `declare_id!` and `Anchor.toml` before deployment. Never commit or share the private key. Devnet deployment requires separate explicit user authorization and has not been performed.
