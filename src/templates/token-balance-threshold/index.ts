import type { WorkflowTemplate } from '../meta';
import { tokenBalanceThresholdWorkflow } from './workflow';

export const template: WorkflowTemplate = {
  id: 'token-balance-threshold',
  title: 'Token balance threshold',
  category: 'token',
  workflowName: 'tokenBalanceThresholdWorkflow',
  activities: ['getTokenOwnerBalance', 'notify'],
  description: 'Alert when an owner balance for a specific SPL mint crosses configured limits.',
  defaultCron: '*/5 * * * *',
  sampleInput: {
    owner: 'YOUR_WALLET_PUBKEY',
    mint: 'So11111111111111111111111111111111111111112',
    minUiAmount: 1,
  },
  workflowType: tokenBalanceThresholdWorkflow,
  builtIn: true,
};

export { tokenBalanceThresholdWorkflow };
export type { TokenBalanceThresholdInput, TokenBalanceThresholdResult } from './types';
