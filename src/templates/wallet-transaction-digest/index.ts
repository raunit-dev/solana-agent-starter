import type { WorkflowTemplate } from '../meta';
import { walletTransactionDigestWorkflow } from './workflow';

export const template: WorkflowTemplate = {
  id: 'wallet-transaction-digest',
  title: 'Wallet transaction digest',
  category: 'wallet',
  workflowName: 'walletTransactionDigestWorkflow',
  activities: ['getRecentSignatures', 'notify'],
  description: 'Summarize the newest signatures for a wallet and optionally post a digest.',
  defaultCron: '0 * * * *',
  sampleInput: { address: 'YOUR_WALLET_PUBKEY', limit: 5, notify: false },
  workflowType: walletTransactionDigestWorkflow,
  builtIn: true,
};

export { walletTransactionDigestWorkflow };
export type { WalletTransactionDigestInput, WalletTransactionDigestResult } from './types';
