import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CampaignStatus, DonationStatus, Prisma } from '@prisma/client';
import { decodeEventLog, formatUnits, parseAbiItem, type Hex, type PublicClient } from 'viem';
import { PrismaService } from '../../prisma/prisma.service';
import { PricingService } from './pricing.service';
import { findToken } from './tokens.config';

const TRANSFER_EVENT = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');

export interface IncomingTransfer {
  chainId: number;
  txHash: string;
  /** -1 for native coin transfers */
  logIndex: number;
  /** null = native coin */
  tokenAddress: string | null;
  /** integer string, token base units */
  amountRaw: string;
  fromAddress: string;
  toAddress: string;
  blockNumber: number;
}

@Injectable()
export class DonationsService {
  private readonly logger = new Logger(DonationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
  ) {}

  /**
   * Record an observed incoming transfer to a campaign Safe address.
   * Idempotent on (chainId, txHash, logIndex). Non-allowlisted tokens are
   * stored as EXCLUDED and never counted.
   */
  async recordTransfer(t: IncomingTransfer): Promise<void> {
    if (BigInt(t.amountRaw) <= 0n) return;

    const campaign = await this.prisma.campaign.findFirst({
      where: {
        safeAddress: { equals: t.toAddress, mode: 'insensitive' },
        status: { in: [CampaignStatus.ACTIVE, CampaignStatus.COMPLETED] },
      },
      select: { id: true },
    });
    if (!campaign) return; // not one of ours

    const token = findToken(t.chainId, t.tokenAddress);
    let amountUsd = new Prisma.Decimal(0);
    let priceUsd = new Prisma.Decimal(0);
    let symbol = 'UNKNOWN';
    let status: DonationStatus = DonationStatus.EXCLUDED;

    if (token) {
      symbol = token.symbol;
      try {
        const price = await this.pricing.getUsdPrice(token.coingeckoId, token.isStablecoin);
        const amount = Number(formatUnits(BigInt(t.amountRaw), token.decimals));
        priceUsd = new Prisma.Decimal(price.toFixed(8));
        amountUsd = new Prisma.Decimal((amount * price).toFixed(2));
        status = DonationStatus.DETECTED;
      } catch {
        // Price unavailable for a non-stablecoin: keep DETECTED with 0 USD;
        // the confirmation cron re-prices before confirming.
        status = DonationStatus.DETECTED;
      }
    }

    const donor = await this.prisma.user.findFirst({
      where: { walletAddress: { equals: t.fromAddress, mode: 'insensitive' } },
      select: { id: true },
    });

    try {
      await this.prisma.donation.create({
        data: {
          campaignId: campaign.id,
          chainId: t.chainId,
          txHash: t.txHash.toLowerCase(),
          logIndex: t.logIndex,
          tokenAddress: t.tokenAddress?.toLowerCase() ?? null,
          tokenSymbol: symbol,
          amountRaw: t.amountRaw,
          amountUsd,
          priceUsd,
          donorAddress: t.fromAddress.toLowerCase(),
          donorId: donor?.id ?? null,
          status,
          blockNumber: t.blockNumber,
        },
      });
      this.logger.log(
        `Recorded ${symbol} transfer ${t.txHash} (chain ${t.chainId}) → campaign ${campaign.id} [${status}]`,
      );
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return; // duplicate delivery — already recorded
      }
      throw err;
    }
  }

  /**
   * Promote DETECTED donations to CONFIRMED once enough blocks have passed.
   * Called by the indexing cron with the latest block per chain.
   *
   * When a chain client is provided we re-verify the actual transfer on
   * receipt logs (ERC-20) or the transaction itself (native) — not just
   * that some transaction with this hash succeeded. This is the only
   * defense against a webhook (or any future donation-recording path)
   * claiming an amount/recipient that was never actually transferred.
   */
  async confirmDonations(
    chainId: number,
    latestBlock: number,
    confirmations: number,
    client?: PublicClient,
  ): Promise<number> {
    const MAX_ATTEMPTS = 20;
    const eligible = await this.prisma.donation.findMany({
      where: {
        chainId,
        status: DonationStatus.DETECTED,
        blockNumber: { lte: latestBlock - confirmations },
      },
      orderBy: { blockNumber: 'asc' },
      include: { campaign: { select: { safeAddress: true } } },
      take: 100,
    });

    let confirmed = 0;
    for (const d of eligible) {
      if (client) {
        const ok = await this.isRealTransfer(client, d, latestBlock, confirmations);
        if (!ok) {
          const attempts = d.attempts + 1;
          if (attempts >= MAX_ATTEMPTS) {
            await this.prisma.donation.update({
              where: { id: d.id },
              data: { status: DonationStatus.ORPHANED, attempts },
            });
            this.logger.warn(`Donation ${d.id} (tx ${d.txHash}) orphaned after ${attempts} failed confirmation attempts`);
          } else {
            await this.prisma.donation.update({ where: { id: d.id }, data: { attempts } });
          }
          continue;
        }
      }

      let amountUsd = d.amountUsd;
      if (amountUsd.lte(0)) {
        const token = findToken(d.chainId, d.tokenAddress);
        if (!token) continue;
        try {
          const price = await this.pricing.getUsdPrice(token.coingeckoId, token.isStablecoin);
          const amount = Number(formatUnits(BigInt(d.amountRaw), token.decimals));
          amountUsd = new Prisma.Decimal((amount * price).toFixed(2));
        } catch {
          continue;
        }
      }

      const isNewDonor =
        (await this.prisma.donation.count({
          where: {
            campaignId: d.campaignId,
            donorAddress: d.donorAddress,
            status: DonationStatus.CONFIRMED,
          },
        })) === 0;

      await this.prisma.$transaction([
        this.prisma.donation.update({
          where: { id: d.id },
          data: { status: DonationStatus.CONFIRMED, amountUsd },
        }),
        this.prisma.campaign.update({
          where: { id: d.campaignId },
          data: {
            raisedUsd: { increment: amountUsd },
            ...(isNewDonor ? { donorsCount: { increment: 1 } } : {}),
          },
        }),
      ]);
      confirmed++;
    }
    if (confirmed > 0) this.logger.log(`Confirmed ${confirmed} donations on chain ${chainId}`);
    return confirmed;
  }

  /**
   * True only if: the tx has a successful receipt buried under enough
   * confirmations, AND the receipt/transaction independently shows the
   * exact transfer this donation row claims (amount, token, recipient).
   * The webhook-supplied blockNumber is never trusted for this check —
   * depth is computed from the receipt's own blockNumber.
   */
  private async isRealTransfer(
    client: PublicClient,
    d: { txHash: string; logIndex: number; tokenAddress: string | null; amountRaw: string; campaign: { safeAddress: string } },
    latestBlock: number,
    confirmations: number,
  ): Promise<boolean> {
    try {
      const receipt = await client.getTransactionReceipt({ hash: d.txHash as Hex });
      if (receipt.status !== 'success') return false;
      if (latestBlock - Number(receipt.blockNumber) < confirmations) return false;

      const safeAddress = d.campaign.safeAddress.toLowerCase();

      if (d.tokenAddress) {
        const log = receipt.logs.find((l) => l.logIndex === d.logIndex);
        if (!log || log.address.toLowerCase() !== d.tokenAddress.toLowerCase()) return false;
        try {
          const decoded = decodeEventLog({ abi: [TRANSFER_EVENT], data: log.data, topics: log.topics });
          return (
            decoded.args.to.toLowerCase() === safeAddress &&
            decoded.args.value === BigInt(d.amountRaw)
          );
        } catch {
          return false;
        }
      }

      const tx = await client.getTransaction({ hash: d.txHash as Hex });
      return (
        !!tx.to &&
        tx.to.toLowerCase() === safeAddress &&
        tx.value === BigInt(d.amountRaw)
      );
    } catch {
      return false;
    }
  }

  // ─── Public reads ─────────────────────────────────────────────

  async listForCampaign(campaignId: string, page = 1, limit = 20) {
    const where = { campaignId, status: DonationStatus.CONFIRMED };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.donation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { donor: { select: { username: true, displayName: true, avatarUrl: true } } },
      }),
      this.prisma.donation.count({ where }),
    ]);
    return {
      items: items.map((d) => ({
        id: d.id,
        chainId: d.chainId,
        txHash: d.txHash,
        tokenSymbol: d.tokenSymbol,
        amountRaw: d.amountRaw,
        amountUsd: d.amountUsd.toString(),
        donorAddress: d.donorAddress,
        donor: d.donor,
        createdAt: d.createdAt,
      })),
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async raisedBreakdown(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');

    const groups = await this.prisma.donation.groupBy({
      by: ['chainId', 'tokenSymbol'],
      where: { campaignId, status: DonationStatus.CONFIRMED },
      _sum: { amountUsd: true },
      _count: { _all: true },
    });
    return {
      breakdown: groups.map((g) => ({
        chainId: g.chainId,
        tokenSymbol: g.tokenSymbol,
        totalUsd: (g._sum.amountUsd ?? new Prisma.Decimal(0)).toString(),
        count: g._count._all,
      })),
    };
  }
}
