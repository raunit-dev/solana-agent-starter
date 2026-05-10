import type { WalletSnapshot } from '../../shared';

export interface WalletDeltaInput {
  address: string;
  intervalSeconds?: number;
}

export interface WalletDeltaResult {
  address: string;
  before: WalletSnapshot;
  after: WalletSnapshot;
  deltaLamports: number;
  deltaSol: number;
  changed: boolean;
}
