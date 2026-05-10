import { proxyActivities, sleep } from '@temporalio/workflow';
import type * as activities from '../../temporal/activities';
import type { WalletDeltaInput, WalletDeltaResult } from './types';

const { getWalletSnapshot, notify } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '5 seconds',
    maximumInterval: '5 minutes',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

/**
 * Snapshot a wallet, sleep durably, snapshot again, report the delta.
 *
 * The `await sleep(...)` is the textbook Temporal demo: kill the worker
 * during the sleep and the workflow resumes from this exact spot when a new
 * worker comes online.
 */
export async function walletDeltaWorkflow(input: WalletDeltaInput): Promise<WalletDeltaResult> {
  const intervalSeconds = input.intervalSeconds ?? 60;

  const before = await getWalletSnapshot(input.address);
  await sleep(`${intervalSeconds} seconds`);
  const after = await getWalletSnapshot(input.address);

  const deltaLamports = after.lamports - before.lamports;
  const deltaSol = after.sol - before.sol;
  const changed = deltaLamports !== 0;

  if (changed) {
    await notify(
      `wallet ${input.address} changed by ${deltaSol} SOL between slot ${before.slot} and ${after.slot}`,
    );
  }

  return {
    address: input.address,
    before,
    after,
    deltaLamports,
    deltaSol,
    changed,
  };
}
