/**
 * The creator's own embedded-wallet balances, for the "send funds out" UI.
 * Not to be confused with lib/withdrawals.ts's CampaignBalances, which reads
 * the campaign's Safe (a different address, a different flow).
 */

import { apiFetch } from "@/lib/api";
import type { TokenBalance } from "@/lib/withdrawals";

export interface WalletChainBalance {
  chainId: number;
  name: string;
  explorerUrl: string;
  native: { symbol: string; decimals: number; balanceRaw: string };
  tokens: TokenBalance[];
}

export interface WalletBalances {
  walletAddress: string;
  chains: WalletChainBalance[];
}

export const walletFetchers = {
  balances: (token: string) =>
    apiFetch<WalletBalances>("/api/wallet/balances", { token }),
};
