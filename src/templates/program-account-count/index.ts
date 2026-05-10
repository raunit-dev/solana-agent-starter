import type { WorkflowTemplate } from '../meta';
import { programAccountCountWorkflow } from './workflow';

export const template: WorkflowTemplate = {
  id: 'program-account-count',
  title: 'Program account count',
  category: 'program',
  workflowName: 'programAccountCountWorkflow',
  activities: ['getProgramAccountCount', 'notify'],
  description: 'Count accounts owned by a program, optionally filtered by account data size.',
  defaultCron: '0 * * * *',
  sampleInput: {
    programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    minCount: 1,
    dataSize: 165,
  },
  workflowType: programAccountCountWorkflow,
  builtIn: true,
};

export { programAccountCountWorkflow };
export type { ProgramAccountCountInput, ProgramAccountCountResult } from './types';
