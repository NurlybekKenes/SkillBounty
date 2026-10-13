use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

declare_id!("FfQi9opVmK3BaWz1tpdR3Gz5zDhV76afuvJmnuAsttcw");

const MAX_DEADLINE_SECONDS: i64 = 30 * 24 * 60 * 60;
const REVIEW_PERIOD_SECONDS: i64 = 7 * 24 * 60 * 60;

#[program]
pub mod skill_bounty {
    use super::*;

    pub fn create_bounty(
        ctx: Context<CreateBounty>,
        task_id: u64,
        amount: u64,
        deadline: i64,
        brief_hash: [u8; 32],
    ) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        require!(amount > 0, BountyError::InvalidAmount);
        require!(deadline > now, BountyError::DeadlineMustBeFuture);
        require!(deadline <= now + MAX_DEADLINE_SECONDS, BountyError::DeadlineTooFar);
        require!(brief_hash != [0; 32], BountyError::EmptyHash);

        transfer(
            CpiContext::new(
                ctx.accounts.system_program.key(),
                Transfer {
                    from: ctx.accounts.employer.to_account_info(),
                    to: ctx.accounts.escrow.to_account_info(),
                },
            ),
            amount,
        )?;

        let bounty = &mut ctx.accounts.bounty;
        bounty.task_id = task_id;
        bounty.employer = ctx.accounts.employer.key();
        bounty.worker = Pubkey::default();
        bounty.amount = amount;
        bounty.deadline = deadline;
        bounty.brief_hash = brief_hash;
        bounty.submission_hash = [0; 32];
        bounty.submitted_at = 0;
        bounty.review_deadline = 0;
        bounty.status = BountyStatus::Open;
        bounty.created_at = now;
        bounty.bump = ctx.bumps.bounty;
        bounty.escrow_bump = ctx.bumps.escrow;
        emit!(BountyCreated { task_id, employer: bounty.employer, amount, deadline });
        Ok(())
    }

    pub fn assign_worker(ctx: Context<AssignWorker>, worker: Pubkey) -> Result<()> {
        let bounty = &mut ctx.accounts.bounty;
        require!(bounty.status == BountyStatus::Open, BountyError::InvalidState);
        require!(worker != Pubkey::default(), BountyError::InvalidWorker);
        require!(worker != bounty.employer, BountyError::InvalidWorker);
        require!(worker.is_on_curve(), BountyError::InvalidWorker);
        require!(Clock::get()?.unix_timestamp < bounty.deadline, BountyError::Expired);
        bounty.worker = worker;
        bounty.status = BountyStatus::Assigned;
        emit!(WorkerAssigned { task_id: bounty.task_id, worker });
        Ok(())
    }

    pub fn submit_work(ctx: Context<SubmitWork>, submission_hash: [u8; 32]) -> Result<()> {
        let bounty = &mut ctx.accounts.bounty;
        let now = Clock::get()?.unix_timestamp;
        require!(bounty.status == BountyStatus::Assigned, BountyError::InvalidState);
        require!(now < bounty.deadline, BountyError::Expired);
        require!(submission_hash != [0; 32], BountyError::EmptyHash);
        bounty.submission_hash = submission_hash;
        bounty.submitted_at = now;
        bounty.review_deadline = now
            .checked_add(REVIEW_PERIOD_SECONDS)
            .ok_or(BountyError::ArithmeticOverflow)?;
        bounty.status = BountyStatus::Submitted;
        emit!(WorkSubmitted { task_id: bounty.task_id, worker: bounty.worker, submission_hash });
        Ok(())
    }

    pub fn approve_and_pay(ctx: Context<ApproveAndPay>) -> Result<()> {
        let bounty = &mut ctx.accounts.bounty;
        require!(bounty.status == BountyStatus::Submitted, BountyError::InvalidState);
        let amount = ctx.accounts.escrow.lamports();
        require!(amount >= bounty.amount, BountyError::EscrowUnderfunded);
        let task_id = bounty.task_id;
        let bump = [bounty.escrow_bump];
        let task_id_bytes = task_id.to_le_bytes();
        let signer_seeds: &[&[&[u8]]] =
            &[&[b"escrow", bounty.employer.as_ref(), &task_id_bytes, &bump]];

        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.key(),
                Transfer {
                    from: ctx.accounts.escrow.to_account_info(),
                    to: ctx.accounts.worker.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;
        bounty.status = BountyStatus::Paid;
        emit!(BountyPaid { task_id, worker: bounty.worker, amount });
        Ok(())
    }

    /// If the employer does not review a submission within seven days, the assigned worker can
    /// release the escrow. This prevents an accepted submission from becoming permanently locked.
    pub fn claim_after_review_timeout(ctx: Context<ClaimAfterReviewTimeout>) -> Result<()> {
        let bounty = &mut ctx.accounts.bounty;
        require!(bounty.status == BountyStatus::Submitted, BountyError::InvalidState);
        require!(
            Clock::get()?.unix_timestamp >= bounty.review_deadline,
            BountyError::ReviewPeriodActive
        );
        let amount = ctx.accounts.escrow.lamports();
        require!(amount >= bounty.amount, BountyError::EscrowUnderfunded);
        let task_id = bounty.task_id;
        let worker = bounty.worker;
        let bump = [bounty.escrow_bump];
        let task_id_bytes = task_id.to_le_bytes();
        let signer_seeds: &[&[&[u8]]] =
            &[&[b"escrow", bounty.employer.as_ref(), &task_id_bytes, &bump]];

        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.key(),
                Transfer {
                    from: ctx.accounts.escrow.to_account_info(),
                    to: ctx.accounts.worker.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;
        bounty.status = BountyStatus::Paid;
        emit!(BountyPaid { task_id, worker, amount });
        Ok(())
    }

    pub fn refund_expired(ctx: Context<RefundExpired>) -> Result<()> {
        let bounty = &mut ctx.accounts.bounty;
        require!(
            bounty.status == BountyStatus::Open || bounty.status == BountyStatus::Assigned,
            BountyError::InvalidState
        );
        require!(Clock::get()?.unix_timestamp >= bounty.deadline, BountyError::NotExpired);
        let amount = ctx.accounts.escrow.lamports();
        require!(amount >= bounty.amount, BountyError::EscrowUnderfunded);
        let task_id = bounty.task_id;
        let bump = [bounty.escrow_bump];
        let task_id_bytes = task_id.to_le_bytes();
        let signer_seeds: &[&[&[u8]]] =
            &[&[b"escrow", bounty.employer.as_ref(), &task_id_bytes, &bump]];

        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.key(),
                Transfer {
                    from: ctx.accounts.escrow.to_account_info(),
                    to: ctx.accounts.employer.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;
        bounty.status = BountyStatus::Refunded;
        emit!(BountyRefunded { task_id, employer: bounty.employer, amount });
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(task_id: u64)]
pub struct CreateBounty<'info> {
    #[account(mut)]
    pub employer: Signer<'info>,
    #[account(
        init,
        payer = employer,
        space = 8 + Bounty::INIT_SPACE,
        seeds = [b"bounty", employer.key().as_ref(), &task_id.to_le_bytes()],
        bump
    )]
    pub bounty: Account<'info, Bounty>,
    /// CHECK: This is a system-owned PDA that only this program can sign for in a System Program transfer.
    #[account(mut, seeds = [b"escrow", employer.key().as_ref(), &task_id.to_le_bytes()], bump)]
    pub escrow: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AssignWorker<'info> {
    pub employer: Signer<'info>,
    #[account(mut, has_one = employer)]
    pub bounty: Account<'info, Bounty>,
}

#[derive(Accounts)]
pub struct SubmitWork<'info> {
    pub worker: Signer<'info>,
    #[account(mut, constraint = bounty.worker == worker.key() @ BountyError::Unauthorized)]
    pub bounty: Account<'info, Bounty>,
}

#[derive(Accounts)]
pub struct ApproveAndPay<'info> {
    pub employer: Signer<'info>,
    #[account(mut, has_one = employer)]
    pub bounty: Account<'info, Bounty>,
    /// CHECK: Must be the worker recorded in the bounty; receives the fixed escrow amount.
    #[account(mut, constraint = worker.key() == bounty.worker @ BountyError::Unauthorized)]
    pub worker: UncheckedAccount<'info>,
    /// CHECK: PDA and employer/task seeds are checked; system-owned account is enforced by SystemAccount.
    #[account(mut, seeds = [b"escrow", bounty.employer.as_ref(), &bounty.task_id.to_le_bytes()], bump = bounty.escrow_bump)]
    pub escrow: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimAfterReviewTimeout<'info> {
    #[account(mut)]
    pub worker: Signer<'info>,
    #[account(mut, constraint = bounty.worker == worker.key() @ BountyError::Unauthorized)]
    pub bounty: Account<'info, Bounty>,
    /// CHECK: PDA and stored bump checked; system-owned account is enforced by SystemAccount.
    #[account(mut, seeds = [b"escrow", bounty.employer.as_ref(), &bounty.task_id.to_le_bytes()], bump = bounty.escrow_bump)]
    pub escrow: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RefundExpired<'info> {
    #[account(mut)]
    pub employer: Signer<'info>,
    #[account(mut, has_one = employer)]
    pub bounty: Account<'info, Bounty>,
    /// CHECK: PDA and stored bump checked; system-owned account is enforced by SystemAccount.
    #[account(mut, seeds = [b"escrow", bounty.employer.as_ref(), &bounty.task_id.to_le_bytes()], bump = bounty.escrow_bump)]
    pub escrow: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct Bounty {
    pub task_id: u64,
    pub employer: Pubkey,
    pub worker: Pubkey,
    pub amount: u64,
    pub deadline: i64,
    pub brief_hash: [u8; 32],
    pub submission_hash: [u8; 32],
    pub submitted_at: i64,
    pub review_deadline: i64,
    pub status: BountyStatus,
    pub created_at: i64,
    pub bump: u8,
    pub escrow_bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum BountyStatus { Open, Assigned, Submitted, Paid, Refunded }

#[event]
pub struct BountyCreated { pub task_id: u64, pub employer: Pubkey, pub amount: u64, pub deadline: i64 }
#[event]
pub struct WorkerAssigned { pub task_id: u64, pub worker: Pubkey }
#[event]
pub struct WorkSubmitted { pub task_id: u64, pub worker: Pubkey, pub submission_hash: [u8; 32] }
#[event]
pub struct BountyPaid { pub task_id: u64, pub worker: Pubkey, pub amount: u64 }
#[event]
pub struct BountyRefunded { pub task_id: u64, pub employer: Pubkey, pub amount: u64 }

#[error_code]
pub enum BountyError {
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Deadline must be in the future")]
    DeadlineMustBeFuture,
    #[msg("Deadline cannot be more than 30 days away")]
    DeadlineTooFar,
    #[msg("Hash cannot be empty")]
    EmptyHash,
    #[msg("Worker wallet is invalid")]
    InvalidWorker,
    #[msg("Bounty deadline has expired")]
    Expired,
    #[msg("Bounty deadline has not expired")]
    NotExpired,
    #[msg("Bounty is not in a state for this action")]
    InvalidState,
    #[msg("Signer is not authorized for this action")]
    Unauthorized,
    #[msg("The employer's review period is still active")]
    ReviewPeriodActive,
    #[msg("Escrow balance is below the recorded bounty amount")]
    EscrowUnderfunded,
    #[msg("Timestamp arithmetic overflow")]
    ArithmeticOverflow,
}

#[cfg(test)]
mod tests;
