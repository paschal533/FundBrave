"use client";

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
import { ArrowRight, Wallet, Rocket, Shield } from "@/components/ui/icons";

/**
 * Sourced placeholder (warm, documentary-style, license-clean Unsplash
 * photo) for the hero background — swap this one constant for the real
 * asset when it's supplied. Not currently used elsewhere on the site
 * (seeded campaign images use different photo IDs), so it won't visually
 * duplicate a card in the causes grid below it.
 */
const HERO_IMAGE_URL =
  "https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&w=1920&q=80";

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

function FeaturedCampaigns() {
  const { data, isLoading, isError, refetch } = useCampaignsList({
    page: 1,
    limit: 3,
    sort: "most_raised",
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
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

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {data.items.map((campaign) => (
        <CampaignCard key={campaign.id} campaign={campaign} />
      ))}
    </div>
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

        The "Start a campaign" button below is the one exception: it DOES
        need explicit `dark:` overrides even though the values are
        identical to the light ones. Live verification (Step 5) showed
        that without them, the Button component's own `secondary` variant
        (components/ui/button.tsx) ships built-in
        `dark:bg-[var(--color-primary-900)]` etc., which wins the cascade
        in dark mode and made the button render brownish instead of the
        intended glass style — breaking the "identical in both themes"
        requirement. So the dark: classes here aren't redundant, they're
        required to defeat the base component's theme-aware default.

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
            <span className="bg-[linear-gradient(90deg,var(--color-primary)_0%,var(--color-primary-600)_100%)] bg-clip-text text-transparent">
              FundBrave
            </span>
          </h1>
          <p className="max-w-md text-lg text-white/90">
            Borderless fundraising, powered by crypto and owned by
            communities.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/campaigns">
                Explore campaigns
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="border-white bg-white/15 text-[var(--color-primary-foreground)] hover:bg-white/25 dark:border-white dark:bg-white/15 dark:text-[var(--color-primary-foreground)] dark:hover:bg-white/25"
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
            Campaigns making progress
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
        <p className="mx-auto mt-3 max-w-md text-[var(--color-primary-foreground)]/80">
          It takes a few minutes to get started — no crypto experience required.
        </p>
        <Button
          asChild
          size="lg"
          variant="secondary"
          className="mt-8 border-white bg-white/15 text-[var(--color-primary-foreground)] hover:bg-white/25 dark:border-white/40 dark:bg-white/10 dark:text-[var(--color-primary-foreground)] dark:hover:bg-white/20"
        >
          <Link href="/auth/login">Start a campaign</Link>
        </Button>
      </section>
    </main>
  );
}
