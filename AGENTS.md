# AGENTS.md

Project map for AI coding agents (Claude Code, Cursor, etc.) working in this
repo.

## What this project is

A starter that ships **15 reusable Solana agent templates on Temporal**, plus
a custom slot in `src/strategy.ts` for users who want to write their own. It's
the Solana counterpart to
[`temporalio/samples-typescript`](https://github.com/temporalio/samples-typescript).
Temporal handles scheduling, retries, run history, durable timers, and
horizontal scaling.

## Mental model

```
HTTP / CLI ─► Temporal Server ─► workflow-worker ─► activity-worker ─► strategy() or template workflow
                                  (deterministic)    (any side effects)
```

- Each template = one folder under `src/templates/<name>/` with `workflow.ts`,
  `types.ts`, and `index.ts`.
- Activities are non-deterministic and live globally in
  `src/temporal/activities.ts` (worker requires globally unique names).
- Workflows are deterministic; ESLint blocks Node builtins inside them.
- An "agent" === a Temporal Schedule whose action starts a workflow. Verbs:
  `deploy / pause / resume / invoke / status / list / retire`.

## File-by-file

| Path                                  | Owner | Determinism       | Purpose                                                                                           |
| ------------------------------------- | ----- | ----------------- | ------------------------------------------------------------------------------------------------- |
| `src/strategy.ts`                     | user  | non-deterministic | the custom slot — one async function for users who don't want a starter template                  |
| `src/server.ts`                       | infra | n/a               | Express HTTP API: `/templates`, `/agents`, `/agents/:id`                                          |
| `src/agent.ts`                        | infra | n/a               | CLI: `templates / run / deploy / pause / resume / invoke / status / list / retire`                |
| `src/shared.ts`                       | infra | n/a               | task queue, default agent id, shape types returned by activities                                  |
| `src/templates/catalog.ts`            | infra | n/a               | imports every per-template `index.ts` and exposes `WORKFLOW_TEMPLATES` + lookup helpers           |
| `src/templates/meta.ts`               | infra | n/a               | `TemplateMetadata`, `WorkflowTemplate`, `TemplateCategory`                                        |
| `src/templates/<name>/workflow.ts`    | infra | **deterministic** | the workflow function — proxies activities via `proxyActivities<typeof activities>`               |
| `src/templates/<name>/types.ts`       | infra | n/a               | input + output contracts for the template                                                         |
| `src/templates/<name>/index.ts`       | infra | n/a               | exports `template: WorkflowTemplate` and re-exports the workflow                                  |
| `src/temporal/activities.ts`          | infra | non-deterministic | every activity (single source of truth, names must be globally unique)                            |
| `src/temporal/workflows.ts`           | infra | **deterministic** | workflowsPath entry — defines `strategyWorkflow` and re-exports each per-template workflow        |
| `src/temporal/client.ts`              | infra | n/a               | `TemporalClientManager` singleton — shared Temporal `Connection` + `Client`                       |
| `src/solana/connection.ts`            | infra | n/a               | `SolanaConnectionManager` singleton — shared `@solana/web3.js` `Connection`                       |
| `src/workers/activity-worker.ts`      | infra | n/a               | registers `activities` only — no `workflowsPath`                                                  |
| `src/workers/workflow-worker.ts`      | infra | n/a               | registers `workflowsPath` only — no `activities`                                                  |

## Determinism rules

ESLint (`.eslintrc.js`) blocks all Node builtin imports inside
`src/temporal/workflows.ts` and every `src/templates/*/workflow.ts`. Any I/O,
randomness, or wall-clock reads must move into an activity. Safe in workflows:
pure logic, math, `proxyActivities`, child workflow calls, `workflow.sleep`,
`workflow.condition`, etc.

## Common modifications

### Add a new template

1. `mkdir src/templates/<name>`
2. `types.ts` — input + output interfaces. Reuse shape types from `src/shared.ts`
   when the activity already produces them.
3. Add any new activities to `src/temporal/activities.ts`. Names must be
   globally unique.
4. `workflow.ts` — deterministic. Import activity proxies via
   `proxyActivities<typeof activities>` from `'../../temporal/activities'`.
5. `index.ts` — exports a `template: WorkflowTemplate` object and re-exports
   the workflow function.
6. Register in `src/templates/catalog.ts` (add the import + push it into
   `WORKFLOW_TEMPLATES`).
7. Re-export the workflow from `src/temporal/workflows.ts` so the bundler
   picks it up.
8. `src/mocha/templates.test.ts` will assert the catalog count — bump it if
   you're adding a new built-in.

### Edit an existing template

Touch only its folder, plus `src/temporal/activities.ts` if you need a new
side effect. Avoid renaming activity functions unless you also update every
template that proxies them.

### Edit the user's custom strategy

`src/strategy.ts` is the slot for users who don't want to copy a template.
It runs as the `runStrategy` activity inside `strategyWorkflow`. Free to use
any library / RPC / random / time / env.

### Change task queue

Update `TASK_QUEUE_NAME` in `src/shared.ts`. Both workers and the client read
it from there.

## Singletons

Long-lived clients are wrapped as classic `getInstance()` singletons:

- `TemporalClientManager` (`src/temporal/client.ts`) — used by `server.ts`
  and `agent.ts`. Holds one `Connection` + `Client`. Call `.close()` on
  shutdown.
- `SolanaConnectionManager` (`src/solana/connection.ts`) — used by every
  activity that talks to Solana RPC. Reuses one `@solana/web3.js`
  `Connection` per activity-worker process.

If you add another long-lived resource (Helius client, DB pool, KV cache,
queue), add it as another `XManager.getInstance()` singleton in the same style
so the pattern stays consistent.

## Things to watch out for

- **Importing `strategy.ts` from any workflow file**: only `import type` is
  safe. A runtime import would pull `@solana/web3.js` into the workflow
  sandbox and break determinism. Types are erased at compile time, so
  type-only imports are fine.
- **Activity names must be globally unique** — the activity worker registers
  one flat namespace from `src/temporal/activities.ts`. Don't introduce two
  activities with the same exported name.
- **`require.resolve('../temporal/workflows')`** in `workflow-worker.ts` is
  what the Temporal worker bundler needs — don't replace it with a static
  import.
- **Schedule overlap policy** is set to `SKIP` (don't start a new run if the
  previous one is still going). Change in `src/agent.ts` / `src/server.ts`
  if your workflow is OK to overlap.

## Sanity checks before shipping

```bash
npx tsc --noEmit
npm run lint
npm test
```

## Reference

- `temporalio/samples-typescript`: <https://github.com/temporalio/samples-typescript>
- Temporal TypeScript hello world: <https://learn.temporal.io/getting_started/typescript/hello_world_in_typescript/>
- Temporal Schedules (TS): <https://docs.temporal.io/develop/typescript/schedules>
