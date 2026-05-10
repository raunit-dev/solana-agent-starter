import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../../temporal/activities';
import type { TokenLargestAccountsInput, TokenLargestAccountsResult } from './types';

const { getTokenLargestAccountsSnapshot, notify } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '5 seconds',
    maximumInterval: '5 minutes',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

/** Fetch largest token accounts and flag holder concentration. */
export async function tokenLargestAccountsWorkflow(
  input: TokenLargestAccountsInput,
): Promise<TokenLargestAccountsResult> {
  const snapshot = await getTokenLargestAccountsSnapshot(input.mint, input.limit);
  const maxTopHolderShare = input.maxTopHolderShare;
  const triggered =
    typeof maxTopHolderShare === 'number' &&
    snapshot.topHolderShare !== null &&
    snapshot.topHolderShare > maxTopHolderShare;
  const reason =
    snapshot.topHolderShare === null
      ? 'token has no supply'
      : `top holder share is ${snapshot.topHolderShare}; limit is ${maxTopHolderShare ?? 'not set'}`;
  let notificationSent = false;

  if (triggered && input.notify === true) {
    await notify(`token concentration ${input.mint}: ${reason}`);
    notificationSent = true;
  }

  return { snapshot, triggered, reason, notificationSent };
}
