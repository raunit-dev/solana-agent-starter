import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../../temporal/activities';
import type { WalletTransactionDigestInput, WalletTransactionDigestResult } from './types';

const { getRecentSignatures, notify } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '5 seconds',
    maximumInterval: '5 minutes',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

/** Summarize the newest signatures for a wallet. */
export async function walletTransactionDigestWorkflow(
  input: WalletTransactionDigestInput,
): Promise<WalletTransactionDigestResult> {
  const snapshot = await getRecentSignatures(input.address, input.limit);
  let notificationSent = false;

  if (input.notify === true) {
    const signatures = snapshot.signatures
      .slice(0, 5)
      .map((item) => `${item.signature.slice(0, 8)}... @ slot ${item.slot}`)
      .join(', ');
    await notify(`wallet ${input.address} digest: ${signatures || 'no recent signatures'}`);
    notificationSent = true;
  }

  return { snapshot, notificationSent };
}
