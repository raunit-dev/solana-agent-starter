import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../../temporal/activities';
import type { SlotHeartbeatInput, SlotHeartbeatResult } from './types';

const { getClusterSnapshot, notify } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '5 seconds',
    maximumInterval: '5 minutes',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

/** Snapshot slot, block height, epoch progress, version, and genesis hash. */
export async function slotHeartbeatWorkflow(input: SlotHeartbeatInput = {}): Promise<SlotHeartbeatResult> {
  const snapshot = await getClusterSnapshot();
  let notificationSent = false;

  if (input.notify === true) {
    const label = input.label ? `${input.label}: ` : '';
    await notify(
      `${label}slot ${snapshot.slot}, block height ${snapshot.blockHeight}, epoch ${snapshot.epoch}, ${snapshot.slotsRemainingInEpoch} slots remaining`,
    );
    notificationSent = true;
  }

  return { snapshot, notificationSent };
}
