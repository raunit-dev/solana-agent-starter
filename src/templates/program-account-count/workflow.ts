import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../../temporal/activities';
import type { ProgramAccountCountInput, ProgramAccountCountResult } from './types';

const { getProgramAccountCount, notify } = proxyActivities<typeof activities>({
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

/** Count accounts owned by a program, optionally filtered by data size. */
export async function programAccountCountWorkflow(
  input: ProgramAccountCountInput,
): Promise<ProgramAccountCountResult> {
  const snapshot = await getProgramAccountCount(input.programId, input.dataSize);
  const reason = thresholdReason(snapshot.count, input.minCount, input.maxCount, ' accounts');
  const triggered = reason.includes('below') || reason.includes('above');
  let notificationSent = false;

  if (triggered && input.notify === true) {
    await notify(`program ${input.programId}: ${reason}`);
    notificationSent = true;
  }

  return { snapshot, triggered, reason, notificationSent };
}
