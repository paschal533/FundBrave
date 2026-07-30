"use client";

/**
 * Send funds out of the user's own Privy embedded wallet to any address.
 *
 * Unlike withdrawals (2-of-2 Safe, backend-coordinated), this is an ordinary
 * wallet send: Privy signs and broadcasts directly from the embedded wallet,
 * no backend involvement, with Privy's own confirmation modal in front of it.
 */

import { useCallback } from "react";
import { useSendTransaction, useWallets } from "@privy-io/react-auth";
import { encodeFunctionData, erc20Abi, type Address } from "viem";
import { isPrivyConfigured } from "@/lib/privy-config";

export class SendError extends Error {}

export interface SendFundsInput {
  chainId: number;
  /** null = native coin */
  tokenAddress: string | null;
  to: string;
  amountRaw: bigint;
}

export interface FundsSender {
  /** Send funds; resolves to the broadcast transaction hash. */
  send: (input: SendFundsInput) => Promise<string>;
  /** The embedded wallet address, or null if not ready. */
  address: string | null;
  ready: boolean;
}

/** Real implementation — mounted only when PrivyProvider is present. */
function useFundsSenderReal(): FundsSender {
  const { wallets, ready } = useWallets();
  const { sendTransaction } = useSendTransaction();

  const embedded = wallets.find((w) => w.walletClientType === "privy") ?? null;

  const send = useCallback(
    async ({ chainId, tokenAddress, to, amountRaw }: SendFundsInput): Promise<string> => {
      if (!embedded) {
        throw new SendError(
          "Your embedded wallet isn't ready yet. Please try again in a moment."
        );
      }
      const { hash } = await sendTransaction(
        tokenAddress
          ? {
              to: tokenAddress as Address,
              value: 0n,
              chainId,
              data: encodeFunctionData({
                abi: erc20Abi,
                functionName: "transfer",
                args: [to as Address, amountRaw],
              }),
            }
          : { to: to as Address, value: amountRaw, chainId },
        { address: embedded.address }
      );
      return hash;
    },
    [embedded, sendTransaction]
  );

  return { send, address: embedded?.address ?? null, ready };
}

/** Degraded mode — Privy not configured. */
function useFundsSenderDegraded(): FundsSender {
  const send = useCallback(async (): Promise<string> => {
    throw new SendError(
      "Sending is unavailable: NEXT_PUBLIC_PRIVY_APP_ID is not configured."
    );
  }, []);
  return { send, address: null, ready: true };
}

export function useSendFunds(): FundsSender {
  /* eslint-disable react-hooks/rules-of-hooks */
  return isPrivyConfigured ? useFundsSenderReal() : useFundsSenderDegraded();
  /* eslint-enable react-hooks/rules-of-hooks */
}
