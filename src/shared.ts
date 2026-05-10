export const TASK_QUEUE_NAME = 'solana-strategy';

export const DEFAULT_AGENT_ID = 'solana-agent';

// ---- user strategy contracts ----

export type StrategyInput = Record<string, unknown>;

export interface StrategyOutput {
  ok: boolean;
  summary: string;
  data?: Record<string, unknown>;
}

// ---- common template input flag ----

export interface NotificationInput {
  notify?: boolean;
}

// ---- shape types returned by activities ----

export interface WalletSnapshot {
  address: string;
  slot: number;
  lamports: number;
  sol: number;
  observedAt: string;
}

export interface ClusterSnapshot {
  slot: number;
  blockHeight: number;
  epoch: number;
  slotIndex: number;
  slotsInEpoch: number;
  slotsRemainingInEpoch: number;
  transactionCount: number;
  solanaCore: string;
  featureSet?: number;
  genesisHash: string;
  rpcUrl: string;
  observedAt: string;
}

export interface RecentSignature {
  signature: string;
  slot: number;
  blockTime: number | null;
  ageSeconds: number | null;
  confirmationStatus: string | null;
  err: string | null;
  memo: string | null;
}

export interface RecentSignaturesSnapshot {
  address: string;
  signatures: RecentSignature[];
  newestAgeSeconds: number | null;
  observedAt: string;
}

export interface SignatureStatusSnapshot {
  signature: string;
  found: boolean;
  slot: number | null;
  confirmations: number | null;
  confirmationStatus: string | null;
  err: string | null;
  observedAt: string;
}

export interface AccountSnapshot {
  address: string;
  exists: boolean;
  lamports: number;
  sol: number;
  owner: string | null;
  executable: boolean;
  rentEpoch: number | null;
  dataLength: number;
  observedAt: string;
}

export interface ProgramAccountCountSnapshot {
  programId: string;
  count: number;
  dataSize: number | null;
  observedAt: string;
}

export interface TokenOwnerBalanceSnapshot {
  owner: string;
  mint: string;
  amount: string;
  decimals: number;
  uiAmount: number;
  uiAmountString: string;
  tokenAccountCount: number;
  observedAt: string;
}

export interface TokenSupplySnapshot {
  mint: string;
  amount: string;
  decimals: number;
  uiAmount: number | null;
  uiAmountString: string;
  observedAt: string;
}

export interface TokenLargestAccount {
  address: string;
  amount: string;
  decimals: number;
  uiAmount: number | null;
  uiAmountString: string;
}

export interface TokenLargestAccountsSnapshot {
  mint: string;
  supply: TokenSupplySnapshot;
  accounts: TokenLargestAccount[];
  topHolderShare: number | null;
  observedAt: string;
}

export interface RentExemptionSnapshot {
  address: string | null;
  dataLength: number;
  currentLamports: number | null;
  minimumLamports: number;
  deficitLamports: number;
  rentExempt: boolean;
  observedAt: string;
}
