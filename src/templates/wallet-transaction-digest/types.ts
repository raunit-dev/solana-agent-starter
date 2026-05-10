import type { NotificationInput, RecentSignaturesSnapshot } from '../../shared';

export interface WalletTransactionDigestInput extends NotificationInput {
  address: string;
  limit?: number;
}

export interface WalletTransactionDigestResult {
  snapshot: RecentSignaturesSnapshot;
  notificationSent: boolean;
}
