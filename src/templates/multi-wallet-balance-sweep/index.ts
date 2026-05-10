import type { WorkflowTemplate } from '../meta';
import { multiWalletBalanceSweepWorkflow } from './workflow';

export const template: WorkflowTemplate = {
  id: 'multi-wallet-balance-sweep',
  title: 'Multi-wallet balance sweep',
  category: 'wallet',
  workflowName: 'multiWalletBalanceSweepWorkflow',
  activities: ['getWalletSnapshots', 'notify'],
  description: 'Sweep several wallets in one run and flag balances outside configured limits.',
  defaultCron: '*/10 * * * *',
  sampleInput: { addresses: ['WALLET_ONE', 'WALLET_TWO'], minSol: 0.1, notify: true },
  workflowType: multiWalletBalanceSweepWorkflow,
  builtIn: true,
};

export { multiWalletBalanceSweepWorkflow };
export type {
  MultiWalletBalanceSweepInput,
  MultiWalletBalanceSweepResult,
  WalletBalanceFinding,
} from './types';
