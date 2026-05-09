import { proxyActivities } from '@temporalio/workflow';
import type * as activities from './activities';
import type { StrategyInput, StrategyOutput } from './shared';

const { runStrategy } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '5 seconds',
    maximumInterval: '5 minutes',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

/**
 * Deterministic shell. The workflow's only job is to call the activity.
 *
 * Don't do I/O here, don't import Node builtins (ESLint blocks that), don't
 * call Date.now() or fetch. All of that goes in `src/strategy.ts`.
 */
export async function strategyWorkflow(input: StrategyInput = {}): Promise<StrategyOutput> {
  return runStrategy(input);
}
