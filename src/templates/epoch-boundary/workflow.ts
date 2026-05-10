import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../../temporal/activities';
import type { EpochBoundaryInput, EpochBoundaryResult } from './types';

const { getClusterSnapshot, notify } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '5 seconds',
    maximumInterval: '5 minutes',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

/** Alert when an epoch is close to ending. */
export async function epochBoundaryWorkflow(input: EpochBoundaryInput = {}): Promise<EpochBoundaryResult> {
  const threshold = input.slotsRemainingThreshold ?? 1000;
  const snapshot = await getClusterSnapshot();
  const nearBoundary = snapshot.slotsRemainingInEpoch <= threshold;
  let notificationSent = false;

  if (nearBoundary && input.notify === true) {
    await notify(`epoch ${snapshot.epoch} is near boundary: ${snapshot.slotsRemainingInEpoch} slots remaining`);
    notificationSent = true;
  }

  return { snapshot, nearBoundary, notificationSent };
}
