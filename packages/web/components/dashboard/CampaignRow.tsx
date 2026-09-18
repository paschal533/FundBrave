"use client";

/**
 * One campaign in the dashboard list.
 *
 * Carries what a creator wants at a glance — progress against goal, raised,
 * donors — and a contextual next action. A draft that cannot be published says
 * why up front rather than failing into a toast when the button is pressed.
 *
 * The whole row links via a stretched overlay rather than a wrapping <a>:
 * wrapping the figures and the progressbar gave the link the accessible name
 * "Clean water for Abeokuta schools Live $2,100 of $5,000 · 42% … 31 donors".
 */

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { usePublishCampaign } from "@/hooks/useCampaigns";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { type Campaign, type CampaignStatus, formatUsd } from "@/lib/campaigns";
import {
  CampaignImage,
  MediaPlaceholder,
  coverImage,
} from "@/components/campaigns/CampaignCard";
import { WithdrawModal } from "@/components/withdrawals/WithdrawModal";
import { PencilLine, Rocket } from "@/components/ui/icons";
import { Banknote, ImagePlus } from "lucide-react";

/**
 * Solid pills with ink text. The 10%-opacity wash used before put #4ade80 on
 * cream at 1.61:1 — LIVE and COMPLETED were ghosts in light mode, and the
 * darker brand tokens only reach 2.10:1.
 */
const STATUS_BADGE: Record<CampaignStatus, string> = {
  DRAFT: "bg-brave-amber text-[var(--fb-ink)]",
  ACTIVE: "bg-brave-mint text-[var(--fb-ink)]",
  COMPLETED: "bg-brave-teal text-[var(--fb-ink)]",
  SUSPENDED: "bg-destructive text-white",
};

const STATUS_LABEL: Record<CampaignStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Live",
  COMPLETED: "Completed",
  SUSPENDED: "Suspended",
};

function toNumber(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function StatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span
      className={cn(
        "mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-[0.06em] uppercase",
        STATUS_BADGE[status]
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function CampaignRow({ campaign }: { campaign: Campaign }) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const publishMutation = usePublishCampaign();
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const cover = coverImage(campaign);
  const hasImage = campaign.media.some((m) => m.type === "IMAGE");
  const raised = toNumber(campaign.raisedUsd);
  const goal = toNumber(campaign.goalUsd);
  const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
  const isDraft = campaign.status === "DRAFT";
  const canWithdraw =
    campaign.status === "ACTIVE" || campaign.status === "COMPLETED";

  const handlePublish = async () => {
    try {
      await publishMutation.mutateAsync(campaign.id);
      showToast(`"${campaign.title}" is live!`, "success");
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        showToast(
          `${err.message} Your draft is saved. You can retry publishing anytime.`,
          "error",
          9000
        );
      } else {
        showToast(
          err instanceof Error ? err.message : "Publishing failed",
          "error",
          6000
        );
      }
    }
  };

  return (
    <li
      className={cn(
        "group relative flex flex-col gap-4 rounded-xl border border-[var(--dash-panel-border)] bg-[var(--dash-row)] p-4",
        "transition-[transform,box-shadow,background-color] duration-200 ease-[var(--ease-out-expo)]",
        // A drop shadow does not read on a near-black surface, so hover
        // brightens as well as lifts.
        "hover:-translate-y-0.5 hover:bg-[var(--dash-row-hover)] hover:shadow-[var(--dash-row-shadow)]",
        "has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-[var(--color-ring)]",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        "sm:flex-row sm:items-center sm:gap-5"
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-4 sm:items-center">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[var(--dash-skeleton)] sm:h-[72px] sm:w-[72px]">
          {cover ? (
            <CampaignImage src={cover} alt="" sizes="72px" />
          ) : (
            <MediaPlaceholder />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            {/* Two lines on narrow screens: truncating a campaign title to
                "Clean water for ..." hides the thing that identifies it. */}
            <p className="line-clamp-2 font-semibold text-[var(--dash-ink)]">
              <Link
                href={`/campaigns/${campaign.slug}`}
                className="after:absolute after:inset-0 after:rounded-xl focus:outline-none"
              >
                {campaign.title}
              </Link>
            </p>
            <StatusBadge status={campaign.status} />
          </div>

          {isDraft ? (
            <p className="mt-1.5 text-sm text-[var(--dash-ink-muted)]">
              {hasImage
                ? "Ready to publish."
                : "Add a photo before this can go live."}
            </p>
          ) : (
            <>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-lg tabular-nums text-[var(--dash-ink)]">
                  {formatUsd(campaign.raisedUsd)}
                </span>
                <span className="text-sm tabular-nums text-[var(--dash-ink-faint)]">
                  of {formatUsd(campaign.goalUsd)} · {pct}%
                </span>
              </div>
              <div
                className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--dash-track)]"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${campaign.title} funding progress`}
              >
                <div
                  className="h-full rounded-full bg-[var(--fb-orange)]"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-2 text-xs tabular-nums text-[var(--dash-ink-faint)]">
                {campaign.donorsCount.toLocaleString()}{" "}
                {campaign.donorsCount === 1 ? "donor" : "donors"}
              </p>
            </>
          )}
        </div>
      </div>

      {/* relative + z-10 keeps the buttons above the stretched link */}
      <div className="relative z-10 grid shrink-0 grid-cols-2 gap-2 sm:flex sm:items-center sm:self-center">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="focus-visible:ring-offset-[var(--dash-row)]"
        >
          <Link
            href={`/campaigns/create?draft=${campaign.id}`}
            aria-label={`Edit ${campaign.title}`}
          >
            <PencilLine size={16} aria-hidden="true" />
            Edit
          </Link>
        </Button>

        {isDraft &&
          (hasImage ? (
            <Button
              size="sm"
              onClick={handlePublish}
              loading={publishMutation.isPending}
              loadingText="Publishing..."
              className="focus-visible:ring-offset-[var(--dash-row)]"
            >
              <Rocket size={16} aria-hidden="true" />
              Publish
            </Button>
          ) : (
            <Button
              asChild
              size="sm"
              variant="secondary"
              className="focus-visible:ring-offset-[var(--dash-row)]"
            >
              <Link
                href={`/campaigns/create?draft=${campaign.id}`}
                aria-label={`Add a photo to ${campaign.title}`}
              >
                <ImagePlus size={16} aria-hidden="true" />
                Add photo
              </Link>
            </Button>
          ))}

        {canWithdraw && (
          /* Outline, not secondary: a considered action behind a 2-of-2 Safe
             flow should not be the loudest pixel on the page. */
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWithdrawOpen(true)}
            className="focus-visible:ring-offset-[var(--dash-row)]"
          >
            <Banknote size={16} aria-hidden="true" />
            Withdraw
          </Button>
        )}
      </div>

      <WithdrawModal
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        campaignId={campaign.id}
        campaignTitle={campaign.title}
        destination={user?.walletAddress ?? null}
      />
    </li>
  );
}
