import { proxyActivities, sleep } from '@temporalio/workflow';
import type * as activities from '../../temporal/activities';
import type { AccountLamportsDeltaInput, AccountLamportsDeltaResult } from './types';

const { getAccountSnapshot, notify } = proxyActivities<typeof activities>({
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

/** Compare account lamports before/after a durable wait. */
export async function accountLamportsDeltaWorkflow(
  input: AccountLamportsDeltaInput,
): Promise<AccountLamportsDeltaResult> {
  const intervalSeconds = positiveSeconds(input.intervalSeconds, 60);
  const before = await getAccountSnapshot(input.address);
  await sleep(`${intervalSeconds} seconds`);
  const after = await getAccountSnapshot(input.address);
  const deltaLamports = after.lamports - before.lamports;
  const deltaSol = after.sol - before.sol;
  const minDeltaLamports = input.minDeltaLamports ?? 1;
  const changed = Math.abs(deltaLamports) >= minDeltaLamports;
  let notificationSent = false;

  if (changed && input.notify === true) {
    await notify(`account ${input.address} changed by ${deltaLamports} lamports over ${intervalSeconds}s`);
    notificationSent = true;
  }

  return {
    address: input.address,
    before,
    after,
    deltaLamports,
    deltaSol,
    changed,
    notificationSent,
  };
}
