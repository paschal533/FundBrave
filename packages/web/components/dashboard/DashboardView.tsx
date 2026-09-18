"use client";

/**
 * The control room's markup, with no data fetching of its own.
 *
 * Splitting the view from the container keeps this renderable with fixture
 * data — which is how the layout gets reviewed at every breakpoint without
 * standing up an authenticated session.
 *
 * Composition, deliberately not four stacked panels:
 *  - one hero that leads with the money (the greeting is an eyebrow, not the
 *    headline — a control room's first line should be the number),
 *  - campaigns as bare rows on the page: the work,
 *  - activity as a quiet rail beside them at ≥lg: the ledger.
 * Three ranks, three treatments.
 */

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Check, Plus, Send, Wallet } from "@/components/ui/icons";
import { Copy, Rocket as RocketLucide } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { truncateWalletAddress } from "@/lib/wallet";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/lib/campaigns";
import type { DashboardSummary } from "@/hooks/useDashboardSummary";
import { Sparkline } from "@/components/dashboard/Sparkline";
import { CampaignRow } from "@/components/dashboard/CampaignRow";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";

/**
 * Cream in light, elevated surface in dark — the landing page's card treatment.
 * Every value comes from a --dash-* token that flips with the theme, so no
 * `dark:` variant can lose an ordering race against an arbitrary value.
 */
const PANEL = cn(
  "rounded-2xl border border-[var(--dash-panel-border)] bg-[var(--dash-panel)]",
  "shadow-[var(--dash-panel-shadow)]"
);

/** Micro-caps, used only for the small figures beside the hero number. */
const MICRO_LABEL =
  "text-[11px] font-semibold tracking-[0.14em] text-[var(--dash-ink-faint)] uppercase";

/** Panel titles sit above micro-caps in the hierarchy, so they read as text. */
const PANEL_TITLE = "text-[15px] font-semibold text-[var(--dash-ink)]";

/** Skeletons need their own surface: the shared one matches the panel exactly. */
const SKELETON = "animate-pulse rounded-md bg-[var(--dash-skeleton)]";

function WalletChip({ address }: { address: string }) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      showToast("Wallet address copied", "success", 2000);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Could not copy address", "error");
    }
  };

  return (
    <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--dash-panel-border)] bg-[var(--dash-row)] py-1 pr-1 pl-3">
      <Wallet size={14} aria-hidden="true" className="text-[var(--dash-ink-faint)]" />
      <span
        className="font-mono text-xs text-[var(--dash-ink-muted)]"
        title={address}
      >
        {truncateWalletAddress(address)}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy wallet address"
        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-[var(--dash-ink-faint)] transition-colors hover:bg-[var(--dash-track)] hover:text-[var(--dash-ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--dash-panel)]"
      >
        {copied ? <Check size={13} className="text-brave-mint" /> : <Copy size={13} />}
      </button>
    </span>
  );
}

/** One of the two smaller figures flanking the hero number. */
function MiniStat({
  label,
  value,
  foot,
}: {
  label: string;
  value: string;
  foot: string;
}) {
  return (
    <div className="flex-1">
      <p className={MICRO_LABEL}>{label}</p>
      <p className="font-display mt-1.5 text-2xl leading-none tracking-tight text-[var(--dash-ink)] tabular-nums">
        {value}
      </p>
      <p className="mt-1.5 text-sm text-[var(--dash-ink-faint)]">{foot}</p>
    </div>
  );
}

function HeroSkeleton() {
  return (
    <section className={cn(PANEL, "p-5 sm:p-8")}>
      <div className={cn(SKELETON, "h-4 w-40")} />
      <div className={cn(SKELETON, "mt-5 h-12 w-56")} />
      <div className={cn(SKELETON, "mt-4 h-11 w-full max-w-sm")} />
      <div className="mt-8 flex gap-10 border-t border-[var(--dash-panel-border)] pt-6">
        <div className={cn(SKELETON, "h-12 w-28")} />
        <div className={cn(SKELETON, "h-12 w-28")} />
      </div>
    </section>
  );
}

function RowSkeleton() {
  return (
    <li
      className={cn(
        "flex items-center gap-4 rounded-xl border border-[var(--dash-panel-border)] bg-[var(--dash-row)] p-4"
      )}
    >
      <div className={cn(SKELETON, "h-16 w-16 shrink-0 rounded-lg sm:h-[72px] sm:w-[72px]")} />
      <div className="flex-1 space-y-2.5">
        <div className={cn(SKELETON, "h-4 w-2/3")} />
        <div className={cn(SKELETON, "h-4 w-1/3")} />
        <div className={cn(SKELETON, "h-1.5 w-full rounded-full")} />
      </div>
    </li>
  );
}

function FeedSkeleton() {
  return (
    <ul className="divide-y divide-[var(--dash-divider)]">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="flex items-center gap-3 py-3">
          <div className={cn(SKELETON, "h-2 w-2 shrink-0 rounded-full")} />
          <div className="flex-1 space-y-2">
            <div className={cn(SKELETON, "h-3.5 w-3/4")} />
            <div className={cn(SKELETON, "h-3 w-1/2")} />
          </div>
        </li>
      ))}
    </ul>
  );
}

interface HeroProps extends Pick<DashboardSummary, "totals" | "trend"> {
  name: string;
  avatarUrl?: string;
  walletAddress: string | null;
  isAdmin: boolean;
  loggingOut: boolean;
  onLogout: () => void;
  onSend: () => void;
}

function Hero({
  name,
  avatarUrl,
  walletAddress,
  isAdmin,
  loggingOut,
  onLogout,
  onSend,
  totals,
  trend,
}: HeroProps) {
  const trendTotal = trend?.reduce((sum, p) => sum + p.totalUsd, 0) ?? 0;

  return (
    <section aria-labelledby="dash-total" className={cn(PANEL, "p-5 sm:p-8")}>
      {/* Identity: an eyebrow, not the headline */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar src={avatarUrl} alt={name} size="md" showGradientBorder />
          <div className="min-w-0">
            <p className="text-sm text-[var(--dash-ink-muted)]">Welcome back,</p>
            <p className="line-clamp-2 font-semibold text-[var(--dash-ink)]">
              {name}
            </p>
          </div>
        </div>
        <Button asChild className="shrink-0 max-sm:w-full">
          <Link href="/campaigns/create">
            <Plus size={16} aria-hidden="true" />
            New campaign
          </Link>
        </Button>
      </div>

      {/* The number the page exists for */}
      <div className="mt-7">
        <p className={MICRO_LABEL}>Total raised</p>
        <p
          id="dash-total"
          className="font-display mt-2 text-[2.75rem] leading-none tracking-tight text-[var(--dash-ink)] tabular-nums sm:text-6xl"
        >
          {formatUsd(totals.raisedUsd)}
        </p>
        <div className="mt-4 max-w-md">
          {/* Reserved height either way, so the tile does not grow when the
              trend arrives and shove the rest of the page down. */}
          <div className="h-11">
            {trend ? <Sparkline values={trend.map((p) => p.totalUsd)} /> : null}
          </div>
          <p className="mt-2 text-sm text-[var(--dash-ink-muted)]">
            {trend
              ? trendTotal > 0
                ? `${formatUsd(trendTotal)} in the last 7 days`
                : "No donations in the last 7 days"
              : "Across all your campaigns"}
          </p>
        </div>
      </div>

      {/* Supporting figures */}
      <div className="mt-7 flex gap-6 border-t border-[var(--dash-panel-border)] pt-6 sm:gap-10">
        <MiniStat
          label="Supporters"
          value={totals.supporters.toLocaleString()}
          foot="Across campaigns"
        />
        <MiniStat
          label="Live progress"
          value={totals.progressPct === null ? "—" : `${totals.progressPct}%`}
          foot={
            totals.goalUsd > 0
              ? `of ${formatUsd(totals.goalUsd)} target`
              : "No live campaigns"
          }
        />
      </div>

      {/* Wallet + account actions: present, deliberately quiet */}
      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-[var(--dash-panel-border)] pt-4 text-sm">
        {walletAddress ? (
          <>
            <WalletChip address={walletAddress} />
            <Button variant="ghost" size="sm" onClick={onSend}>
              <Send size={15} aria-hidden="true" />
              Send
            </Button>
          </>
        ) : (
          <p className="text-[var(--dash-ink-faint)]">
            Your wallet is still being provisioned.
          </p>
        )}
        <span className="ml-auto flex items-center gap-4">
          {isAdmin && (
            <Link
              href="/admin"
              className="text-[var(--dash-ink-muted)] underline-offset-4 transition-colors hover:text-[var(--dash-ink)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            >
              Admin panel
            </Link>
          )}
          <button
            type="button"
            onClick={onLogout}
            disabled={loggingOut}
            className="cursor-pointer text-[var(--dash-ink-muted)] underline-offset-4 transition-colors hover:text-[var(--dash-ink)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] disabled:opacity-60"
          >
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
        </span>
      </div>
    </section>
  );
}

export interface DashboardViewProps {
  name: string;
  avatarUrl?: string;
  walletAddress: string | null;
  isAdmin: boolean;
  summary: Omit<DashboardSummary, "refetch">;
  loggingOut: boolean;
  onLogout: () => void;
  onSend: () => void;
  onRetry: () => void;
  onStartCampaign: () => void;
}

export function DashboardView({
  name,
  avatarUrl,
  walletAddress,
  isAdmin,
  summary,
  loggingOut,
  onLogout,
  onSend,
  onRetry,
  onStartCampaign,
}: DashboardViewProps) {
  const {
    campaigns,
    totals,
    trend,
    activity,
    isLoading,
    isActivityLoading,
    isError,
    isActivityError,
  } = summary;
  const hasCampaigns = campaigns.length > 0;

  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:gap-6 sm:py-12"
    >
      {isLoading ? (
        <HeroSkeleton />
      ) : isError ? (
        <section className={cn(PANEL, "flex flex-col items-center gap-3 p-8")}>
          <p className="text-sm text-[var(--dash-ink-muted)]">
            We could not load your dashboard.
          </p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </section>
      ) : (
        <div className="animate-dash-rise">
          <Hero
            name={name}
            avatarUrl={avatarUrl}
            walletAddress={walletAddress}
            isAdmin={isAdmin}
            loggingOut={loggingOut}
            onLogout={onLogout}
            onSend={onSend}
            totals={totals}
            trend={trend}
          />
        </div>
      )}

      {!isError &&
        (!isLoading && !hasCampaigns ? (
          /* A row of zeros is a bad first impression: invite instead. */
          <section
            className={cn(PANEL, "animate-dash-rise [animation-delay:80ms]")}
          >
            <EmptyState
              icon={RocketLucide}
              title="Start your first campaign"
              description="Share your story, set a goal, and start raising. You can save a draft and publish when it is ready."
              action={{ label: "Create a campaign", onClick: onStartCampaign }}
            />
          </section>
        ) : (
          <div className="grid gap-5 sm:gap-6 lg:grid-cols-[7fr_5fr] lg:items-start">
            {/* The work: rows are the cards, no outer panel */}
            <section
              aria-labelledby="dash-campaigns"
              className="animate-dash-rise [animation-delay:80ms]"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 id="dash-campaigns" className={PANEL_TITLE}>
                  My campaigns
                </h2>
                <Button asChild variant="outline" size="sm">
                  <Link href="/campaigns/create">
                    <Plus size={15} aria-hidden="true" />
                    New
                  </Link>
                </Button>
              </div>
              <ul className="flex flex-col gap-3">
                {isLoading ? (
                  <>
                    <RowSkeleton />
                    <RowSkeleton />
                  </>
                ) : (
                  campaigns.map((campaign) => (
                    <CampaignRow key={campaign.id} campaign={campaign} />
                  ))
                )}
              </ul>
            </section>

            {/* The ledger: a quieter rail */}
            <section
              aria-labelledby="dash-activity"
              className={cn(
                PANEL,
                "animate-dash-rise p-5 [animation-delay:140ms] sm:p-6"
              )}
            >
              <h2 id="dash-activity" className={cn(PANEL_TITLE, "mb-1")}>
                Recent activity
              </h2>
              {isLoading || isActivityLoading ? (
                <FeedSkeleton />
              ) : (
                <>
                  <ActivityFeed items={activity} />
                  {isActivityError && (
                    <p className="pt-3 text-xs text-[var(--dash-ink-faint)]">
                      Some activity could not be loaded, so this list may be
                      incomplete.
                    </p>
                  )}
                </>
              )}
            </section>
          </div>
        ))}
    </main>
  );
}
