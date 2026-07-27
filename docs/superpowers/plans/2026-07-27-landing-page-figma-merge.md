# FundBrave Landing Page — Figma Design Merge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the `FundBrave/Logos` Figma landing page design into `packages/web`'s shipped landing page — full-bleed dark hero, expanded causes grid, real CTA-banner copy, and a new site-wide footer — per `docs/superpowers/specs/2026-07-27-landing-page-figma-merge-design.md`.

**Architecture:** No architectural changes — this is a page-composition and one new-component pass inside the existing Next.js 16 App Router structure of `packages/web`. All work is client-side/CSS/component-level; no API or Prisma changes.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4 (CSS-first `@theme`), TypeScript, existing `CampaignImage`/`Button`/`useCampaignsList` primitives.

## Global Constraints

- This codebase has no component/visual test suite for `packages/web` (`jest --passWithNoTests`, no test files). "Tests" in this plan mean: `npm run type-check` / `npm run build` staying green, plus explicit manual/scripted verification (dev server + specific assertions) — not new unit tests, per the same convention established in `docs/superpowers/plans/2026-07-26-web-mvp-redesign.md`.
- Every task ends with `npm run type-check` (from `packages/web`) and `npm run build` passing before commit.
- No changes to `packages/api` or `packages/frontend` — this plan is scoped to `packages/web` only.
- Header/nav (`components/layout/Header.tsx`) is explicitly out of scope — do not modify it.
- Footer links only point to routes that exist. Anything with no destination page renders as plain, visually non-interactive text — never a fake or dead link.
- The hero photo is a **fixed-dark treatment**: styled dark regardless of the site's light/dark toggle (same override pattern already used by the closing CTA gradient band), not theme-conditional (`dark:`) classes.

---

## File Map

| File | Change |
|---|---|
| `packages/web/components/layout/Footer.tsx` | **New** — 4-column footer (brand + 3 link/text columns) |
| `packages/web/app/layout.tsx` | Render `<Footer />` below the page content |
| `packages/web/app/globals.css` | `.bg-progress-gradient` recolored from primary/coral to `brave-mint` |
| `packages/web/app/page.tsx` | Hero rebuild (full-bleed dark photo), causes-grid pagination, CTA banner copy |

---

## Task 1: New footer component

**Files:**
- Create: `packages/web/components/layout/Footer.tsx`
- Modify: `packages/web/app/layout.tsx`

**Interfaces:**
- Produces: `Footer` (default export and named export), a zero-prop server component rendered once, globally, below `{children}`.
- Consumes: nothing from other tasks — fully independent.

- [ ] **Step 1: Create the Footer component**

Create `packages/web/components/layout/Footer.tsx`:

```tsx
import Link from "next/link";

interface FooterLink {
  label: string;
  href: string;
}

interface FooterColumn {
  heading: string;
  links: FooterLink[];
  /** Items with no real destination page yet — rendered as plain text, never a fake link. */
  plainText?: string[];
}

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: "Navigation",
    links: [
      { label: "Home", href: "/" },
      { label: "Browse campaigns", href: "/campaigns" },
      { label: "Start a campaign", href: "/campaigns/create" },
    ],
  },
  {
    heading: "Account",
    links: [
      { label: "Sign in", href: "/auth/login" },
      { label: "Dashboard", href: "/dashboard" },
      { label: "Request access", href: "/request-access" },
    ],
  },
  {
    heading: "Legal",
    links: [],
    plainText: ["Privacy Policy", "Terms of Service"],
  },
];

/**
 * Fixed-dark treatment regardless of the site's light/dark toggle —
 * same pattern as the landing page's hero and closing-CTA sections.
 * Uses the app's own dark-mode --background value directly so the
 * footer's dark tone matches what dark-mode users already see
 * elsewhere, rather than an unrelated black.
 */
export function Footer() {
  return (
    <footer className="mt-16 bg-[oklch(0.145_0.02_60)] px-4 py-12 text-white sm:px-6">
      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-2 gap-8 sm:grid-cols-4">
        <div className="col-span-2 flex flex-col gap-2 sm:col-span-1">
          <span className="font-display text-xl font-bold tracking-tight">
            <span className="bg-[linear-gradient(90deg,var(--color-primary)_0%,var(--color-primary-600)_100%)] bg-clip-text text-transparent">
              FundBrave
            </span>
          </span>
          <p className="max-w-[220px] text-sm text-white/70">
            Borderless fundraising, powered by crypto and owned by
            communities.
          </p>
        </div>

        {FOOTER_COLUMNS.map((column) => (
          <div key={column.heading} className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-white">
              {column.heading}
            </h3>
            <ul className="flex flex-col gap-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/70 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              {column.plainText?.map((text) => (
                <li key={text} className="text-sm text-white/40">
                  {text}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-10 w-full max-w-[1400px] border-t border-white/10 pt-6 text-xs text-white/50">
        © {new Date().getFullYear()} FundBrave. All rights reserved.
      </div>
    </footer>
  );
}

export default Footer;
```

- [ ] **Step 2: Wire it into the shared layout**

In `packages/web/app/layout.tsx`, add the import and render `<Footer />` after `{children}`:

```tsx
import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display-family",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FundBrave",
  description: "A decentralized fundraising platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={bricolage.variable} suppressHydrationWarning>
      <body
        className="custom-scrollbar overflow-x-hidden"
        suppressHydrationWarning
      >
        <Providers>
          <Header />
          <div className="w-full mx-auto max-w-[1400px]">{children}</div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Type-check and build**

Run: `cd packages/web && npm run type-check && npm run build`
Expected: both pass with zero errors.

- [ ] **Step 4: Live verification**

Start the dev server (`npm run dev` from `packages/web`) and check `/` and `/campaigns` at 1440px and 375px:
- Footer renders on both routes (confirms shared-layout wiring, not landing-page-only).
- Every rendered link (`Home`, `Browse campaigns`, `Start a campaign`, `Sign in`, `Dashboard`, `Request access`) navigates to a real page, no 404s.
- `Privacy Policy` / `Terms of Service` render as plain text — visually muted/non-interactive, not styled or behaving like a link (no hover state, no cursor pointer, not focusable).
- Footer stays legible/dark at both viewport widths, no overlap or clipping at 375px.

- [ ] **Step 5: Commit**

```bash
git add packages/web/components/layout/Footer.tsx packages/web/app/layout.tsx
git commit -m "feat(web): add site-wide footer"
```

---

## Task 2: Reconcile progress-bar color to mint

**Files:**
- Modify: `packages/web/app/globals.css`

**Interfaces:**
- Consumes: existing `--brave-mint` (`#4ade80`) and `--brave-mint-dark` (`#22c55e`) tokens (already defined, unchanged by this task).
- Produces: nothing new — recolors the existing `.bg-progress-gradient` utility class used by `CampaignProgressBar` in `components/campaigns/CampaignCard.tsx` (not modified by this task — it already applies this class name).

This task is fully independent of every other task in this plan.

- [ ] **Step 1: Recolor the utility class**

In `packages/web/app/globals.css`, find:

```css
  /* Progress bar gradient */
  .bg-progress-gradient {
    background: linear-gradient(
      150deg,
      var(--primary-500) 0%,
      var(--primary-300) 100%
    );
  }
```

Replace with:

```css
  /* Progress bar gradient — reconciled to the mint/success token (not
     primary/coral) so donation progress reads as a distinct "success"
     signal, separate from the brand color used everywhere else. */
  .bg-progress-gradient {
    background: linear-gradient(
      150deg,
      var(--brave-mint-dark) 0%,
      var(--brave-mint) 100%
    );
  }
```

- [ ] **Step 2: Type-check and build**

Run: `cd packages/web && npm run type-check && npm run build`
Expected: both pass with zero errors.

- [ ] **Step 3: Live verification**

Start the dev server and check `/campaigns` (any campaign card) and a campaign detail page (`/campaigns/[slug]`) in both light and dark mode: progress bars render in green (mint), not coral, and the bar is still clearly visible against its `bg-white/10` track in both themes.

- [ ] **Step 4: Commit**

```bash
git add packages/web/app/globals.css
git commit -m "fix(web): reconcile donation progress-bar color to mint"
```

---

## Task 3: Hero rebuild — full-bleed dark photo

**Files:**
- Modify: `packages/web/app/page.tsx`

**Interfaces:**
- Consumes: `CampaignImage` from `@/components/campaigns/CampaignCard` (existing component — `src`, `alt`, `priority`, `sizes`, `className` props; requires a `relative` parent, which the hero `<section>` provides).
- Produces: nothing new for later tasks — this task only touches the hero `<section>` and the top import block.

This task is independent of Tasks 4 and 5, which touch different, non-overlapping regions of the same file (`FeaturedCampaigns` and the closing CTA section respectively). Do this task before Tasks 4/5 so their import-block diffs apply cleanly on top of this one.

- [ ] **Step 1: Add `CampaignImage` to the existing import**

In `packages/web/app/page.tsx`, find:

```tsx
import {
  CampaignCard,
  CampaignCardSkeleton,
  CATEGORY_ICONS,
} from "@/components/campaigns/CampaignCard";
```

Replace with:

```tsx
import {
  CampaignCard,
  CampaignCardSkeleton,
  CampaignImage,
  CATEGORY_ICONS,
} from "@/components/campaigns/CampaignCard";
```

- [ ] **Step 2: Add the hero image constant**

Immediately after the imports (before `const HOW_IT_WORKS = [...]`), add:

```tsx
/**
 * Sourced placeholder (warm, documentary-style, license-clean Unsplash
 * photo) for the hero background — swap this one constant for the real
 * asset when it's supplied. Not currently used elsewhere on the site
 * (seeded campaign images use different photo IDs), so it won't visually
 * duplicate a card in the causes grid below it.
 */
const HERO_IMAGE_URL =
  "https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&w=1920&q=80";
```

- [ ] **Step 3: Replace the hero section**

Find:

```tsx
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
```

Replace with:

```tsx
      {/* ============================== HERO ============================== */}
      {/*
        Fixed-dark treatment: always dark regardless of the site's
        light/dark toggle, matching the closing CTA band's approach of
        overriding page theme for a specific brand moment — so no `dark:`
        variants below, the on-photo styling is the same in both themes.

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
              className="border-white bg-white/15 text-[var(--color-primary-foreground)] hover:bg-white/25"
            >
              <Link href="/auth/login">Start a campaign</Link>
            </Button>
          </div>
        </div>
      </section>
```

Note: the "Explore campaigns" button uses the default `primary` variant unchanged — its colors (`--color-primary-foreground` on the `--color-primary`/`--color-primary-600` gradient) are already identical in both themes and already proven safe against dark backgrounds (documented in `components/ui/button.tsx`), so it needs no on-photo override. Only the `secondary`/glass button gets a `className` override, reusing the exact pattern already WCAG-verified on the closing CTA band — minus the `dark:` variants that pattern needed there (that section's backdrop is the same fixed gradient in both themes too, but the button was reused generically; here we're writing it fresh, so no redundant `dark:` classes that resolve to the same values, matching the code-review finding from the prior redesign pass).

- [ ] **Step 4: Type-check and build**

Run: `cd packages/web && npm run type-check && npm run build`
Expected: both pass with zero errors.

- [ ] **Step 5: Live verification**

Start the dev server and check `/` at 1440px and 375px, light and dark mode:
- Hero photo renders full-bleed, headline/tagline/both buttons are clearly legible against it in all four combinations (2 viewports × 2 themes) — the hero must look identical between light and dark mode (fixed-dark treatment).
- If the tagline or heading is hard to read against the photo in any combination, increase the overlay opacity (e.g. `from-black/90 via-black/65 to-black/45`) and re-check.
- "Explore campaigns" and "Start a campaign" buttons are both clearly visible with legible labels, not blending into the photo.
- No layout shift/overflow at 375px.

- [ ] **Step 6: Commit**

```bash
git add packages/web/app/page.tsx
git commit -m "feat(web): rebuild landing hero as full-bleed dark photo section"
```

---

## Task 4: Causes grid — expand to 3×N with "Show more"

**Files:**
- Modify: `packages/web/app/page.tsx`

**Interfaces:**
- Consumes: `useCampaignsList(params)` from `@/hooks/useCampaigns` (existing — `CampaignListParams` accepts `page`/`limit`/`sort`; returns `{ data, isLoading, isFetching, isError, refetch }` where `data: CampaignListResponse | undefined` has `items: Campaign[]`, `total: number`).
- Produces: nothing new for later tasks.

Depends only on Task 3 having landed first (for the import-block diff to apply cleanly); otherwise independent.

- [ ] **Step 1: Add `useState` import**

At the top of `packages/web/app/page.tsx`, find:

```tsx
"use client";

import Link from "next/link";
```

Replace with:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
```

- [ ] **Step 2: Rewrite `FeaturedCampaigns` with pagination**

Find:

```tsx
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
```

Replace with:

```tsx
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
```

Note: `isLoading` (from `useQuery`) is `true` only on the very first fetch when there's no data yet, so it still correctly gates the initial skeleton grid. `isFetching` is used for the "Show more" button's busy state specifically, since it stays `true` during a `limit` refetch even though `keepPreviousData` means `isLoading` is already `false` by then.

- [ ] **Step 3: Update the section heading**

Find, inside the `FEATURED CAMPAIGNS` section:

```tsx
          <h2 className="text-3xl font-bold text-foreground">
            Campaigns making progress
          </h2>
```

Replace with:

```tsx
          <h2 className="text-3xl font-bold text-foreground">
            Campaigns making an impact
          </h2>
```

Chosen to evoke the Figma's "Discover Causes You Care About" heading without
duplicating the existing Categories section's heading further down the same
page ("Find a cause you care about") — the two would otherwise read as
near-identical phrasing back to back.

Leave the rest of that section (the "View all" desktop link and the mobile "View all campaigns" button below `<FeaturedCampaigns />`) unchanged — they're still useful as a direct link to the full `/campaigns` browse page alongside the new inline pagination.

- [ ] **Step 4: Type-check and build**

Run: `cd packages/web && npm run type-check && npm run build`
Expected: both pass with zero errors.

- [ ] **Step 5: Live verification**

Start the dev server and check `/`. The current seed data (`packages/api/prisma/seed-mvp.ts`) has exactly 7 campaigns, so against that dataset `hasMore` is correctly `false` from the start (`7 < 7`) — confirm the grid renders all 7 cards and "Show more" never appears, with no error.

To verify the pagination click-path itself (not exercisable with only 7 seeded campaigns against a limit of 9), temporarily change `CAUSES_INITIAL_LIMIT` to `3` and `CAUSES_PAGE_SIZE` to `2` in this file, reload, and confirm:
- Grid initially shows 3 cards, "Show more" is visible.
- Clicking it loads 2 more (button shows `loadingText` briefly), grid grows to 5 without losing scroll position.
- Clicking again grows to 7 and "Show more" disappears (`7 < 7` is false).

Revert `CAUSES_INITIAL_LIMIT`/`CAUSES_PAGE_SIZE` back to `9` before committing — this temporary change is for local verification only, not part of the shipped diff.

- [ ] **Step 6: Commit**

```bash
git add packages/web/app/page.tsx
git commit -m "feat(web): expand causes grid to 3xN with Show more pagination"
```

---

## Task 5: CTA banner — real feature-bullet copy

**Files:**
- Modify: `packages/web/app/page.tsx`

**Interfaces:**
- Consumes: `Lock`, `CheckCircle2`, `Globe` icons from `@/components/ui/icons` (all already exported from that module).
- Produces: nothing new for later tasks.

Depends only on Tasks 3 and 4 having landed first (for the import-block diff to apply cleanly); otherwise independent.

- [ ] **Step 1: Extend the icons import**

Find:

```tsx
import { ArrowRight, Wallet, Rocket, Shield } from "@/components/ui/icons";
```

Replace with:

```tsx
import {
  ArrowRight,
  Wallet,
  Rocket,
  Shield,
  Lock,
  CheckCircle2,
  Globe,
} from "@/components/ui/icons";
```

- [ ] **Step 2: Add the CTA benefits constant**

Immediately after `HERO_IMAGE_URL` (added in Task 3) and before `const HOW_IT_WORKS = [...]`, add:

```tsx
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
```

- [ ] **Step 3: Replace the closing CTA section's body copy with the bullet grid**

Find (note the existing WCAG-contrast comment block stays — it documents colors this task doesn't change):

```tsx
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
```

Replace with:

```tsx
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
```

Note: this reuses the exact same `--color-primary-foreground` on `--gradient-cta` color pairing already WCAG-verified for the heading (documented in the comment block directly above this section in the file) — only the content between the heading and the button changed (3 bullets instead of one paragraph), not any color, so no new contrast computation is needed. The button's `dark:` variants are unchanged from the existing, already-verified version (this section's background does follow the page gradient token consistently in both themes, unlike the hero — it was already using `dark:` correctly here before this task).

- [ ] **Step 4: Type-check and build**

Run: `cd packages/web && npm run type-check && npm run build`
Expected: both pass with zero errors.

- [ ] **Step 5: Live verification**

Start the dev server and check `/` (closing CTA section) at 1440px and 375px, light and dark mode: 3 bullets render in a row at desktop width and stack to 1 column at 375px, all icon/title/body text stays legible against the gradient in both themes (reusing already-verified colors, so this should just be a visual sanity check, not a new contrast measurement).

- [ ] **Step 6: Commit**

```bash
git add packages/web/app/page.tsx
git commit -m "feat(web): replace CTA banner placeholder copy with real feature bullets"
```

---

## Task 6: Final verification pass

**Files:** none modified — this task only runs checks.

- [ ] **Step 1: Full build/type-check**

```bash
cd packages/web && npm run type-check && npm run build
```
Expected: passes with zero errors.

- [ ] **Step 2: Live screenshot audit**

Dispatch a `ui-ux-reviewer` agent against the running app, covering `/` and `/campaigns` at 1440px and 375px, in both light and dark mode. Confirm specifically:
- Hero reads identically dark in both light and dark site-theme (fixed-dark treatment working correctly, no accidental `dark:`-conditional styling crept in).
- Headline, tagline, and both hero buttons are legible against the photo in all 4 combinations.
- Causes grid shows up to 9 campaigns, "Show more" works and self-hides once all campaigns are loaded.
- CTA banner's 3 bullets are legible and correctly laid out (3-column desktop, 1-column mobile).
- Footer renders on both routes checked, all real links resolve, `Privacy Policy`/`Terms of Service` are visibly non-interactive text.
- Progress bars on campaign cards render mint/green, not coral.
- No console errors, no layout shift/overflow at 375px anywhere touched by this plan.

- [ ] **Step 3: Code review gate**

Per this repo's standing conventions, run the `code-reviewer` and `typescript-reviewer` agents over the full diff (`git diff <merge-base>...HEAD -- packages/web/components/layout/Footer.tsx packages/web/app/layout.tsx packages/web/app/globals.css packages/web/app/page.tsx`, where `<merge-base>` is the commit before Task 1 started). Address any CRITICAL/HIGH findings before merging; MEDIUM/LOW are discretionary per the same convention.

- [ ] **Step 4: Update the design spec status**

In `docs/superpowers/specs/2026-07-27-landing-page-figma-merge-design.md`, change the `**Status:**` line from `Approved for planning` to `Implemented`.

```bash
git add docs/superpowers/specs/2026-07-27-landing-page-figma-merge-design.md
git commit -m "docs: mark landing page Figma merge spec as implemented"
```
