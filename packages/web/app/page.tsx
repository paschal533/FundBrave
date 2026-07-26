"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCampaignsList } from "@/hooks/useCampaigns";
import {
  CampaignCard,
  CampaignCardSkeleton,
  CATEGORY_ICONS,
} from "@/components/campaigns/CampaignCard";
import { CATEGORIES } from "@/lib/campaigns";
import { ArrowRight, Wallet, Rocket, Shield } from "@/components/ui/icons";

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
      <section className="flex min-h-[85vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <h1 className="font-display text-5xl font-bold tracking-tight sm:text-7xl">
          <span className="bg-[linear-gradient(90deg,var(--color-primary)_0%,var(--color-primary-600)_100%)] bg-clip-text text-transparent">
            FundBrave
          </span>
        </h1>
        <p className="max-w-md text-lg text-text-secondary">
          Borderless fundraising, powered by crypto and owned by communities.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/campaigns">
              Explore campaigns
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/auth/login">Start a campaign</Link>
          </Button>
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
      <section className="bg-[var(--gradient-cta)] px-4 py-16 text-center sm:py-24">
        <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
          Ready to raise funds for what matters?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-white/90">
          It takes a few minutes to get started — no crypto experience required.
        </p>
        <Button asChild size="lg" variant="secondary" className="mt-8 border-white bg-white/15 text-white hover:bg-white/25">
          <Link href="/auth/login">Start a campaign</Link>
        </Button>
      </section>
    </main>
  );
}
