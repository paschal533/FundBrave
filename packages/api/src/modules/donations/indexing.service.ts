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
// Bounded concurrency for native-transfer block fetches — high enough to
// meaningfully parallelize across a multi-block range, low enough not to
// flood an RPC endpoint with simultaneous connections during catch-up.
const BLOCK_BATCH_SIZE = 25;

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
      // Chains are independent RPC endpoints, so poll them concurrently rather
      // than one at a time — sequential polling of 4 mainnet chains, each with
      // its own block-range scan, can exceed the 2-minute cron interval and
      // fall permanently behind (see H-5).
      const results = await Promise.allSettled(
        this.chains.map((chain) => this.pollChain(chain, safeAddresses)),
      );
      results.forEach((result, i) => {
        if (result.status === 'rejected') {
          const chain = this.chains[i];
          this.logger.warn(`Polling ${chain.name} failed: ${(result.reason as Error).message}`);
        }
      });
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
    //
    // Deliberately isolated from the block-range scan below: confirmation
    // promotes already-DETECTED rows and takes no fromBlock/toBlock, so its
    // failure says nothing about whether this cycle's range was scanned. Its
    // own errors must therefore neither anchor chainSyncState (which would
    // needlessly re-scan a range that succeeded) nor abort the scan (which,
    // on a cold start, would leave no chainSyncState row at all and silently
    // skip the intervening blocks next cycle). It is retried every cycle
    // regardless, since it is driven purely by DB state.
    try {
      await this.donations.confirmDonations(
        chain.chainId,
        Number(latest),
        this.confirmations,
        client,
      );
    } catch (err) {
      this.logger.error(
        `${chain.name}: confirmation pass failed: ${(err as Error).message}. ` +
          `Donations stay DETECTED and will be retried next cycle.`,
      );
    }

    if (safeAddresses.length === 0) return;

    const sync = await this.prisma.chainSyncState.findUnique({
      where: { chainId: chain.chainId },
    });
    const fromBlock = sync ? BigInt(sync.lastBlock) + 1n : latest - 10n;
    if (fromBlock > latest) return;
    const toBlock = fromBlock + MAX_BLOCK_RANGE > latest ? latest : fromBlock + MAX_BLOCK_RANGE;

    // Everything that scans [fromBlock, toBlock] is wrapped in one try/catch so
    // that ANY failure — an ERC-20 getLogs rejection, a recordTransfer write
    // error, or an unexpected throw out of pollNativeTransfers — lands on the
    // same anchoring path as a native-transfer failure, instead of propagating
    // out of pollChain and skipping the upsert entirely. Skipping the upsert is
    // harmless in steady state (the old row persists, so the range is re-scanned)
    // but on a cold start (no row yet) the next cycle recomputes fromBlock from a
    // fresh `latest` and silently loses the failed range — which is exactly the
    // situation each of the 4 mainnet chains starts in.
    let hadFailures = false;
    try {
      await this.scanErc20Transfers(client, chain, safeAddresses, fromBlock, toBlock);
      hadFailures = await this.pollNativeTransfers(client, chain, safeAddresses, fromBlock, toBlock);
    } catch (err) {
      this.logger.error(
        `${chain.name}: scan of [${fromBlock}, ${toBlock}] failed: ${(err as Error).message}. ` +
          `Range will be re-scanned next poll cycle.`,
      );
      hadFailures = true;
    }

    this.logSyncProgress(chain, fromBlock, toBlock, latest, hadFailures);

    // Always upsert chainSyncState to ensure a persisted row exists after the first poll.
    // On success: advance normally to toBlock.
    // On failure: anchor to fromBlock - 1, ensuring the failed range is re-scanned next cycle.
    // With this approach, fromBlock is always derived from a persisted lastBlock value on
    // the 2nd+ cycle, guaranteeing retry semantics in all cases.
    const lastBlockToStore = hadFailures
      ? Number(fromBlock) - 1 // Don't advance; re-scan this range next cycle
      : Number(toBlock); // Advance normally on success

    await this.prisma.chainSyncState.upsert({
      where: { chainId: chain.chainId },
      create: { chainId: chain.chainId, lastBlock: lastBlockToStore },
      update: { lastBlock: lastBlockToStore },
    });
  }

  /**
   * Surface how far this poll's sync target trails the current chain head.
   * A poller that silently falls behind (H-5) is only detectable via this line.
   *
   * The level is escalated to warn when this cycle anchored on failure, or when
   * the poller is more than one full MAX_BLOCK_RANGE behind the head. A range
   * whose block or receipt is permanently unavailable from the configured RPC
   * is retried forever by design (force-advancing past it would mean accepting
   * permanent, silent donation loss for that range), so the only remaining
   * safeguard is that the stall becomes visible to whatever watches warnings —
   * at info level it would never escalate and nobody would ever be alerted.
   */
  private logSyncProgress(
    chain: ChainConfig,
    fromBlock: bigint,
    toBlock: bigint,
    latest: bigint,
    hadFailures: boolean,
  ): void {
    const lag = latest - toBlock;
    const range = `[${fromBlock}, ${toBlock}] (head ${latest}, lag ${lag} blocks)`;
    if (hadFailures) {
      this.logger.warn(
        `${chain.name}: scan of ${range} did not fully succeed — not advancing sync state, ` +
          `this range will be re-scanned next cycle. Indexing for this chain is stalled ` +
          `until it succeeds.`,
      );
      return;
    }
    if (lag > MAX_BLOCK_RANGE) {
      this.logger.warn(`${chain.name}: synced ${range} — poller is falling behind the chain head`);
      return;
    }
    this.logger.log(`${chain.name}: synced ${range}`);
  }

  /**
   * Single getLogs call covering every allowlisted ERC-20 on this chain for the
   * whole [fromBlock, toBlock] range. Errors are intentionally NOT caught here —
   * pollChain's surrounding try/catch owns them so they reach the same
   * chainSyncState anchoring path as native-transfer failures.
   */
  private async scanErc20Transfers(
    client: PublicClient,
    chain: ChainConfig,
    safeAddresses: Address[],
    fromBlock: bigint,
    toBlock: bigint,
  ): Promise<void> {
    const tokenAddresses = tokensForChain(chain.chainId)
      .map((t) => t.address)
      .filter((a): a is string => a !== null) as Address[];
    if (tokenAddresses.length === 0) return;

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
      this.logger.log(
        `${chain.name}: found ${logs.length} ERC-20 transfers in [${fromBlock}, ${toBlock}]`,
      );
    }
  }

  /**
   * Native-coin transfers emit no logs, so they can't be picked up by
   * getLogs — each new block's transaction list has to be fetched and
   * filtered directly. This costs one RPC call per block (vs. one getLogs
   * call for the whole ERC-20 range), but fromBlock/toBlock is normally
   * just the handful of blocks since the last 2-minute poll, so the extra
   * calls are cheap; MAX_BLOCK_RANGE still caps the worst case (a long
   * outage) at 2,000 calls.
   *
   * Blocks are fetched in bounded concurrent batches of BLOCK_BATCH_SIZE
   * rather than one at a time — a purely sequential scan of a 2,000-block
   * catch-up range (or even a routine multi-block range across 4 mainnet
   * chains) could not keep up within the 2-minute poll interval (H-5).
   * Batching is bounded rather than a single unbounded Promise.all across
   * the whole range, so a long outage's catch-up doesn't open thousands of
   * simultaneous RPC connections at once.
   *
   * Only transactions addressed to a tracked Safe get a receipt lookup
   * (cheap spam elsewhere in the block costs nothing extra), and reverted
   * ones are never recorded at all — a reverted send moved no value, and
   * recording it anyway would create a DETECTED row that can never
   * legitimately confirm, wasting confirmation-check cycles forever.
   *
   * Receipt lookups and recording are wrapped in try-catch per transaction,
   * so a flaky RPC response for one candidate doesn't abort processing of
   * remaining candidates in the block or other blocks in this poll cycle.
   * If any per-candidate error occurs, that transaction is logged and skipped,
   * and the method returns true. This signals the caller to skip advancing
   * chainSyncState, ensuring the entire block range is re-scanned next cycle.
   *
   * @returns true if any per-candidate error occurred; false if all completed successfully
   */
  private async pollNativeTransfers(
    client: PublicClient,
    chain: ChainConfig,
    safeAddresses: Address[],
    fromBlock: bigint,
    toBlock: bigint,
  ): Promise<boolean> {
    const safeSet = new Set(safeAddresses.map((a) => a.toLowerCase()));
    let found = 0;
    let hadFailures = false;

    const blockNumbers: bigint[] = [];
    for (let b = fromBlock; b <= toBlock; b++) blockNumbers.push(b);

    for (let i = 0; i < blockNumbers.length; i += BLOCK_BATCH_SIZE) {
      const batch = blockNumbers.slice(i, i + BLOCK_BATCH_SIZE);
      let blocks: Awaited<ReturnType<PublicClient['getBlock']>>[];
      try {
        blocks = await Promise.all(
          batch.map((blockNumber) => client.getBlock({ blockNumber, includeTransactions: true })),
        );
      } catch (err) {
        // A batch-level RPC failure (e.g. a rate limit tripped by issuing up to
        // BLOCK_BATCH_SIZE concurrent getBlock calls) must not bypass the same
        // hadFailures -> chainSyncState anchoring path that per-candidate
        // failures use below — otherwise this range would be silently skipped
        // on the next poll cycle instead of re-scanned. Preserve whatever
        // found/hadFailures state earlier, already-successful batches
        // accumulated, and stop scanning further batches in this range.
        this.logger.warn(
          `${chain.name}: failed to fetch blocks [${batch[0]}, ${batch[batch.length - 1]}]: ${(err as Error).message}. ` +
            `Skipping; block range will be re-scanned next poll cycle.`,
        );
        hadFailures = true;
        break;
      }

      for (let j = 0; j < blocks.length; j++) {
        const block = blocks[j];
        const blockNumber = batch[j];
        for (const tx of block.transactions) {
          if (typeof tx === 'string') continue;
          if (!tx.to || tx.value === 0n) continue;
          if (!safeSet.has(tx.to.toLowerCase())) continue;

          try {
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
          } catch (err) {
            this.logger.warn(
              `${chain.name}: failed to process native transfer ${tx.hash}: ${(err as Error).message}. ` +
                `Skipping; block range will be re-scanned next poll cycle.`,
            );
            hadFailures = true;
          }
        }
      }
    }

    if (found > 0) {
      this.logger.log(`${chain.name}: found ${found} native transfers in [${fromBlock}, ${toBlock}]`);
    }
    return hadFailures;
  }
}
