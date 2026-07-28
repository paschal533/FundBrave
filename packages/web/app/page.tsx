"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCampaignsList } from "@/hooks/useCampaigns";
import {
  CampaignCard,
  CampaignCardSkeleton,
  CampaignImage,
  CATEGORY_ICONS,
} from "@/components/campaigns/CampaignCard";
import { CATEGORIES } from "@/lib/campaigns";
import {
  ArrowRight,
  Wallet,
  Rocket,
  Shield,
  Lock,
  CheckCircle2,
  Globe,
} from "@/components/ui/icons";

/**
 * Sourced placeholder (warm, documentary-style, license-clean Unsplash
 * photo) for the hero background — swap this one constant for the real
 * asset when it's supplied. Not currently used elsewhere on the site
 * (seeded campaign images use different photo IDs), so it won't visually
 * duplicate a card in the causes grid below it.
 */
const HERO_IMAGE_URL =
  "https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&w=1920&q=80";

const CTA_BENEFITS = [
  {
    icon: Lock,
    title: "No seed phrases, ever",
    body: "Sign in with email or Google — a self-custodial wallet is created for you automatically.",
  },
  {
    icon: CheckCircle2,
    title: "Two signatures, every time",
    body: "Withdrawals need your signature plus platform co-approval, so no single party can move donated funds alone.",
  },
  {
    icon: Globe,
    title: "Borderless by design",
    body: "Give or raise from anywhere — no bank account or wire transfer required.",
  },
] as const;

const HOW_IT_WORKS = [
  {
    icon: Wallet,
    title: "Sign in, no seed phrase",
    body: "Sign in with email or Google. A self-custodial wallet is created for you automatically — only you hold the key.",
  },
  {
    icon: Rocket,
    title: "Launch a campaign",
    body: "Set a goal, tell your story, add photos or video. Your campaign gets its own dedicated on-chain vault address.",
  },
  {
    icon: Shield,
    title: "Funds released with you in the loop",
    body: "Withdrawals require your signature plus platform co-approval — no single party can move donated funds alone.",
  },
] as const;

const CAUSES_INITIAL_LIMIT = 9;
const CAUSES_PAGE_SIZE = 9;

function FeaturedCampaigns() {
  const [limit, setLimit] = useState(CAUSES_INITIAL_LIMIT);
  const { data, isLoading, isFetching, isError, refetch } = useCampaignsList({
    page: 1,
    limit,
    sort: "most_raised",
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: CAUSES_INITIAL_LIMIT }).map((_, i) => (
          <CampaignCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-center text-text-secondary">
        Could not load campaigns right now.{" "}
        <button
          type="button"
          onClick={() => refetch()}
          className="text-primary underline underline-offset-4"
        >
          Try again
        </button>
      </p>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <p className="text-center text-text-secondary">
        No campaigns yet — be the first to{" "}
        <Link href="/auth/login" className="text-primary underline underline-offset-4">
          start one
        </Link>
        .
      </p>
    );
  }

  const hasMore = data.items.length < data.total;

  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.items.map((campaign) => (
          <CampaignCard key={campaign.id} campaign={campaign} />
        ))}
      </div>
      {hasMore && (
        <div className="mt-8 flex justify-center">
          <Button
            variant="outline"
            onClick={() => setLimit((l) => l + CAUSES_PAGE_SIZE)}
            loading={isFetching}
            loadingText="Loading..."
          >
            Show more
          </Button>
        </div>
      )}
    </>
  );
}

export default function HomePage() {
  return (
    <main id="main-content" className="flex flex-col">
      {/* ============================== HERO ============================== */}
      {/*
        Fixed-dark treatment: always dark regardless of the site's
        light/dark toggle, matching the closing CTA band's approach of
        overriding page theme for a specific brand moment. The section's
        own background/overlay/text-white classes need no `dark:` variants
        for this (they're already theme-independent literal values).

        Two more theme-parity gotchas found and fixed during live
        verification (Step 5), both because pieces reused from
        components/ui/button.tsx and design tokens are themselves
        theme-aware, unlike the section's own literal classes:

        1. The "Start a campaign" button needs explicit `dark:` overrides
           even though the values are identical to the light ones. Without
           them, the Button component's `secondary` variant ships built-in
           `dark:bg-[var(--color-primary-900)]` etc., which wins the
           cascade in dark mode and rendered the button brownish instead
           of the intended glass style.

        2. The H1 gradient and the "Explore campaigns" button's `primary`
           variant both used `var(--color-primary)` / `--color-primary-600`
           for their gradient stops. `--color-primary` resolves to
           `--primary`, which globals.css redefines inside `.dark`
           (`--primary-400`, #ff9668) while `--primary-600` is never
           overridden — so the gradient's start color silently shifted
           between themes while the end color didn't. Fixed by hardcoding
           both gradients to the light-mode hex values (#ff8a5c / #e06a3c)
           directly instead of the theme-aware vars: this preserves
           today's light-mode look and makes dark mode match it. The
           "Explore campaigns" override lives in a `className` on this one
           instance only — the shared Button component's `primary` variant
           is untouched, since changing it would affect every primary
           button site-wide.

        In both cases the dark: classes/hardcoded values aren't redundant,
        they're required to defeat theme-aware defaults inherited from
        shared components/tokens.

        alt="" on the hero photo is correct here (distinct from the
        CampaignCard alt="" finding from the prior redesign review): this
        image is purely decorative background texture with no ancestor
        control relying on it for an accessible name, unlike a campaign
        photo inside a Link.

        Overlay opacity (85/55/35%) was chosen and verified against this
        specific placeholder photo's tones during live verification (Step
        5). If HERO_IMAGE_URL is ever swapped for a different photo,
        re-verify heading/tagline legibility the same way and adjust the
        overlay opacity if needed — a CSS overlay can't be proven safe for
        an arbitrary future image, only for the one actually shipped.
      */}
      <section className="relative flex min-h-[85vh] flex-col items-center justify-center gap-6 overflow-hidden px-4 text-center">
        <CampaignImage src={HERO_IMAGE_URL} alt="" priority sizes="100vw" />
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/85 via-black/55 to-black/35" />
        <div className="relative z-20 flex flex-col items-center gap-6">
          <h1 className="font-display text-5xl font-bold tracking-tight sm:text-7xl">
            <span className="bg-[linear-gradient(90deg,#ff8a5c_0%,#e06a3c_100%)] bg-clip-text text-transparent">
              FundBrave
            </span>
          </h1>
          <p className="max-w-md text-lg text-white/90">
            Borderless fundraising, powered by crypto and owned by
            communities.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="bg-[linear-gradient(90deg,#ff8a5c_0%,#e06a3c_100%)] dark:bg-[linear-gradient(90deg,#ff8a5c_0%,#e06a3c_100%)]"
            >
              <Link href="/campaigns">
                Explore campaigns
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="border-white bg-white/15 text-[var(--color-primary-foreground)] hover:bg-white/25 active:bg-white/30 dark:border-white dark:bg-white/15 dark:text-[var(--color-primary-foreground)] dark:hover:bg-white/25 dark:active:bg-white/30"
            >
              <Link href="/auth/login">Start a campaign</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ========================= HOW IT WORKS ========================= */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-24">
        <h2 className="text-center text-3xl font-bold text-foreground">
          How it works
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {HOW_IT_WORKS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary-100)] text-[var(--color-primary-600)] dark:bg-[color-mix(in_srgb,var(--color-primary-900)_50%,transparent)] dark:text-[var(--color-primary-200)]">
                <Icon size={26} aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-foreground">{title}</h3>
              <p className="text-sm text-text-secondary">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ========================= FEATURED CAMPAIGNS ========================= */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-24">
        <div className="mb-10 flex items-center justify-between">
          <h2 className="text-3xl font-bold text-foreground">
            Campaigns making an impact
          </h2>
          <Link
            href="/campaigns"
            className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline sm:flex"
          >
            View all
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <FeaturedCampaigns />
        <div className="mt-8 flex justify-center sm:hidden">
          <Button asChild variant="outline">
            <Link href="/campaigns">View all campaigns</Link>
          </Button>
        </div>
      </section>

      {/* ============================== CATEGORIES ============================== */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-24">
        <h2 className="text-center text-3xl font-bold text-foreground">
          Find a cause you care about
        </h2>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {CATEGORIES.map((category) => {
            const Icon = CATEGORY_ICONS[category.slug];
            return (
              <Link
                key={category.slug}
                href={`/campaigns?category=${category.slug}`}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border-default bg-surface-elevated px-4 py-6 text-center transition-colors hover:border-primary hover:bg-primary/5"
              >
                <Icon size={24} className="text-primary" aria-hidden="true" />
                <span className="text-sm font-medium text-foreground">
                  {category.label}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ============================== CLOSING CTA ============================== */}
      {/*
        --gradient-cta runs #ff8a5c -> #ffb454 (coral -> amber). White text
        measured ~1.8:1 against the amber end and failed even as large text.
        Using --color-primary-foreground (#1a0e08) instead, verified against
        both gradient endpoints (WCAG 2.1 AA):
          heading, solid (needs 3:1):     #1a0e08 on #ff8a5c = 8.14:1, on #ffb454 = 10.73:1
          body, at 80% opacity (needs 4.5:1, computed against the blended
          on-gradient color): on #ff8a5c = 5.72:1, on #ffb454 = 7.03:1

        The "Start a campaign" button label reused text-white and also failed
        (~2.05:1 light, ~2.14:1 dark) against the effective background, which
        is white-at-15%/10%-opacity blended over the gradient, not the
        gradient alone. Switched the label to --color-primary-foreground too,
        verified against the blended background (WCAG 2.1 AA, needs 4.5:1):
          light (bg-white/15) on #ff8a5c blend = 9.24:1, on #ffb454 blend = 11.65:1
          dark (bg-white/10)  on #ff8a5c blend = 8.85:1, on #ffb454 blend = 11.38:1
        The translucent glass background/border is unchanged — only the text
        color moved off text-white.
      */}
      <section className="bg-[image:var(--gradient-cta)] px-4 py-16 text-center sm:py-24">
        <h2 className="font-display text-3xl font-bold text-[var(--color-primary-foreground)] sm:text-4xl">
          Ready to raise funds for what matters?
        </h2>
        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-8 sm:grid-cols-3">
          {CTA_BENEFITS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex flex-col items-center gap-2 text-center">
              <Icon
                size={22}
                className="text-[var(--color-primary-foreground)]"
                aria-hidden="true"
              />
              <h3 className="font-semibold text-[var(--color-primary-foreground)]">
                {title}
              </h3>
              <p className="text-sm text-[var(--color-primary-foreground)]/80">
                {body}
              </p>
            </div>
          ))}
        </div>
        <Button
          asChild
          size="lg"
          variant="secondary"
          className="mt-10 border-white bg-white/15 text-[var(--color-primary-foreground)] hover:bg-white/25 dark:border-white/40 dark:bg-white/10 dark:text-[var(--color-primary-foreground)] dark:hover:bg-white/20"
        >
          <Link href="/auth/login">Start a campaign</Link>
        </Button>
      </section>
    </main>
  );
}
