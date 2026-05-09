import { NativeConnection, Worker } from '@temporalio/worker';
import { TASK_QUEUE_NAME } from '../shared';

async function run() {
  const address = process.env.TEMPORAL_ADDRESS ?? 'localhost:7233';
  const namespace = process.env.TEMPORAL_NAMESPACE ?? 'default';

  const connection = await NativeConnection.connect({ address });
  try {
    const worker = await Worker.create({
      connection,
      namespace,
      taskQueue: TASK_QUEUE_NAME,
      workflowsPath: require.resolve('../temporal/workflows'),
      identity: `workflow-worker@${process.pid}`,
    });

    console.log(`[workflow-worker] polling "${TASK_QUEUE_NAME}" on ${address}`);
    await worker.run();
  } finally {
    await connection.close();
  }
}

run().catch((err) => {
  console.error('[workflow-worker] fatal:', err);
  process.exit(1);
});
