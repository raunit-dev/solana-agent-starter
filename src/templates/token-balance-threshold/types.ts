import type { NotificationInput, TokenOwnerBalanceSnapshot } from '../../shared';

export interface TokenBalanceThresholdInput extends NotificationInput {
  owner: string;
  mint: string;
  minUiAmount?: number;
  maxUiAmount?: number;
}

export interface TokenBalanceThresholdResult {
  snapshot: TokenOwnerBalanceSnapshot;
  triggered: boolean;
  reason: string;
  notificationSent: boolean;
}
