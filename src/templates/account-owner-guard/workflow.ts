import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../../temporal/activities';
import type { AccountOwnerGuardInput, AccountOwnerGuardResult } from './types';

const { getAccountSnapshot, notify } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '5 seconds',
    maximumInterval: '5 minutes',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

/** Verify an account is still owned by an expected program. */
export async function accountOwnerGuardWorkflow(input: AccountOwnerGuardInput): Promise<AccountOwnerGuardResult> {
  const snapshot = await getAccountSnapshot(input.address);
  const matches = snapshot.owner === input.expectedOwner;
  let notificationSent = false;

  if (!matches && input.notify === true) {
    await notify(
      `account ${input.address} owner mismatch: expected ${input.expectedOwner}, got ${snapshot.owner ?? 'missing account'}`,
    );
    notificationSent = true;
  }

  return { snapshot, matches, notificationSent };
}
