import type { NotificationInput, WalletSnapshot } from '../../shared';

export interface MultiWalletBalanceSweepInput extends NotificationInput {
  addresses: string[];
  minSol?: number;
  maxSol?: number;
}

export interface WalletBalanceFinding {
  address: string;
  sol: number;
  reason: string;
}

export interface MultiWalletBalanceSweepResult {
  snapshots: WalletSnapshot[];
  findings: WalletBalanceFinding[];
  notificationSent: boolean;
}
