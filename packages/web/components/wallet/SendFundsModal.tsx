"use client";

/**
 * SendFundsModal — move funds out of the user's own embedded wallet to any
 * address. An ordinary wallet send (see hooks/useSendFunds), not a
 * withdrawal: no backend approval, no 2-of-2 — Privy's own confirmation
 * modal is the only gate before broadcast.
 */

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { truncateWalletAddress, isValidWalletAddress } from "@/lib/wallet";
import {
  AmountError,
  formatTokenAmount,
  parseTokenAmount,
  type TokenBalance,
} from "@/lib/withdrawals";
import { type WalletChainBalance } from "@/lib/wallet-balances";
import { useWalletBalances } from "@/hooks/useWalletBalances";
import { useSendFunds, SendError } from "@/hooks/useSendFunds";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { AlertTriangle, CheckCircle2, Clock, Send } from "@/components/ui/icons";

interface SendFundsModalProps {
  open: boolean;
  onClose: () => void;
}

type SelectableToken = TokenBalance & { chainId: number };

function tokensWithBalance(chain: WalletChainBalance): SelectableToken[] {
  const out: SelectableToken[] = [];
  if (BigInt(chain.native.balanceRaw || "0") > 0n) {
    out.push({
      address: null,
      symbol: chain.native.symbol,
      decimals: chain.native.decimals,
      balanceRaw: chain.native.balanceRaw,
      chainId: chain.chainId,
    });
  }
  for (const t of chain.tokens) {
    if (BigInt(t.balanceRaw || "0") > 0n) out.push({ ...t, chainId: chain.chainId });
  }
  return out;
}

export function SendFundsModal({ open, onClose }: SendFundsModalProps) {
  const { showToast } = useToast();
  const qc = useQueryClient();
  const balancesQuery = useWalletBalances(open);
  const { send } = useSendFunds();

  const [chainId, setChainId] = useState<number | null>(null);
  const [tokenKey, setTokenKey] = useState<string | null>(null); // `${chainId}:${address ?? 'native'}`
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState<string | null>(null);
  const [recipient, setRecipient] = useState("");
  const [recipientError, setRecipientError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const chains = balancesQuery.data?.chains ?? [];
  const fundedChains = useMemo(
    () => chains.filter((c) => tokensWithBalance(c).length > 0),
    [chains]
  );
  const activeChain = fundedChains.find((c) => c.chainId === chainId) ?? null;
  const tokens = activeChain ? tokensWithBalance(activeChain) : [];
  const activeToken =
    tokens.find((t) => `${t.chainId}:${t.address ?? "native"}` === tokenKey) ?? null;

  const reset = () => {
    setChainId(null);
    setTokenKey(null);
    setAmount("");
    setAmountError(null);
    setRecipient("");
    setRecipientError(null);
    setTxHash(null);
  };

  const handleClose = () => {
    if (sending) return;
    reset();
    onClose();
  };

  const handleMax = () => {
    if (!activeToken) return;
    setAmount(formatTokenAmount(activeToken.balanceRaw, activeToken.decimals, activeToken.decimals));
    setAmountError(null);
  };

  const handleSend = async () => {
    if (!activeChain || !activeToken) return;

    const to = recipient.trim();
    if (!isValidWalletAddress(to)) {
      setRecipientError("Enter a valid wallet address");
      return;
    }

    let amountRaw: bigint;
    try {
      amountRaw = parseTokenAmount(amount, activeToken.decimals);
    } catch (err) {
      setAmountError(err instanceof AmountError ? err.message : "Invalid amount");
      return;
    }
    if (amountRaw > BigInt(activeToken.balanceRaw)) {
      setAmountError("Amount exceeds the available balance");
      return;
    }

    setSending(true);
    try {
      const hash = await send({
        chainId: activeChain.chainId,
        tokenAddress: activeToken.address,
        to,
        amountRaw,
      });
      setTxHash(hash);
      void qc.invalidateQueries({ queryKey: ["wallet", "balances"] });
    } catch (err) {
      const msg = err instanceof SendError ? err.message : "Sending failed. Please try again.";
      showToast(msg, "error", 7000);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Send funds"
      dismissible={!sending}
    >
      {txHash ? (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <CheckCircle2 size={48} className="text-brave-mint" aria-hidden="true" />
          <div>
            <p className="text-base font-semibold text-foreground">Sent</p>
            <p className="mt-1 text-sm text-text-secondary">
              Your transaction has been broadcast to the network.
            </p>
          </div>
          {activeChain && (
            <a
              href={`${activeChain.explorerUrl}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-brave-mint hover:underline"
            >
              View on {activeChain.name} explorer
            </a>
          )}
          <Button onClick={handleClose} className="mt-2">
            Done
          </Button>
        </div>
      ) : balancesQuery.isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : balancesQuery.isError ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <AlertTriangle size={32} className="text-brave-amber" aria-hidden="true" />
          <p className="text-sm text-text-secondary">
            We couldn&apos;t read your wallet balance right now.
          </p>
          <Button variant="outline" size="sm" onClick={() => balancesQuery.refetch()}>
            Try again
          </Button>
        </div>
      ) : fundedChains.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <Clock size={32} className="text-text-tertiary" aria-hidden="true" />
          <p className="text-sm text-text-secondary">
            Your wallet is empty. Funds you receive will appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Chain */}
          <Field label="Network">
            <div className="flex flex-wrap gap-2">
              {fundedChains.map((c) => (
                <Chip
                  key={c.chainId}
                  active={c.chainId === chainId}
                  onClick={() => {
                    setChainId(c.chainId);
                    setTokenKey(null);
                    setAmount("");
                    setAmountError(null);
                  }}
                >
                  {c.name}
                </Chip>
              ))}
            </div>
          </Field>

          {/* Token */}
          {activeChain && (
            <Field label="Token">
              <div className="flex flex-wrap gap-2">
                {tokens.map((t) => {
                  const key = `${t.chainId}:${t.address ?? "native"}`;
                  return (
                    <Chip
                      key={key}
                      active={key === tokenKey}
                      onClick={() => {
                        setTokenKey(key);
                        setAmount("");
                        setAmountError(null);
                      }}
                    >
                      {t.symbol}
                      <span className="ml-1.5 text-xs text-text-tertiary">
                        {formatTokenAmount(t.balanceRaw, t.decimals)}
                      </span>
                    </Chip>
                  );
                })}
              </div>
            </Field>
          )}

          {/* Amount */}
          {activeToken && (
            <Field label="Amount">
              <div
                className={cn(
                  "flex items-center gap-2 rounded-xl border bg-surface-sunken px-3 py-2",
                  amountError ? "border-destructive/60" : "border-white/10"
                )}
              >
                <input
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setAmountError(null);
                  }}
                  placeholder="0.0"
                  className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-text-tertiary"
                  aria-label="Amount to send"
                />
                <span className="shrink-0 text-sm font-medium text-text-secondary">
                  {activeToken.symbol}
                </span>
                <button
                  type="button"
                  onClick={handleMax}
                  className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-brave-mint transition-colors hover:bg-brave-mint/10"
                >
                  Max
                </button>
              </div>
              {amountError ? (
                <p className="mt-1 text-xs text-destructive">{amountError}</p>
              ) : (
                <p className="mt-1 text-xs text-text-tertiary">
                  Available: {formatTokenAmount(activeToken.balanceRaw, activeToken.decimals)}{" "}
                  {activeToken.symbol}
                </p>
              )}
            </Field>
          )}

          {/* Recipient */}
          {activeToken && (
            <Field label="Send to">
              <input
                value={recipient}
                onChange={(e) => {
                  setRecipient(e.target.value);
                  setRecipientError(null);
                }}
                placeholder="0x..."
                className={cn(
                  "w-full rounded-xl border bg-surface-sunken px-3 py-2 font-mono text-sm text-foreground outline-none placeholder:text-text-tertiary",
                  recipientError ? "border-destructive/60" : "border-white/10"
                )}
                aria-label="Recipient wallet address"
              />
              {recipientError ? (
                <p className="mt-1 text-xs text-destructive">{recipientError}</p>
              ) : (
                <p className="mt-1 text-xs text-text-tertiary">
                  Double-check this address. Crypto transactions can&apos;t be reversed.
                </p>
              )}
            </Field>
          )}

          <Button
            onClick={handleSend}
            disabled={!activeToken || amount.trim() === "" || recipient.trim() === ""}
            loading={sending}
            loadingText="Confirm in your wallet..."
          >
            <Send size={16} aria-hidden="true" />
            Send
          </Button>
        </div>
      )}
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-text-secondary">{label}</p>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
        active
          ? "border-brave-mint/50 bg-brave-mint/10 text-brave-mint"
          : "border-white/10 bg-surface-sunken text-text-secondary hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

export default SendFundsModal;
