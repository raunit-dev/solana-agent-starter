import type { NotificationInput, TokenLargestAccountsSnapshot } from '../../shared';

export interface TokenLargestAccountsInput extends NotificationInput {
  mint: string;
  limit?: number;
  maxTopHolderShare?: number;
}

export interface TokenLargestAccountsResult {
  snapshot: TokenLargestAccountsSnapshot;
  triggered: boolean;
  reason: string;
  notificationSent: boolean;
}
