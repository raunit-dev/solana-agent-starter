# AGENTS.md

Project map for AI coding agents (Claude Code, Cursor, etc.) working in this
repo.

## What this project is

A starter template for running **Solana agent strategies on Temporal**. The
user writes a single strategy function; Temporal provides scheduling, retries,
run history, and horizontal scaling.

## Mental model

```
HTTP / CLI ──► Temporal Server ──► workflow-worker ──► activity-worker ──► strategy()
                                   (deterministic)     (any side effects)
```

- `strategy()` is the unit of work. It's a normal async function.
- It runs as a Temporal **activity**, on the activity worker.
- A trivial **workflow** wraps the activity — its only job is to satisfy
  Temporal's "every run is a workflow" model and provide deterministic retry
  semantics.
- An "agent" in this repo === a Temporal Schedule whose action is to start the
  workflow. Verbs you'll see in the code and docs:
  - `deploy`  — create or replace the schedule
  - `pause` / `resume`
  - `invoke`  — fire one run right now (one-shot or against a deployed agent)
  - `status`  — describe the schedule + last runs
  - `list`    — every deployed agent
  - `retire`  — tear it down

## File-by-file

| File | Owner | Determinism | Purpose |
|------|-------|-------------|---------|
| `src/strategy.ts`              | user | non-deterministic | user's agent logic — fetch, RPC, random, time, env all OK |
| `src/activities.ts`            | infra | non-deterministic | thin wrapper that exposes `strategy()` as `runStrategy` activity |
| `src/workflows.ts`             | infra | **deterministic** | calls `runStrategy` via `proxyActivities` with a retry policy. **Never** import Node builtins or call `fetch`/`Date.now()` here. |
| `src/shared.ts`                | infra | n/a | task queue name + `StrategyInput`/`StrategyOutput` types |
| `src/workers/activity-worker.ts` | infra | n/a | registers `activities` only — no `workflowsPath` |
| `src/workers/workflow-worker.ts` | infra | n/a | registers `workflowsPath` only — no `activities` |
| `src/server.ts`                | infra | n/a | Express HTTP API: `/invoke`, `/invocations/:id`, `/agents*` |
| `src/agent.ts`                 | infra | n/a | tiny CLI: `deploy / pause / resume / invoke / status / list / retire` |
| `src/temporal-client.ts`       | infra | n/a | `TemporalClientManager` singleton — shared Temporal `Connection` + `Client` |
| `src/solana-connection.ts`     | infra | n/a | `SolanaConnectionManager` singleton — shared `@solana/web3.js` `Connection` |

## Determinism rules (workflow.ts)

ESLint (`.eslintrc.js`) blocks all Node builtin imports inside `workflows.ts`.
Any I/O, randomness, or wall-clock reads must move into an activity. If you
need new orchestration logic, add a new **activity**, then have the workflow
call it via `proxyActivities`.

Safe in workflows: pure logic, math, `proxyActivities`, child workflow calls,
`workflow.sleep`, `workflow.condition`, etc.

## Common modifications

### Add a new strategy parameter
1. The strategy receives `StrategyInput` (a `Record<string, unknown>`). No
   shared.ts change needed for one-off params; just read `input.foo`.
2. If the param is structural (used by all strategies), tighten `StrategyInput`
   in `src/shared.ts`.

### Change retry / timeout
Edit `proxyActivities({...})` in `src/workflows.ts`. `startToCloseTimeout` is
the per-attempt budget. `retry.maximumAttempts` caps total attempts.

### Add a second strategy / workflow
1. Add another exported function in `src/activities.ts` (still non-deterministic).
2. Add a corresponding workflow in `src/workflows.ts` that proxies to it.
3. Wire it up in `src/server.ts` and/or `src/agent.ts`. Pick a different
   `agentId` so deployments don't collide.

### Change task queue
Update `TASK_QUEUE_NAME` in `src/shared.ts`. Both workers and the client read
it from there.

## Singletons

Long-lived clients are wrapped as classic `getInstance()` singletons:

- `TemporalClientManager` (`src/temporal-client.ts`) — used by `server.ts` and
  `agent.ts`. Holds one `Connection` + `Client`. Call `.close()` on shutdown.
- `SolanaConnectionManager` (`src/solana-connection.ts`) — used by `strategy.ts`.
  Reuses one `@solana/web3.js` `Connection` across activity invocations on the
  same worker process.

If you add another long-lived resource (Helius client, DB pool, KV cache,
queue), add it as another `XManager.getInstance()` singleton in the same style
so the pattern stays consistent.

## Things to watch out for

- **Importing strategy.ts from workflows.ts**: only `import type` is safe. A
  runtime import would pull `@solana/web3.js` into the workflow sandbox and
  break it. Types are erased at compile time, so type-only imports are fine.
- **`require.resolve('../workflows')`** in `workflow-worker.ts` is what the
  Temporal worker bundler needs — don't replace it with a static import.
- **Schedule overlap policy** is set to `SKIP` (don't start a new run if the
  previous one is still going). Change in `src/agent.ts` /
  `src/server.ts` if your strategy is OK to overlap.

## Sanity checks before shipping

```bash
npx tsc --noEmit   # types
npm run lint       # determinism + style
npm test           # mocha smoke tests
```

## Reference

- Temporal TypeScript hello world: <https://learn.temporal.io/getting_started/typescript/hello_world_in_typescript/>
- Temporal Schedules (TS): <https://docs.temporal.io/develop/typescript/schedules>
