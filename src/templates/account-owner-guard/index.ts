import type { WorkflowTemplate } from '../meta';
import { accountOwnerGuardWorkflow } from './workflow';

export const template: WorkflowTemplate = {
  id: 'account-owner-guard',
  title: 'Account owner guard',
  category: 'account',
  workflowName: 'accountOwnerGuardWorkflow',
  activities: ['getAccountSnapshot', 'notify'],
  description: 'Verify that an account is still owned by the expected program.',
  defaultCron: '*/10 * * * *',
  sampleInput: { address: 'ACCOUNT_PUBKEY', expectedOwner: 'EXPECTED_OWNER_PROGRAM', notify: true },
  workflowType: accountOwnerGuardWorkflow,
  builtIn: true,
};

export { accountOwnerGuardWorkflow };
export type { AccountOwnerGuardInput, AccountOwnerGuardResult } from './types';
