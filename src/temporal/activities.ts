// Activity worker entry point — every activity used by any template lives here.
//
// Activities run in regular Node, so they're allowed to be non-deterministic:
// fetch, RPC, dns, Date.now(), Math.random(), env vars, the works.

import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { strategy } from '../strategy';
import { SolanaConnectionManager } from '../solana/connection';
import type {
  AccountSnapshot,
  ClusterSnapshot,
  ProgramAccountCountSnapshot,
  RecentSignature,
  RecentSignaturesSnapshot,
  RentExemptionSnapshot,
  SignatureStatusSnapshot,
  StrategyInput,
  StrategyOutput,
  TokenLargestAccount,
  TokenLargestAccountsSnapshot,
  TokenOwnerBalanceSnapshot,
  TokenSupplySnapshot,
  WalletSnapshot,
} from '../shared';

// ---- helpers (private to this file) ----

function publicKey(value: string, label: string): PublicKey {
  try {
    return new PublicKey(value);
  } catch {
    throw new Error(`${label} must be a valid Solana public key`);
  }
}

function boundedLimit(value: number | undefined, fallback: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(Math.floor(value), max);
}

function observedAt(): string {
  return new Date().toISOString();
}

function stringifyError(err: unknown): string | null {
  if (!err) return null;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function tokenUiAmount(amount: string, decimals: number, uiAmount: number | null): number {
  if (uiAmount !== null) return uiAmount;
  return Number(amount) / 10 ** decimals;
}

// ---- user strategy ----

export async function runStrategy(input: StrategyInput): Promise<StrategyOutput> {
  return strategy(input);
}

// ---- notification ----

export async function notify(message: string): Promise<void> {
  const webhook = process.env.NOTIFY_WEBHOOK;
  if (!webhook) {
    console.log(`[notify] ${message}`);
    return;
  }
  const response = await fetch(webhook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: message }),
  });
  if (!response.ok) {
    throw new Error(`notify webhook failed with status ${response.status}`);
  }
}

// ---- cluster ----

export async function getClusterSnapshot(): Promise<ClusterSnapshot> {
  const connection = SolanaConnectionManager.getInstance();
  const [slot, blockHeight, epochInfo, transactionCount, version, genesisHash] = await Promise.all([
    connection.getSlot(),
    connection.getBlockHeight(),
    connection.getEpochInfo(),
    connection.getTransactionCount(),
    connection.getVersion(),
    connection.getGenesisHash(),
  ]);

  return {
    slot,
    blockHeight,
    epoch: epochInfo.epoch,
    slotIndex: epochInfo.slotIndex,
    slotsInEpoch: epochInfo.slotsInEpoch,
    slotsRemainingInEpoch: epochInfo.slotsInEpoch - epochInfo.slotIndex,
    transactionCount,
    solanaCore: version['solana-core'],
    featureSet: version['feature-set'],
    genesisHash,
    rpcUrl: connection.rpcEndpoint,
    observedAt: observedAt(),
  };
}

// ---- wallet ----

export async function getWalletSnapshot(address: string): Promise<WalletSnapshot> {
  const connection = SolanaConnectionManager.getInstance();
  const pubkey = publicKey(address, 'wallet address');
  const [slot, lamports] = await Promise.all([connection.getSlot(), connection.getBalance(pubkey)]);
  return {
    address,
    slot,
    lamports,
    sol: lamports / LAMPORTS_PER_SOL,
    observedAt: observedAt(),
  };
}

export async function getWalletSnapshots(addresses: string[]): Promise<WalletSnapshot[]> {
  if (!Array.isArray(addresses) || addresses.length === 0) {
    throw new Error('addresses must contain at least one wallet public key');
  }

  const connection = SolanaConnectionManager.getInstance();
  const slot = await connection.getSlot();
  return Promise.all(
    addresses.map(async (address) => {
      const lamports = await connection.getBalance(publicKey(address, 'wallet address'));
      return {
        address,
        slot,
        lamports,
        sol: lamports / LAMPORTS_PER_SOL,
        observedAt: observedAt(),
      };
    }),
  );
}

// ---- signatures ----

export async function getRecentSignatures(address: string, limit = 10): Promise<RecentSignaturesSnapshot> {
  const connection = SolanaConnectionManager.getInstance();
  const nowSeconds = Math.floor(Date.now() / 1000);
  const signatures = await connection.getSignaturesForAddress(
    publicKey(address, 'address'),
    { limit: boundedLimit(limit, 10, 100) },
    'confirmed',
  );

  const normalized: RecentSignature[] = signatures.map((item) => {
    const blockTime = item.blockTime ?? null;
    return {
      signature: item.signature,
      slot: item.slot,
      blockTime,
      ageSeconds: blockTime === null ? null : nowSeconds - blockTime,
      confirmationStatus: item.confirmationStatus ?? null,
      err: stringifyError(item.err),
      memo: item.memo ?? null,
    };
  });

  const newestAgeSeconds = normalized.length > 0 ? normalized[0].ageSeconds : null;
  return {
    address,
    signatures: normalized,
    newestAgeSeconds,
    observedAt: observedAt(),
  };
}

export async function getSignatureStatus(
  signature: string,
  searchTransactionHistory = true,
): Promise<SignatureStatusSnapshot> {
  const connection = SolanaConnectionManager.getInstance();
  const response = await connection.getSignatureStatuses([signature], { searchTransactionHistory });
  const status = response.value[0];

  return {
    signature,
    found: status !== null,
    slot: status?.slot ?? null,
    confirmations: status?.confirmations ?? null,
    confirmationStatus: status?.confirmationStatus ?? null,
    err: stringifyError(status?.err),
    observedAt: observedAt(),
  };
}

// ---- accounts ----

export async function getAccountSnapshot(address: string): Promise<AccountSnapshot> {
  const connection = SolanaConnectionManager.getInstance();
  const account = await connection.getAccountInfo(publicKey(address, 'account address'), 'confirmed');

  if (!account) {
    return {
      address,
      exists: false,
      lamports: 0,
      sol: 0,
      owner: null,
      executable: false,
      rentEpoch: null,
      dataLength: 0,
      observedAt: observedAt(),
    };
  }

  return {
    address,
    exists: true,
    lamports: account.lamports,
    sol: account.lamports / LAMPORTS_PER_SOL,
    owner: account.owner.toBase58(),
    executable: account.executable,
    rentEpoch: account.rentEpoch ?? null,
    dataLength: account.data.length,
    observedAt: observedAt(),
  };
}

export async function getRentExemptionSnapshot(address?: string, dataLength?: number): Promise<RentExemptionSnapshot> {
  const connection = SolanaConnectionManager.getInstance();
  let account: AccountSnapshot | null = null;

  if (address) {
    account = await getAccountSnapshot(address);
  }

  const resolvedDataLength =
    account?.exists === true
      ? account.dataLength
      : typeof dataLength === 'number' && Number.isFinite(dataLength) && dataLength >= 0
        ? Math.floor(dataLength)
        : null;

  if (resolvedDataLength === null) {
    throw new Error('provide either address or dataLength');
  }

  const minimumLamports = await connection.getMinimumBalanceForRentExemption(resolvedDataLength);
  const currentLamports = account?.exists === true ? account.lamports : null;
  const deficitLamports = currentLamports === null ? minimumLamports : Math.max(0, minimumLamports - currentLamports);

  return {
    address: address ?? null,
    dataLength: resolvedDataLength,
    currentLamports,
    minimumLamports,
    deficitLamports,
    rentExempt: currentLamports === null ? false : currentLamports >= minimumLamports,
    observedAt: observedAt(),
  };
}

// ---- programs ----

export async function getProgramAccountCount(
  programId: string,
  dataSize?: number,
): Promise<ProgramAccountCountSnapshot> {
  const connection = SolanaConnectionManager.getInstance();
  const filters =
    typeof dataSize === 'number' && Number.isFinite(dataSize) && dataSize >= 0 ? [{ dataSize }] : undefined;
  const accounts = await connection.getProgramAccounts(publicKey(programId, 'program id'), {
    filters,
    dataSlice: { offset: 0, length: 0 },
    commitment: 'confirmed',
  });

  return {
    programId,
    count: accounts.length,
    dataSize: filters ? (dataSize ?? null) : null,
    observedAt: observedAt(),
  };
}

// ---- tokens ----

export async function getTokenOwnerBalance(owner: string, mint: string): Promise<TokenOwnerBalanceSnapshot> {
  const connection = SolanaConnectionManager.getInstance();
  const response = await connection.getParsedTokenAccountsByOwner(
    publicKey(owner, 'owner'),
    { mint: publicKey(mint, 'mint') },
    'confirmed',
  );

  let amount = 0n;
  let decimals = 0;
  let uiAmount = 0;

  for (const item of response.value) {
    const parsed = (item.account.data as any).parsed;
    const tokenAmount = parsed.info.tokenAmount;
    decimals = tokenAmount.decimals;
    amount += BigInt(tokenAmount.amount);
    uiAmount += tokenUiAmount(tokenAmount.amount, tokenAmount.decimals, tokenAmount.uiAmount);
  }

  return {
    owner,
    mint,
    amount: amount.toString(),
    decimals,
    uiAmount,
    uiAmountString: uiAmount.toString(),
    tokenAccountCount: response.value.length,
    observedAt: observedAt(),
  };
}

export async function getTokenSupplySnapshot(mint: string): Promise<TokenSupplySnapshot> {
  const connection = SolanaConnectionManager.getInstance();
  const response = await connection.getTokenSupply(publicKey(mint, 'mint'), 'confirmed');
  const value = response.value;
  return {
    mint,
    amount: value.amount,
    decimals: value.decimals,
    uiAmount: value.uiAmount,
    uiAmountString: value.uiAmountString ?? String(value.uiAmount ?? 0),
    observedAt: observedAt(),
  };
}

export async function getTokenLargestAccountsSnapshot(
  mint: string,
  limit = 10,
): Promise<TokenLargestAccountsSnapshot> {
  const connection = SolanaConnectionManager.getInstance();
  const [largest, supply] = await Promise.all([
    connection.getTokenLargestAccounts(publicKey(mint, 'mint'), 'confirmed'),
    getTokenSupplySnapshot(mint),
  ]);

  const accounts: TokenLargestAccount[] = largest.value.slice(0, boundedLimit(limit, 10, 20)).map((account) => ({
    address: account.address.toBase58(),
    amount: account.amount,
    decimals: account.decimals,
    uiAmount: account.uiAmount,
    uiAmountString: account.uiAmountString ?? String(account.uiAmount ?? 0),
  }));

  const supplyAmount = BigInt(supply.amount);
  const topAmount = accounts.length > 0 ? BigInt(accounts[0].amount) : 0n;
  const topHolderShare = supplyAmount === 0n ? null : Number((topAmount * 1_000_000n) / supplyAmount) / 1_000_000;

  return {
    mint,
    supply,
    accounts,
    topHolderShare,
    observedAt: observedAt(),
  };
}
