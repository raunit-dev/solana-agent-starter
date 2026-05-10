import type { WorkflowTemplate } from '../meta';
import { accountLamportsDeltaWorkflow } from './workflow';

export const template: WorkflowTemplate = {
  id: 'account-lamports-delta',
  title: 'Account lamports delta',
  category: 'account',
  workflowName: 'accountLamportsDeltaWorkflow',
  activities: ['getAccountSnapshot', 'notify'],
  description: 'Compare an account before and after a durable wait and report lamport movement.',
  defaultCron: '*/15 * * * *',
  sampleInput: { address: 'ACCOUNT_PUBKEY', intervalSeconds: 60, minDeltaLamports: 1 },
  workflowType: accountLamportsDeltaWorkflow,
  builtIn: true,
};

export { accountLamportsDeltaWorkflow };
export type { AccountLamportsDeltaInput, AccountLamportsDeltaResult } from './types';
