import { proxyActivities, sleep } from '@temporalio/workflow';
import type * as activities from '../../temporal/activities';
import type { TokenSupplyDeltaInput, TokenSupplyDeltaResult } from './types';

const { getTokenSupplySnapshot, notify } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '5 seconds',
    maximumInterval: '5 minutes',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

function positiveSeconds(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return fallback;
  return Math.ceil(value);
}

/** Compare SPL token supply before/after a durable wait. */
export async function tokenSupplyDeltaWorkflow(input: TokenSupplyDeltaInput): Promise<TokenSupplyDeltaResult> {
  const intervalSeconds = positiveSeconds(input.intervalSeconds, 60);
  const before = await getTokenSupplySnapshot(input.mint);
  await sleep(`${intervalSeconds} seconds`);
  const after = await getTokenSupplySnapshot(input.mint);
  const deltaAmount = (BigInt(after.amount) - BigInt(before.amount)).toString();
  const changed = deltaAmount !== '0';
  let notificationSent = false;

  if (changed && input.notify === true) {
    await notify(`token ${input.mint} supply changed by raw amount ${deltaAmount}`);
    notificationSent = true;
  }

  return {
    mint: input.mint,
    before,
    after,
    deltaAmount,
    changed,
    notificationSent,
  };
}
