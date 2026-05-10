import type { WorkflowTemplate } from '../meta';
import { walletBalanceThresholdWorkflow } from './workflow';

export const template: WorkflowTemplate = {
  id: 'wallet-balance-threshold',
  title: 'Wallet balance threshold',
  category: 'wallet',
  workflowName: 'walletBalanceThresholdWorkflow',
  activities: ['getWalletSnapshot', 'notify'],
  description: 'Alert when a wallet SOL balance falls below or rises above configured limits.',
  defaultCron: '*/5 * * * *',
  sampleInput: { address: 'YOUR_WALLET_PUBKEY', minSol: 0.25, notify: true },
  workflowType: walletBalanceThresholdWorkflow,
  builtIn: true,
};

export { walletBalanceThresholdWorkflow };
export type { WalletBalanceThresholdInput, WalletBalanceThresholdResult } from './types';
