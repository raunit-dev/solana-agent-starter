import { ScheduleAlreadyRunning, ScheduleNotFoundError } from '@temporalio/client';
import { strategyWorkflow } from './temporal/workflows';
import { DEFAULT_AGENT_ID, TASK_QUEUE_NAME } from './shared';
import { TemporalClientManager } from './temporal/client';

const USAGE = `
usage:
  npm run agent -- deploy "<cron>"   # deploy on a schedule, e.g. "*/5 * * * *"
  npm run agent -- pause             # stop firing on the schedule
  npm run agent -- resume            # resume firing on the schedule
  npm run agent -- invoke            # invoke one run right now
  npm run agent -- status            # show the agent's current schedule + state
  npm run agent -- list              # list every deployed agent
  npm run agent -- retire            # tear it down

env:
  AGENT_ID            (default: ${DEFAULT_AGENT_ID})
  TEMPORAL_ADDRESS    (default: localhost:7233)
  TEMPORAL_NAMESPACE  (default: default)
`.trim();

async function main() {
  const cmd = process.argv[2];
  if (!cmd) {
    console.log(USAGE);
    process.exit(1);
  }

  const agentId = process.env.AGENT_ID ?? DEFAULT_AGENT_ID;
  const temporal = TemporalClientManager.getInstance();
  const client = await temporal.getClient();

  try {
    switch (cmd) {
      case 'deploy': {
        const cron = process.argv[3];
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
            workflowType: strategyWorkflow,
            taskQueue: TASK_QUEUE_NAME,
            args: [{}],
          },
          policies: { overlap: 'SKIP' },
        });
        console.log(`deployed agent "${agentId}" with cron "${cron}"`);
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
