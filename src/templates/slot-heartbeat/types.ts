import type { ClusterSnapshot, NotificationInput } from '../../shared';

export interface SlotHeartbeatInput extends NotificationInput {
  label?: string;
}

export interface SlotHeartbeatResult {
  snapshot: ClusterSnapshot;
  notificationSent: boolean;
}
