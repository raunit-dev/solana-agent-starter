import type { NotificationInput, SignatureStatusSnapshot } from '../../shared';

export type SignatureConfirmationTarget = 'processed' | 'confirmed' | 'finalized';

export interface SignatureConfirmationInput extends NotificationInput {
  signature: string;
  desiredStatus?: SignatureConfirmationTarget;
  pollIntervalSeconds?: number;
  timeoutSeconds?: number;
  searchTransactionHistory?: boolean;
}

export interface SignatureConfirmationResult {
  status: SignatureStatusSnapshot;
  desiredStatus: SignatureConfirmationTarget;
  reached: boolean;
  timedOut: boolean;
  attempts: number;
  notificationSent: boolean;
}
