import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../../temporal/activities';
import type { TokenBalanceThresholdInput, TokenBalanceThresholdResult } from './types';

const { getTokenOwnerBalance, notify } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '5 seconds',
    maximumInterval: '5 minutes',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

function thresholdReason(value: number, min?: number, max?: number): string {
  if (typeof min === 'number' && value < min) return `${value} is below minimum ${min}`;
  if (typeof max === 'number' && value > max) return `${value} is above maximum ${max}`;
  return `${value} is within configured limits`;
}

/** Check an owner's balance for a specific SPL mint. */
export async function tokenBalanceThresholdWorkflow(
  input: TokenBalanceThresholdInput,
): Promise<TokenBalanceThresholdResult> {
  const snapshot = await getTokenOwnerBalance(input.owner, input.mint);
  const reason = thresholdReason(snapshot.uiAmount, input.minUiAmount, input.maxUiAmount);
  const triggered = reason.includes('below') || reason.includes('above');
  let notificationSent = false;

  if (triggered && input.notify === true) {
    await notify(`token balance ${input.owner}/${input.mint}: ${reason}`);
    notificationSent = true;
  }

  return { snapshot, triggered, reason, notificationSent };
}
