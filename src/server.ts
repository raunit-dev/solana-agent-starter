import express, { type NextFunction, type Request, type Response } from 'express';
import { ScheduleNotFoundError, WorkflowFailedError } from '@temporalio/client';
import { nanoid } from 'nanoid';
import { strategyWorkflow } from './workflows';
import { DEFAULT_AGENT_ID, TASK_QUEUE_NAME } from './shared';
import { TemporalClientManager } from './temporal-client';

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function main() {
  const port = parseInt(process.env.PORT ?? '3000', 10);
  const address = process.env.TEMPORAL_ADDRESS ?? 'localhost:7233';
  const namespace = process.env.TEMPORAL_NAMESPACE ?? 'default';

  const temporal = TemporalClientManager.getInstance();
  const client = await temporal.getClient();

  const app = express();
  app.use(express.json({ limit: '256kb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, taskQueue: TASK_QUEUE_NAME, temporal: address });
  });

  // ---- one-shot invocation (no schedule) ----

  // Invoke the strategy once, right now. Synchronous by default.
  // Pass ?async=true to start and return an invocationId immediately.
  app.post('/invoke', async (req, res, next) => {
    try {
      const input = (req.body ?? {}) as Record<string, unknown>;
      const isAsync = String(req.query.async ?? 'false').toLowerCase() === 'true';
      const invocationId = `invocation-${nanoid()}`;

      if (isAsync) {
        await client.workflow.start(strategyWorkflow, {
          taskQueue: TASK_QUEUE_NAME,
          workflowId: invocationId,
          args: [input],
        });
        res.status(202).json({
          invocationId,
          status: 'RUNNING',
          poll: `/invocations/${invocationId}`,
        });
        return;
      }

      const result = await client.workflow.execute(strategyWorkflow, {
        taskQueue: TASK_QUEUE_NAME,
        workflowId: invocationId,
        args: [input],
      });
      res.json({ invocationId, status: 'COMPLETED', result });
    } catch (err) {
      next(err);
    }
  });

  app.get('/invocations/:invocationId', async (req, res, next) => {
    try {
      const handle = client.workflow.getHandle(req.params.invocationId);
      const desc = await handle.describe();
      const body: Record<string, unknown> = {
        invocationId: handle.workflowId,
        runId: desc.runId,
        status: desc.status.name,
        startTime: desc.startTime,
        closeTime: desc.closeTime,
      };
      if (desc.status.name === 'COMPLETED') {
        body.result = await handle.result();
      }
      res.json(body);
    } catch (err) {
      next(err);
    }
  });

  // ---- agent management (scheduled deployments) ----

  app.get('/agents', async (_req, res, next) => {
    try {
      const entries: { agentId: string; workflowType?: string }[] = [];
      for await (const s of client.schedule.list()) {
        entries.push({ agentId: s.scheduleId, workflowType: s.action?.workflowType });
      }
      res.json({ agents: entries });
    } catch (err) {
      next(err);
    }
  });

  // Deploy (create or replace) an agent on a cron schedule.
  // body: { id?: string, cron: string, args?: object }
  app.post('/agents/deploy', async (req, res, next) => {
    try {
      const { id = DEFAULT_AGENT_ID, cron, args = {} } = req.body ?? {};
      if (typeof cron !== 'string' || cron.trim().length === 0) {
        throw new HttpError(400, 'body.cron is required, e.g. "*/5 * * * *"');
      }
      if (typeof args !== 'object' || args === null) {
        throw new HttpError(400, 'body.args must be an object');
      }
      try {
        await client.schedule.getHandle(id).delete();
      } catch (err) {
        if (!(err instanceof ScheduleNotFoundError)) throw err;
      }
      await client.schedule.create({
        scheduleId: id,
        spec: { cronExpressions: [cron] },
        action: {
          type: 'startWorkflow',
          workflowType: strategyWorkflow,
          taskQueue: TASK_QUEUE_NAME,
          args: [args],
        },
        policies: { overlap: 'SKIP' },
      });
      res.status(201).json({ agentId: id, cron });
    } catch (err) {
      next(err);
    }
  });

  app.get('/agents/:id/status', async (req, res, next) => {
    try {
      const desc = await client.schedule.getHandle(req.params.id).describe();
      res.json(desc);
    } catch (err) {
      next(err);
    }
  });

  app.post('/agents/:id/pause', async (req, res, next) => {
    try {
      await client.schedule.getHandle(req.params.id).pause('paused via api');
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  app.post('/agents/:id/resume', async (req, res, next) => {
    try {
      await client.schedule.getHandle(req.params.id).unpause('resumed via api');
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  app.post('/agents/:id/invoke', async (req, res, next) => {
    try {
      await client.schedule.getHandle(req.params.id).trigger();
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  app.post('/agents/:id/retire', async (req, res, next) => {
    try {
      await client.schedule.getHandle(req.params.id).delete();
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    if (err instanceof ScheduleNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (err instanceof WorkflowFailedError) {
      const cause = err.cause;
      res.status(400).json({
        error: err.message,
        cause: cause instanceof Error ? cause.message : String(cause),
      });
      return;
    }
    console.error('[server] unhandled:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'unknown error' });
  });

  const server = app.listen(port, () => {
    console.log(`[server] http://localhost:${port}`);
    console.log(`[server] temporal=${address} ns=${namespace} queue=${TASK_QUEUE_NAME}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[server] ${signal}, closing`);
    server.close();
    await temporal.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[server] fatal:', err);
  process.exit(1);
});
