import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { CampaignStatus } from '@prisma/client';
import { createPublicClient, http, parseAbiItem, type Address, type PublicClient } from 'viem';
import { PrismaService } from '../../prisma/prisma.service';
import { DonationsService } from './donations.service';
import { tokensForChain } from './tokens.config';
import type { ChainConfig } from '../../config/configuration';

const TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)',
);
const MAX_BLOCK_RANGE = 2_000n;

/**
 * Primary donation indexer. Every 2 minutes it scans, via plain RPC, both
 * ERC-20 Transfer logs (single getLogs call per chain) and native-coin
 * transfers (block-by-block scan of the same delta range) to campaign Safe
 * addresses, then promotes DETECTED donations to CONFIRMED. Fully
 * self-sufficient — Moralis Streams (webhook) is optional low-latency
 * redundancy, not a requirement.
 */
@Injectable()
export class IndexingService {
  private readonly logger = new Logger(IndexingService.name);
  private readonly chains: ChainConfig[];
  private readonly confirmations: number;
  private readonly clients = new Map<number, PublicClient>();
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly donations: DonationsService,
    config: ConfigService,
  ) {
    this.chains = config.get<ChainConfig[]>('chains.enabled') ?? [];
    this.confirmations = config.get<number>('donations.confirmations') ?? 5;
  }

  private clientFor(chain: ChainConfig): PublicClient {
    let client = this.clients.get(chain.chainId);
    if (!client) {
      client = createPublicClient({ transport: http(chain.rpcUrl) });
      this.clients.set(chain.chainId, client);
    }
    return client;
  }

  @Cron('*/2 * * * *')
  async poll(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const safeAddresses = await this.activeSafeAddresses();
      for (const chain of this.chains) {
        try {
          await this.pollChain(chain, safeAddresses);
        } catch (err) {
          this.logger.warn(`Polling ${chain.name} failed: ${(err as Error).message}`);
        }
      }
    } finally {
      this.running = false;
    }
  }

  private async activeSafeAddresses(): Promise<Address[]> {
    const campaigns = await this.prisma.campaign.findMany({
      where: { status: { in: [CampaignStatus.ACTIVE, CampaignStatus.COMPLETED] } },
      select: { safeAddress: true },
    });
    return campaigns
      .map((c) => c.safeAddress as Address)
      .filter((a) => /^0x[0-9a-fA-F]{40}$/.test(a));
  }

  private async pollChain(chain: ChainConfig, safeAddresses: Address[]): Promise<void> {
    const client = this.clientFor(chain);
    const latest = await client.getBlockNumber();

    // Confirmation pass runs even with no addresses (clears backlog).
    // Passing the client makes confirmation re-verify each tx receipt on-chain.
    await this.donations.confirmDonations(
      chain.chainId,
      Number(latest),
      this.confirmations,
      client,
    );

    if (safeAddresses.length === 0) return;

    const sync = await this.prisma.chainSyncState.findUnique({
      where: { chainId: chain.chainId },
    });
    const fromBlock = sync ? BigInt(sync.lastBlock) + 1n : latest - 10n;
    if (fromBlock > latest) return;
    const toBlock = fromBlock + MAX_BLOCK_RANGE > latest ? latest : fromBlock + MAX_BLOCK_RANGE;

    const tokenAddresses = tokensForChain(chain.chainId)
      .map((t) => t.address)
      .filter((a): a is string => a !== null) as Address[];

    if (tokenAddresses.length > 0) {
      const logs = await client.getLogs({
        address: tokenAddresses,
        event: TRANSFER_EVENT,
        args: { to: safeAddresses },
        fromBlock,
        toBlock,
      });
      for (const log of logs) {
        if (log.args.value === undefined || !log.args.from || !log.args.to) continue;
        await this.donations.recordTransfer({
          chainId: chain.chainId,
          txHash: log.transactionHash,
          logIndex: log.logIndex,
          tokenAddress: log.address,
          amountRaw: log.args.value.toString(),
          fromAddress: log.args.from,
          toAddress: log.args.to,
          blockNumber: Number(log.blockNumber),
        });
      }
      if (logs.length > 0) {
        this.logger.log(`${chain.name}: found ${logs.length} ERC-20 transfers in [${fromBlock}, ${toBlock}]`);
      }
    }

    await this.pollNativeTransfers(client, chain, safeAddresses, fromBlock, toBlock);

    await this.prisma.chainSyncState.upsert({
      where: { chainId: chain.chainId },
      create: { chainId: chain.chainId, lastBlock: Number(toBlock) },
      update: { lastBlock: Number(toBlock) },
    });
  }

  /**
   * Native-coin transfers emit no logs, so they can't be picked up by
   * getLogs — each new block's transaction list has to be fetched and
   * filtered directly. This costs one RPC call per block (vs. one getLogs
   * call for the whole ERC-20 range), but fromBlock/toBlock is normally
   * just the handful of blocks since the last 2-minute poll, so the extra
   * calls are cheap; MAX_BLOCK_RANGE still caps the worst case (a long
   * outage) at 2,000 sequential calls.
   *
   * Only transactions addressed to a tracked Safe get a receipt lookup
   * (cheap spam elsewhere in the block costs nothing extra), and reverted
   * ones are never recorded at all — a reverted send moved no value, and
   * recording it anyway would create a DETECTED row that can never
   * legitimately confirm, wasting confirmation-check cycles forever.
   */
  private async pollNativeTransfers(
    client: PublicClient,
    chain: ChainConfig,
    safeAddresses: Address[],
    fromBlock: bigint,
    toBlock: bigint,
  ): Promise<void> {
    const safeSet = new Set(safeAddresses.map((a) => a.toLowerCase()));
    let found = 0;
    for (let blockNumber = fromBlock; blockNumber <= toBlock; blockNumber++) {
      const block = await client.getBlock({ blockNumber, includeTransactions: true });
      for (const tx of block.transactions) {
        if (typeof tx === 'string') continue;
        if (!tx.to || tx.value === 0n) continue;
        if (!safeSet.has(tx.to.toLowerCase())) continue;

        const receipt = await client.getTransactionReceipt({ hash: tx.hash });
        if (receipt.status !== 'success') continue;

        await this.donations.recordTransfer({
          chainId: chain.chainId,
          txHash: tx.hash,
          logIndex: -1,
          tokenAddress: null,
          amountRaw: tx.value.toString(),
          fromAddress: tx.from,
          toAddress: tx.to,
          blockNumber: Number(blockNumber),
        });
        found++;
      }
    }
    if (found > 0) {
      this.logger.log(`${chain.name}: found ${found} native transfers in [${fromBlock}, ${toBlock}]`);
    }
  }
}
