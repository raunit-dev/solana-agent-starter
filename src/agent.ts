import { ScheduleAlreadyRunning, ScheduleNotFoundError } from '@temporalio/client';
import { DEFAULT_AGENT_ID, TASK_QUEUE_NAME } from './shared';
import { TemporalClientManager } from './temporal/client';
import { nanoid } from 'nanoid';
import { DEFAULT_WORKFLOW_TEMPLATE_ID, getWorkflowTemplate, listWorkflowTemplates } from './templates/catalog';

const USAGE = `
usage:
  npm run agent -- deploy "<cron>"
  npm run agent -- pause
  npm run agent -- resume
  npm run agent -- invoke
  npm run agent -- status
  npm run agent -- list
  npm run agent -- retire
  npm run agent -- templates
  npm run agent -- run [template] [jsonArgs]

env:
  AGENT_ID            (default: ${DEFAULT_AGENT_ID})
  AGENT_TEMPLATE      (default: ${DEFAULT_WORKFLOW_TEMPLATE_ID})
  AGENT_ARGS          JSON object used by deploy/run, e.g. '{"address":"..."}'
  TEMPORAL_ADDRESS    (default: localhost:7233)
  TEMPORAL_NAMESPACE  (default: default)
`.trim();

function parseJsonObject(value: string | undefined, label: string): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error(`${label} must be a JSON object`);
    }
    return parsed as Record<string, unknown>;
  } catch (err) {
    throw new Error(`${label} is invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function resolveWorkflowTemplate(templateId: string | undefined) {
  try {
    return getWorkflowTemplate(templateId ?? process.env.AGENT_TEMPLATE ?? DEFAULT_WORKFLOW_TEMPLATE_ID);
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : String(err));
  }
}

async function main() {
  const cmd = process.argv[2];
  if (!cmd) {
    console.log(USAGE);
    process.exit(1);
  }

  const agentId = process.env.AGENT_ID ?? DEFAULT_AGENT_ID;

  if (cmd === 'templates') {
    console.log(JSON.stringify(listWorkflowTemplates(), null, 2));
    return;
  }

  const temporal = TemporalClientManager.getInstance();
  const client = await temporal.getClient();

  try {
    switch (cmd) {
      case 'run': {
        const template = resolveWorkflowTemplate(process.argv[3]);
        const args = parseJsonObject(process.argv[4] ?? process.env.AGENT_ARGS, 'jsonArgs');
        const workflowId = `${template.id}-run-${nanoid()}`;
        const result = await client.workflow.execute(template.workflowType, {
          taskQueue: TASK_QUEUE_NAME,
          workflowId,
          args: [args],
        });
        console.log(
          JSON.stringify(
            {
              workflowId,
              templateId: template.id,
              workflowType: template.workflowName,
              result,
            },
            null,
            2,
          ),
        );
        break;
      }
      case 'deploy': {
        const cron = process.argv[3];
        const template = resolveWorkflowTemplate(undefined);
        const args = parseJsonObject(process.env.AGENT_ARGS, 'AGENT_ARGS');
        if (!cron) {
          console.error('cron expression required, e.g. "*/5 * * * *"');
          process.exit(1);
        }
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
        console.log(`deployed agent "${agentId}" with cron "${cron}" using template "${template.id}"`);
        break;
      }
      case 'pause':
        await client.schedule.getHandle(agentId).pause('paused via cli');
        console.log(`paused "${agentId}"`);
        break;
      case 'resume':
        await client.schedule.getHandle(agentId).unpause('resumed via cli');
        console.log(`resumed "${agentId}"`);
        break;
      case 'invoke':
        await client.schedule.getHandle(agentId).trigger();
        console.log(`invoked "${agentId}"`);
        break;
      case 'status': {
        const desc = await client.schedule.getHandle(agentId).describe();
        console.log(JSON.stringify(desc, null, 2));
        break;
      }
      case 'retire':
        await client.schedule.getHandle(agentId).delete();
        console.log(`retired "${agentId}"`);
        break;
      case 'list': {
        const entries: { agentId: string; workflowType?: string }[] = [];
        for await (const s of client.schedule.list()) {
          entries.push({ agentId: s.scheduleId, workflowType: s.action?.workflowType });
        }
        console.log(JSON.stringify(entries, null, 2));
        break;
      }
      default:
        console.log(USAGE);
        process.exit(1);
    }
  } catch (err) {
    if (err instanceof ScheduleAlreadyRunning) {
      console.error(`agent "${agentId}" already deployed — retire it first or run "deploy" again`);
      process.exit(1);
    }
    throw err;
  } finally {
    await temporal.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
