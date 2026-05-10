import type { WorkflowTemplate } from '../meta';
import { walletDeltaWorkflow } from './workflow';

export const template: WorkflowTemplate = {
  id: 'wallet-delta',
  title: 'Wallet balance delta',
  category: 'wallet',
  workflowName: 'walletDeltaWorkflow',
  activities: ['getWalletSnapshot', 'notify'],
  description: 'Take a wallet snapshot, sleep durably, take another snapshot, and report the delta.',
  defaultCron: '*/15 * * * *',
  sampleInput: { address: 'YOUR_WALLET_PUBKEY', intervalSeconds: 60 },
  workflowType: walletDeltaWorkflow,
  builtIn: true,
};

export { walletDeltaWorkflow };
export type { WalletDeltaInput, WalletDeltaResult } from './types';
