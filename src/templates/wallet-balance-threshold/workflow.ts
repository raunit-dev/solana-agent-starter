import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../../temporal/activities';
import type { WalletBalanceThresholdInput, WalletBalanceThresholdResult } from './types';

const { getWalletSnapshot, notify } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '5 seconds',
    maximumInterval: '5 minutes',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

function thresholdReason(value: number, min?: number, max?: number, unit = ''): string {
  if (typeof min === 'number' && value < min) return `${value}${unit} is below minimum ${min}${unit}`;
  if (typeof max === 'number' && value > max) return `${value}${unit} is above maximum ${max}${unit}`;
  return `${value}${unit} is within configured limits`;
}

/** Alert when a wallet SOL balance crosses min/max limits. */
export async function walletBalanceThresholdWorkflow(
  input: WalletBalanceThresholdInput,
): Promise<WalletBalanceThresholdResult> {
  const snapshot = await getWalletSnapshot(input.address);
  const reason = thresholdReason(snapshot.sol, input.minSol, input.maxSol, ' SOL');
  const triggered = reason.includes('below') || reason.includes('above');
  let notificationSent = false;

  if (triggered && input.notify === true) {
    await notify(`wallet ${input.address}: ${reason} at slot ${snapshot.slot}`);
    notificationSent = true;
  }

  return { snapshot, triggered, reason, notificationSent };
}
