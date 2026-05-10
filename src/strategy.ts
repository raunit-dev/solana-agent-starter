import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { SolanaConnectionManager } from './solana/connection';
import type { StrategyInput, StrategyOutput } from './shared';

export async function strategy(input: StrategyInput): Promise<StrategyOutput> {
  const wallet =
    (typeof input.wallet === 'string' && input.wallet) ||
    process.env.WATCH_WALLET ||
    'So11111111111111111111111111111111111111112';

  const connection = SolanaConnectionManager.getInstance();
  const [slot, lamports] = await Promise.all([connection.getSlot(), connection.getBalance(new PublicKey(wallet))]);

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
