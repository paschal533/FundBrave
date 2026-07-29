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
});
