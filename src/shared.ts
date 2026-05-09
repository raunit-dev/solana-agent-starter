export const TASK_QUEUE_NAME = 'solana-strategy';

export const DEFAULT_AGENT_ID = 'solana-agent';

export type StrategyInput = Record<string, unknown>;

export interface StrategyOutput {
  ok: boolean;
  summary: string;
  data?: Record<string, unknown>;
}
