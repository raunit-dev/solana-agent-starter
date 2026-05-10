export const TASK_QUEUE_NAME = 'solana-strategy';

export const DEFAULT_AGENT_ID = 'solana-agent';

export type StrategyInput = Record<string, unknown>;

export interface StrategyOutput {
  ok: boolean;
  summary: string;
  data?: Record<string, unknown>;
}

// ---- example workflow types (wallet delta) ----

export interface WalletSnapshot {
  address: string;
  slot: number;
  lamports: number;
  sol: number;
  observedAt: string;
}

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
