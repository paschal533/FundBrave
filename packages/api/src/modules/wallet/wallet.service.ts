import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { erc20Abi, type Address } from 'viem';
import { SafeService } from '../safe/safe.service';
import { tokensForChain } from '../donations/tokens.config';
import { TtlCache } from '../../common/ttl-cache';
import type { ChainConfig } from '../../config/configuration';

export interface WalletTokenBalance {
  address: string | null;
  symbol: string;
  decimals: number;
  balanceRaw: string;
}

export interface WalletChainBalance {
  chainId: number;
  name: string;
  explorerUrl: string;
  native: { symbol: string; decimals: number; balanceRaw: string };
  tokens: WalletTokenBalance[];
}

export interface WalletBalances {
  walletAddress: string;
  chains: WalletChainBalance[];
}

const CACHE_TTL_MS = 20_000;

/**
 * Reads the creator's own Privy embedded-wallet balance across every
 * enabled chain — for the "send funds out" UI, not the campaign Safe
 * (see WithdrawalsService.campaignBalances for that).
 */
@Injectable()
export class WalletService {
  private readonly chains: ChainConfig[];
  private readonly cache = new TtlCache<WalletBalances>(CACHE_TTL_MS);

  constructor(
    private readonly safe: SafeService,
    config: ConfigService,
  ) {
    this.chains = config.get<ChainConfig[]>('chains.enabled') ?? [];
  }

  async balances(user: User): Promise<WalletBalances> {
    const address = user.walletAddress as Address | null;
    if (!address) return { walletAddress: '', chains: [] };

    const cached = this.cache.get(address);
    if (cached) return cached;

    const results = await Promise.allSettled(
      this.chains.map(async (chain): Promise<WalletChainBalance> => {
        const client = this.safe.publicClient(chain.chainId);
        const native = await client.getBalance({ address });
        const tokens = await Promise.all(
          tokensForChain(chain.chainId)
            .filter((t) => t.address !== null)
            .map(async (t) => ({
              address: t.address,
              symbol: t.symbol,
              decimals: t.decimals,
              balanceRaw: (
                await client.readContract({
                  address: t.address as Address,
                  abi: erc20Abi,
                  functionName: 'balanceOf',
                  args: [address],
                })
              ).toString(),
            })),
        );
        const nativeToken = tokensForChain(chain.chainId).find((t) => t.address === null);
        return {
          chainId: chain.chainId,
          name: chain.name,
          explorerUrl: chain.explorerUrl,
          native: {
            symbol: nativeToken?.symbol ?? 'ETH',
            decimals: 18,
            balanceRaw: native.toString(),
          },
          tokens,
        };
      }),
    );

    const result: WalletBalances = {
      walletAddress: address,
      chains: results
        .filter(<T,>(r: PromiseSettledResult<T>): r is PromiseFulfilledResult<T> => r.status === 'fulfilled')
        .map((r) => r.value),
    };
    this.cache.set(address, result);
    return result;
  }
}
