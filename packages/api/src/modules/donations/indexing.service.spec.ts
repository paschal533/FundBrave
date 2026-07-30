import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { IndexingService } from './indexing.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DonationsService } from './donations.service';

describe('IndexingService.pollNativeTransfers', () => {
  let prisma: any;
  let donations: any;
  let service: IndexingService;

  const chain = { chainId: 11155111, name: 'Sepolia', rpcUrl: 'https://x', explorerUrl: '', nativeSymbol: 'ETH', isTestnet: true };
  const safe = '0x000000000000000000000000000000000005afe';

  beforeEach(async () => {
    prisma = { chainSyncState: { findUnique: jest.fn(), upsert: jest.fn() }, campaign: { findMany: jest.fn() } };
    donations = { recordTransfer: jest.fn(), confirmDonations: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        IndexingService,
        { provide: PrismaService, useValue: prisma },
        { provide: DonationsService, useValue: donations },
        { provide: ConfigService, useValue: { get: () => undefined } },
      ],
    }).compile();

    service = moduleRef.get(IndexingService);
  });

  function client(blockTxs: any[], receiptStatus: 'success' | 'reverted') {
    return {
      getBlock: jest.fn().mockResolvedValue({ transactions: blockTxs }),
      getTransactionReceipt: jest.fn().mockResolvedValue({ status: receiptStatus }),
    } as any;
  }

  it('records a native transfer whose receipt succeeded, returns false', async () => {
    const tx = { to: safe, from: '0xd0e', value: 1_000_000_000_000_000n, hash: '0xok' };
    const hadFailures = await (service as any).pollNativeTransfers(client([tx], 'success'), chain, [safe], 10n, 10n);
    expect(hadFailures).toBe(false);
    expect(donations.recordTransfer).toHaveBeenCalledTimes(1);
    expect(donations.recordTransfer).toHaveBeenCalledWith(
      expect.objectContaining({ txHash: '0xok', amountRaw: '1000000000000000' }),
    );
  });

  it('does NOT record a native transfer whose receipt reverted, returns false', async () => {
    const tx = { to: safe, from: '0xd0e', value: 1n, hash: '0xreverted' };
    const hadFailures = await (service as any).pollNativeTransfers(client([tx], 'reverted'), chain, [safe], 10n, 10n);
    expect(hadFailures).toBe(false);
    expect(donations.recordTransfer).not.toHaveBeenCalled();
  });

  it('never fetches a receipt for transactions unrelated to any tracked Safe', async () => {
    const c = client([{ to: '0xsomeoneelse', from: '0xd0e', value: 1n, hash: '0xirrelevant' }], 'success');
    const hadFailures = await (service as any).pollNativeTransfers(c, chain, [safe], 10n, 10n);
    expect(hadFailures).toBe(false);
    expect(c.getTransactionReceipt).not.toHaveBeenCalled();
    expect(donations.recordTransfer).not.toHaveBeenCalled();
  });

  it('logs and skips one failed receipt lookup but still records other valid Safe-addressed transfers, returns true', async () => {
    const tx1 = { to: safe, from: '0xfail', value: 111n, hash: '0xfail' };
    const tx2 = { to: safe, from: '0xok', value: 222n, hash: '0xok2' };
    const mockClient = {
      getBlock: jest.fn().mockResolvedValue({ transactions: [tx1, tx2] }),
      getTransactionReceipt: jest
        .fn()
        .mockRejectedValueOnce(new Error('RPC timeout'))
        .mockResolvedValueOnce({ status: 'success' }),
    } as any;
    const hadFailures = await (service as any).pollNativeTransfers(mockClient, chain, [safe], 10n, 10n);
    expect(hadFailures).toBe(true);
    expect(donations.recordTransfer).toHaveBeenCalledTimes(1);
    expect(donations.recordTransfer).toHaveBeenCalledWith(
      expect.objectContaining({ txHash: '0xok2', amountRaw: '222' }),
    );
  });

  it('returns true when a per-candidate error occurs, signaling pollChain to skip state advancement', async () => {
    const tx = { to: safe, from: '0xfail', value: 111n, hash: '0xfail' };
    const mockClient = {
      getBlock: jest.fn().mockResolvedValue({ transactions: [tx] }),
      getTransactionReceipt: jest.fn().mockRejectedValue(new Error('RPC rate limit')),
    } as any;
    const hadFailures = await (service as any).pollNativeTransfers(mockClient, chain, [safe], 10n, 10n);
    expect(hadFailures).toBe(true);
    expect(donations.recordTransfer).not.toHaveBeenCalled();
  });

  it('fetches and processes every block across a range spanning multiple batches (BATCH_SIZE=25)', async () => {
    const fromBlock = 1n;
    const toBlock = 30n; // 30 blocks: batch 1 = [1..25], batch 2 = [26..30]
    const mockClient = {
      getBlock: jest.fn().mockImplementation(({ blockNumber }: { blockNumber: bigint }) =>
        Promise.resolve({
          transactions: [{ to: safe, from: '0xd0e', value: 1n, hash: `0xblock${blockNumber}` }],
        }),
      ),
      getTransactionReceipt: jest.fn().mockResolvedValue({ status: 'success' }),
    } as any;

    const hadFailures = await (service as any).pollNativeTransfers(mockClient, chain, [safe], fromBlock, toBlock);

    expect(hadFailures).toBe(false);
    expect(mockClient.getBlock).toHaveBeenCalledTimes(30);
    expect(donations.recordTransfer).toHaveBeenCalledTimes(30);
    // Spot-check a block from each batch was actually recorded with the right blockNumber.
    expect(donations.recordTransfer).toHaveBeenCalledWith(expect.objectContaining({ blockNumber: 1 }));
    expect(donations.recordTransfer).toHaveBeenCalledWith(expect.objectContaining({ blockNumber: 30 }));
  });

  it('isolates a receipt failure in one batch from blocks processed in a later batch', async () => {
    const fromBlock = 1n;
    const toBlock = 26n; // batch 1 = [1..25] (block 5 fails), batch 2 = [26]
    const mockClient = {
      getBlock: jest.fn().mockImplementation(({ blockNumber }: { blockNumber: bigint }) =>
        Promise.resolve({
          transactions: [{ to: safe, from: '0xd0e', value: 1n, hash: `0xblock${blockNumber}` }],
        }),
      ),
      getTransactionReceipt: jest.fn().mockImplementation(({ hash }: { hash: string }) =>
        hash === '0xblock5'
          ? Promise.reject(new Error('RPC timeout'))
          : Promise.resolve({ status: 'success' }),
      ),
    } as any;

    const hadFailures = await (service as any).pollNativeTransfers(mockClient, chain, [safe], fromBlock, toBlock);

    expect(hadFailures).toBe(true);
    // 26 blocks total, 1 failed receipt lookup -> 25 successful records, including the block
    // in the second batch, proving the batch-1 failure didn't abort batch-2 processing.
    expect(donations.recordTransfer).toHaveBeenCalledTimes(25);
    expect(donations.recordTransfer).toHaveBeenCalledWith(expect.objectContaining({ blockNumber: 26 }));
    expect(donations.recordTransfer).not.toHaveBeenCalledWith(expect.objectContaining({ blockNumber: 5 }));
  });

  it('returns true (not a thrown error) when a batch-level getBlock call rejects, and does not process later batches', async () => {
    const fromBlock = 1n;
    const toBlock = 26n; // batch 1 = [1..25] (rejects entirely), batch 2 = [26] (must be skipped)
    const mockClient = {
      getBlock: jest.fn().mockImplementation(({ blockNumber }: { blockNumber: bigint }) =>
        blockNumber <= 25n
          ? Promise.reject(new Error('429 Too Many Requests'))
          : Promise.resolve({ transactions: [{ to: safe, from: '0xd0e', value: 1n, hash: '0xblock26' }] }),
      ),
      getTransactionReceipt: jest.fn().mockResolvedValue({ status: 'success' }),
    } as any;

    // A rejecting Promise.all means every block in that batch rejects the same
    // way (Promise.all short-circuits on first rejection); the important
    // behavior under test is that pollNativeTransfers doesn't propagate the
    // rejection to its caller (which would bypass pollChain's hadFailures ->
    // chainSyncState anchoring), and that it stops before touching batch 2.
    await expect(
      (service as any).pollNativeTransfers(mockClient, chain, [safe], fromBlock, toBlock),
    ).resolves.toBe(true);

    expect(donations.recordTransfer).not.toHaveBeenCalled();
    // Batch 2 (block 26) must never have been fetched — scanning stops at the
    // first batch-level failure so the whole [fromBlock, toBlock] range is
    // re-scanned cleanly next cycle rather than partially advancing past it.
    expect(mockClient.getBlock).not.toHaveBeenCalledWith(
      expect.objectContaining({ blockNumber: 26n }),
    );
  });
});

describe('IndexingService.pollChain - state advancement wiring', () => {
  let prisma: any;
  let donations: any;
  let service: IndexingService;

  const chain = { chainId: 11155111, name: 'Sepolia', rpcUrl: 'https://x', explorerUrl: '', nativeSymbol: 'ETH', isTestnet: true };
  const safe = '0x000000000000000000000000000000000005afe';

  function mockClient(blockTxs: any[], receiptStatus: 'success' | 'reverted' | null) {
    return {
      getBlockNumber: jest.fn().mockResolvedValue(100n),
      getBlock: jest.fn().mockResolvedValue({ transactions: blockTxs }),
      getTransactionReceipt:
        receiptStatus === null
          ? jest.fn().mockRejectedValue(new Error('RPC error'))
          : jest.fn().mockResolvedValue({ status: receiptStatus }),
      getLogs: jest.fn().mockResolvedValue([]),
    } as any;
  }

  beforeEach(async () => {
    prisma = {
      chainSyncState: {
        findUnique: jest.fn(),
        upsert: jest.fn().mockResolvedValue({ chainId: 11155111, lastBlock: 100 }),
      },
      campaign: {
        findMany: jest.fn().mockResolvedValue([{ safeAddress: safe }]),
      },
    };
    donations = { recordTransfer: jest.fn(), confirmDonations: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        IndexingService,
        { provide: PrismaService, useValue: prisma },
        { provide: DonationsService, useValue: donations },
        { provide: ConfigService, useValue: { get: () => undefined } },
      ],
    }).compile();

    service = moduleRef.get(IndexingService);
  });

  it('advances chainSyncState to toBlock on successful native transfer processing', async () => {
    const tx = { to: safe, from: '0xok', value: 1n, hash: '0xok' };
    prisma.chainSyncState.findUnique.mockResolvedValue({ chainId: 11155111, lastBlock: 50 });

    const client = mockClient([tx], 'success');
    (service as any).clients.set(chain.chainId, client);

    await (service as any).pollChain(chain, [safe]);

    expect(prisma.chainSyncState.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { lastBlock: 100 },
        create: expect.objectContaining({ lastBlock: 100 }),
      }),
    );
  });

  it('anchors chainSyncState to fromBlock - 1 on native transfer failure', async () => {
    const tx = { to: safe, from: '0xfail', value: 1n, hash: '0xfail' };
    prisma.chainSyncState.findUnique.mockResolvedValue({ chainId: 11155111, lastBlock: 50 });

    const client = mockClient([tx], null);
    (service as any).clients.set(chain.chainId, client);

    await (service as any).pollChain(chain, [safe]);

    // fromBlock = 51 (after last sync), so on failure we anchor to 51 - 1 = 50
    expect(prisma.chainSyncState.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { lastBlock: 50 },
        create: expect.objectContaining({ lastBlock: 50 }),
      }),
    );
  });

  it('creates chainSyncState with proper lastBlock on cold-start success', async () => {
    const tx = { to: safe, from: '0xok', value: 1n, hash: '0xok' };
    prisma.chainSyncState.findUnique.mockResolvedValue(null); // No existing sync state

    const client = mockClient([tx], 'success');
    (service as any).clients.set(chain.chainId, client);

    await (service as any).pollChain(chain, [safe]);

    // On cold-start: fromBlock = latest - 10 = 90, toBlock = 100
    // On success: persist lastBlock = toBlock = 100
    expect(prisma.chainSyncState.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ lastBlock: 100 }),
      }),
    );
  });

  it('creates chainSyncState with fromBlock - 1 on cold-start failure (prevents donation loss)', async () => {
    const tx = { to: safe, from: '0xfail', value: 1n, hash: '0xfail' };
    prisma.chainSyncState.findUnique.mockResolvedValue(null); // No existing sync state (cold-start)

    const client = mockClient([tx], null);
    (service as any).clients.set(chain.chainId, client);

    await (service as any).pollChain(chain, [safe]);

    // On cold-start: fromBlock = latest - 10 = 90, toBlock = 100
    // On failure: persist lastBlock = fromBlock - 1 = 89, ensuring [90, 100] is re-scanned next cycle
    expect(prisma.chainSyncState.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ lastBlock: 89 }),
      }),
    );
  });

  it('creates chainSyncState anchored to fromBlock - 1 when the ERC-20 getLogs call rejects on a cold start', async () => {
    prisma.chainSyncState.findUnique.mockResolvedValue(null); // cold start — no row exists yet

    const client = mockClient([], 'success');
    client.getLogs = jest.fn().mockRejectedValue(new Error('getLogs: 503 Service Unavailable'));
    (service as any).clients.set(chain.chainId, client);

    await (service as any).pollChain(chain, [safe]);

    // A getLogs rejection used to propagate out of pollChain, skipping the upsert
    // entirely — leaving a cold-start chain with NO row, so the next cycle would
    // recompute fromBlock from a fresh head and silently skip [90, 100].
    expect(prisma.chainSyncState.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ lastBlock: 89 }),
        update: { lastBlock: 89 },
      }),
    );
  });

  it('anchors chainSyncState to fromBlock - 1 when an ERC-20 recordTransfer write rejects', async () => {
    prisma.chainSyncState.findUnique.mockResolvedValue({ chainId: 11155111, lastBlock: 50 });
    donations.recordTransfer.mockRejectedValue(new Error('DB connection lost'));

    const client = mockClient([], 'success');
    client.getLogs = jest.fn().mockResolvedValue([
      {
        transactionHash: '0xerc20',
        logIndex: 0,
        address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
        blockNumber: 60n,
        args: { value: 5n, from: '0xd0e', to: safe },
      },
    ]);
    (service as any).clients.set(chain.chainId, client);

    await (service as any).pollChain(chain, [safe]);

    expect(prisma.chainSyncState.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { lastBlock: 50 } }),
    );
  });

  it('chunks a >10-block range into multiple <=10-block getLogs calls that tile the range with no gaps or overlaps', async () => {
    const fromBlock = 1n;
    const toBlock = 25n; // chunks: [1,10] [11,20] [21,25]
    const getLogs = jest.fn().mockResolvedValue([]);
    const client = { getLogs } as any;

    await (service as any).scanErc20Transfers(client, chain, [safe], fromBlock, toBlock);

    expect(getLogs).toHaveBeenCalledTimes(3);
    expect(getLogs).toHaveBeenNthCalledWith(1, expect.objectContaining({ fromBlock: 1n, toBlock: 10n }));
    expect(getLogs).toHaveBeenNthCalledWith(2, expect.objectContaining({ fromBlock: 11n, toBlock: 20n }));
    expect(getLogs).toHaveBeenNthCalledWith(3, expect.objectContaining({ fromBlock: 21n, toBlock: 25n }));
  });

  it('aggregates and records ERC-20 transfers found across multiple chunks', async () => {
    const fromBlock = 1n;
    const toBlock = 25n;
    const usdc = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
    const getLogs = jest
      .fn()
      .mockResolvedValueOnce([
        { transactionHash: '0xa', logIndex: 0, address: usdc, blockNumber: 5n, args: { value: 1n, from: '0xd0e', to: safe } },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { transactionHash: '0xb', logIndex: 0, address: usdc, blockNumber: 22n, args: { value: 2n, from: '0xd0e', to: safe } },
      ]);
    const client = { getLogs } as any;

    await (service as any).scanErc20Transfers(client, chain, [safe], fromBlock, toBlock);

    expect(donations.recordTransfer).toHaveBeenCalledTimes(2);
    expect(donations.recordTransfer).toHaveBeenCalledWith(expect.objectContaining({ txHash: '0xa' }));
    expect(donations.recordTransfer).toHaveBeenCalledWith(expect.objectContaining({ txHash: '0xb' }));
  });

  it('does not anchor (or abort the scan) when only the confirmation pass fails', async () => {
    prisma.chainSyncState.findUnique.mockResolvedValue(null); // cold start
    donations.confirmDonations.mockRejectedValue(new Error('confirmation query timed out'));
    const errorSpy = jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);

    const tx = { to: safe, from: '0xok', value: 1n, hash: '0xok' };
    const client = mockClient([tx], 'success');
    (service as any).clients.set(chain.chainId, client);

    await (service as any).pollChain(chain, [safe]);

    // confirmDonations takes no block range, so its failure says nothing about
    // whether [90, 100] was scanned — the scan still ran and still advanced.
    expect(donations.recordTransfer).toHaveBeenCalled();
    expect(prisma.chainSyncState.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ lastBlock: 100 }) }),
    );
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('confirmation pass failed'));
  });

  it('logs sync progress at warn level when the range failed, and at info level when healthy', async () => {
    const warnSpy = jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
    const logSpy = jest.spyOn((service as any).logger, 'log').mockImplementation(() => undefined);
    prisma.chainSyncState.findUnique.mockResolvedValue({ chainId: 11155111, lastBlock: 50 });

    const failing = mockClient([{ to: safe, from: '0xfail', value: 1n, hash: '0xfail' }], null);
    (service as any).clients.set(chain.chainId, failing);
    await (service as any).pollChain(chain, [safe]);

    // A permanently stuck range must escalate beyond info level — that is the
    // only operator-visible signal that indexing has stopped making progress.
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('did not fully succeed'));
    expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('synced [51, 100]'));

    warnSpy.mockClear();
    logSpy.mockClear();

    const healthy = mockClient([{ to: safe, from: '0xok', value: 1n, hash: '0xok' }], 'success');
    (service as any).clients.set(chain.chainId, healthy);
    await (service as any).pollChain(chain, [safe]);

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('synced [51, 100]'));
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe('IndexingService.poll — chain concurrency', () => {
  let prisma: any;
  let donations: any;
  let service: IndexingService;

  beforeEach(async () => {
    prisma = {
      chainSyncState: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn() },
      campaign: { findMany: jest.fn().mockResolvedValue([]) },
    };
    donations = { recordTransfer: jest.fn(), confirmDonations: jest.fn().mockResolvedValue(0) };

    const chains = [
      { chainId: 1, name: 'Ethereum', rpcUrl: 'https://a', explorerUrl: '', nativeSymbol: 'ETH', isTestnet: false },
      { chainId: 8453, name: 'Base', rpcUrl: 'https://b', explorerUrl: '', nativeSymbol: 'ETH', isTestnet: false },
    ];

    const moduleRef = await Test.createTestingModule({
      providers: [
        IndexingService,
        { provide: PrismaService, useValue: prisma },
        { provide: DonationsService, useValue: donations },
        { provide: ConfigService, useValue: { get: (k: string) => (k === 'chains.enabled' ? chains : undefined) } },
      ],
    }).compile();

    service = moduleRef.get(IndexingService);
  });

  it('polls all enabled chains concurrently, not sequentially', async () => {
    // Structural proof of concurrency, not a timing-based one: each chain's
    // getBlockNumber() call returns a manually-controlled, never-auto-resolving
    // promise. If pollChain(chain1) were awaited to completion before
    // pollChain(chain2) is even invoked (the old sequential for-loop), Base's
    // getBlockNumber would NOT have been called yet at the checkpoint below,
    // since Ethereum's promise is still pending. Concurrent (Promise.allSettled
    // over a .map) invokes every chain's pollChain up to its own first await
    // before any of them can resolve.
    let resolveEth!: (value: bigint) => void;
    let resolveBase!: (value: bigint) => void;
    const ethBlockNumber = new Promise<bigint>((resolve) => {
      resolveEth = resolve;
    });
    const baseBlockNumber = new Promise<bigint>((resolve) => {
      resolveBase = resolve;
    });
    const getBlockNumberEth = jest.fn().mockReturnValue(ethBlockNumber);
    const getBlockNumberBase = jest.fn().mockReturnValue(baseBlockNumber);

    (service as any).clientFor = jest.fn().mockImplementation((chain: any) => ({
      getBlockNumber: chain.chainId === 1 ? getBlockNumberEth : getBlockNumberBase,
    }));

    const pollPromise = service.poll();

    // Flush pending microtasks so poll() progresses past `await
    // activeSafeAddresses()` and into `Promise.allSettled(this.chains.map(...))`
    // — the .map() call synchronously invokes pollChain for every chain up to
    // each one's own first await, without waiting for any of them to resolve.
    await new Promise((resolve) => setImmediate(resolve));

    expect(getBlockNumberEth).toHaveBeenCalledTimes(1);
    expect(getBlockNumberBase).toHaveBeenCalledTimes(1);

    resolveEth(100n);
    resolveBase(100n);
    await pollPromise;

    expect(donations.confirmDonations).toHaveBeenCalledTimes(2);
  });

  it('logs a warning per rejected chain but still lets other chains complete', async () => {
    const warnSpy = jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
    (service as any).clientFor = jest.fn().mockImplementation((chain: any) => ({
      getBlockNumber:
        chain.chainId === 1
          ? () => Promise.reject(new Error('RPC unreachable'))
          : () => Promise.resolve(100n),
    }));

    await service.poll();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Polling Ethereum failed: RPC unreachable'));
    // The healthy chain (Base) still completed its confirmDonations pass despite Ethereum rejecting.
    expect(donations.confirmDonations).toHaveBeenCalledTimes(1);
  });
});
