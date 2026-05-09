import { Client, Connection } from '@temporalio/client';

export class TemporalClientManager {
  private static instance: TemporalClientManager;
  private connection: Connection | null = null;
  private client: Client | null = null;

  private constructor() {
    // Private — use TemporalClientManager.getInstance() instead.
  }

  public static getInstance(): TemporalClientManager {
    if (!TemporalClientManager.instance) {
      TemporalClientManager.instance = new TemporalClientManager();
    }
    return TemporalClientManager.instance;
  }

  public async getClient(): Promise<Client> {
    if (this.client) return this.client;

    const address = process.env.TEMPORAL_ADDRESS ?? 'localhost:7233';
    const namespace = process.env.TEMPORAL_NAMESPACE ?? 'default';

    this.connection = await Connection.connect({ address });
    this.client = new Client({ connection: this.connection, namespace });
    return this.client;
  }

  public async close(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
    }
    this.connection = null;
    this.client = null;
  }
}

// Usage: const client = await TemporalClientManager.getInstance().getClient();
