import type { NotificationInput, RentExemptionSnapshot } from '../../shared';

export interface RentExemptionInput extends NotificationInput {
  address?: string;
  dataLength?: number;
}

export interface RentExemptionResult {
  snapshot: RentExemptionSnapshot;
  notificationSent: boolean;
}
