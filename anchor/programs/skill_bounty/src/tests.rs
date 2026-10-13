#[cfg(test)]
mod tests {
    use crate::ID as PROGRAM_ID;
    use anchor_lang::system_program;
    use litesvm::LiteSVM;
    use solana_sdk::{
        hash::hash,
        instruction::{AccountMeta, Instruction},
        pubkey::Pubkey,
        signature::Keypair,
        signer::Signer,
        sysvar::clock::Clock,
        transaction::Transaction,
    };

    const LAMPORTS_PER_SOL: u64 = 1_000_000_000;
    const TASK_ID: u64 = 7;

    fn discriminator(name: &str) -> Vec<u8> {
        hash(format!("global:{name}").as_bytes()).to_bytes()[..8].to_vec()
    }

    fn pda(seed: &[u8], employer: &Pubkey, task_id: u64) -> Pubkey {
        Pubkey::find_program_address(&[seed, employer.as_ref(), &task_id.to_le_bytes()], &PROGRAM_ID).0
    }

    fn tx(svm: &mut LiteSVM, payer: &Keypair, ix: Instruction) -> Result<(), String> {
        let transaction = Transaction::new_signed_with_payer(
            &[ix],
            Some(&payer.pubkey()),
            &[payer],
            svm.latest_blockhash(),
        );
        svm.send_transaction(transaction).map(|_| ()).map_err(|e| format!("{e:?}"))
    }

    fn load() -> (LiteSVM, Keypair, Keypair, Pubkey, Pubkey) {
        let mut svm = LiteSVM::new();
        svm.add_program(PROGRAM_ID, include_bytes!("../../../target/deploy/skill_bounty.so"))
            .unwrap();
        let employer = Keypair::new();
        let worker = Keypair::new();
        svm.airdrop(&employer.pubkey(), 5 * LAMPORTS_PER_SOL).unwrap();
        svm.airdrop(&worker.pubkey(), LAMPORTS_PER_SOL).unwrap();
        let bounty = pda(b"bounty", &employer.pubkey(), TASK_ID);
        let escrow = pda(b"escrow", &employer.pubkey(), TASK_ID);
        (svm, employer, worker, bounty, escrow)
    }

    fn create_ix(employer: &Pubkey, bounty: &Pubkey, escrow: &Pubkey, deadline: i64) -> Instruction {
        let mut data = discriminator("create_bounty");
        data.extend_from_slice(&TASK_ID.to_le_bytes());
        data.extend_from_slice(&LAMPORTS_PER_SOL.to_le_bytes());
        data.extend_from_slice(&deadline.to_le_bytes());
        data.extend_from_slice(&[9; 32]);
        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*employer, true),
                AccountMeta::new(*bounty, false),
                AccountMeta::new(*escrow, false),
                AccountMeta::new_readonly(system_program::ID, false),
            ],
            data,
        }
    }

    fn assign_ix(employer: &Pubkey, bounty: &Pubkey, worker: &Pubkey) -> Instruction {
        let mut data = discriminator("assign_worker");
        data.extend_from_slice(worker.as_ref());
        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new_readonly(*employer, true),
                AccountMeta::new(*bounty, false),
            ],
            data,
        }
    }

    #[test]
    fn create_assign_submit_and_pay_moves_escrow_to_worker() {
        let (mut svm, employer, worker, bounty, escrow) = load();
        let deadline = svm.get_sysvar::<Clock>().unix_timestamp + 3600;
        tx(&mut svm, &employer, create_ix(&employer.pubkey(), &bounty, &escrow, deadline)).unwrap();
        assert_eq!(svm.get_account(&escrow).unwrap().lamports, LAMPORTS_PER_SOL);

        tx(&mut svm, &employer, assign_ix(&employer.pubkey(), &bounty, &worker.pubkey())).unwrap();

        let mut submit_data = discriminator("submit_work");
        submit_data.extend_from_slice(&[3; 32]);
        tx(&mut svm, &worker, Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![AccountMeta::new_readonly(worker.pubkey(), true), AccountMeta::new(bounty, false)],
            data: submit_data,
        }).unwrap();

        let worker_balance_before_payment = svm.get_account(&worker.pubkey()).unwrap().lamports;

        tx(&mut svm, &employer, Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new_readonly(employer.pubkey(), true),
                AccountMeta::new(bounty, false),
                AccountMeta::new(worker.pubkey(), false),
                AccountMeta::new(escrow, false),
                AccountMeta::new_readonly(system_program::ID, false),
            ],
            data: discriminator("approve_and_pay"),
        }).unwrap();

        assert_eq!(svm.get_account(&escrow).map(|account| account.lamports).unwrap_or(0), 0);
        assert_eq!(
            svm.get_account(&worker.pubkey()).unwrap().lamports,
            worker_balance_before_payment + LAMPORTS_PER_SOL
        );
    }

    #[test]
    fn unrelated_wallet_cannot_assign_worker() {
        let (mut svm, employer, _worker, bounty, escrow) = load();
        let outsider = Keypair::new();
        svm.airdrop(&outsider.pubkey(), LAMPORTS_PER_SOL).unwrap();
        let deadline = svm.get_sysvar::<Clock>().unix_timestamp + 3600;
        tx(&mut svm, &employer, create_ix(&employer.pubkey(), &bounty, &escrow, deadline)).unwrap();
        let mut data = discriminator("assign_worker");
        data.extend_from_slice(Pubkey::new_unique().as_ref());
        let result = tx(&mut svm, &outsider, Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![AccountMeta::new_readonly(outsider.pubkey(), true), AccountMeta::new(bounty, false)],
            data,
        });
        assert!(result.is_err());
    }

    #[test]
    fn bounty_cannot_be_assigned_twice() {
        let (mut svm, employer, worker, bounty, escrow) = load();
        let second_worker = Keypair::new();
        let deadline = svm.get_sysvar::<Clock>().unix_timestamp + 3600;
        tx(&mut svm, &employer, create_ix(&employer.pubkey(), &bounty, &escrow, deadline)).unwrap();
        tx(&mut svm, &employer, assign_ix(&employer.pubkey(), &bounty, &worker.pubkey())).unwrap();

        let result = tx(&mut svm, &employer, assign_ix(&employer.pubkey(), &bounty, &second_worker.pubkey()));
        assert!(result.is_err(), "A bounty in Assigned state cannot be reassigned");
    }

    #[test]
    fn off_curve_worker_cannot_be_assigned() {
        let (mut svm, employer, _worker, bounty, escrow) = load();
        let deadline = svm.get_sysvar::<Clock>().unix_timestamp + 3600;
        tx(&mut svm, &employer, create_ix(&employer.pubkey(), &bounty, &escrow, deadline)).unwrap();
        let off_curve = Pubkey::find_program_address(&[b"not-a-wallet"], &PROGRAM_ID).0;
        let result = tx(&mut svm, &employer, assign_ix(&employer.pubkey(), &bounty, &off_curve));
        assert!(result.is_err(), "A PDA cannot be assigned as a worker because it cannot sign");
    }

    #[test]
    fn expired_open_bounty_can_be_refunded_to_employer() {
        let (mut svm, employer, _worker, bounty, escrow) = load();
        let deadline = svm.get_sysvar::<Clock>().unix_timestamp + 60;
        tx(&mut svm, &employer, create_ix(&employer.pubkey(), &bounty, &escrow, deadline)).unwrap();

        let mut clock: Clock = svm.get_sysvar();
        clock.unix_timestamp = deadline;
        svm.set_sysvar(&clock);
        let result = tx(&mut svm, &employer, Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(employer.pubkey(), true),
                AccountMeta::new(bounty, false),
                AccountMeta::new(escrow, false),
                AccountMeta::new_readonly(system_program::ID, false),
            ],
            data: discriminator("refund_expired"),
        });

        assert!(result.is_ok(), "An expired, unsubmitted bounty can be refunded");
        assert_eq!(svm.get_account(&escrow).map(|account| account.lamports).unwrap_or(0), 0);
    }

    #[test]
    fn worker_can_claim_if_employer_does_not_review_within_seven_days() {
        let (mut svm, employer, worker, bounty, escrow) = load();
        let deadline = svm.get_sysvar::<Clock>().unix_timestamp + 3600;
        tx(&mut svm, &employer, create_ix(&employer.pubkey(), &bounty, &escrow, deadline)).unwrap();
        tx(&mut svm, &employer, assign_ix(&employer.pubkey(), &bounty, &worker.pubkey())).unwrap();

        let mut submit_data = discriminator("submit_work");
        submit_data.extend_from_slice(&[3; 32]);
        tx(&mut svm, &worker, Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![AccountMeta::new_readonly(worker.pubkey(), true), AccountMeta::new(bounty, false)],
            data: submit_data,
        }).unwrap();

        let mut clock: Clock = svm.get_sysvar();
        clock.unix_timestamp += 7 * 24 * 60 * 60;
        svm.set_sysvar(&clock);
        let before = svm.get_account(&worker.pubkey()).unwrap().lamports;
        tx(&mut svm, &worker, Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(worker.pubkey(), true),
                AccountMeta::new(bounty, false),
                AccountMeta::new(escrow, false),
                AccountMeta::new_readonly(system_program::ID, false),
            ],
            data: discriminator("claim_after_review_timeout"),
        }).unwrap();

        let after = svm.get_account(&worker.pubkey()).unwrap().lamports;
        assert!(after + 10_000 >= before + LAMPORTS_PER_SOL, "Worker receives the bounty minus transaction fees");
        assert_eq!(svm.get_account(&escrow).map(|account| account.lamports).unwrap_or(0), 0);
    }
}
