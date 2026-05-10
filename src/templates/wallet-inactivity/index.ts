import type { WorkflowTemplate } from '../meta';
import { walletInactivityWorkflow } from './workflow';

export const template: WorkflowTemplate = {
  id: 'wallet-inactivity',
  title: 'Wallet inactivity monitor',
  category: 'wallet',
  workflowName: 'walletInactivityWorkflow',
  activities: ['getRecentSignatures', 'notify'],
  description: 'Alert when a wallet has no recent signatures inside a configurable age window.',
  defaultCron: '*/30 * * * *',
  sampleInput: { address: 'YOUR_WALLET_PUBKEY', maxAgeSeconds: 3600, limit: 10, notify: true },
  workflowType: walletInactivityWorkflow,
  builtIn: true,
};

export { walletInactivityWorkflow };
export type { WalletInactivityInput, WalletInactivityResult } from './types';
