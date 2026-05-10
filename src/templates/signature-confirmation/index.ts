import type { WorkflowTemplate } from '../meta';
import { signatureConfirmationWorkflow } from './workflow';

export const template: WorkflowTemplate = {
  id: 'signature-confirmation',
  title: 'Signature confirmation watcher',
  category: 'transaction',
  workflowName: 'signatureConfirmationWorkflow',
  activities: ['getSignatureStatus', 'notify'],
  description: 'Poll a transaction signature with durable sleeps until it reaches a target confirmation.',
  defaultCron: 'one-shot',
  sampleInput: {
    signature: 'YOUR_TRANSACTION_SIGNATURE',
    desiredStatus: 'finalized',
    pollIntervalSeconds: 5,
    timeoutSeconds: 120,
  },
  workflowType: signatureConfirmationWorkflow,
  builtIn: true,
};

export { signatureConfirmationWorkflow };
export type {
  SignatureConfirmationInput,
  SignatureConfirmationResult,
  SignatureConfirmationTarget,
} from './types';
