# solana-agent-starter

A small open-source starter for running **Solana agent strategies on
[Temporal](https://temporal.io)**. Write your strategy as one async function;
Temporal handles the rest.

## Why Temporal instead of `node-cron` + a process

- **Schedules out of the box.** Deploy, pause, resume, invoke, retire cron
  schedules with one API call. No cron table, no leader election.
- **A run log you didn't have to build.** Every firing of every agent is
  visible in the Temporal UI — inputs, outputs, errors, timing.
- **Sane behavior when things crash.** If a runner dies mid-run, Temporal times
  the run out and marks it failed instead of silently dropping it.
- **Many runners, one queue.** Spin up more worker pods and they share the
  load automatically. No "did the same job fire twice?" debugging.

## What you write vs. what's free

| You write | Temporal handles |
|-----------|------------------|
| `src/strategy.ts` — one async function | scheduling, retries, run history, timeouts, scaling |

That's the whole pitch. The rest of the repo is glue.

## Project layout

```
src/
├── strategy.ts                 # ← YOU EDIT THIS. Your agent's logic.
├── activities.ts               # wraps strategy() as a Temporal activity
├── workflows.ts                # deterministic shell — calls the activity
├── shared.ts                   # task queue + types
├── agent.ts                    # CLI: deploy/pause/resume/invoke/status/list/retire
├── server.ts                   # Express HTTP API (invoke + manage agents)
└── workers/
    ├── activity-worker.ts      # registers activities only
    └── workflow-worker.ts      # registers workflows only
```

Two separate workers on purpose: activities run regular Node (fetch, RPC, fs,
random); workflows run in a sandbox and must be deterministic. ESLint enforces
the determinism rules in `workflows.ts`.

## Quickstart

```bash
# 1. install
npm install

# 2. start a local Temporal server (separate terminal)
temporal server start-dev

# 3. start workers + HTTP API
npm run start:all

# 4. invoke your agent once
curl -X POST http://localhost:3000/invoke -H 'content-type: application/json' -d '{}'

# 5. deploy it on a cron — every 5 minutes
npm run agent -- deploy "*/5 * * * *"
```

Open Temporal's UI at <http://localhost:8233> to watch runs.

## Editing your strategy

Open `src/strategy.ts`. It's one function:

```ts
export async function strategy(input: StrategyInput): Promise<StrategyOutput> {
  // ... your logic. Throw on failure; Temporal retries.
}
```

Use any library, any RPC, any side effect — this runs on the activity worker,
not in a sandbox.

## HTTP API

One-shot invocation:

| Method | Path | Body | What |
|--------|------|------|------|
| `GET`    | `/health` | — | liveness |
| `POST`   | `/invoke` | `{ ...args }` | invoke the strategy once (sync; `?async=true` to start and poll) |
| `GET`    | `/invocations/:id` | — | status/result of an invocation |

Agent (scheduled) management:

| Method | Path | Body | What |
|--------|------|------|------|
| `GET`    | `/agents` | — | list deployed agents |
| `POST`   | `/agents/deploy` | `{ id?, cron, args? }` | deploy (create or replace) |
| `GET`    | `/agents/:id/status` | — | describe |
| `POST`   | `/agents/:id/pause` | — | stop firing on the schedule |
| `POST`   | `/agents/:id/resume` | — | resume firing |
| `POST`   | `/agents/:id/invoke` | — | fire one run now |
| `POST`   | `/agents/:id/retire` | — | tear it down |

No auth — this is meant to live behind your own infra.

## CLI (alternative to HTTP)

```bash
npm run agent -- deploy "*/15 * * * *"   # deploy on a cron
npm run agent -- pause                   # stop firing
npm run agent -- resume                  # resume firing
npm run agent -- invoke                  # fire one run now
npm run agent -- status                  # show schedule + state
npm run agent -- list                    # list every deployed agent
npm run agent -- retire                  # tear it down
```

## Configuration

| Env var | Default | |
|---------|---------|--|
| `SOLANA_RPC` | `https://api.mainnet-beta.solana.com` | RPC endpoint your strategy uses |
| `WATCH_WALLET` | wSOL mint | example wallet for the demo strategy |
| `TEMPORAL_ADDRESS` | `localhost:7233` | Temporal frontend |
| `TEMPORAL_NAMESPACE` | `default` | |
| `PORT` | `3000` | HTTP server |
| `AGENT_ID` | `solana-agent` | id used by the agent CLI |

## Production notes

- Run as many `start:worker:activities` / `start:worker:workflows` processes as
  you want — Temporal load-balances across them.
- Tune retry policy and `startToCloseTimeout` in `src/workflows.ts`.
- For Temporal Cloud, set `TEMPORAL_ADDRESS`/`TEMPORAL_NAMESPACE` and add TLS
  in `NativeConnection.connect()` / `Connection.connect()`.

## Reference

- Temporal TypeScript: <https://learn.temporal.io/getting_started/typescript/hello_world_in_typescript/>
- Temporal Schedules: <https://docs.temporal.io/develop/typescript/schedules>

## License

MIT.
