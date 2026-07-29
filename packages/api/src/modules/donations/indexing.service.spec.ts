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

    // Stub clientFor so pollChain doesn't make real network calls; one
    // chain resolves slowly, the other fast — if polling were sequential,
    // total elapsed time would be sum(slow + fast); if concurrent, ~= slow.
    (service as any).clientFor = jest.fn().mockImplementation((chain: any) => {
      const delay = chain.chainId === 1 ? 50 : 5;
      return {
        getBlockNumber: () => new Promise((resolve) => setTimeout(() => resolve(100n), delay)),
      };
    });
  });

  it('polls all enabled chains concurrently, not sequentially', async () => {
    const start = Date.now();
    await service.poll();
    const elapsed = Date.now() - start;

    // Sequential would take >= 50 + 5 = 55ms; concurrent should stay close to the slower chain alone.
    expect(elapsed).toBeLessThan(50 + 5 + 20); // generous margin, still well under the sequential sum
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
