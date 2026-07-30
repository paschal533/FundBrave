"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";
import { walletFetchers, type WalletBalances } from "@/lib/wallet-balances";

/** Token accessor that throws a friendly error when unavailable. */
function useToken() {
  const { getToken } = useAuth();
  return useCallback(async () => {
    const token = await getToken();
    if (!token) throw new ApiError("You must be signed in", 401);
    return token;
  }, [getToken]);
}

export function useWalletBalances(enabled: boolean) {
  const getToken = useToken();
  return useQuery<WalletBalances, Error>({
    queryKey: ["wallet", "balances"],
    enabled,
    staleTime: 15_000,
    queryFn: async () => walletFetchers.balances(await getToken()),
  });
}
