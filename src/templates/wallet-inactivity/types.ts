import type { NotificationInput, RecentSignaturesSnapshot } from '../../shared';

export interface WalletInactivityInput extends NotificationInput {
  address: string;
  maxAgeSeconds?: number;
  limit?: number;
}

export interface WalletInactivityResult {
  snapshot: RecentSignaturesSnapshot;
  inactive: boolean;
  reason: string;
  notificationSent: boolean;
}
