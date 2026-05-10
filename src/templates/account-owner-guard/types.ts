import type { AccountSnapshot, NotificationInput } from '../../shared';

export interface AccountOwnerGuardInput extends NotificationInput {
  address: string;
  expectedOwner: string;
}

export interface AccountOwnerGuardResult {
  snapshot: AccountSnapshot;
  matches: boolean;
  notificationSent: boolean;
}
