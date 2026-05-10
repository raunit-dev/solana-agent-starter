import type { NotificationInput, ProgramAccountCountSnapshot } from '../../shared';

export interface ProgramAccountCountInput extends NotificationInput {
  programId: string;
  minCount?: number;
  maxCount?: number;
  dataSize?: number;
}

export interface ProgramAccountCountResult {
  snapshot: ProgramAccountCountSnapshot;
  triggered: boolean;
  reason: string;
  notificationSent: boolean;
}
