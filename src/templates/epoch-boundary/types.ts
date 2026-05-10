import type { ClusterSnapshot, NotificationInput } from '../../shared';

export interface EpochBoundaryInput extends NotificationInput {
  slotsRemainingThreshold?: number;
}

export interface EpochBoundaryResult {
  snapshot: ClusterSnapshot;
  nearBoundary: boolean;
  notificationSent: boolean;
}
