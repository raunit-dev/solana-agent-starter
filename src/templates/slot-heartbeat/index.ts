import type { WorkflowTemplate } from '../meta';
import { slotHeartbeatWorkflow } from './workflow';

export const template: WorkflowTemplate = {
  id: 'slot-heartbeat',
  title: 'Slot heartbeat',
  category: 'cluster',
  workflowName: 'slotHeartbeatWorkflow',
  activities: ['getClusterSnapshot', 'notify'],
  description: 'Capture cluster slot, block height, epoch progress, version, and genesis hash.',
  defaultCron: '*/5 * * * *',
  sampleInput: { label: 'mainnet heartbeat', notify: false },
  workflowType: slotHeartbeatWorkflow,
  builtIn: true,
};

export { slotHeartbeatWorkflow };
export type { SlotHeartbeatInput, SlotHeartbeatResult } from './types';
