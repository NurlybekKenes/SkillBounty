"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { address, type Address } from "@solana/kit";
import { useSolanaClient } from "../lib/solana-client-context";
import { useWallet } from "../lib/wallet/context";
import { useSendTransaction } from "../lib/hooks/use-send-transaction";
import { formatSol } from "../lib/demo-data";
import {
  BountyStatus,
  fetchMaybeBounty,
  findBountyPda,
  findEscrowPda,
  getApproveAndPayInstruction,
  getAssignWorkerInstruction,
  getClaimAfterReviewTimeoutInstruction,
  getCreateBountyInstructionAsync,
  getRefundExpiredInstruction,
  getSubmitWorkInstruction,
  SKILL_BOUNTY_PROGRAM_ADDRESS,
} from "../generated/skill_bounty";

const panelClass = "rounded-lg border border-border bg-card p-5 sm:p-6";
const inputClass =
  "min-h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function shortAddress(value: string) {
  return `${value.slice(0, 5)}…${value.slice(-5)}`;
}

async function hashText(value: string) {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
  );
}

export function BountyChainPanel({
  draft,
}: {
  draft: {
    id: string;
    title: string;
    summary: string;
    rewardLamports: bigint;
  } | null;
}) {
  const client = useSolanaClient();
  const { wallet, signer, status } = useWallet();
  const { send, isSending } = useSendTransaction();
  const [programState, setProgramState] = useState<
    "checking" | "ready" | "missing" | "error"
  >("checking");
  const [programMessage, setProgramMessage] = useState("");
  const [taskId, setTaskId] = useState("");
  const [workerAddress, setWorkerAddress] = useState("");
  const [submission, setSubmission] = useState("");
  const [bountyAddress, setBountyAddress] = useState<Address | null>(null);
  const [bounty, setBounty] = useState<Awaited<
    ReturnType<typeof fetchMaybeBounty>
  > | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const inspectProgram = useCallback(async () => {
    try {
      const result = await client.rpc
        .getAccountInfo(SKILL_BOUNTY_PROGRAM_ADDRESS, { encoding: "base64" })
        .send();
      if (result.value?.executable) {
        return {
          state: "ready" as const,
          message: "Program is executable on Devnet.",
        };
      } else {
        return {
          state: "missing" as const,
          message: "The SkillBounty program is not deployed on Devnet yet.",
        };
      }
    } catch {
      return {
        state: "error" as const,
        message: "Could not check Devnet. Check the RPC connection and retry.",
      };
    }
  }, [client]);

  useEffect(() => {
    let active = true;
    void inspectProgram().then((result) => {
      if (!active) return;
      setProgramState(result.state);
      setProgramMessage(result.message);
    });
    return () => {
      active = false;
    };
  }, [inspectProgram]);

  const refreshProgram = useCallback(async () => {
    setProgramState("checking");
    const result = await inspectProgram();
    setProgramState(result.state);
    setProgramMessage(result.message);
  }, [inspectProgram]);

  const connectedAddress = wallet?.account.address;
  const isBusy = isSending || isLoading;

  const loadBounty = useCallback(async () => {
    setError("");
    setNotice("");
    if (!connectedAddress || !taskId.trim()) {
      setError("Connect the employer wallet and enter the bounty task ID.");
      return;
    }
    if (programState !== "ready") {
      setError(
        "The program must be deployed on Devnet before reading bounties."
      );
      return;
    }
    try {
      setIsLoading(true);
      const id = BigInt(taskId.trim());
      if (id <= 0n) throw new Error("Task ID must be a positive integer.");
      const [derived] = await findBountyPda({
        employer: address(connectedAddress),
        taskId: id,
      });
      const result = await fetchMaybeBounty(client.rpc, derived);
      setBountyAddress(derived);
      setBounty(result);
      if (result.exists) {
        setWorkerAddress(result.data.worker);
        setNotice("Bounty loaded from Devnet.");
      } else {
        setNotice("No on-chain bounty exists for this employer and task ID.");
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not load bounty."
      );
    } finally {
      setIsLoading(false);
    }
  }, [client.rpc, connectedAddress, programState, taskId]);

  async function createBounty() {
    setError("");
    setNotice("");
    if (!signer || !connectedAddress) {
      setError("Connect a wallet to create and fund a bounty.");
      return;
    }
    if (programState !== "ready") {
      setError(
        "The program is not deployed on Devnet, so escrow creation is unavailable."
      );
      return;
    }
    if (!draft) {
      setError(
        "Save a project draft first. Sample opportunities are not on-chain listings."
      );
      return;
    }
    if (draft.rewardLamports <= 0n) {
      setError("The bounty reward must be greater than zero.");
      return;
    }
    try {
      setIsLoading(true);
      const random = new Uint32Array(2);
      crypto.getRandomValues(random);
      const id = (BigInt(random[0]) << 32n) | BigInt(random[1]);
      const employer = address(connectedAddress);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60);
      const [bountyPda] = await findBountyPda({ employer, taskId: id });
      const instruction = await getCreateBountyInstructionAsync({
        employer: signer,
        taskId: id,
        amount: draft.rewardLamports,
        deadline,
        briefHash: await hashText(`${draft.title}\n${draft.summary}`),
      });
      const amountText = formatSol(draft.rewardLamports);
      const approved = window.confirm(
        `Review Devnet transaction\n\nAction: create and fund SkillBounty escrow\nTask: ${draft.title}\nReward: ${amountText} SOL\nEmployer: ${employer}\nBounty account: ${bountyPda}\nProgram: ${SKILL_BOUNTY_PROGRAM_ADDRESS}\nNetwork fee: shown by your wallet before signing\n\nContinue to your wallet for transaction simulation and signature?`
      );
      if (!approved) return;
      const signature = await send({ instructions: [instruction] });
      setTaskId(id.toString());
      setBountyAddress(bountyPda);
      setBounty(null);
      setNotice(`Escrow created. Transaction: ${signature}`);
      window.open(
        `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not create the escrow transaction."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function performAction(
    action: "assign" | "submit" | "approve" | "claim" | "refund"
  ) {
    setError("");
    setNotice("");
    if (!signer || !connectedAddress || !bountyAddress || !bounty?.exists) {
      setError(
        "Connect the relevant wallet and load an existing on-chain bounty first."
      );
      return;
    }
    try {
      setIsLoading(true);
      const id = BigInt(taskId);
      const [escrow] = await findEscrowPda({
        employer: address(connectedAddress),
        taskId: id,
      });
      let instruction;
      let confirmation = "";
      if (action === "assign") {
        const worker = address(workerAddress);
        if (worker === address(connectedAddress))
          throw new Error("Employer and worker must be different wallets.");
        instruction = getAssignWorkerInstruction({
          employer: signer,
          bounty: bountyAddress,
          worker,
        });
        confirmation = `Assign worker ${worker} to bounty ${bountyAddress}? The ${formatSol(bounty.data.amount)} SOL reward stays locked in escrow; this action does not transfer the reward.`;
      } else if (action === "submit") {
        if (bounty.data.worker !== connectedAddress)
          throw new Error("Only the assigned worker wallet can submit work.");
        if (submission.trim().length < 8)
          throw new Error(
            "Enter a deliverable URL or short reference (at least 8 characters)."
          );
        instruction = getSubmitWorkInstruction({
          worker: signer,
          bounty: bountyAddress,
          submissionHash: await hashText(submission.trim()),
        });
        confirmation = `Submit the SHA-256 hash of this deliverable reference on Devnet?\n\nBounty: ${bountyAddress}\nAmount transferred: 0 SOL (network fee only)\nThe reference itself stays off-chain.`;
      } else if (action === "approve") {
        if (bounty.data.employer !== connectedAddress)
          throw new Error("Only the employer wallet can approve payout.");
        instruction = getApproveAndPayInstruction({
          employer: signer,
          bounty: bountyAddress,
          worker: bounty.data.worker,
          escrow,
        });
        confirmation = `Approve the work and release ${formatSol(bounty.data.amount)} SOL to ${bounty.data.worker}?`;
      } else if (action === "claim") {
        if (bounty.data.worker !== connectedAddress)
          throw new Error(
            "Only the assigned worker wallet can claim the submitted bounty."
          );
        instruction = getClaimAfterReviewTimeoutInstruction({
          worker: signer,
          bounty: bountyAddress,
          escrow,
        });
        confirmation = `Claim ${formatSol(bounty.data.amount)} SOL to worker ${connectedAddress} after the employer review timeout?`;
      } else {
        if (bounty.data.employer !== connectedAddress)
          throw new Error(
            "Only the employer wallet can reclaim an expired unsubmitted bounty."
          );
        instruction = getRefundExpiredInstruction({
          employer: signer,
          bounty: bountyAddress,
          escrow,
        });
        confirmation = `Refund ${formatSol(bounty.data.amount)} SOL to employer ${connectedAddress} after the deadline?`;
      }
      const approved = window.confirm(
        `Review Devnet transaction\n\n${confirmation}\n\nBounty: ${bountyAddress}\nProgram: ${SKILL_BOUNTY_PROGRAM_ADDRESS}\nNetwork fee: shown by your wallet before signing\n\nContinue to your wallet for transaction simulation and signature?`
      );
      if (!approved) return;
      const signature = await send({ instructions: [instruction] });
      setNotice(`Transaction confirmed by wallet. Signature: ${signature}`);
      await loadBounty();
      window.open(
        `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The transaction could not be prepared."
      );
    } finally {
      setIsLoading(false);
    }
  }

  const statusLabel = useMemo(() => {
    if (!bounty?.exists) return "Not found";
    return BountyStatus[bounty.data.status];
  }, [bounty]);

  return (
    <section className={panelClass} aria-labelledby="chain-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Solana · Devnet
          </p>
          <h2
            id="chain-title"
            className="mt-1 text-xl font-semibold tracking-tight"
          >
            Escrow and proof of work
          </h2>
        </div>
        <span className="rounded border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          {programState}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {programMessage} On-chain data contains wallet addresses and hashes
        only; task text and deliverables stay off-chain.
      </p>

      {draft && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background p-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">
              Create escrow for the saved draft
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {draft.title} · {formatSol(draft.rewardLamports)} SOL
            </p>
          </div>
          <button
            type="button"
            disabled={
              programState !== "ready" || status !== "connected" || isBusy
            }
            onClick={() => void createBounty()}
            className="min-h-10 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending
              ? "Waiting for wallet…"
              : isLoading
                ? "Preparing…"
                : "Create and fund"}
          </button>
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="grid gap-1.5 text-sm font-medium">
          Load a bounty by task ID
          <input
            className={inputClass}
            inputMode="numeric"
            value={taskId}
            onChange={(event) =>
              setTaskId(event.target.value.replace(/\D/g, ""))
            }
            placeholder="Task ID from the create transaction"
          />
        </label>
        <button
          type="button"
          disabled={
            programState !== "ready" || status !== "connected" || isBusy
          }
          onClick={() => void loadBounty()}
          className="min-h-10 self-end rounded-md border border-border px-3 text-sm font-semibold hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          Load on-chain state
        </button>
      </div>

      {bounty?.exists && (
        <div className="mt-4 rounded-md border border-border bg-background p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-sm font-semibold">
              {statusLabel}
            </span>
            <span className="break-all font-mono text-[10px] text-muted-foreground">
              {shortAddress(bountyAddress ?? "")}
            </span>
          </div>
          <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Reward</dt>
              <dd className="mt-1 font-mono tabular-nums">
                {formatSol(bounty.data.amount)} SOL
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Assigned worker</dt>
              <dd className="mt-1 break-all font-mono">
                {bounty.data.worker === "11111111111111111111111111111111"
                  ? "Not assigned"
                  : bounty.data.worker}
              </dd>
            </div>
          </dl>

          {bounty.data.status === BountyStatus.Open &&
            bounty.data.employer === connectedAddress && (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  className={`${inputClass} min-w-0 flex-1 font-mono`}
                  aria-label="Worker wallet address"
                  value={workerAddress}
                  onChange={(event) => setWorkerAddress(event.target.value)}
                  placeholder="Worker wallet address"
                />
                <button
                  type="button"
                  disabled={isBusy || !workerAddress}
                  onClick={() => void performAction("assign")}
                  className="min-h-10 rounded-md border border-border px-3 text-sm font-semibold hover:bg-accent disabled:opacity-50"
                >
                  Assign worker
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void performAction("refund")}
                  className="min-h-10 rounded-md border border-border px-3 text-sm font-semibold hover:bg-accent disabled:opacity-50"
                >
                  Refund after expiry
                </button>
              </div>
            )}
          {bounty.data.status === BountyStatus.Assigned &&
            bounty.data.worker === connectedAddress && (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  className={`${inputClass} min-w-0 flex-1`}
                  aria-label="Deliverable reference"
                  value={submission}
                  onChange={(event) => setSubmission(event.target.value)}
                  placeholder="Deliverable URL (kept off-chain)"
                />
                <button
                  type="button"
                  disabled={isBusy || !submission.trim()}
                  onClick={() => void performAction("submit")}
                  className="min-h-10 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  Submit hash
                </button>
              </div>
            )}
          {bounty.data.status === BountyStatus.Submitted && (
            <div className="mt-4 flex flex-wrap gap-2">
              {bounty.data.employer === connectedAddress && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void performAction("approve")}
                  className="min-h-10 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  Approve and pay worker
                </button>
              )}
              {bounty.data.worker === connectedAddress && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void performAction("claim")}
                  className="min-h-10 rounded-md border border-border px-3 text-sm font-semibold disabled:opacity-50"
                >
                  Claim after review timeout
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {(notice || error) && (
        <p
          role={error ? "alert" : "status"}
          className={`mt-4 break-words text-xs leading-5 ${error ? "text-destructive" : "text-primary"}`}
        >
          {error || notice}
        </p>
      )}
      {programState === "missing" && (
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          The contract was compiled and tested locally, but Devnet deployment is
          still required before wallet actions can run. The app will unlock this
          flow automatically once the program is available.
        </p>
      )}
      <p className="mt-4 border-t border-border pt-3 text-[11px] leading-5 text-muted-foreground">
        Each confirmation describes the action and any SOL transfer, then opens
        the connected wallet. Review the wallet’s simulation and fee before
        signing. No transaction is sent automatically.
      </p>
      <button
        type="button"
        onClick={() => void refreshProgram()}
        className="mt-3 min-h-9 rounded-md px-2 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        Recheck program availability
      </button>
    </section>
  );
}
