"use client";

/**
 * Donations and withdrawals on one timeline.
 *
 * Money in and money out are the same story to a creator, and splitting them
 * into two lists made each look emptier than the account actually is. Statuses
 * still flip in place, since the underlying withdrawal list polls while
 * anything is mid-flight.
 */

import { cn, formatRelativeTime } from "@/lib/utils";
import { formatTokenAmount, type WithdrawalStatus } from "@/lib/withdrawals";
import { useSupportedChains } from "@/hooks/useDonationData";
import type { ActivityItem, WithdrawalActivity } from "@/hooks/useDashboardSummary";
import { formatUsd } from "@/lib/campaigns";

const WITHDRAWAL_STATUS: Record<
  WithdrawalStatus,
  { label: string; dot: string }
> = {
  PENDING: { label: "awaiting approval", dot: "bg-brave-amber" },
  APPROVED: { label: "executing", dot: "bg-brave-teal" },
  EXECUTED: { label: "completed", dot: "bg-brave-mint" },
  REJECTED: { label: "declined", dot: "bg-destructive" },
  FAILED: { label: "failed", dot: "bg-destructive" },
};

type Chains = ReturnType<typeof useSupportedChains>["data"];

/** Same resolution the withdrawals list uses: native assets carry a null address. */
function tokenDecimals(chains: Chains, item: WithdrawalActivity): number {
  const token = chains
    ?.find((c) => c.chainId === item.chainId)
    ?.tokens.find(
      (t) =>
        (t.address?.toLowerCase() ?? null) ===
        (item.tokenAddress?.toLowerCase() ?? null)
    );
  return token?.decimals ?? (item.tokenAddress ? 6 : 18);
}

function ActivityRow({ item, chains }: { item: ActivityItem; chains: Chains }) {
  if (item.kind === "donation") {
    return (
      <li className="flex items-center gap-3 py-3">
        <span
          aria-hidden="true"
          className="h-2 w-2 shrink-0 rounded-full bg-[var(--fb-orange)]"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-[var(--dash-ink)]">
            <span className="font-display tabular-nums">
              {formatUsd(item.amountUsd)}
            </span>{" "}
            from {item.donorLabel}
          </p>
          <p className="truncate text-xs text-[var(--dash-ink-faint)]">
            {item.campaignTitle}
          </p>
        </div>
        <time
          dateTime={item.at}
          className="shrink-0 text-xs tabular-nums text-[var(--dash-ink-faint)]"
        >
          {formatRelativeTime(item.at)}
        </time>
      </li>
    );
  }

  const status = WITHDRAWAL_STATUS[item.status];
  return (
    <li className="flex items-center gap-3 py-3">
      <span
        aria-hidden="true"
        className={cn("h-2 w-2 shrink-0 rounded-full", status.dot)}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-[var(--dash-ink)]">
          <span className="font-display tabular-nums">
            {formatTokenAmount(item.amountRaw, tokenDecimals(chains, item))}{" "}
            {item.tokenSymbol}
          </span>{" "}
          withdrawn — {status.label}
        </p>
        <p className="truncate text-xs text-[var(--dash-ink-faint)]">
          {item.campaignTitle}
        </p>
      </div>
      <time
        dateTime={item.at}
        className="shrink-0 text-xs tabular-nums text-[var(--dash-ink-faint)]"
      >
        {formatRelativeTime(item.at)}
      </time>
    </li>
  );
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  const { data: chains } = useSupportedChains();

  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-[var(--dash-ink-faint)]">
        Donations and withdrawals will appear here as they happen.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-[var(--dash-divider)]">
      {items.map((item) => (
        <ActivityRow
          key={`${item.kind}-${item.id}`}
          item={item}
          chains={chains}
        />
      ))}
    </ul>
  );
}
