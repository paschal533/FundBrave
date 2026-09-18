"use client";

/**
 * Dashboard aggregation.
 *
 * Everything the control room shows is derived here from endpoints the app
 * already calls, so the redesign adds no API surface.
 *
 * Two honesty constraints shape this file:
 *
 * 1. Bounded cost. One donations request per campaign, capped at
 *    FEED_CAMPAIGN_CAP, so a creator with many campaigns cannot turn the
 *    dashboard into a request storm.
 * 2. No invented numbers. A trend drawn from a truncated feed would silently
 *    understate days, so `trend` is null unless the seven-day window is
 *    provably complete. The UI shows nothing rather than a wrong sparkline.
 */

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { donationKeys, type DonationListResponse } from "@/hooks/useDonationData";
import { useMyCampaigns } from "@/hooks/useCampaigns";
import { useMyWithdrawals } from "@/hooks/useWithdrawals";
import type { Campaign } from "@/lib/campaigns";
import type { WithdrawalStatus } from "@/lib/withdrawals";

const FEED_CAMPAIGN_CAP = 5;
const FEED_PAGE_SIZE = 25;
const TREND_DAYS = 7;
const ACTIVITY_LIMIT = 8;
const DAY_MS = 86_400_000;

export interface DashboardTotals {
  /** Sum of every campaign's raised total, in USD. */
  raisedUsd: number;
  /** Sum of every live campaign's goal, in USD. 0 when nothing is live. */
  goalUsd: number;
  /**
   * Sum of per-campaign donor counts. A person who gave to two campaigns
   * counts twice, which is why the UI labels this "across campaigns" rather
   * than implying unique people.
   */
  supporters: number;
  /** raised/goal across live campaigns, clamped to 0-100. null when no goal. */
  progressPct: number | null;
  liveCount: number;
  draftCount: number;
}

export interface TrendPoint {
  /** YYYY-MM-DD, oldest first. */
  key: string;
  totalUsd: number;
}

export interface DonationActivity {
  kind: "donation";
  id: string;
  at: string;
  amountUsd: number;
  donorLabel: string;
  campaignTitle: string;
}

export interface WithdrawalActivity {
  kind: "withdrawal";
  id: string;
  at: string;
  chainId: number;
  amountRaw: string;
  tokenSymbol: string;
  tokenAddress: string | null;
  status: WithdrawalStatus;
  campaignTitle: string;
}

export type ActivityItem = DonationActivity | WithdrawalActivity;

export interface DashboardSummary {
  campaigns: Campaign[];
  totals: DashboardTotals;
  /** Null when the seven-day window cannot be proven complete. */
  trend: TrendPoint[] | null;
  activity: ActivityItem[];
  isLoading: boolean;
  /** Donations/withdrawals still in flight after campaigns have arrived. */
  isActivityLoading: boolean;
  isError: boolean;
  /** A feed failed: the timeline is partial and must not be shown as complete. */
  isActivityError: boolean;
  refetch: () => void;
}

function toNumber(value: string | number): number {
  const n = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function donorLabel(
  donor: { displayName: string | null; username: string | null } | null,
  address: string
): string {
  if (donor?.displayName) return donor.displayName;
  if (donor?.username) return `@${donor.username}`;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Campaigns worth pulling a donation feed for: drafts have none. */
function feedCampaigns(campaigns: Campaign[]): Campaign[] {
  return campaigns
    .filter((c) => c.status === "ACTIVE" || c.status === "COMPLETED")
    .slice(0, FEED_CAMPAIGN_CAP);
}

interface FeedResult {
  items: DonationListResponse["items"];
  /** True when this campaign has donations we did not fetch. */
  truncated: boolean;
  isLoading: boolean;
  isError: boolean;
}

export function useDashboardSummary(): DashboardSummary {
  const campaignsQuery = useMyCampaigns();
  const withdrawalsQuery = useMyWithdrawals();

  const campaigns = useMemo(
    () => campaignsQuery.data ?? [],
    [campaignsQuery.data]
  );
  const feeds = useMemo(() => feedCampaigns(campaigns), [campaigns]);

  // `combine` keeps the result referentially stable across renders, so the
  // memos below do not recompute on every parent render.
  const donations = useQueries({
    queries: feeds.map((campaign) => ({
      queryKey: [...donationKeys.list(campaign.id, 1), FEED_PAGE_SIZE],
      queryFn: () =>
        apiFetch<DonationListResponse>(
          `/api/campaigns/${encodeURIComponent(
            campaign.id
          )}/donations?page=1&limit=${FEED_PAGE_SIZE}`
        ),
      staleTime: 30_000,
    })),
    combine: (results): FeedResult[] =>
      results.map((r) => ({
        items: r.data?.items ?? [],
        truncated: (r.data?.pages ?? 1) > 1,
        isLoading: r.isLoading,
        isError: r.isError,
      })),
  });

  const totals = useMemo<DashboardTotals>(() => {
    // Progress is about campaigns still running. Including COMPLETED ones
    // parks a creator with a finished history at a permanent ~100%, which
    // tells them nothing about the work in front of them.
    const live = campaigns.filter((c) => c.status === "ACTIVE");
    const raisedUsd = campaigns.reduce((sum, c) => sum + toNumber(c.raisedUsd), 0);
    const goalUsd = live.reduce((sum, c) => sum + toNumber(c.goalUsd), 0);
    const liveRaisedUsd = live.reduce((sum, c) => sum + toNumber(c.raisedUsd), 0);
    const supporters = campaigns.reduce((sum, c) => sum + c.donorsCount, 0);
    return {
      raisedUsd,
      goalUsd,
      supporters,
      progressPct:
        goalUsd > 0
          ? Math.min(100, Math.round((liveRaisedUsd / goalUsd) * 100))
          : null,
      liveCount: campaigns.filter((c) => c.status === "ACTIVE").length,
      draftCount: campaigns.filter((c) => c.status === "DRAFT").length,
    };
  }, [campaigns]);

  const trend = useMemo<TrendPoint[] | null>(() => {
    if (donations.length === 0) return null;
    if (donations.some((f) => f.isLoading || f.isError)) return null;

    // The cap drops campaigns beyond FEED_CAMPAIGN_CAP. Drawing a trend then
    // would put a figure computed from some campaigns directly under a total
    // computed from all of them.
    const fundable = campaigns.filter(
      (c) => c.status === "ACTIVE" || c.status === "COMPLETED"
    ).length;
    if (feeds.length < fundable) return null;

    const start = Date.now() - (TREND_DAYS - 1) * DAY_MS;
    const windowStart = new Date(dayKey(start)).getTime();

    // A truncated feed is only a problem when its oldest fetched donation is
    // still inside the window: then older ones in-window exist unfetched and
    // any daily total would undercount.
    const incomplete = donations.some((feed, i) => {
      if (!feed.truncated) return false;
      const oldest = feed.items.at(-1);
      if (!oldest) return false;
      return new Date(oldest.createdAt).getTime() >= windowStart;
    });
    if (incomplete) return null;

    const buckets = new Map<string, number>();
    for (let i = 0; i < TREND_DAYS; i += 1) {
      buckets.set(dayKey(windowStart + i * DAY_MS), 0);
    }
    for (const feed of donations) {
      for (const item of feed.items) {
        const key = dayKey(new Date(item.createdAt).getTime());
        const current = buckets.get(key);
        if (current !== undefined) {
          buckets.set(key, current + toNumber(item.amountUsd));
        }
      }
    }
    return Array.from(buckets, ([key, totalUsd]) => ({ key, totalUsd }));
  }, [donations, campaigns, feeds]);

  const activity = useMemo<ActivityItem[]>(() => {
    const titleById = new Map(feeds.map((c) => [c.id, c] as const));
    const items: ActivityItem[] = [];

    donations.forEach((feed, index) => {
      const campaign = feeds[index];
      if (!campaign) return;
      for (const donation of feed.items) {
        items.push({
          kind: "donation",
          id: donation.id,
          at: donation.createdAt,
          amountUsd: toNumber(donation.amountUsd),
          donorLabel: donorLabel(donation.donor, donation.donorAddress),
          campaignTitle: campaign.title,
        });
      }
    });

    for (const w of withdrawalsQuery.data ?? []) {
      items.push({
        kind: "withdrawal",
        id: w.id,
        at: w.createdAt,
        chainId: w.chainId,
        amountRaw: w.amountRaw,
        tokenSymbol: w.tokenSymbol,
        tokenAddress: w.tokenAddress,
        status: w.status,
        campaignTitle:
          w.campaign?.title ?? titleById.get(w.campaignId)?.title ?? "Campaign",
      });
    }

    return items
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, ACTIVITY_LIMIT);
  }, [donations, feeds, withdrawalsQuery.data]);

  return {
    campaigns,
    totals,
    trend,
    activity,
    isLoading: campaignsQuery.isLoading,
    isActivityLoading:
      donations.some((f) => f.isLoading) || withdrawalsQuery.isLoading,
    isError: campaignsQuery.isError,
    isActivityError:
      donations.some((f) => f.isError) || withdrawalsQuery.isError,
    refetch: () => {
      void campaignsQuery.refetch();
      void withdrawalsQuery.refetch();
    },
  };
}
