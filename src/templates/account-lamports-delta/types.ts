import type { AccountSnapshot, NotificationInput } from '../../shared';

export interface AccountLamportsDeltaInput extends NotificationInput {
  address: string;
  intervalSeconds?: number;
  minDeltaLamports?: number;
}

export interface AccountLamportsDeltaResult {
  address: string;
  before: AccountSnapshot;
  after: AccountSnapshot;
  deltaLamports: number;
  deltaSol: number;
  changed: boolean;
  notificationSent: boolean;
}
