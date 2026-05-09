import { strategy } from './strategy';
import type { StrategyInput, StrategyOutput } from './shared';

/**
 * Single activity — runs the user's strategy.
 *
 * Activities run on the activity worker (regular Node), so they're allowed to
 * be non-deterministic: fetch, RPC, dns, Date.now(), Math.random(), env vars.
 */
export async function runStrategy(input: StrategyInput): Promise<StrategyOutput> {
  return strategy(input);
}
