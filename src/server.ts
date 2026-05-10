import express, { type NextFunction, type Request, type Response } from 'express';
import { ScheduleNotFoundError } from '@temporalio/client';
import { DEFAULT_AGENT_ID, TASK_QUEUE_NAME } from './shared';
import { TemporalClientManager } from './temporal/client';
import { DEFAULT_WORKFLOW_TEMPLATE_ID, getWorkflowTemplate, listWorkflowTemplates } from './templates/catalog';

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function resolveWorkflowTemplate(templateId: unknown) {
  if (templateId !== undefined && typeof templateId !== 'string') {
    throw new HttpError(400, 'template must be a string');
  }
  try {
    return getWorkflowTemplate(templateId ?? DEFAULT_WORKFLOW_TEMPLATE_ID);
  } catch (err) {
    throw new HttpError(400, err instanceof Error ? err.message : String(err));
  }
}

function parseArgs(args: unknown): Record<string, unknown> {
  if (args === undefined) return {};
  if (typeof args !== 'object' || args === null || Array.isArray(args)) {
    throw new HttpError(400, 'body.args must be an object');
  }
  return args as Record<string, unknown>;
}

function parseAgentId(value: unknown): string {
  if (value === undefined) return DEFAULT_AGENT_ID;
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new HttpError(400, 'agent id must be a non-empty string');
  }
  return value.trim();
}

function parseCron(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new HttpError(400, 'body.cron is required, e.g. "*/5 * * * *"');
  }
  return value.trim();
}

function parseTargetState(body: unknown): 'stopped' | 'running' {
  const value =
    typeof body === 'object' && body !== null
      ? ((body as { state?: unknown; stopped?: unknown }).state ??
        ((body as { stopped?: unknown }).stopped === true
          ? 'stopped'
          : (body as { stopped?: unknown }).stopped === false
            ? 'running'
            : undefined))
      : undefined;

  if (value === 'stopped' || value === 'paused') return 'stopped';
  if (value === 'running' || value === 'resumed') return 'running';
  throw new HttpError(400, 'body.state must be "stopped" or "running"');
}

async function main() {
  const port = parseInt(process.env.PORT ?? '3000', 10);
  const address = process.env.TEMPORAL_ADDRESS ?? 'localhost:7233';
  const namespace = process.env.TEMPORAL_NAMESPACE ?? 'default';

  const temporal = TemporalClientManager.getInstance();
  const client = await temporal.getClient();

  const app = express();
  app.use(express.json({ limit: '256kb' }));

  const deployAgent = async (agentId: string, cron: string, templateId: unknown, args: Record<string, unknown>) => {
    const template = resolveWorkflowTemplate(templateId);
    try {
      await client.schedule.getHandle(agentId).delete();
    } catch (err) {
      if (!(err instanceof ScheduleNotFoundError)) throw err;
    }
    await client.schedule.create({
      scheduleId: agentId,
      spec: { cronExpressions: [cron] },
      action: {
        type: 'startWorkflow',
        workflowType: template.workflowType,
        taskQueue: TASK_QUEUE_NAME,
        args: [args],
      },
      policies: { overlap: 'SKIP' },
    });
    return {
      agentId,
      cron,
      templateId: template.id,
      workflowType: template.workflowName,
    };
  };

  app.get('/health', (_req, res) => {
    res.json({ ok: true, taskQueue: TASK_QUEUE_NAME, temporal: address });
  });

  app.get('/templates', (_req, res) => {
    res.json({ templates: listWorkflowTemplates() });
  });

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

  app.post('/agents', async (req, res, next) => {
    try {
      const { id = DEFAULT_AGENT_ID, cron, template: templateId, args = {} } = req.body ?? {};
      const agentId = parseAgentId(id);
      const parsedCron = parseCron(cron);
      const parsedArgs = parseArgs(args);
      res.status(201).json(await deployAgent(agentId, parsedCron, templateId, parsedArgs));
    } catch (err) {
      next(err);
    }
  });

  app.get('/agents/:id', async (req, res, next) => {
    try {
      const desc = await client.schedule.getHandle(req.params.id).describe();
      res.json(desc);
    } catch (err) {
      next(err);
    }
  });

  app.put('/agents/:id', async (req, res, next) => {
    try {
      const agentId = parseAgentId(req.params.id);
      const { cron, template: templateId, args = {} } = req.body ?? {};
      const parsedCron = parseCron(cron);
      const parsedArgs = parseArgs(args);
      res.json(await deployAgent(agentId, parsedCron, templateId, parsedArgs));
    } catch (err) {
      next(err);
    }
  });

  app.patch('/agents/:id', async (req, res, next) => {
    try {
      const state = parseTargetState(req.body);
      const handle = client.schedule.getHandle(req.params.id);

      if (state === 'stopped') {
        await handle.pause('stopped via api');
      } else {
        await handle.unpause('resumed via api');
      }

      res.json({ agentId: req.params.id, state });
    } catch (err) {
      next(err);
    }
  });

  app.delete('/agents/:id', async (req, res, next) => {
    try {
      await client.schedule.getHandle(req.params.id).delete();
      res.status(204).send();
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
