// Registry of every starter template plus the user's custom strategy slot.
// Each src/templates/<name>/index.ts exports a `template` object; we collect
// them here so the CLI, HTTP API, and tests can iterate over the catalog.

import { strategyWorkflow } from '../temporal/workflows';
import type { TemplateMetadata, WorkflowTemplate } from './meta';

import { template as accountLamportsDelta } from './account-lamports-delta';
import { template as accountOwnerGuard } from './account-owner-guard';
import { template as epochBoundary } from './epoch-boundary';
import { template as multiWalletBalanceSweep } from './multi-wallet-balance-sweep';
import { template as programAccountCount } from './program-account-count';
import { template as rentExemption } from './rent-exemption';
import { template as signatureConfirmation } from './signature-confirmation';
import { template as slotHeartbeat } from './slot-heartbeat';
import { template as tokenBalanceThreshold } from './token-balance-threshold';
import { template as tokenLargestAccounts } from './token-largest-accounts';
import { template as tokenSupplyDelta } from './token-supply-delta';
import { template as walletBalanceThreshold } from './wallet-balance-threshold';
import { template as walletDelta } from './wallet-delta';
import { template as walletInactivity } from './wallet-inactivity';
import { template as walletTransactionDigest } from './wallet-transaction-digest';

export const DEFAULT_WORKFLOW_TEMPLATE_ID = 'strategy';

const STRATEGY_TEMPLATE: WorkflowTemplate = {
  id: DEFAULT_WORKFLOW_TEMPLATE_ID,
  title: 'Custom strategy',
  category: 'custom',
  workflowName: 'strategyWorkflow',
  activities: ['runStrategy'],
  description: 'The default user-owned strategy function in src/strategy.ts.',
  defaultCron: '*/5 * * * *',
  sampleInput: {},
  workflowType: strategyWorkflow,
  builtIn: false,
};

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  STRATEGY_TEMPLATE,
  slotHeartbeat,
  walletBalanceThreshold,
  walletDelta,
  walletInactivity,
  walletTransactionDigest,
  multiWalletBalanceSweep,
  signatureConfirmation,
  accountLamportsDelta,
  accountOwnerGuard,
  programAccountCount,
  tokenBalanceThreshold,
  tokenSupplyDelta,
  tokenLargestAccounts,
  rentExemption,
  epochBoundary,
];

export function listWorkflowTemplates(): TemplateMetadata[] {
  return WORKFLOW_TEMPLATES.map(({ workflowType: _wt, builtIn: _b, ...metadata }) => metadata);
}

export function getWorkflowTemplate(id = DEFAULT_WORKFLOW_TEMPLATE_ID): WorkflowTemplate {
  const normalized = id.trim();
  const template = WORKFLOW_TEMPLATES.find((entry) => entry.id === normalized);
  if (!template) {
    const available = WORKFLOW_TEMPLATES.map((entry) => entry.id).join(', ');
    throw new Error(`unknown workflow template "${id}". Available templates: ${available}`);
  }
  return template;
}
