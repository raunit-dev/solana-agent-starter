import { proxyActivities, sleep } from '@temporalio/workflow';
import type * as activities from '../../temporal/activities';
import type {
  SignatureConfirmationInput,
  SignatureConfirmationResult,
  SignatureConfirmationTarget,
} from './types';

const { getSignatureStatus, notify } = proxyActivities<typeof activities>({
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

function confirmationRank(status: string | null | undefined): number {
  switch (status) {
    case 'processed':
      return 1;
    case 'confirmed':
      return 2;
    case 'finalized':
      return 3;
    default:
      return 0;
  }
}

/** Poll a signature with durable sleeps until it reaches a target confirmation. */
export async function signatureConfirmationWorkflow(
  input: SignatureConfirmationInput,
): Promise<SignatureConfirmationResult> {
  const desiredStatus: SignatureConfirmationTarget = input.desiredStatus ?? 'finalized';
  const pollIntervalSeconds = positiveSeconds(input.pollIntervalSeconds, 5);
  const timeoutSeconds = positiveSeconds(input.timeoutSeconds, 120);
  const maxAttempts = Math.max(1, Math.ceil(timeoutSeconds / pollIntervalSeconds));
  let status = await getSignatureStatus(input.signature, input.searchTransactionHistory ?? true);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const reached = confirmationRank(status.confirmationStatus) >= confirmationRank(desiredStatus);
    if (reached || status.err !== null) {
      let notificationSent = false;
      if (input.notify === true) {
        await notify(
          `signature ${input.signature} reached ${status.confirmationStatus ?? 'unknown'} after ${attempt} poll(s)`,
        );
        notificationSent = true;
      }
      return {
        status,
        desiredStatus,
        reached,
        timedOut: false,
        attempts: attempt,
        notificationSent,
      };
    }

    if (attempt < maxAttempts) {
      await sleep(`${pollIntervalSeconds} seconds`);
      status = await getSignatureStatus(input.signature, input.searchTransactionHistory ?? true);
    }
  }

  let notificationSent = false;
  if (input.notify === true) {
    await notify(`signature ${input.signature} did not reach ${desiredStatus} within ${timeoutSeconds}s`);
    notificationSent = true;
  }

  return {
    status,
    desiredStatus,
    reached: false,
    timedOut: true,
    attempts: maxAttempts,
    notificationSent,
  };
}
