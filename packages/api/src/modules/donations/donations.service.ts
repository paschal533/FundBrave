import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CampaignStatus, DonationStatus, Prisma } from '@prisma/client';
import { decodeEventLog, formatUnits, parseAbiItem, type Hex, type PublicClient } from 'viem';
import { PrismaService } from '../../prisma/prisma.service';
import { PricingService } from './pricing.service';
import { findToken } from './tokens.config';

const TRANSFER_EVENT = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

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
   *
   * `isRealTransfer` throws when verification could not run at all (RPC
   * timeout, rate limit, node outage) and only returns `false` when it ran
   * successfully and found a genuine mismatch. Those two cases are handled
   * differently below: a thrown error skips the donation this cycle with no
   * penalty (transient — retried next poll), while a `false` result counts
   * as a real failed attempt that can eventually orphan the row. Without this
   * split, a run of RPC hiccups would accumulate the same `attempts` counter
   * as genuine fabricated claims and could permanently orphan a real,
   * legitimately-funded donation.
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
        let verification: { ok: boolean; reason: string };
        try {
          verification = await this.isRealTransfer(client, d, latestBlock, confirmations);
        } catch (err) {
          // Verification could not run this cycle — do NOT touch `attempts`.
          // Leave the donation exactly as-is; the next poll will retry.
          this.logger.warn(
            `Donation ${d.id} (tx ${d.txHash}): could not verify this cycle (RPC/network error), will retry: ${errorMessage(err)}`,
          );
          continue;
        }

        if (!verification.ok) {
          const attempts = d.attempts + 1;
          try {
            if (attempts >= MAX_ATTEMPTS) {
              await this.prisma.donation.update({
                where: { id: d.id },
                data: { status: DonationStatus.ORPHANED, attempts },
              });
              this.logger.warn(
                `Donation ${d.id} (tx ${d.txHash}) orphaned after ${attempts} failed confirmation attempts — last reason: ${verification.reason}`,
              );
            } else {
              await this.prisma.donation.update({ where: { id: d.id }, data: { attempts } });
              this.logger.warn(
                `Donation ${d.id} (tx ${d.txHash}) failed verification (attempt ${attempts}/${MAX_ATTEMPTS}): ${verification.reason}`,
              );
            }
          } catch (err) {
            // Don't let one row's DB failure abort the rest of the batch.
            this.logger.error(
              `Donation ${d.id}: failed to persist failed-attempt counter, will retry next cycle: ${errorMessage(err)}`,
            );
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
   * Verifies that the receipt/transaction independently shows the exact
   * transfer this donation row claims (amount, token, recipient), buried
   * under enough confirmations. The webhook-supplied blockNumber is never
   * trusted for the depth check — depth is computed from the receipt's own
   * blockNumber.
   *
   * IMPORTANT: this method intentionally does NOT catch errors thrown by
   * `client.getTransactionReceipt` / `client.getTransaction` (RPC timeouts,
   * rate limits, node outages, "not found" while a node is still catching
   * up). Those propagate to the caller, which must treat them as "could not
   * verify this cycle" — not as a mismatch. Only a call that completed
   * successfully but produced data that doesn't match the donation's claim
   * resolves as `{ ok: false }`, since that's the only case that should ever
   * count as a real failed attempt.
   */
  private async isRealTransfer(
    client: PublicClient,
    d: { txHash: string; logIndex: number; tokenAddress: string | null; amountRaw: string; campaign: { safeAddress: string } },
    latestBlock: number,
    confirmations: number,
  ): Promise<{ ok: boolean; reason: string }> {
    // Not caught here — an RPC/network failure must propagate to the caller.
    const receipt = await client.getTransactionReceipt({ hash: d.txHash as Hex });

    if (receipt.status !== 'success') {
      return { ok: false, reason: `receipt status is "${receipt.status}", not "success"` };
    }
    const depth = latestBlock - Number(receipt.blockNumber);
    if (depth < confirmations) {
      return { ok: false, reason: `only ${depth} confirmations at block ${receipt.blockNumber}, need ${confirmations}` };
    }

    const safeAddress = d.campaign.safeAddress.toLowerCase();

    if (d.tokenAddress) {
      const log = receipt.logs.find((l) => l.logIndex === d.logIndex);
      if (!log) {
        return { ok: false, reason: `no log at logIndex ${d.logIndex} in receipt` };
      }
      if (log.address.toLowerCase() !== d.tokenAddress.toLowerCase()) {
        return { ok: false, reason: `log at logIndex ${d.logIndex} is from ${log.address}, not claimed token ${d.tokenAddress}` };
      }
      let decoded: { args: { to: string; value: bigint } };
      try {
        decoded = decodeEventLog({ abi: [TRANSFER_EVENT], data: log.data, topics: log.topics }) as {
          args: { to: string; value: bigint };
        };
      } catch (err) {
        // Data-only decode failure — no network call involved, so this is a
        // genuine mismatch (the log isn't actually a Transfer event), not an
        // RPC issue.
        return { ok: false, reason: `log at logIndex ${d.logIndex} did not decode as an ERC-20 Transfer event: ${errorMessage(err)}` };
      }
      if (decoded.args.to.toLowerCase() !== safeAddress) {
        return { ok: false, reason: `transfer recipient ${decoded.args.to} does not match campaign safe ${safeAddress}` };
      }
      if (decoded.args.value !== BigInt(d.amountRaw)) {
        return { ok: false, reason: `transfer value ${decoded.args.value} does not match claimed amountRaw ${d.amountRaw}` };
      }
      return { ok: true, reason: 'ok' };
    }

    // Not caught here — same reasoning as getTransactionReceipt above.
    const tx = await client.getTransaction({ hash: d.txHash as Hex });
    if (!tx.to || tx.to.toLowerCase() !== safeAddress) {
      return { ok: false, reason: `native tx recipient ${tx.to ?? 'null'} does not match campaign safe ${safeAddress}` };
    }
    if (tx.value !== BigInt(d.amountRaw)) {
      return { ok: false, reason: `native tx value ${tx.value} does not match claimed amountRaw ${d.amountRaw}` };
    }
    return { ok: true, reason: 'ok' };
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
