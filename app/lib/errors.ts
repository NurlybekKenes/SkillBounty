import {
  isSolanaError,
  SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM,
} from "@solana/kit";
const BOUNTY_ERROR_MESSAGES: Record<number, string> = {
  6000: "Amount must be greater than zero.",
  6001: "The deadline must be in the future.",
  6002: "The deadline cannot be more than 30 days away.",
  6003: "A task or submission hash is missing.",
  6004: "This worker wallet cannot be assigned.",
  6005: "The bounty has expired.",
  6006: "The bounty has not expired yet.",
  6007: "This bounty is not in a state for that action.",
  6008: "This wallet is not authorized for that action.",
};

export function parseTransactionError(err: unknown): string {
  // Wallet rejection (comes from wallet-standard, not a SolanaError)
  if (err instanceof Error && err.message.includes("User rejected")) {
    return "Transaction was rejected by the wallet.";
  }

  // Anchor custom errors have stable program-local codes.
  if (
    isSolanaError(err, SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM) &&
    typeof err.context?.code === "number"
  ) {
    const bountyError = BOUNTY_ERROR_MESSAGES[err.context.code];
    if (bountyError !== undefined) {
      return bountyError;
    }
  }

  // For all other errors, kit's SolanaError already has readable messages.
  // Walk the cause chain to find the deepest message.
  const message = getDeepestMessage(err);
  return message.length > 200 ? `${message.slice(0, 200)}...` : message;
}

function getDeepestMessage(err: unknown): string {
  let deepest = err instanceof Error ? err.message : String(err);
  let current: unknown = err;

  while (current instanceof Error && current.cause) {
    current = current.cause;
    if (current instanceof Error) {
      deepest = current.message;
    }
  }

  return deepest;
}
