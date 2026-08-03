"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { MotionPathPlugin, ScrollTrigger, SplitText } from "gsap/all";
import {
  PetalsIcon,
  PlaneIcon,
  ShieldIcon,
} from "@/components/landing/FeatureIcons";
import { Button } from "@/components/ui/button";
import { useCampaignsList } from "@/hooks/useCampaigns";
import {
  CampaignCardSkeleton,
  CampaignImage,
  MediaPlaceholder,
  coverImage,
} from "@/components/campaigns/CampaignCard";
import {
  type Campaign,
  formatUsd,
  progressPercent,
} from "@/lib/campaigns";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, MotionPathPlugin);

/**
 * Landing page — implements the Figma "Onboarding" frame
 * (FundBrave-Logos, node 467:6). Brand values are the fixed
 * --fb-* tokens in globals.css (orange/green/cream/ink) and are
 * intentionally identical in light and dark themes for the hero and
 * the orange CTA band, matching the previous design's fixed-dark
 * treatment. The cream mid-section IS theme-aware: cream in light,
 * the app's dark surfaces in dark, so dark-mode users aren't flashed
 * with a bright page between two dark bands.
 *
 * Motion is GSAP end-to-end (useGSAP protocol, scoped selectors):
 * a hero timeline with SplitText word masks, a scroll-scrubbed photo
 * parallax, ScrollTrigger reveals for each section, a drawn progress
 * fill and a counting stat. Server HTML renders everything in its
 * final visible state; GSAP takes over only after hydration, so slow
 * or absent JS can never leave content hidden. All tweens animate
 * transform/opacity only.
 *
 * Hero photo: committed copy of the Figma asset (public/landing/hero.png,
 * exported 2026-08; the Figma MCP asset URLs expire after ~7 days).
 */

/* Inline copies of the exact Figma icon exports (white fills — only
   legible on the orange band) so GSAP can animate the vectors. Icons
   are paired semantically: the paper plane carries "Borderless", the
   shield "Secure", the petals "Simple". Copy follows the design's
   rhythm: 2–3 word title, one short line under it. */
const CTA_BENEFITS = [
  {
    Icon: PlaneIcon,
    title: "Borderless Giving",
    body: "Donate from anywhere",
  },
  {
    Icon: ShieldIcon,
    title: "Secure by Design",
    body: "Two-signature withdrawals",
  },
  {
    Icon: PetalsIcon,
    title: "Simple to Start",
    body: "Sign up with just email",
  },
] as const;

const CAUSES_INITIAL_LIMIT = 9;
const CAUSES_PAGE_SIZE = 6;

/**
 * Every scroll-triggered reveal on this page hides real content (`.from()`
 * with a scrollTrigger applies its hidden "from" state immediately on
 * creation, not when the trigger fires) until its ScrollTrigger condition
 * is met. A ScrollTrigger that never fires — a layout shift mid-load, a
 * calculation edge case — must not leave that content permanently
 * invisible, so every reveal below pairs with a wall-clock timeout at this
 * duration that force-completes it. Not a GSAP delayedCall: that runs on
 * the same ticker a stalled main thread would also stall.
 */
const REVEAL_FAILSAFE_MS = 3000;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Green brand progress bar (design: #1e6b4c on a light track). */
function CauseProgressBar({ percent }: { percent: number }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/15"
    >
      <div
        className="h-full rounded-full bg-[var(--fb-green)] transition-[width] duration-500 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

/**
 * Landing-specific campaign card per the Figma grid (cream surface,
 * green progress, "$X raised", "by <creator>"). The shared
 * CampaignCard keeps its own style for /campaigns — this variant is
 * deliberately local to the landing page.
 */
function CauseCard({
  campaign,
  priority = false,
}: {
  campaign: Campaign;
  priority?: boolean;
}) {
  const cover = coverImage(campaign);
  const percent = progressPercent(campaign.raisedUsd, campaign.goalUsd);
  const author =
    campaign.creator?.displayName || campaign.creator?.username || null;

  return (
    <Link
      href={`/campaigns/${campaign.slug}`}
      aria-label={`View campaign: ${campaign.title}`}
      className="cause-card group flex flex-col overflow-hidden rounded-t-xl bg-[var(--fb-cream)] shadow-[8px_8px_71px_0px_rgba(0,0,0,0.1)] transition-[transform,box-shadow] duration-200 ease-[var(--ease-out-expo)] hover:-translate-y-1 hover:shadow-[8px_12px_71px_0px_rgba(0,0,0,0.18)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] dark:border dark:border-white/10 dark:bg-surface-elevated"
    >
      {/* Cover height steps down for the 2-up tablet grid (480–1023) so a
          ~200px-wide card is not topped by a taller-than-wide photo. */}
      <div className="relative h-52 w-full shrink-0 overflow-hidden sm:h-44 md:h-52 lg:h-56">
        {cover ? (
          <CampaignImage
            src={cover}
            alt={campaign.title}
            priority={priority}
            className="transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <MediaPlaceholder />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex flex-col gap-1.5">
          {/* 480–767 keeps the 18px size (the 2-up cards are only ~200px
              wide there) and drops min-h to exactly two 18px lines —
              min-h-[3.25rem] is sized for the 20px type, and against 18px it
              left the reserved box taller than the clamp, leaking a sliver
              of the third line under the ellipsis. */}
          <h3 className="line-clamp-2 min-h-[3.25rem] text-lg font-semibold leading-snug tracking-wide text-[var(--fb-ink)] dark:text-foreground sm:min-h-[2.875rem] md:min-h-[3.25rem] md:text-xl">
            {campaign.title}
          </h3>
          {author && (
            <p className="text-base font-light text-[var(--fb-ink)]/80 dark:text-text-secondary">
              by {author}
            </p>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-3">
          <CauseProgressBar percent={percent} />
          <p className="text-lg font-semibold tracking-wide text-[var(--fb-ink)] dark:text-foreground">
            {formatUsd(campaign.raisedUsd)} raised
          </p>
        </div>
      </div>
    </Link>
  );
}

function DiscoverCauses() {
  const [limit, setLimit] = useState(CAUSES_INITIAL_LIMIT);
  const gridRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, isPlaceholderData, isError, refetch } =
    useCampaignsList({
      page: 1,
      limit,
      sort: "most_raised",
    });

  /* Cards mount asynchronously (after the API responds), so their
     reveal lives here with the data as a dependency. Each card is
     tagged once animated so "Show more" batches never replay cards
     that are already on screen. */
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const cards = Array.from(
        gridRef.current?.querySelectorAll<HTMLElement>(".cause-card") ?? []
      ).filter((card) => !card.dataset.revealed);
      if (!cards.length) return;

      gsap.set(cards, { y: 44, autoAlpha: 0 });
      const reveal = (targets: Element[]) => {
        targets.forEach((el) => {
          (el as HTMLElement).dataset.revealed = "1";
        });
        gsap.to(targets, {
          y: 0,
          autoAlpha: 1,
          duration: 0.75,
          ease: "expo.out",
          stagger: 0.09,
          overwrite: true,
          clearProps: "opacity,visibility,transform",
        });
      };
      ScrollTrigger.batch(cards, {
        start: "top 95%",
        once: true,
        onEnter: reveal,
      });
      ScrollTrigger.refresh();

      // These are the actual campaign links, not decorative — if a batch's
      // ScrollTrigger never fires (see REVEAL_FAILSAFE_MS), they must not
      // stay invisible forever.
      const failsafe = window.setTimeout(() => {
        const stillHidden = cards.filter((card) => !card.dataset.revealed);
        if (stillHidden.length) reveal(stillHidden);
      }, REVEAL_FAILSAFE_MS);

      return () => window.clearTimeout(failsafe);
    },
    { scope: gridRef, dependencies: [data?.items.length] }
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
        No campaigns yet. Be the first to{" "}
        <Link
          href="/auth/login"
          className="text-primary underline underline-offset-4"
        >
          start one
        </Link>
        .
      </p>
    );
  }

  const hasMore = data.items.length < data.total;

  return (
    <div ref={gridRef}>
      {/* 2-up from sm (480) — a single full-width card between 480 and 767
          left tablets reading like a stretched phone. 3-up stays at lg. */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data.items.map((campaign, i) => (
          <CauseCard key={campaign.id} campaign={campaign} priority={i < 3} />
        ))}
      </div>
      {hasMore && (
        <div className="mt-10 flex justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setLimit((l) => l + CAUSES_PAGE_SIZE)}
            loading={isPlaceholderData}
            loadingText="Loading..."
            className="border-[var(--fb-orange)] text-[var(--fb-orange)] hover:bg-[var(--fb-orange)]/10 dark:border-[var(--fb-orange)] dark:text-[var(--fb-orange)] dark:hover:bg-[var(--fb-orange)]/10"
          >
            Show more
          </Button>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const container = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;

      /* ---------- Hero: one choreographed timeline ---------- */
      const heroTl = gsap.timeline({ defaults: { ease: "expo.out" } });

      // Word-by-word mask reveal for line 1; line 2 rises as one unit
      // (it carries the absolutely-positioned stroke, so it must not
      // be split). SplitText failure must never take the headline
      // down with it, so it degrades to a whole-line rise.
      let line1Targets: Element[] | string = ".hero-line-1";
      try {
        line1Targets = SplitText.create(".hero-line-1", {
          type: "words",
          mask: "words",
        }).words;
      } catch {
        /* fall back to animating the whole line */
      }

      // Every copy tween clears its inline styles on completion
      // (clearProps), returning elements to pure CSS styling — GSAP can
      // then never leave a button or paragraph stuck hidden or
      // transformed, and CSS hover/active states keep working.
      heroTl
        .from(line1Targets, {
          yPercent: 120,
          duration: 0.8,
          stagger: 0.06,
          clearProps: "transform",
        })
        .from(
          ".hero-line-2",
          { yPercent: 115, duration: 0.8, clearProps: "transform" },
          "-=0.65"
        )
        .from(
          ".hero-stroke",
          {
            scaleX: 0,
            transformOrigin: "left center",
            duration: 0.5,
            ease: "power3.out",
            clearProps: "transform",
          },
          "-=0.3"
        )
        .fromTo(
          ".hero-sub",
          { y: 24, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.6,
            clearProps: "opacity,visibility,transform",
          },
          "-=0.45"
        )
        .fromTo(
          ".hero-cta > *",
          { y: 20, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.55,
            stagger: 0.08,
            clearProps: "opacity,visibility,transform",
          },
          "-=0.45"
        )
        // Photo settles from a deeper zoom; final scale stays slightly
        // overscanned so the scroll parallax below never exposes edges.
        .fromTo(
          ".hero-photo",
          { scale: 1.22 },
          { scale: 1.12, duration: 1.8, ease: "power2.out" },
          0
        );

      // Scroll-scrubbed parallax: the photo drifts as the hero leaves.
      gsap.to(".hero-photo", {
        yPercent: 8,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero-section",
          start: "top top",
          end: "bottom top",
          scrub: true,
          invalidateOnRefresh: true,
        },
      });

      /* ---------- Stats card: rise, draw the fill, count up ---------- */
      const statsCardTween = gsap.from(".stats-card", {
        y: 44,
        autoAlpha: 0,
        duration: 0.9,
        ease: "expo.out",
        scrollTrigger: { trigger: ".stats-card", start: "top 95%", once: true },
      });
      const statsFillTween = gsap.from(".stats-fill", {
        scaleX: 0,
        transformOrigin: "left center",
        duration: 1.2,
        delay: 0.2,
        ease: "expo.out",
        scrollTrigger: { trigger: ".stats-card", start: "top 90%", once: true },
      });
      const pctEl = container.current?.querySelector(".stats-percent");
      let statsCounterTween: gsap.core.Tween | undefined;
      if (pctEl) {
        const counter = { v: 0 };
        statsCounterTween = gsap.to(counter, {
          v: 99,
          duration: 1.4,
          delay: 0.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".stats-card",
            start: "top 90%",
            once: true,
          },
          onUpdate: () => {
            pctEl.textContent = `${Math.round(counter.v)}%`;
          },
        });
      }

      /* ---------- Section reveals ---------- */
      const discoverHeadingTween = gsap.from(".discover-heading", {
        y: 30,
        autoAlpha: 0,
        duration: 0.8,
        ease: "expo.out",
        scrollTrigger: {
          trigger: ".discover-heading",
          start: "top 92%",
          once: true,
        },
      });
      /* ---------- Orange band: choreographed icon intro ---------- */
      const bandTl = gsap.timeline({
        defaults: { ease: "expo.out" },
        scrollTrigger: {
          trigger: "#why-fundbrave",
          start: "top 75%",
          once: true,
        },
      });
      bandTl
        .from(".band-heading", { y: 30, autoAlpha: 0, duration: 0.8 })
        .from(
          ".band-item",
          { y: 36, autoAlpha: 0, duration: 0.7, stagger: 0.12 },
          "-=0.45"
        )
        // The plane flies in along an arc and levels off.
        .from(
          ".icon-plane",
          {
            motionPath: {
              path: [
                { x: -64, y: 36 },
                { x: -26, y: -12 },
                { x: 0, y: 0 },
              ],
              curviness: 1.25,
            },
            rotation: -14,
            autoAlpha: 0,
            duration: 1.1,
            ease: "power2.out",
            transformOrigin: "50% 50%",
          },
          "-=0.6"
        )
        // The shield lands, then gives one confident guard pulse.
        .from(
          ".icon-shield",
          {
            scale: 0.4,
            autoAlpha: 0,
            duration: 0.7,
            transformOrigin: "50% 50%",
          },
          "-=0.95"
        )
        .to(
          ".icon-shield",
          {
            scale: 1.09,
            duration: 0.18,
            yoyo: true,
            repeat: 1,
            ease: "power2.inOut",
            transformOrigin: "50% 50%",
          },
          "-=0.2"
        )
        // The petals bloom in with a quarter spin.
        .from(
          ".icon-petals",
          {
            rotation: -120,
            scale: 0.4,
            autoAlpha: 0,
            duration: 0.9,
            transformOrigin: "50% 50%",
          },
          "-=0.85"
        );

      // Single wall-clock failsafe for every scroll-gated reveal above
      // (hero copy, stats card/fill/counter, discover heading, orange
      // band) — see REVEAL_FAILSAFE_MS. All of it is real content, not
      // decorative, so none of it may stay permanently hidden if a
      // ScrollTrigger never fires.
      const failsafe = window.setTimeout(() => {
        if (heroTl.isActive() || heroTl.progress() < 1) {
          heroTl.progress(1);
        }
        gsap.set([".hero-sub", ".hero-cta > *", ".hero-stroke"], {
          clearProps: "opacity,visibility,transform",
        });
        [
          statsCardTween,
          statsFillTween,
          statsCounterTween,
          discoverHeadingTween,
          bandTl,
        ].forEach((tw) => {
          if (tw && tw.progress() < 1) tw.progress(1);
        });
      }, REVEAL_FAILSAFE_MS);

      return () => window.clearTimeout(failsafe);
    },
    { scope: container }
  );

  return (
    <main id="main-content" ref={container} className="flex flex-col">
      {/* ============================== HERO ============================== */}
      {/*
        Fixed-dark regardless of theme (literal values, no dark: variants
        needed). Text sits left; the photo's subject is right-of-center,
        so the overlay darkens left-to-right less aggressively on lg
        while a stronger uniform overlay keeps text legible on small
        screens where the text overlaps the subject.
      */}
      <section className="hero-section relative left-1/2 -ml-[50vw] flex min-h-[90svh] w-screen flex-col justify-center overflow-hidden bg-[#171717] px-4 pt-24 pb-32 sm:px-6 md:min-h-[90vh] md:pt-28 md:pb-48">
        <Image
          src="/landing/hero.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="hero-photo object-cover object-[70%_30%]"
        />
        {/* Lighter than the first pass on purpose — the Figma hero keeps
            the photo warm and clearly visible. Text sits left where the
            gradient is strongest; re-check legibility if the photo changes. */}
        <div className="absolute inset-0 bg-black/45 lg:bg-gradient-to-r lg:from-black/65 lg:via-black/35 lg:to-black/10" />

        <div className="relative z-10 mx-auto w-full max-w-[1200px]">
          <div className="flex max-w-[740px] flex-col items-start gap-6">
            {/* Line 1 is SplitText'd into masked words by the hero
                timeline; line 2 rises inside its own mask and carries
                the green stroke, which draws in afterward. */}
            <h1 className="font-display text-3xl font-bold leading-[1.3] tracking-wide text-[#fafaf9] sm:text-4xl md:text-5xl lg:text-6xl">
              <span className="hero-line-1 block">Support the Causes</span>
              <span className="hero-mask">
                <span className="hero-line-2 relative inline-block whitespace-nowrap">
                  <span
                    aria-hidden="true"
                    className="hero-stroke absolute inset-x-[-0.1em] bottom-[-0.02em] h-[0.62em] bg-[var(--fb-green)]"
                  />
                  <span className="relative">That Matter To You</span>
                </span>
              </span>
            </h1>
            <p className="hero-sub max-w-[540px] text-base leading-relaxed tracking-wide text-[#d4d4d4] sm:text-lg">
              Browse inspiring campaigns from people, communities, and
              charities making a real difference. Every contribution, big or
              small, helps turn hope into action.
            </p>
            <div className="hero-cta mt-2 flex flex-col gap-4 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="bg-[var(--fb-orange)] text-[#fafaf9] shadow-[0px_2px_1px_rgba(0,0,0,0.25)] hover:bg-[#e0560f] active:bg-[#c94d0d]"
              >
                <Link href="/campaigns">Explore Campaigns</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="border border-[#fafaf9] bg-transparent text-[#fafaf9]/90 shadow-[0px_2px_2px_rgba(0,0,0,0.25)] hover:bg-white/10 active:bg-white/15 dark:border-[#fafaf9] dark:bg-transparent dark:text-[#fafaf9]/90 dark:hover:bg-white/10 dark:active:bg-white/15"
              >
                <Link href="/auth/login">Start a Campaign</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CREAM MID-SECTION (stats + causes) ================= */}
      <div className="relative left-1/2 -ml-[50vw] w-screen bg-[var(--fb-cream)] dark:bg-transparent">
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
          {/* Floating stats card overlapping the hero */}
          <section aria-label="Community impact" className="relative z-20 -mt-24">
            <div className="stats-card rounded-2xl bg-[var(--fb-cream)] px-6 py-8 shadow-[0px_-24px_80px_0px_rgba(0,0,0,0.35)] sm:px-10 dark:border dark:border-white/10 dark:bg-surface-elevated">
              <div className="flex flex-col gap-5">
                <h2 className="text-2xl font-semibold text-[var(--fb-ink)] dark:text-foreground sm:text-3xl">
                  Together we&rsquo;ve helped
                </h2>
                <div className="h-4 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
                  <div className="stats-fill h-full w-[91%] rounded-full bg-[var(--fb-green)]" />
                </div>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-2.5 md:items-center">
                    <div className="flex items-center" aria-hidden="true">
                      {["/landing/avatar-1.png", "/landing/avatar-2.png", "/landing/avatar-3.png"].map(
                        (src, i) => (
                          <Image
                            key={src}
                            src={src}
                            alt=""
                            width={24}
                            height={24}
                            className={
                              i > 0
                                ? "-ml-[5px] size-6 rounded-full"
                                : "size-6 rounded-full"
                            }
                          />
                        )
                      )}
                    </div>
                    <p className="text-base font-medium tracking-wide text-[var(--fb-ink)] dark:text-foreground sm:text-lg">
                      Donors all over the world raise
                    </p>
                  </div>
                  <p className="text-base font-medium tracking-wide text-[var(--fb-ink)] dark:text-foreground sm:text-lg">
                    <span className="stats-percent text-xl font-semibold sm:text-2xl">
                      99%
                    </span>{" "}
                    towards a cause
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ========================= DISCOVER CAUSES ========================= */}
          <section className="py-16 sm:py-20">
            <h2 className="discover-heading mb-10 text-2xl font-semibold tracking-wide text-[var(--fb-ink)] dark:text-foreground sm:text-3xl">
              Discover Causes You Care About
            </h2>
            <DiscoverCauses />
          </section>
        </div>
      </div>

      {/* ========================= ORANGE CTA BAND ========================= */}
      {/*
        Matches the Figma band (node 572:374) at the user's request:
        24px semibold titles, 20px LIGHT one-line bodies, 60px icons.
        Contrast caveat: white on #fe6217 is ~3.01:1, which WCAG AA
        accepts only for large text — the 20px light bodies ride on
        design fidelity here, chosen deliberately over strict AA.
      */}
      <section
        id="why-fundbrave"
        className="relative left-1/2 -ml-[50vw] w-screen scroll-mt-20 bg-[var(--fb-orange)] px-4 py-16 sm:px-6 sm:py-20"
      >
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-14">
          <h2 className="band-heading max-w-[625px] text-center font-display text-3xl font-bold leading-tight tracking-wide text-[#fafaf9] sm:text-4xl">
            Support the Causes That Matter To You
          </h2>
          {/* max-w-md keeps the stacked items readable on phones; from md
              (tablets) the three benefits go side by side, otherwise a 448px
              column sits marooned in an 900px-wide band. */}
          <div className="mx-auto grid w-full max-w-md grid-cols-1 gap-10 md:max-w-none md:grid-cols-3 md:gap-x-6 md:gap-y-10 lg:max-w-none lg:grid-cols-3 lg:gap-12">
            {CTA_BENEFITS.map(({ Icon, title, body }) => (
              <div
                key={title}
                className="band-item flex items-center justify-start gap-3.5 lg:justify-center"
              >
                <span className="relative block size-12 shrink-0 lg:size-[60px]">
                  <Icon className="band-svg absolute inset-0 h-full w-full" />
                </span>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-xl font-semibold tracking-wide text-[#fafaf9] lg:text-2xl">
                    {title}
                  </h3>
                  <p className="text-base font-light tracking-wide text-[#fafaf9] lg:text-xl">
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
