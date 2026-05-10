import type { NotificationInput, WalletSnapshot } from '../../shared';

export interface WalletBalanceThresholdInput extends NotificationInput {
  address: string;
  minSol?: number;
  maxSol?: number;
}

export interface WalletBalanceThresholdResult {
  snapshot: WalletSnapshot;
  triggered: boolean;
  reason: string;
  notificationSent: boolean;
}
