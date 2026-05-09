import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { SolanaConnectionManager } from './solana/connection';
import type { StrategyInput, StrategyOutput } from './shared';

/**
 * Your strategy lives here.
 *
 * Anything goes — Solana RPC calls, Jupiter swaps, Helius lookups, DB writes,
 * HTTP calls, Math.random, env vars, the works. This function runs as a
 * Temporal activity, so it does NOT need to be deterministic.
 *
 * What Temporal gives you for free by wrapping it:
 *   • Cron-style schedules (deploy / pause / resume / invoke / retire)
 *   • A run log per firing — inputs, outputs, errors, timing — in the Temporal UI
 *   • Crash safety: if the worker dies mid-run, the run is timed out and marked
 *     failed instead of silently disappearing
 *   • Horizontal scaling: spin up more workers and they share the same task queue
 *
 * Throw on failure. Temporal will retry per the policy in `src/workflows.ts`.
 */
export async function strategy(input: StrategyInput): Promise<StrategyOutput> {
  const wallet =
    (typeof input.wallet === 'string' && input.wallet) ||
    process.env.WATCH_WALLET ||
    'So11111111111111111111111111111111111111112'; // Wrapped SOL mint, just for demo

  const connection = SolanaConnectionManager.getInstance();
  const [slot, lamports] = await Promise.all([
    connection.getSlot(),
    connection.getBalance(new PublicKey(wallet)),
  ]);

  const sol = lamports / LAMPORTS_PER_SOL;

  return {
    ok: true,
    summary: `wallet ${wallet} holds ${sol} SOL @ slot ${slot}`,
    data: {
      wallet,
      lamports,
      sol,
      slot,
      observedAt: new Date().toISOString(),
      rpcUrl: connection.rpcEndpoint,
    },
  };
}
