import type { WorkflowTemplate } from '../meta';
import { epochBoundaryWorkflow } from './workflow';

export const template: WorkflowTemplate = {
  id: 'epoch-boundary',
  title: 'Epoch boundary monitor',
  category: 'cluster',
  workflowName: 'epochBoundaryWorkflow',
  activities: ['getClusterSnapshot', 'notify'],
  description: 'Alert when the current epoch is close to ending.',
  defaultCron: '*/15 * * * *',
  sampleInput: { slotsRemainingThreshold: 1000, notify: true },
  workflowType: epochBoundaryWorkflow,
  builtIn: true,
};

export { epochBoundaryWorkflow };
export type { EpochBoundaryInput, EpochBoundaryResult } from './types';
