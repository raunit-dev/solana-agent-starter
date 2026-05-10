import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { strategy } from '../strategy';
import { SolanaConnectionManager } from '../solana/connection';
import type { StrategyInput, StrategyOutput, WalletSnapshot } from '../shared';

/**
 * Activity — runs the user's strategy.
 *
 * Activities run on the activity worker (regular Node), so they're allowed to
 * be non-deterministic: fetch, RPC, dns, Date.now(), Math.random(), env vars.
 */
export async function runStrategy(input: StrategyInput): Promise<StrategyOutput> {
  return strategy(input);
}

// ---- example activities (used by walletDeltaWorkflow) ----

/**
 * Fetch a wallet's SOL balance + the current slot.
 *
 * This is a normal async function — write as many of these as you like and
 * import them via `proxyActivities` in `src/temporal/workflows.ts`.
 */
export async function getWalletSnapshot(address: string): Promise<WalletSnapshot> {
  const connection = SolanaConnectionManager.getInstance();
  const pubkey = new PublicKey(address);
  const [slot, lamports] = await Promise.all([
    connection.getSlot(),
    connection.getBalance(pubkey),
  ]);
  return {
    address,
    slot,
    lamports,
    sol: lamports / LAMPORTS_PER_SOL,
    observedAt: new Date().toISOString(),
  };
}

/**
 * Send a notification. Posts to `NOTIFY_WEBHOOK` (Slack/Discord-compatible)
 * if set; otherwise just logs. Swap in your real notifier of choice.
 */
export async function notify(message: string): Promise<void> {
  const webhook = process.env.NOTIFY_WEBHOOK;
  if (!webhook) {
    console.log(`[notify] ${message}`);
    return;
  }
  const response = await fetch(webhook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: message }),
  });
  if (!response.ok) {
    throw new Error(`notify webhook failed with status ${response.status}`);
  }
}
