import type { WorkflowTemplate } from '../meta';
import { tokenLargestAccountsWorkflow } from './workflow';

export const template: WorkflowTemplate = {
  id: 'token-largest-accounts',
  title: 'Token largest accounts',
  category: 'token',
  workflowName: 'tokenLargestAccountsWorkflow',
  activities: ['getTokenLargestAccountsSnapshot', 'notify'],
  description: 'Fetch top SPL token accounts and optionally alert on holder concentration.',
  defaultCron: '0 * * * *',
  sampleInput: {
    mint: 'So11111111111111111111111111111111111111112',
    limit: 10,
    maxTopHolderShare: 0.2,
  },
  workflowType: tokenLargestAccountsWorkflow,
  builtIn: true,
};

export { tokenLargestAccountsWorkflow };
export type { TokenLargestAccountsInput, TokenLargestAccountsResult } from './types';
