// Workflow worker entry point (workflowsPath).
//
// The user's custom strategy workflow is defined here directly. Every other
// workflow lives in its own folder under src/templates/<name>/workflow.ts
// and is re-exported below so the workflow-worker bundler picks it up.
//
// Determinism: ESLint blocks Node builtin imports in this file and in every
// src/templates/*/workflow.ts file (see .eslintrc.js).

import { proxyActivities } from '@temporalio/workflow';
import type * as activities from './activities';
import type { StrategyInput, StrategyOutput } from '../shared';

const { runStrategy } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '5 seconds',
    maximumInterval: '5 minutes',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

export async function strategyWorkflow(input: StrategyInput = {}): Promise<StrategyOutput> {
  return runStrategy(input);
}

export { accountLamportsDeltaWorkflow } from '../templates/account-lamports-delta/workflow';
export { accountOwnerGuardWorkflow } from '../templates/account-owner-guard/workflow';
export { epochBoundaryWorkflow } from '../templates/epoch-boundary/workflow';
export { multiWalletBalanceSweepWorkflow } from '../templates/multi-wallet-balance-sweep/workflow';
export { programAccountCountWorkflow } from '../templates/program-account-count/workflow';
export { rentExemptionWorkflow } from '../templates/rent-exemption/workflow';
export { signatureConfirmationWorkflow } from '../templates/signature-confirmation/workflow';
export { slotHeartbeatWorkflow } from '../templates/slot-heartbeat/workflow';
export { tokenBalanceThresholdWorkflow } from '../templates/token-balance-threshold/workflow';
export { tokenLargestAccountsWorkflow } from '../templates/token-largest-accounts/workflow';
export { tokenSupplyDeltaWorkflow } from '../templates/token-supply-delta/workflow';
export { walletBalanceThresholdWorkflow } from '../templates/wallet-balance-threshold/workflow';
export { walletDeltaWorkflow } from '../templates/wallet-delta/workflow';
export { walletInactivityWorkflow } from '../templates/wallet-inactivity/workflow';
export { walletTransactionDigestWorkflow } from '../templates/wallet-transaction-digest/workflow';
