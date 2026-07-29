import { Test } from '@nestjs/testing';
import { DonationStatus } from '@prisma/client';
import { encodeEventTopics, parseAbiItem } from 'viem';
import { DonationsService } from './donations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PricingService } from './pricing.service';

const TRANSFER_EVENT = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');
// Lowercase, full 20-byte (40 hex char) addresses — viem's address encoder
// enforces EIP-55 checksum on any mixed-case or short-length hex string.
const SAFE_ADDRESS = '0x0000000000000000000000000000000000005afe';
const TOKEN_ADDRESS = '0x000000000000000000000000000000000000c0de';
const DONOR = '0x0000000000000000000000000000000000000d0e';
// A different campaign's Safe — used to prove cross-campaign misattribution
// (a real transfer to someone else's Safe) is rejected, not just fabricated amounts.
const OTHER_SAFE_ADDRESS = '0x0000000000000000000000000000000000ba0bab';

function erc20TransferLog(logIndex: number, to: string, value: bigint) {
  const topics = encodeEventTopics({
    abi: [TRANSFER_EVENT],
    eventName: 'Transfer',
    args: { from: DONOR, to: to as `0x${string}` },
  });
  return {
    address: TOKEN_ADDRESS,
    logIndex,
    topics,
    data: `0x${value.toString(16).padStart(64, '0')}` as `0x${string}`,
  };
}

describe('DonationsService.confirmDonations — receipt verification', () => {
  let prisma: any;
  let pricing: any;
  let service: DonationsService;

  const baseDonation = {
    id: 'd1',
    campaignId: 'c1',
    chainId: 11155111,
    txHash: '0xabc',
    logIndex: 0,
    tokenAddress: TOKEN_ADDRESS.toLowerCase(),
    tokenSymbol: 'USDC',
    amountRaw: '1000000',
    amountUsd: { toString: () => '1.00', lte: () => false } as any,
    donorAddress: DONOR.toLowerCase(),
    status: DonationStatus.DETECTED,
    blockNumber: 100,
    attempts: 0,
    campaign: { safeAddress: SAFE_ADDRESS },
  };

  beforeEach(async () => {
    prisma = {
      donation: {
        findMany: jest.fn().mockResolvedValue([baseDonation]),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn(),
      },
      campaign: { update: jest.fn() },
      $transaction: jest.fn().mockImplementation((ops) => Promise.all(ops)),
    };
    pricing = { getUsdPrice: jest.fn().mockResolvedValue(1) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DonationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PricingService, useValue: pricing },
      ],
    }).compile();

    service = moduleRef.get(DonationsService);
  });

  it('confirms when the receipt log at logIndex really shows the claimed transfer', async () => {
    const client = {
      getTransactionReceipt: jest.fn().mockResolvedValue({
        status: 'success',
        blockNumber: 90n,
        logs: [erc20TransferLog(0, SAFE_ADDRESS, 1_000_000n)],
      }),
    } as any;

    const confirmed = await service.confirmDonations(11155111, 100, 5, client);

    expect(confirmed).toBe(1);
    expect(prisma.donation.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'd1' }, data: expect.objectContaining({ status: DonationStatus.CONFIRMED }) }),
    );
  });

  it('does NOT confirm when the receipt has no log matching the claimed amount', async () => {
    const client = {
      getTransactionReceipt: jest.fn().mockResolvedValue({
        status: 'success',
        blockNumber: 90n,
        // Real receipt, but the transfer was for a different (much smaller) amount.
        logs: [erc20TransferLog(0, SAFE_ADDRESS, 1n)],
      }),
    } as any;

    const confirmed = await service.confirmDonations(11155111, 100, 5, client);

    // The fabricated claim must never be confirmed and must never move money:
    // raisedUsd is only ever incremented inside the confirm branch, so
    // asserting campaign.update was never called is the load-bearing check
    // that the inflation this fix targets cannot happen. (donation.update
    // *is* expected to be called here — to persist the failed-attempt
    // counter added in an earlier migration — so we assert on its
    // arguments rather than on whether it was called at all.)
    expect(confirmed).toBe(0);
    expect(prisma.campaign.update).not.toHaveBeenCalled();
    expect(prisma.donation.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: DonationStatus.CONFIRMED }) }),
    );
  });

  it('does NOT confirm when the receipt has no log at all for the recorded logIndex', async () => {
    const client = {
      getTransactionReceipt: jest.fn().mockResolvedValue({
        status: 'success',
        blockNumber: 90n,
        logs: [erc20TransferLog(3, SAFE_ADDRESS, 1_000_000n)], // wrong logIndex
      }),
    } as any;

    const confirmed = await service.confirmDonations(11155111, 100, 5, client);
    expect(confirmed).toBe(0);
  });

  it('verifies native transfers against getTransaction to/value, not just receipt status', async () => {
    const nativeDonation = {
      ...baseDonation,
      id: 'd2',
      tokenAddress: null,
      logIndex: -1,
      amountRaw: '1000000000000000',
    };
    prisma.donation.findMany.mockResolvedValue([nativeDonation]);

    const goodClient = {
      getTransactionReceipt: jest.fn().mockResolvedValue({ status: 'success', blockNumber: 90n, logs: [] }),
      getTransaction: jest.fn().mockResolvedValue({ to: SAFE_ADDRESS, value: 1_000_000_000_000_000n }),
    } as any;
    expect(await service.confirmDonations(11155111, 100, 5, goodClient)).toBe(1);

    jest.clearAllMocks();
    prisma.donation.findMany.mockResolvedValue([nativeDonation]);
    const badClient = {
      getTransactionReceipt: jest.fn().mockResolvedValue({ status: 'success', blockNumber: 90n, logs: [] }),
      // Real tx, but it actually sent a different amount / to a different address.
      getTransaction: jest.fn().mockResolvedValue({ to: SAFE_ADDRESS, value: 1n }),
    } as any;
    expect(await service.confirmDonations(11155111, 100, 5, badClient)).toBe(0);
  });

  it('does NOT confirm when the real transfer went to a different address than this campaign\'s safe (cross-campaign misattribution)', async () => {
    const client = {
      getTransactionReceipt: jest.fn().mockResolvedValue({
        status: 'success',
        blockNumber: 90n,
        // Real receipt, exact amount match — but the recipient is a
        // DIFFERENT campaign's Safe, not this donation's campaign.safeAddress.
        // Deleting the recipient check from the implementation would make
        // this test (falsely) pass, since the amount matches exactly.
        logs: [erc20TransferLog(0, OTHER_SAFE_ADDRESS, 1_000_000n)],
      }),
    } as any;

    const confirmed = await service.confirmDonations(11155111, 100, 5, client);

    expect(confirmed).toBe(0);
    expect(prisma.campaign.update).not.toHaveBeenCalled();
    expect(prisma.donation.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: DonationStatus.CONFIRMED }) }),
    );
  });

  it('does NOT confirm when the receipt block is not yet deep enough, even if the stored blockNumber looks eligible', async () => {
    // The stored (webhook-supplied) blockNumber must never be trusted for
    // the depth check — only the receipt's own blockNumber counts. Use a
    // stored blockNumber far in the past (which would pass any eligibility
    // filter) alongside a receipt.blockNumber that is still within the
    // confirmation window. If the implementation ever reverts to trusting
    // `d.blockNumber` for depth, this test starts (falsely) confirming.
    const donation = { ...baseDonation, blockNumber: 1 };
    prisma.donation.findMany.mockResolvedValue([donation]);

    const client = {
      getTransactionReceipt: jest.fn().mockResolvedValue({
        status: 'success',
        blockNumber: 99n, // latestBlock(100) - 99 = 1 confirmation, need 5
        logs: [erc20TransferLog(0, SAFE_ADDRESS, 1_000_000n)],
      }),
    } as any;

    const confirmed = await service.confirmDonations(11155111, 100, 5, client);

    expect(confirmed).toBe(0);
    expect(prisma.campaign.update).not.toHaveBeenCalled();
  });

  it('does NOT touch attempts and does NOT confirm when verification cannot run at all (RPC/network error) — treated as transient, not a mismatch', async () => {
    const client = {
      getTransactionReceipt: jest.fn().mockRejectedValue(new Error('ETIMEDOUT: RPC request timed out')),
    } as any;

    const confirmed = await service.confirmDonations(11155111, 100, 5, client);

    expect(confirmed).toBe(0);
    // The load-bearing assertion: a thrown RPC error must not touch the
    // donation row at all (no attempts bump, no status change) — otherwise
    // an RPC outage would accumulate the same penalty as a real fabricated
    // claim and could eventually orphan a legitimate, fully-funded donation.
    expect(prisma.donation.update).not.toHaveBeenCalled();
    expect(prisma.campaign.update).not.toHaveBeenCalled();
  });

  it('never orphans a donation from repeated RPC failures alone, across many poll cycles', async () => {
    const client = {
      getTransactionReceipt: jest.fn().mockRejectedValue(new Error('rate limited')),
    } as any;

    // Well past MAX_ATTEMPTS (20) worth of poll cycles — if RPC failures
    // incremented `attempts` the way a real mismatch does, this donation
    // would have been ORPHANED long before cycle 25.
    for (let i = 0; i < 25; i++) {
      // eslint-disable-next-line no-await-in-loop
      await service.confirmDonations(11155111, 100, 5, client);
    }

    expect(prisma.donation.update).not.toHaveBeenCalled();
  });

  it('does not let one row\'s DB failure abort verification of the rest of the batch', async () => {
    const badDonation = { ...baseDonation, id: 'd-bad', txHash: '0xbad' };
    const goodDonation = { ...baseDonation, id: 'd-good', txHash: '0xgood' };
    prisma.donation.findMany.mockResolvedValue([badDonation, goodDonation]);

    // Persisting the failed-attempt counter for the bad row fails (e.g. a
    // transient DB error) — this must not prevent the good row, later in
    // the same batch, from being verified and confirmed.
    prisma.donation.update.mockImplementation((args: any) => {
      if (args.where.id === 'd-bad') return Promise.reject(new Error('DB connection lost'));
      return Promise.resolve();
    });

    const client = {
      getTransactionReceipt: jest.fn().mockImplementation(({ hash }: { hash: string }) => {
        if (hash === '0xbad') {
          // Fabricated: real receipt, wrong amount.
          return Promise.resolve({ status: 'success', blockNumber: 90n, logs: [erc20TransferLog(0, SAFE_ADDRESS, 1n)] });
        }
        // Genuine: real receipt, exact matching transfer.
        return Promise.resolve({ status: 'success', blockNumber: 90n, logs: [erc20TransferLog(0, SAFE_ADDRESS, 1_000_000n)] });
      }),
    } as any;

    const confirmed = await service.confirmDonations(11155111, 100, 5, client);

    expect(confirmed).toBe(1);
    expect(prisma.campaign.update).toHaveBeenCalledTimes(1);
  });
});
