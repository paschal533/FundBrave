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

  it('records a native transfer whose receipt succeeded', async () => {
    const tx = { to: safe, from: '0xd0e', value: 1_000_000_000_000_000n, hash: '0xok' };
    await (service as any).pollNativeTransfers(client([tx], 'success'), chain, [safe], 10n, 10n);
    expect(donations.recordTransfer).toHaveBeenCalledTimes(1);
    expect(donations.recordTransfer).toHaveBeenCalledWith(
      expect.objectContaining({ txHash: '0xok', amountRaw: '1000000000000000' }),
    );
  });

  it('does NOT record a native transfer whose receipt reverted', async () => {
    const tx = { to: safe, from: '0xd0e', value: 1n, hash: '0xreverted' };
    await (service as any).pollNativeTransfers(client([tx], 'reverted'), chain, [safe], 10n, 10n);
    expect(donations.recordTransfer).not.toHaveBeenCalled();
  });

  it('never fetches a receipt for transactions unrelated to any tracked Safe', async () => {
    const c = client([{ to: '0xsomeoneelse', from: '0xd0e', value: 1n, hash: '0xirrelevant' }], 'success');
    await (service as any).pollNativeTransfers(c, chain, [safe], 10n, 10n);
    expect(c.getTransactionReceipt).not.toHaveBeenCalled();
    expect(donations.recordTransfer).not.toHaveBeenCalled();
  });

  it('logs and skips one failed receipt lookup but still records other valid Safe-addressed transfers', async () => {
    const tx1 = { to: safe, from: '0xfail', value: 111n, hash: '0xfail' };
    const tx2 = { to: safe, from: '0xok', value: 222n, hash: '0xok2' };
    const mockClient = {
      getBlock: jest.fn().mockResolvedValue({ transactions: [tx1, tx2] }),
      getTransactionReceipt: jest
        .fn()
        .mockRejectedValueOnce(new Error('RPC timeout'))
        .mockResolvedValueOnce({ status: 'success' }),
    } as any;
    await (service as any).pollNativeTransfers(mockClient, chain, [safe], 10n, 10n);
    expect(donations.recordTransfer).toHaveBeenCalledTimes(1);
    expect(donations.recordTransfer).toHaveBeenCalledWith(
      expect.objectContaining({ txHash: '0xok2', amountRaw: '222' }),
    );
  });
});
