import { proxyActivities, sleep } from '@temporalio/workflow';
import type * as activities from './activities';
import type {
  StrategyInput,
  StrategyOutput,
  WalletDeltaInput,
  WalletDeltaResult,
} from '../shared';

const { runStrategy, getWalletSnapshot, notify } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '5 seconds',
    maximumInterval: '5 minutes',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

/**
 * Default workflow — deterministic shell around the user's strategy.
 *
 * Don't do I/O here, don't import Node builtins (ESLint blocks that), don't
 * call `Date.now()` or `fetch`. All of that goes in `src/strategy.ts`.
 */
export async function strategyWorkflow(input: StrategyInput = {}): Promise<StrategyOutput> {
  return runStrategy(input);
}

/**
 * Example multi-step workflow — observe a wallet, wait, observe again, notify
 * if the balance changed.
 *
 * This is the kind of thing Temporal makes trivially durable: if the worker
 * dies *during the sleep* or between the two snapshots, the workflow resumes
 * exactly where it left off when a new worker picks it up. No checkpoint
 * tables, no idempotency dance.
 *
 * Invoke programmatically:
 *
 *   await client.workflow.execute(walletDeltaWorkflow, {
 *     taskQueue: TASK_QUEUE_NAME,
 *     workflowId: 'wallet-delta-' + nanoid(),
 *     args: [{ address: 'YOUR_PUBKEY', intervalSeconds: 60 }],
 *   });
 */
export async function walletDeltaWorkflow(input: WalletDeltaInput): Promise<WalletDeltaResult> {
  const intervalSeconds = input.intervalSeconds ?? 60;

  const before = await getWalletSnapshot(input.address);
  await sleep(`${intervalSeconds} seconds`); // durable timer — worker can die during this
  const after = await getWalletSnapshot(input.address);

  const deltaLamports = after.lamports - before.lamports;
  const deltaSol = after.sol - before.sol;
  const changed = deltaLamports !== 0;

  if (changed) {
    await notify(
      `wallet ${input.address} changed by ${deltaSol} SOL between slot ${before.slot} and ${after.slot}`,
    );
  }

  return {
    address: input.address,
    before,
    after,
    deltaLamports,
    deltaSol,
    changed,
  };
}
