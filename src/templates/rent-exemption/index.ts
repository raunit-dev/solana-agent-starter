import type { WorkflowTemplate } from '../meta';
import { rentExemptionWorkflow } from './workflow';

export const template: WorkflowTemplate = {
  id: 'rent-exemption',
  title: 'Rent exemption check',
  category: 'account',
  workflowName: 'rentExemptionWorkflow',
  activities: ['getRentExemptionSnapshot', 'notify'],
  description: 'Check whether an account, or a planned account size, is rent exempt.',
  defaultCron: '0 * * * *',
  sampleInput: { address: 'ACCOUNT_PUBKEY', notify: true },
  workflowType: rentExemptionWorkflow,
  builtIn: true,
};

export { rentExemptionWorkflow };
export type { RentExemptionInput, RentExemptionResult } from './types';
