import type { NotificationInput, TokenSupplySnapshot } from '../../shared';

export interface TokenSupplyDeltaInput extends NotificationInput {
  mint: string;
  intervalSeconds?: number;
}

export interface TokenSupplyDeltaResult {
  mint: string;
  before: TokenSupplySnapshot;
  after: TokenSupplySnapshot;
  deltaAmount: string;
  changed: boolean;
  notificationSent: boolean;
}
