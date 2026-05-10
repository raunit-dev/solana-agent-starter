import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../../temporal/activities';
import type {
  MultiWalletBalanceSweepInput,
  MultiWalletBalanceSweepResult,
  WalletBalanceFinding,
} from './types';

const { getWalletSnapshots, notify } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '5 seconds',
    maximumInterval: '5 minutes',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

function thresholdReason(value: number, min?: number, max?: number, unit = ''): string {
  if (typeof min === 'number' && value < min) return `${value}${unit} is below minimum ${min}${unit}`;
  if (typeof max === 'number' && value > max) return `${value}${unit} is above maximum ${max}${unit}`;
  return `${value}${unit} is within configured limits`;
}

/** Sweep several wallets in one run and flag balances outside configured limits. */
export async function multiWalletBalanceSweepWorkflow(
  input: MultiWalletBalanceSweepInput,
): Promise<MultiWalletBalanceSweepResult> {
  const snapshots = await getWalletSnapshots(input.addresses);
  const findings: WalletBalanceFinding[] = [];

  for (const snapshot of snapshots) {
    const reason = thresholdReason(snapshot.sol, input.minSol, input.maxSol, ' SOL');
    if (reason.includes('below') || reason.includes('above')) {
      findings.push({ address: snapshot.address, sol: snapshot.sol, reason });
    }
  }

  let notificationSent = false;
  if (findings.length > 0 && input.notify === true) {
    await notify(
      `wallet sweep found ${findings.length} balance issue(s): ${findings
        .map((finding) => `${finding.address}: ${finding.reason}`)
        .join('; ')}`,
    );
    notificationSent = true;
  }

  return { snapshots, findings, notificationSent };
}
