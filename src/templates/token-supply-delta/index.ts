import type { WorkflowTemplate } from '../meta';
import { tokenSupplyDeltaWorkflow } from './workflow';

export const template: WorkflowTemplate = {
  id: 'token-supply-delta',
  title: 'Token supply delta',
  category: 'token',
  workflowName: 'tokenSupplyDeltaWorkflow',
  activities: ['getTokenSupplySnapshot', 'notify'],
  description: 'Check whether an SPL token supply changed across a durable interval.',
  defaultCron: '*/30 * * * *',
  sampleInput: { mint: 'So11111111111111111111111111111111111111112', intervalSeconds: 60 },
  workflowType: tokenSupplyDeltaWorkflow,
  builtIn: true,
};

export { tokenSupplyDeltaWorkflow };
export type { TokenSupplyDeltaInput, TokenSupplyDeltaResult } from './types';
