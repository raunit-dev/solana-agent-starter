import { Connection } from '@solana/web3.js';

export class SolanaConnectionManager {
  private static _instance: SolanaConnectionManager | null = null;

  private readonly _connection: Connection;

  private constructor() {
    const rpcUrl = process.env.SOLANA_RPC ?? 'https://api.mainnet-beta.solana.com';
    this._connection = new Connection(rpcUrl, 'confirmed');
  }

  public static getInstance(): Connection {
    if (!SolanaConnectionManager._instance) {
      SolanaConnectionManager._instance = new SolanaConnectionManager();
    }
    return SolanaConnectionManager._instance._connection;
  }
}

// Usage: const conn = SolanaConnectionManager.getInstance();
