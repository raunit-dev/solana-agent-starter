# solana-agent-starter

The Solana counterpart to
[`temporalio/samples-typescript`](https://github.com/temporalio/samples-typescript) —
a small open-source starter that ships **15 ready-to-run Solana agent
templates on top of [Temporal](https://temporal.io)**, plus an empty slot for
your own strategy. Pick a template, optionally customise it, and Temporal
handles the cron, retries, run history, and horizontal scaling for you.

## Why this exists

The Solana agent narrative is taking off, but there's no canonical "here's how
to run on-chain logic on a durable execution engine" starter for it. Temporal
already publishes one of these for plain TypeScript; this repo is the same
idea, framed around Solana primitives (slots, wallets, signatures, accounts,
programs, tokens, rent, epochs).

## Why Temporal (and not BullMQ + node-cron + try/catch)

You can absolutely build this yourself with BullMQ, node-cron, and careful
error handling. You'll then re-discover, the hard way, what Temporal hands
you on day one:

- **Durable replay.** If your strategy does `swapA → swapB → settle` and the
  worker crashes after `swapA`, Temporal resumes from "`swapB` pending" — not
  from the start. BullMQ re-runs the whole job, which means double-swap
  hazards unless every step is idempotent against an external ledger.
- **Per-activity retries with backoff.** Each activity carries its own retry
  policy that Temporal enforces. No `try/catch` + retry-counter logic mixed
  into your trading code.
- **Cron without leader election.** `node-cron` in three pods fires three
  times. BullMQ repeatable jobs solve it via Redis; Temporal Schedules solve
  it server-side. Either way, _not_ by you writing leader-election code.
- **Run history is the source of truth.** Every input, output, retry, signal,
  and timer is appended to durable history you can query and replay.
- **Long waits without a hot worker.** `await workflow.sleep('30 days')` is
  one line and the worker doesn't have to be alive for those 30 days.
- **Workflow versioning.** Patch the workflow code without breaking in-flight
  runs (`workflow.patched`).

If your job is "fetch a number every 5 min and tweet it" — this is overkill.
If it touches money on-chain or runs multi-step flows where "crashed halfway"
matters, this is the boring, well-worn answer instead of you reinventing
durable execution.

## The template gallery

Every template lives in its own folder under `src/templates/<name>/` with a
`workflow.ts`, `types.ts`, and `index.ts`. Activities are centralised in
`src/temporal/activities.ts` because the worker registers them globally. To
copy a template into your own project, take the folder + the activities it
references.

| ID                           | Category    | What it does                                                              |
| ---------------------------- | ----------- | ------------------------------------------------------------------------- |
| `slot-heartbeat`             | cluster     | Snapshot slot, block height, epoch progress, version, and genesis hash    |
| `epoch-boundary`             | cluster     | Alert when the current epoch is close to ending                           |
| `wallet-balance-threshold`   | wallet      | Alert when a wallet SOL balance crosses min/max limits                    |
| `wallet-delta`               | wallet      | Snapshot, sleep durably, snapshot again, report delta                     |
| `wallet-inactivity`          | wallet      | Alert when an address has no recent signatures within a time window       |
| `wallet-transaction-digest`  | wallet      | Summarize recent signatures for a wallet                                  |
| `multi-wallet-balance-sweep` | wallet      | Check several wallet SOL balances in one run                              |
| `signature-confirmation`     | transaction | Poll a signature with durable sleeps until it reaches a target status     |
| `account-lamports-delta`     | account     | Compare account lamports before/after a durable wait                      |
| `account-owner-guard`        | account     | Verify an account is still owned by an expected program                   |
| `rent-exemption`             | account     | Check rent exemption for an account or planned account size               |
| `program-account-count`      | program     | Count accounts owned by a program, optionally by data size                |
| `token-balance-threshold`    | token       | Check an owner's balance for a specific SPL mint                          |
| `token-supply-delta`         | token       | Compare SPL token supply before/after a durable wait                      |
| `token-largest-accounts`     | token       | Fetch top SPL token accounts and flag holder concentration                |

…plus the `strategy` slot — `src/strategy.ts` — for your own custom workflow.

List the catalog from your terminal:

```bash
npm run agent -- templates                    # CLI
curl http://localhost:3000/templates          # HTTP
```

## Project layout

```
src/
├── strategy.ts                       # ← your custom slot (one async function)
├── server.ts                         # Express HTTP API
├── agent.ts                          # CLI: deploy / pause / resume / invoke / status / list / retire / run / templates
├── shared.ts                         # task queue + cross-template types
├── templates/
│   ├── catalog.ts                    # registry of every template
│   ├── meta.ts                       # TemplateMetadata + WorkflowTemplate types
│   ├── wallet-delta/
│   │   ├── workflow.ts               # deterministic
│   │   ├── types.ts                  # input/output contracts
│   │   └── index.ts                  # template metadata + re-exports
│   └── …14 more folders, same shape
├── temporal/
│   ├── activities.ts                 # all activities (one place — globally unique names)
│   ├── workflows.ts                  # workflowsPath entry — re-exports per-template workflows
│   └── client.ts                     # TemporalClientManager singleton
├── solana/
│   └── connection.ts                 # SolanaConnectionManager singleton
└── workers/
    ├── activity-worker.ts            # registers activities only
    └── workflow-worker.ts            # registers workflows only
```

Two separate workers on purpose: activities run regular Node (fetch, RPC, fs,
random); workflows run in a sandbox and must be deterministic. ESLint enforces
the determinism rules in every `src/templates/*/workflow.ts` and
`src/temporal/workflows.ts`.

## Quickstart

```bash
npm install
temporal server start-dev                          # local Temporal
npm run start:all                                  # workers + HTTP API
npm run agent -- templates                         # see what's available
npm run agent -- run slot-heartbeat '{"notify":false}'
npm run agent -- deploy "*/5 * * * *"              # cron the default strategy
```

Open Temporal's UI at <http://localhost:8233> to watch runs.

## Adding your own template

1. Create `src/templates/<your-template>/types.ts` with the input/output
   interfaces.
2. Add any new activities to `src/temporal/activities.ts` (don't forget
   to keep their names globally unique).
3. Create `src/templates/<your-template>/workflow.ts` — deterministic,
   imports activity proxies via
   `proxyActivities<typeof activities>` from `'../../temporal/activities'`.
4. Create `src/templates/<your-template>/index.ts` exporting a `template:
   WorkflowTemplate` object plus the workflow.
5. Register it in `src/templates/catalog.ts` (one line).
6. Re-export the workflow from `src/temporal/workflows.ts` so the worker
   bundler picks it up.

`tsc`, `eslint`, and the catalog test in `src/mocha/templates.test.ts` will
catch any mistakes.

## Editing the custom strategy slot

`src/strategy.ts` is one async function — anything goes (RPC, Jupiter, Helius,
DB, env vars, random, time). Throw on failure; Temporal will retry per the
policy in `src/temporal/workflows.ts`.

## HTTP API

Three resource paths: `/templates`, `/agents`, and `/agents/:id`. `/health` is
only a liveness check.

| Method | Path         | Body | What                          |
| ------ | ------------ | ---- | ----------------------------- |
| `GET`  | `/health`    | -    | liveness                      |
| `GET`  | `/templates` | -    | list templates + sample input |

Agent lifecycle:

| Method   | Path                  | Body                                             | What                              |
| -------- | --------------------- | ------------------------------------------------ | --------------------------------- |
| `GET`    | `/agents`             | -                                                | list deployed agents              |
| `POST`   | `/agents`             | `{ id?, cron, template?, args? }`                | deploy an agent                   |
| `GET`    | `/agents/:id`         | -                                                | describe an agent                 |
| `PUT`    | `/agents/:id`         | `{ cron, template?, args? }`                     | replace an agent's schedule       |
| `PATCH`  | `/agents/:id`         | `{ state: "stopped" }` or `{ state: "running" }` | stop or resume                    |
| `DELETE` | `/agents/:id`         | -                                                | retire (delete) an agent          |

Examples:

```bash
curl -X POST http://localhost:3000/agents \
  -H 'content-type: application/json' \
  -d '{"id":"sol-heartbeat","cron":"*/5 * * * *","template":"slot-heartbeat","args":{"notify":false}}'

curl -X PATCH http://localhost:3000/agents/sol-heartbeat \
  -H 'content-type: application/json' \
  -d '{"state":"stopped"}'

curl -X DELETE http://localhost:3000/agents/sol-heartbeat
```

No auth — this is meant to live behind your own infra.

## CLI

```bash
npm run agent -- templates                                   # list catalog
npm run agent -- run slot-heartbeat '{"notify":false}'       # run once now
npm run agent -- deploy "*/15 * * * *"                       # cron a deployment
npm run agent -- pause | resume | status | list | retire     # lifecycle
```

## Configuration

| Env var              | Default                               |                                                            |
| -------------------- | ------------------------------------- | ---------------------------------------------------------- |
| `SOLANA_RPC`         | `https://api.mainnet-beta.solana.com` | RPC endpoint your strategy uses                            |
| `WATCH_WALLET`       | wSOL mint                             | example wallet for the demo strategy                       |
| `TEMPORAL_ADDRESS`   | `localhost:7233`                      | Temporal frontend                                          |
| `TEMPORAL_NAMESPACE` | `default`                             |                                                            |
| `PORT`               | `3000`                                | HTTP server                                                |
| `AGENT_ID`           | `solana-agent`                        | id used by the agent CLI                                   |
| `AGENT_TEMPLATE`     | `strategy`                            | workflow template used by `npm run agent -- deploy`        |
| `AGENT_ARGS`         | `{}`                                  | JSON args used by `deploy` / `run`                         |
| `NOTIFY_WEBHOOK`     | unset                                 | optional Slack/Discord-compatible webhook used by `notify` |

## Production notes

- Run as many `start:worker:activities` / `start:worker:workflows` processes
  as you want — Temporal load-balances across them.
- Tune retry / `startToCloseTimeout` in each `src/templates/*/workflow.ts` or
  in `src/temporal/workflows.ts`.
- For Temporal Cloud, set `TEMPORAL_ADDRESS`/`TEMPORAL_NAMESPACE` and add TLS
  in `NativeConnection.connect()` / `Connection.connect()`.

## Reference

- `temporalio/samples-typescript`: <https://github.com/temporalio/samples-typescript>
- Temporal TypeScript hello world: <https://learn.temporal.io/getting_started/typescript/hello_world_in_typescript/>
- Temporal Schedules: <https://docs.temporal.io/develop/typescript/schedules>

## License

MIT.
