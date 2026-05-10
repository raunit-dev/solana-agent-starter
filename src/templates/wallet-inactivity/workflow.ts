import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../../temporal/activities';
import type { WalletInactivityInput, WalletInactivityResult } from './types';

const { getRecentSignatures, notify } = proxyActivities<typeof activities>({
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

/** Alert when an address has no recent signatures within a time window. */
export async function walletInactivityWorkflow(input: WalletInactivityInput): Promise<WalletInactivityResult> {
  const maxAgeSeconds = positiveSeconds(input.maxAgeSeconds, 3600);
  const snapshot = await getRecentSignatures(input.address, input.limit);
  const inactive = snapshot.newestAgeSeconds === null || snapshot.newestAgeSeconds > maxAgeSeconds;
  const reason =
    snapshot.newestAgeSeconds === null
      ? `wallet ${input.address} has no recent signatures`
      : `newest signature is ${snapshot.newestAgeSeconds}s old; limit is ${maxAgeSeconds}s`;
  let notificationSent = false;

  if (inactive && input.notify === true) {
    await notify(`wallet inactivity: ${reason}`);
    notificationSent = true;
  }

  return { snapshot, inactive, reason, notificationSent };
}
