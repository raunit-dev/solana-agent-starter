import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../../temporal/activities';
import type { RentExemptionInput, RentExemptionResult } from './types';

const { getRentExemptionSnapshot, notify } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '5 seconds',
    maximumInterval: '5 minutes',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

/** Check rent exemption for an account or planned account size. */
export async function rentExemptionWorkflow(input: RentExemptionInput): Promise<RentExemptionResult> {
  const snapshot = await getRentExemptionSnapshot(input.address, input.dataLength);
  let notificationSent = false;

  if (!snapshot.rentExempt && input.notify === true) {
    await notify(
      `rent exemption check: ${snapshot.address ?? `${snapshot.dataLength} bytes`} needs ${snapshot.deficitLamports} more lamports`,
    );
    notificationSent = true;
  }

  return { snapshot, notificationSent };
}
