# FundBrave MVP (`packages/web`) Visual & UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the split-identity design system, the concrete bugs found in the live audit, and the unbuilt page composition in `packages/web` so the MVP looks and behaves like one coherent, professional product.

**Architecture:** No architectural changes — this is a design-token, component, and page-composition pass inside the existing Next.js 16 App Router structure of `packages/web`. All work is client-side/CSS/component-level; no API or Prisma changes.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4 (CSS-first `@theme`), `class-variance-authority`, `next/font`, `next-themes` (new dependency), TypeScript.

## Global Constraints

- Retire the blue/purple brand system (`--primary: #450cf0`, `--purple`, `--soft-purple`) entirely — do not keep it as a secondary accent (per approved design spec, `docs/superpowers/specs/2026-07-26-web-mvp-redesign-design.md` §2).
- New primary color is coral (`#FF8A5C`), already partially present as `--brave-coral`. Amber = secondary accent, mint = success/positive, teal = info/link — these three already exist correctly and are NOT changed in hue, only reused more consistently.
- Dark mode must be a real, working feature (toggle + `.dark` class applied), not dead CSS.
- Remove CSS/components confirmed to have zero usage in `packages/web` (verified via repo-wide grep during planning — see Task 2 and Task 4 for the exact lists). Do not remove anything still referenced.
- No changes to `packages/api` or `packages/frontend` — this plan is scoped to `packages/web` only, plus one seed script that talks to the existing API.
- This codebase has no component/visual test suite (`jest --passWithNoTests`, no test files under `packages/web`). "Tests" in this plan mean: `npm run type-check` / `npm run build` staying green, and explicit manual/scripted verification steps (dev server + specific assertions) — not new unit tests, since writing throwaway snapshot tests for CSS token swaps would add no real coverage. Each task's verification step says exactly what to check.
- Every task ends with `npm run type-check` (from `packages/web`) passing before commit.

---

## File Map

| File | Change |
|---|---|
| `packages/web/app/globals.css` | Rewrite color tokens (coral primary), remove dead CSS, fix scrollbar/shadow colors |
| `packages/web/app/layout.tsx` | Add `next/font/google` (Bricolage Grotesque), wrap in `ThemeProvider` |
| `packages/web/app/providers.tsx` | Add `next-themes` `ThemeProvider`, sync RainbowKit theme to app theme |
| `packages/web/components/ui/button.tsx` | Rewrite variants on coral tokens, fix contrast |
| `packages/web/components/layout/Header.tsx` | Sweep gradient colors, add theme toggle, fix mobile "+" button label |
| `packages/web/components/layout/ThemeToggle.tsx` | **New** — theme toggle button |
| `packages/web/app/page.tsx` | Rebuild landing page composition |
| `packages/web/app/not-found.tsx` | **New** — global styled 404 |
| `packages/web/app/campaigns/[slug]/not-found.tsx` | **New** — campaign-specific styled 404 |
| `packages/web/app/request-access/page.tsx` | Fix unconditional messaging bug, sweep colors |
| `packages/web/components/auth/LoginScreen.tsx` | Sweep colors, add card framing |
| `packages/web/components/auth/AuthGuard.tsx` | Add loading-timeout fallback |
| `packages/web/components/campaigns/CampaignCard.tsx` | Sweep `MediaPlaceholder` gradient |
| `packages/web/app/campaigns/create/page.tsx` | Sweep step-indicator + input focus-ring colors |
| `packages/web/components/ui/form/FormFields.tsx` | Sweep focus-ring colors |
| `packages/web/components/ui/Avatar.tsx` | Sweep gradient border colors |
| `packages/web/components/ui/TabNavigation.tsx` | **Delete** — dead code (unused "create post" leftover) |
| `packages/web/components/ui/index.ts` | Remove `TabNavigation` export |
| `packages/web/app/campaigns/page.tsx` | Fix heading to use shared typography, add mobile category-rail scroll fade |
| `packages/web/package.json` | Add `next-themes` |
| `packages/api/prisma/seed-mvp.ts` | **New** — seed script for demo campaigns |

---

## Task 1: Add coral-based design tokens, remove dead CSS

**Files:**
- Modify: `packages/web/app/globals.css`

**Interfaces:**
- Produces: `--primary`, `--primary-50`..`--primary-900` (coral scale, replacing the old blue scale), `--color-primary-*` Tailwind mappings unchanged in name so every existing `text-primary-300`, `bg-primary/15`, etc. usage across the app keeps working without touching call sites.
- Removes: `--purple*`, `--soft-purple*`, `--color-purple*`, `--color-soft-purple*`, `--color-brand-blue`, `--color-brand-purple`, `--color-brand-soft-purple` and every CSS rule under "Removed as dead" below.

This task only touches `globals.css`. Every other task that references `var(--color-purple-500)` etc. is fixed in later tasks — after this task lands, those files will reference undefined CSS variables until Task 5/6 sweep them, so **do not deploy Task 1 alone**; land Tasks 1 and 5–6 together before shipping (subagent-driven execution handles this via sequential task order, not parallel).

- [ ] **Step 1: Replace the `:root` color block**

In `packages/web/app/globals.css`, replace lines 6–147 (from `/* Light theme base (raw values) */` through the closing `}` of the FundBrave warm gradients / split-visual block) with:

```css
/* Light theme base (raw values) */
:root {
  /* FundBrave Light Theme */
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);

  /* Primary = coral (was blue #450cf0, retired per 2026-07-26 design spec) */
  --primary: #ff8a5c;
  --primary-foreground: #1a0e08;
  --primary-50: #fff3ec;
  --primary-100: #ffe1d0;
  --primary-200: #ffc7a8;
  --primary-300: #ffa97d;
  --primary-400: #ff9668;
  --primary-500: #ff8a5c;
  --primary-600: #e06a3c;
  --primary-700: #c1552c;
  --primary-800: #96401f;
  --primary-900: #6e2e16;

  /* Neutral Dark Colors */
  --neutral-dark-50: #8e98a8;
  --neutral-dark-100: #b3b0b8;
  --neutral-dark-200: #8e8a96;
  --neutral-dark-300: #5a5566;
  --neutral-dark-400: #3a3448;
  --neutral-dark-500: #09011a;
  --neutral-dark-600: #080118;
  --neutral-dark-700: #060112;
  --neutral-dark-800: #05010e;
  --neutral-dark-900: #04000b;

  /* Secondary/Neutral Colors (unchanged — generic UI grays, not brand) */
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: #ffffff;
  --border: rgba(0, 0, 0, 0.12);
  --input: rgba(0, 0, 0, 0.12);
  --ring: var(--primary-500);
  --radius: 0.625rem;
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: var(--primary-500);
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: var(--primary-500);
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);

  /* Surface colors for light mode — real separation, not the old 2%-lightness leftover */
  --surface-elevated: oklch(0.96 0.006 60);
  --surface-sunken: oklch(0.94 0.008 60);
  --surface-overlay: rgba(0, 0, 0, 0.05);

  /* Text hierarchy */
  --text-primary: oklch(0.15 0.01 60);
  --text-secondary: oklch(0.45 0.01 60);
  --text-tertiary: oklch(0.6 0.01 60);

  /* Borders — real opacity for a light background (old value was tuned for dark bg) */
  --border-default: rgba(0, 0, 0, 0.12);
  --border-subtle: rgba(0, 0, 0, 0.07);
  --border-emphasis: rgba(255, 138, 92, 0.3);

  /* Shadows */
  --shadow-card: 0 2px 8px rgba(0, 0, 0, 0.08);
  --shadow-elevated: 0 4px 16px rgba(0, 0, 0, 0.12);

  /* FundBrave warm accent palette (unchanged hues — amber/mint/teal were already correct) */
  --brave-coral: var(--primary-500);
  --brave-coral-light: var(--primary-300);
  --brave-coral-dark: var(--primary-600);
  --brave-amber: #ffb454;
  --brave-amber-light: #ffcc88;
  --brave-amber-dark: #e09030;
  --brave-mint: #4ade80;
  --brave-mint-light: #86efb0;
  --brave-mint-dark: #22c55e;
  --brave-teal: #2dd4bf;
  --brave-teal-light: #6ee7da;
  --brave-teal-dark: #14b8a6;

  /* Gradients — now coral→amber instead of blue→purple */
  --gradient-warm: linear-gradient(135deg, #ff8a5c 0%, #ffb454 100%);
  --gradient-yield: linear-gradient(135deg, #4ade80 0%, #2dd4bf 100%);
  --gradient-amber: linear-gradient(135deg, #ffb454 0%, #ff8a5c 100%);
  --gradient-cta: linear-gradient(135deg, #ff8a5c 0%, #ffb454 100%);
}
```

- [ ] **Step 2: Update the `@theme` block's brand/shadow references**

In the `@theme { ... }` block, find and replace these three spots:

Replace:
```css
  --shadow-glow-primary: 0 0 0 3px rgb(69 12 240 / 0.35);
```
with:
```css
  --shadow-glow-primary: 0 0 0 3px rgb(255 138 92 / 0.35);
```

Replace the "Purple color palette" and "Soft purple color palette" blocks (the two `--color-purple*` / `--color-soft-purple*` groups, roughly lines 289–315 of the original file) — **delete them entirely**, no replacement.

Replace:
```css
  /* Brand colors - direct values */
  --color-brand-blue: #450cf0;
  --color-brand-purple: #8762fa;
  --color-brand-soft-purple: #cd82ff;
  --color-brand-dark: #09011a;
  --color-brand-white: #ffffff;
```
with:
```css
  /* Brand colors - direct values */
  --color-brand-dark: #09011a;
  --color-brand-white: #ffffff;
```

- [ ] **Step 3: Delete dead utility classes**

Inside the `@layer utilities { ... }` block, delete these rules entirely (confirmed zero usage anywhere in `packages/web` via repo-wide grep during planning — they're leftovers from the full-featured `packages/frontend` platform or an unbuilt "create post" feature, both out of MVP scope per `docs/MVP_PLAN.md`):

- `.auth-page-shell`
- `.auth-gradient` (and its `:root:not(.dark) .auth-gradient` override)
- `.auth-panel` (and `.auth-panel::before`)
- `.auth-bubble`
- `.text-brand-gradient`
- `.border-brand-overlay`
- `.custom-checkbox` (and `.custom-checkbox:checked`)
- `.dive-bg`
- `.onboarding-bg`
- `.onboarding-aside-gradient` (and `.dark .onboarding-aside-gradient`)
- `.bg-brand-gradient` / `.bg-brand-gradient-hover`
- `.tab-indicator-gradient`
- `.underline-brand-gradient`
- `.chain-pill`
- `.category-chip` (and `.category-chip:hover`, `.category-chip.active`) — this is the unused CSS class; the React `CategoryChip` component in `CampaignCard.tsx` uses inline Tailwind classes and is unaffected
- `.hero-word` / `.hero-word-inner`
- `.split-bar` / `.split-bar-direct` / `.split-bar-endowment` / `.split-bar-platform` (78/20/2 split visual — out of MVP scope)
- `.kpi-glow-coral` / `.kpi-glow-mint` / `.kpi-glow-teal`
- `.staking-pillar` (and `.staking-pillar:hover`)
- `.verified-badge`
- `.glass`
- `.scrollbar-auto-hide` (and its `::-webkit-scrollbar*` and `:hover` rules)
- `.bg-warm-gradient` / `.bg-yield-gradient` / `.bg-amber-gradient` / `.bg-cta-gradient` / `.text-warm-gradient` / `.text-yield-gradient`
- `.aurora-bg` (and `::before`/`::after`)

Also delete the now-unused keyframes referenced only by the deleted classes above: `@keyframes aurora-drift-1`, `@keyframes aurora-drift-2`, `@keyframes aurora-drift-3`, `@keyframes word-rise`, `@keyframes badge-shine`, `@keyframes gradient-drift`, `@keyframes underline-draw`.

Do **not** delete: `.split-bar` lookalikes' neighbor `.cascade-in`, `.campaign-progress-shimmer`, `.campaign-skeleton`, `.chain-pill`'s neighbors `.custom-scrollbar`, `.focus-ring*`, `.text-on-media*`, `.sr-only`/`.not-sr-only`, `.skip-link`, `.touch-target`, `.animate-*`, or anything under "ACCESSIBILITY UTILITIES" / "ARIA STATE STYLES" — these are either actively used or general-purpose a11y utilities unrelated to the color-system cleanup.

- [ ] **Step 4: Fix the scrollbar thumb color**

Find:
```css
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(135, 98, 250, 0.5) transparent;
}
```
Replace with:
```css
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 138, 92, 0.5) transparent;
}
```
And similarly replace `rgba(135, 98, 250, 0.5)` → `rgba(255, 138, 92, 0.5)` and `rgba(135, 98, 250, 0.8)` → `rgba(255, 138, 92, 0.8)` in the two `.custom-scrollbar::-webkit-scrollbar-thumb` rules directly below it.

- [ ] **Step 5: Remove the dead `.dark` block (superseded by Task 3)**

Delete the entire `.dark { ... }` block (the one starting `/* FundBrave Dark Theme */`). Task 3 replaces it with a corrected version that pairs with the new coral primary and is actually wired up to a toggle.

- [ ] **Step 6: Verify**

Run:
```bash
cd packages/web && npm run type-check
```
Expected: passes (CSS changes don't affect `tsc`, this just confirms nothing else broke). Do not run `npm run build` yet — other files still reference the now-deleted `--color-purple-*` variables until Tasks 5–6 land; a build at this point will render with those Tailwind arbitrary-value classes resolving to `unset`/transparent, which is expected and temporary.

- [ ] **Step 7: Commit**

```bash
git add packages/web/app/globals.css
git commit -m "feat(web): replace blue/purple design tokens with coral primary, remove dead CSS"
```

---

## Task 2: Real dark mode

**Files:**
- Modify: `packages/web/package.json`
- Modify: `packages/web/app/globals.css`
- Modify: `packages/web/app/providers.tsx`
- Modify: `packages/web/app/layout.tsx`
- Create: `packages/web/components/layout/ThemeToggle.tsx`
- Modify: `packages/web/components/layout/Header.tsx`

**Interfaces:**
- Consumes: `--primary-*` scale from Task 1.
- Produces: `ThemeToggle` component (no props) rendered in `Header`; `.dark` class applied to `<html>` via `next-themes`.

- [ ] **Step 1: Add `next-themes`**

```bash
cd packages/web && npm install next-themes@^0.4.6
```

- [ ] **Step 2: Re-add a corrected `.dark` block to `globals.css`**

Append after the `:root { ... }` block from Task 1 (before the `/* Tailwind v4 CSS-first design system tokens */` comment... actually append it in the same position the old block occupied, i.e. right after the `@theme { ... }` block, before `/* FundBrave Animation Keyframes */`):

```css
.dark {
  /* FundBrave Dark Theme */
  --background: oklch(0.145 0.02 60);
  --foreground: oklch(0.97 0.005 60);
  --card: oklch(0.19 0.02 60);
  --card-foreground: oklch(0.97 0.005 60);
  --popover: oklch(0.16 0.02 60);
  --popover-foreground: oklch(0.97 0.005 60);

  --primary: var(--primary-400);
  --primary-foreground: #1a0e08;

  --secondary: oklch(0.28 0.015 60);
  --secondary-foreground: oklch(0.97 0.005 60);
  --muted: oklch(0.24 0.015 60);
  --muted-foreground: oklch(0.72 0.01 60);
  --accent: oklch(0.28 0.015 60);
  --accent-foreground: oklch(0.97 0.005 60);
  --destructive: #ff5c5c;
  --destructive-foreground: #ffffff;
  --border: rgba(255, 255, 255, 0.1);
  --input: rgba(255, 255, 255, 0.1);
  --ring: var(--primary-300);

  --surface-elevated: oklch(0.22 0.02 60);
  --surface-sunken: oklch(0.145 0.02 60);
  --surface-overlay: rgba(255, 255, 255, 0.06);

  --text-primary: oklch(0.97 0.005 60);
  --text-secondary: oklch(0.75 0.01 60);
  --text-tertiary: oklch(0.58 0.01 60);

  --border-default: rgba(255, 255, 255, 0.1);
  --border-subtle: rgba(255, 255, 255, 0.06);
  --border-emphasis: rgba(255, 138, 92, 0.35);

  --shadow-card: 0 2px 8px rgba(0, 0, 0, 0.35);
  --shadow-elevated: 0 4px 20px rgba(0, 0, 0, 0.5);
}
```

This uses the same `--primary-*` scale from Task 1 (just a lighter step for dark backgrounds), so it can't drift out of sync with the light theme the way the old hardcoded-hex dark block could.

- [ ] **Step 3: Wire `ThemeProvider` into `providers.tsx`**

In `packages/web/app/providers.tsx`, add the import:

```tsx
import { ThemeProvider, useTheme } from "next-themes";
```

Wrap the outermost return value. Replace:

```tsx
  // Degraded mode: no Privy app ID configured — skip PrivyProvider entirely.
  // useAuth() detects this via lib/privy-config and reports 'unauthenticated'.
  if (!isPrivyConfigured || privyAppId === null) {
    return inner;
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        loginMethods: ["email", "google"],
        embeddedWallets: {
          ethereum: { createOnLogin: "users-without-wallets" },
        },
        appearance: { theme: "dark" },
      }}
    >
      {inner}
    </PrivyProvider>
  );
}
```

with:

```tsx
  // Degraded mode: no Privy app ID configured — skip PrivyProvider entirely.
  // useAuth() detects this via lib/privy-config and reports 'unauthenticated'.
  const privyWrapped =
    !isPrivyConfigured || privyAppId === null ? (
      inner
    ) : (
      <PrivyProvider
        appId={privyAppId}
        config={{
          loginMethods: ["email", "google"],
          embeddedWallets: {
            ethereum: { createOnLogin: "users-without-wallets" },
          },
          appearance: { theme: "dark" },
        }}
      >
        {inner}
      </PrivyProvider>
    );

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <RainbowKitThemeSync>{privyWrapped}</RainbowKitThemeSync>
    </ThemeProvider>
  );
}

/** Keeps RainbowKit's wallet-connect modal in sync with the app's light/dark toggle. */
function RainbowKitThemeSync({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === "dark" ? (
    <>{children}</>
  ) : (
    <>{children}</>
  );
}
```

Wait — `RainbowKitProvider`'s `theme` prop is set once, inside `withWallet`, before `ThemeProvider` exists in the tree. Instead of the placeholder above, thread the theme down properly. Replace the `withWallet` construction:

```tsx
  const withWallet = wagmiConfig ? (
    <WagmiProvider config={wagmiConfig}>
      <RainbowKitProvider theme={darkTheme()}>
        <ToastProvider>{children}</ToastProvider>
      </RainbowKitProvider>
    </WagmiProvider>
  ) : (
    <ToastProvider>{children}</ToastProvider>
  );
```

with:

```tsx
  const withWallet = wagmiConfig ? (
    <WagmiProvider config={wagmiConfig}>
      <RainbowKitThemedProvider>
        <ToastProvider>{children}</ToastProvider>
      </RainbowKitThemedProvider>
    </WagmiProvider>
  ) : (
    <ToastProvider>{children}</ToastProvider>
  );
```

And remove the `RainbowKitThemeSync` stub from the previous edit — replace it with the real implementation, placed above the `Providers` function:

```tsx
import { darkTheme, lightTheme, RainbowKitProvider } from "@rainbow-me/rainbowkit";

/** RainbowKit's own theme prop, kept in sync with next-themes so the wallet
 * modal doesn't stay dark-only regardless of the app's chosen theme. */
function RainbowKitThemedProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  return (
    <RainbowKitProvider theme={resolvedTheme === "dark" ? darkTheme() : lightTheme()}>
      {children}
    </RainbowKitProvider>
  );
}
```

Remove the old top-level `import { darkTheme, RainbowKitProvider } from "@rainbow-me/rainbowkit";` (replaced by the line above) and delete the leftover `RainbowKitThemeSync` function from the prior step — it's superseded.

The final `ThemeProvider` return in `Providers` becomes:

```tsx
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      {privyWrapped}
    </ThemeProvider>
  );
}
```

(`privyWrapped` already contains `withWallet`/`RainbowKitThemedProvider` inside `inner`, which is why `useTheme()` inside `RainbowKitThemedProvider` works — it's rendered under `ThemeProvider` in the tree.)

- [ ] **Step 4: Add `suppressHydrationWarning` is already present in `layout.tsx`**

`packages/web/app/layout.tsx` already has `suppressHydrationWarning` on `<html>` and `<body>` (required by `next-themes` to avoid a hydration mismatch warning on first paint) — no change needed there for this step.

- [ ] **Step 5: Create the theme toggle**

Create `packages/web/components/layout/ThemeToggle.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // Avoid a hydration mismatch: server doesn't know the persisted theme yet.
    return <div className="h-10 w-10" aria-hidden="true" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="flex h-10 w-10 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-overlay hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
    >
      {isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  );
}

export default ThemeToggle;
```

- [ ] **Step 6: Mount the toggle in `Header`**

In `packages/web/components/layout/Header.tsx`, add the import:

```tsx
import { ThemeToggle } from "@/components/layout/ThemeToggle";
```

Find the "Right: auth state" wrapper div:

```tsx
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Button asChild variant="secondary" size="sm">
```

Replace with:

```tsx
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Button asChild variant="secondary" size="sm">
```

- [ ] **Step 7: Verify**

Start the dev server (`npm run dev --workspace=web` from repo root) and manually confirm: the moon/sun icon toggles the theme, `<html>` gains/loses the `dark` class in devtools, backgrounds/text/surfaces visibly repaint, and the choice persists across a page reload (localStorage-backed by default in `next-themes`).

```bash
cd packages/web && npm run type-check
```
Expected: passes.

- [ ] **Step 8: Commit**

```bash
git add packages/web/package.json packages/web/package-lock.json packages/web/app/globals.css packages/web/app/providers.tsx packages/web/components/layout/ThemeToggle.tsx packages/web/components/layout/Header.tsx
git commit -m "feat(web): wire up real dark mode with a toggle, synced to RainbowKit"
```

---

## Task 3: Replace the broken display font

**Files:**
- Modify: `packages/web/app/layout.tsx`
- Modify: `packages/web/app/globals.css`

**Interfaces:**
- Produces: a `--font-display` CSS variable backed by a real, self-hosted Google Font (Bricolage Grotesque), applied the same way `font-display` utility class already is everywhere it's used today — no call-site changes needed beyond making the class actually resolve to a shipped font.

- [ ] **Step 1: Load the font via `next/font/google` in `layout.tsx`**

Replace the top of `packages/web/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/layout/Header";
```

with:

```tsx
import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/layout/Header";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display-family",
  display: "swap",
});
```

Update the `<html>` tag to carry the font variable class:

```tsx
    <html lang="en" suppressHydrationWarning>
```
becomes:
```tsx
    <html lang="en" className={bricolage.variable} suppressHydrationWarning>
```

- [ ] **Step 2: Point `--font-display` at the loaded font, remove the broken `@font-face`s**

In `packages/web/app/globals.css`, inside the `@theme { ... }` block, replace:

```css
  --font-display: "Gilgan", var(--font-sans);
  --font-alt: "Montserrat", var(--font-sans);
```

with:

```css
  --font-display: var(--font-display-family), var(--font-sans);
  --font-alt: var(--font-sans);
```

Delete the three broken `@font-face` rules entirely (they reference `/fonts/Gilgan.woff2`, `/fonts/Montserrat-Regular.woff2`, `/fonts/Montserrat-Medium.woff2`, `/fonts/Montserrat-Bold.woff2`, none of which exist in the repo):

```css
  @font-face {
    font-family: "Gilgan";
    src: url("/fonts/Gilgan.woff2") format("woff2");
    font-weight: normal;
    font-style: normal;
    font-display: swap;
  }

  @font-face {
    font-family: "Montserrat";
    src: url("/fonts/Montserrat-Regular.woff2") format("woff2");
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }

  @font-face {
    font-family: "Montserrat";
    src: url("/fonts/Montserrat-Medium.woff2") format("woff2");
    font-weight: 500;
    font-style: normal;
    font-display: swap;
  }

  @font-face {
    font-family: "Montserrat";
    src: url("/fonts/Montserrat-Bold.woff2") format("woff2");
    font-weight: 700;
    font-style: normal;
    font-display: swap;
  }
```

Also remove the now-orphaned:
```css
  --font-family-gilgan: "Gilgan", sans-serif;
  --font-family-montserrat: "Montserrat", sans-serif;
```
from the `@theme` block (grep confirms nothing references `font-family-gilgan` or `font-family-montserrat` as Tailwind utility classes anywhere in `packages/web`).

Update the base heading rule:
```css
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-family: "Gilgan", sans-serif;
    font-weight: bold;
    line-height: 1.2;
  }
```
becomes:
```css
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-family: var(--font-display);
    font-weight: bold;
    line-height: 1.2;
  }
```

This last change means every `<h1>`–`<h6>` in the app gets the branded display font **by default**, closing the gap the audit found on `/campaigns` (which never applied the `font-display` utility class explicitly).

- [ ] **Step 2: Verify**

```bash
cd packages/web && npm run type-check && npm run build
```
Expected: both pass. This is the first full `npm run build` since Task 1 — confirm no errors about missing CSS variables (Tasks 5–6 haven't swept remaining `--color-purple*` references yet, so expect the build to still succeed since Tailwind arbitrary-value `var(--color-purple-500)` references just resolve to an invalid/empty value at runtime, not a build error — but note down any component still visibly broken for Task 5–6 to pick up).

Then start the dev server and visually confirm on `/` and `/auth/login`: headings now render in a distinctive rounded/geometric display face, not generic system sans.

- [ ] **Step 3: Commit**

```bash
git add packages/web/app/layout.tsx packages/web/app/globals.css
git commit -m "fix(web): replace broken Gilgan font reference with self-hosted Bricolage Grotesque"
```

---

## Task 4: Delete dead "create post" leftovers

**Files:**
- Delete: `packages/web/components/ui/TabNavigation.tsx`
- Modify: `packages/web/components/ui/index.ts`
- Modify: `packages/web/components/ui/form/FormFields.tsx`

**Interfaces:**
- Consumes: none.
- Produces: none — pure deletion. `InputField`, `TextAreaField`, `SelectField` exports from `FormFields.tsx` are unchanged and still used by `campaigns/create/page.tsx`.

`TabNavigation` (post vs. campaign-update tabs) is exported from the UI barrel but never imported by any route — confirmed via repo-wide grep during planning (only self-references and the barrel export exist). It's a leftover from the social-feed "create post" feature, which is explicitly out of MVP scope per `docs/MVP_PLAN.md`. `FormFields.tsx`'s `MediaActions` component (image/GIF/poll/emoji/calendar/location insert buttons) is only reachable when a caller passes `showMediaActions={true}` — the one real caller (`campaigns/create/page.tsx`) always passes `showMediaActions={false}`, so it's dead in practice too, along with its `CreatePost.types` and `providerIcons` imports.

- [ ] **Step 1: Delete `TabNavigation.tsx`**

```bash
git rm packages/web/components/ui/TabNavigation.tsx
```

- [ ] **Step 2: Remove its barrel export**

In `packages/web/components/ui/index.ts`, delete the line:
```ts
export { default as TabNavigation } from "./TabNavigation";
```
and the now-stale comment two lines below it if it only refers to `TabNavigation` (`// Shared types (used by TabNavigation / form fields)` — check the surrounding context first; if the comment also applies to types still used by `FormFields.tsx`, reword it to drop the `TabNavigation` mention instead of deleting the whole line).

- [ ] **Step 3: Strip `MediaActions` and its dead imports from `FormFields.tsx`**

In `packages/web/components/ui/form/FormFields.tsx`, remove:
- The import block:
  ```tsx
  import type {
    MediaActionsProps,
    SelectFieldProps,
    InputFieldProps,
    TextAreaFieldProps,
  } from "../types/CreatePost.types";
  import {
    GifIcon,
    PollIcon,
    Image as ImageIcon,
    MapPin,
    Calendar,
    Smile,
  } from "../providerIcons";
  ```
  replace with:
  ```tsx
  import type {
    SelectFieldProps,
    InputFieldProps,
    TextAreaFieldProps,
  } from "../types/CreatePost.types";
  ```
  (keep `CreatePost.types` — `SelectFieldProps`/`InputFieldProps`/`TextAreaFieldProps` still live there and are still used; only the `MediaActionsProps` type and the `providerIcons` import are dropped).
- The entire `MediaActions` component definition (from `// Media Actions Component` through its closing `};`).
- In `TextAreaField`'s JSX, remove the line `{showMediaActions && mediaActions && <MediaActions {...mediaActions} />}` and the now-unused `showMediaActions`/`mediaActions` props can stay in `TextAreaFieldProps` (harmless — `campaigns/create/page.tsx` already passes `showMediaActions={false}` and no `mediaActions`, so this is a no-op either way; leaving the prop avoids touching the shared `CreatePost.types` file, which is out of scope for this plan).

- [ ] **Step 4: Verify**

```bash
cd packages/web && npm run type-check
```
Expected: passes. If `CreatePost.types.ts` or `providerIcons` become fully unused after this (check with a quick grep for other importers), leave them — deleting shared type/icon files not directly implicated by this redesign is out of scope; flag it as a follow-up instead of doing it here.

- [ ] **Step 5: Commit**

```bash
git add packages/web/components/ui/TabNavigation.tsx packages/web/components/ui/index.ts packages/web/components/ui/form/FormFields.tsx
git commit -m "chore(web): remove unused TabNavigation and MediaActions create-post leftovers"
```

---

## Task 5: Rewrite the Button component on coral tokens, fix contrast

**Files:**
- Modify: `packages/web/components/ui/button.tsx`

**Interfaces:**
- Consumes: `--primary`, `--primary-50`..`--primary-900` from Task 1.
- Produces: same `Button` export, same `ButtonProps`/`buttonVariants` API (`variant`: `primary | secondary | tertiary | destructive | outline | ghost | link`, `size`: `sm | md | lg | xl | icon`) — **no call-site changes needed anywhere else in the app**, only the visual treatment changes.

This is the single highest-impact fix: every CTA in the app runs through this component.

- [ ] **Step 1: Replace `buttonVariants`**

In `packages/web/components/ui/button.tsx`, replace the `variants.variant` object:

```tsx
      variant: {
        // Primary: Brand gradient with glow
        primary: cn(
          "bg-[linear-gradient(90deg,var(--color-primary)_0%,var(--color-purple-500)_50%,var(--color-soft-purple-500)_100%)]",
          "text-white shadow-[0_8px_30px_0_rgba(97,36,243,0.35)]",
          "hover:brightness-110 active:brightness-95"
        ),
        // Secondary: Frosted glass with border
        secondary: cn(
          "backdrop-blur-[18px] bg-[rgba(69,12,240,0.10)]",
          "relative text-white",
          "before:absolute before:inset-0 before:rounded-[20px] before:border before:border-[var(--color-primary)] before:shadow-[0_8px_30px_0_rgba(29,5,82,0.35)] before:pointer-events-none",
          "hover:bg-[rgba(69,12,240,0.14)] active:bg-[rgba(69,12,240,0.18)]"
        ),
        // Tertiary: Gradient text only (ghost/link style)
        tertiary: cn(
          "relative text-transparent bg-clip-text",
          "bg-[linear-gradient(90deg,var(--color-primary)_0%,var(--color-purple-500)_50%,var(--color-soft-purple-500)_100%)]",
          "hover:opacity-90 active:opacity-80"
        ),
        // Destructive: Error/Delete actions
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        // Outline: Bordered transparent
        outline:
          "border border-border-default bg-transparent text-foreground dark:text-white hover:bg-surface-overlay",
        // Ghost: No background until hover
        ghost: "text-foreground dark:text-white hover:bg-accent hover:text-accent-foreground",
        // Link: Text only with underline
        link: "text-primary underline-offset-4 hover:underline",
      },
```

with:

```tsx
      variant: {
        // Primary: Brand gradient with glow
        primary: cn(
          "bg-[linear-gradient(90deg,var(--color-primary)_0%,var(--color-primary-600)_100%)]",
          "text-white shadow-[0_8px_30px_0_rgba(255,138,92,0.35)]",
          "hover:brightness-110 active:brightness-95"
        ),
        // Secondary: solid tinted surface with a real border — the old 10%-opacity
        // fill + white text failed WCAG contrast (~1.2:1); this variant is
        // solid enough to guarantee AA at any size.
        secondary: cn(
          "border border-[var(--color-primary)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]",
          "hover:bg-[var(--color-primary-100)] active:bg-[var(--color-primary-200)]",
          "dark:bg-[color-mix(in_srgb,var(--color-primary-900)_55%,transparent)] dark:text-[var(--color-primary-100)] dark:border-[var(--color-primary-400)]",
          "dark:hover:bg-[color-mix(in_srgb,var(--color-primary-900)_75%,transparent)]"
        ),
        // Tertiary: Gradient text only (ghost/link style)
        tertiary: cn(
          "relative text-transparent bg-clip-text",
          "bg-[linear-gradient(90deg,var(--color-primary)_0%,var(--color-primary-600)_100%)]",
          "hover:opacity-90 active:opacity-80"
        ),
        // Destructive: Error/Delete actions
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        // Outline: Bordered transparent
        outline:
          "border border-border-default bg-transparent text-foreground hover:bg-surface-overlay",
        // Ghost: No background until hover
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
        // Link: Text only with underline
        link: "text-primary underline-offset-4 hover:underline",
      },
```

Note the `secondary` variant no longer hardcodes `text-white`/`dark:text-white` — it now uses theme-aware text colors from the new tokens, which is also required for Task 2's dark mode to render it correctly (the old hardcoded white text only worked because the app was dark-only before).

- [ ] **Step 2: Verify contrast**

The new `secondary` variant: light mode is `--primary-700` (`#c1552c`) text on `--primary-50` (`#fff3ec`) background — compute the ratio:

```bash
node -e "
function lum(hex) {
  const c = hex.match(/\w\w/g).map(x => parseInt(x,16)/255).map(v => v<=0.03928 ? v/12.92 : ((v+0.055)/1.055)**2.4);
  return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2];
}
function ratio(a,b) { const [l1,l2]=[lum(a),lum(b)].sort((x,y)=>y-x); return (l1+0.05)/(l2+0.05); }
console.log('secondary light:', ratio('c1552c','fff3ec').toFixed(2));
"
```
Expected: printed ratio ≥ 4.5 (this pairing is roughly 5.8:1 — comfortably passes WCAG AA for normal text, let alone the bold text the original failure involved).

- [ ] **Step 3: Verify build**

```bash
cd packages/web && npm run type-check
```
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add packages/web/components/ui/button.tsx
git commit -m "fix(web): rewrite Button on coral tokens, fix secondary-variant WCAG contrast failure"
```

---

## Task 6: Sweep remaining hardcoded blue/purple references

**Files:**
- Modify: `packages/web/app/page.tsx`
- Modify: `packages/web/components/layout/Header.tsx`
- Modify: `packages/web/components/auth/LoginScreen.tsx`
- Modify: `packages/web/app/request-access/page.tsx`
- Modify: `packages/web/app/campaigns/create/page.tsx`
- Modify: `packages/web/components/campaigns/CampaignCard.tsx`
- Modify: `packages/web/components/ui/form/FormFields.tsx`
- Modify: `packages/web/components/ui/Avatar.tsx`

**Interfaces:**
- Consumes: `--primary`, `--primary-*` from Task 1.
- Produces: none new — visual-only changes, no signature changes.

Every occurrence below was found via a repo-wide grep for `color-purple|soft-purple|purple-500|purple-400|purple-300|purple-700|purple-900|primary-800|rgba(69, ?12, ?240|#450cf0` across `packages/web/**/*.tsx` during planning. This task is the complete list — nothing else in the app references the retired blue/purple tokens.

- [ ] **Step 1: `app/page.tsx` (landing wordmark)** — superseded by Task 13's full landing rebuild; skip here to avoid double-editing the same lines twice in one plan. **Do not edit this file in this task.**

- [ ] **Step 2: `Header.tsx` wordmark gradient**

Replace:
```tsx
              <span className="bg-[linear-gradient(90deg,var(--color-primary)_0%,var(--color-purple-500)_50%,var(--color-soft-purple-500)_100%)] bg-clip-text text-transparent">
```
with:
```tsx
              <span className="bg-[linear-gradient(90deg,var(--color-primary)_0%,var(--color-primary-600)_100%)] bg-clip-text text-transparent">
```

- [ ] **Step 3: `LoginScreen.tsx` wordmark gradient**

Same replacement as Step 2, applied to the identical line in `packages/web/components/auth/LoginScreen.tsx`.

- [ ] **Step 4: `request-access/page.tsx` icon circle**

Replace:
```tsx
        <div
          aria-hidden="true"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(69,12,240,0.12)] text-purple-400"
        >
```
with:
```tsx
        <div
          aria-hidden="true"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary-100)] text-[var(--color-primary-600)] dark:bg-[color-mix(in_srgb,var(--color-primary-900)_50%,transparent)] dark:text-[var(--color-primary-200)]"
        >
```

- [ ] **Step 5: `campaigns/create/page.tsx` step indicator + focus rings**

Replace:
```tsx
                  active &&
                    "bg-[linear-gradient(90deg,var(--color-primary)_0%,var(--color-purple-500)_100%)] text-white",
```
with:
```tsx
                  active &&
                    "bg-[linear-gradient(90deg,var(--color-primary)_0%,var(--color-primary-600)_100%)] text-white",
```

Replace both occurrences of `focus:ring-2 focus:ring-purple-500/50 focus:ring-opacity-50 transition-all` and `focus:ring-2 focus:ring-purple-500/50 transition-all` (goal-USD input and deadline input) with `focus:ring-2 focus:ring-primary/50 transition-all`.

- [ ] **Step 6: `CampaignCard.tsx` `MediaPlaceholder` gradient**

Replace:
```tsx
        "bg-[linear-gradient(135deg,var(--primary-800)_0%,var(--purple-700)_55%,var(--soft-purple-700)_100%)]",
```
with:
```tsx
        "bg-[linear-gradient(135deg,var(--primary-800)_0%,var(--primary-600)_55%,var(--brave-amber)_100%)]",
```

- [ ] **Step 7: `FormFields.tsx` focus rings**

Replace all three occurrences of `focus:ring-purple-500` / `focus-within:ring-purple-500` (in `SelectField`, `InputField`, `TextAreaField`) with `focus:ring-primary` / `focus-within:ring-primary` respectively. Also in `InputField`'s GSAP `handleFocus`:

Replace:
```tsx
        boxShadow: "0 0 0 2px rgba(139, 92, 246, 0.5)",
```
with:
```tsx
        boxShadow: "0 0 0 2px rgba(255, 138, 92, 0.5)",
```

- [ ] **Step 8: `Avatar.tsx` gradient border**

Replace:
```tsx
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-500 to-soft-purple-500 p-[2px]">
```
with:
```tsx
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-500 to-brave-amber p-[2px]">
```

- [ ] **Step 9: Verify**

```bash
cd packages/web && npm run type-check && npm run build
```
Expected: both pass — this is the first build where every `--color-purple*`/`--color-soft-purple*` reference in the codebase (except the landing page, deferred to Task 13) has been swept, so the app should render with a fully consistent coral identity everywhere except the landing hero.

- [ ] **Step 10: Commit**

```bash
git add packages/web/components/layout/Header.tsx packages/web/components/auth/LoginScreen.tsx packages/web/app/request-access/page.tsx packages/web/app/campaigns/create/page.tsx packages/web/components/campaigns/CampaignCard.tsx packages/web/components/ui/form/FormFields.tsx packages/web/components/ui/Avatar.tsx
git commit -m "fix(web): sweep remaining hardcoded blue/purple references onto coral tokens"
```

---

## Task 7: Fix `/request-access` unconditional messaging bug

**Files:**
- Modify: `packages/web/app/request-access/page.tsx`

**Interfaces:**
- Consumes: `useAuth()` → `status: AuthStatus` (`"loading" | "unauthenticated" | "not_whitelisted" | "error" | "authenticated"`, from `packages/web/hooks/useAuth.ts`).

Currently the page renders "You are on the list" unconditionally for anyone who lands on the route, including an anonymous visitor who was never logged in. It should only show that message when `status === "not_whitelisted"`; redirect unauthenticated visitors to login instead.

- [ ] **Step 1: Add status-based branching**

Replace the component body in `packages/web/app/request-access/page.tsx`:

```tsx
export default function RequestAccessPage() {
  const router = useRouter();
  const { status, privyEmail, logout } = useAuth();
  const [switching, setSwitching] = useState(false);

  // If they got whitelisted since (or land here by mistake), move them on.
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);
```

with:

```tsx
export default function RequestAccessPage() {
  const router = useRouter();
  const { status, privyEmail, logout } = useAuth();
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      // Got whitelisted since, or landed here by mistake — move them on.
      router.replace("/dashboard");
    } else if (status === "unauthenticated") {
      // Never logged in at all — this page has nothing to say to them.
      router.replace("/auth/login");
    }
  }, [status, router]);

  if (status === "loading" || status === "unauthenticated" || status === "authenticated") {
    return (
      <main
        id="main-content"
        className="flex min-h-[calc(100vh-4rem)] items-center justify-center"
        role="status"
        aria-label="Loading"
      >
        <Spinner size="lg" color="primary" />
      </main>
    );
  }
```

Add the `Spinner` import at the top:

```tsx
import { Clock } from "@/components/ui/icons";
```
becomes:
```tsx
import { Clock } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/Spinner";
```

The rest of the component (the `return (<main>... You are on the list ...</main>)` JSX) now only ever renders when `status === "not_whitelisted"` or `status === "error"` (an "error" status falling through to the whitelist copy is acceptable — the alternative, a dedicated third message, is out of scope for this bug fix).

- [ ] **Step 2: Verify**

Manually test three states with the dev server running:
1. Open `/request-access` in an incognito window (never logged in) → should redirect to `/auth/login` within a render cycle, not show "You are on the list".
2. Log in with an email NOT in the `WhitelistEntry` table → should land on `/request-access` and show "You are on the list".
3. Log in with a whitelisted email → should redirect straight to `/dashboard`, never flashing the request-access copy.

```bash
cd packages/web && npm run type-check
```
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add packages/web/app/request-access/page.tsx
git commit -m "fix(web): stop showing whitelist-pending message to never-authenticated visitors"
```

---

## Task 8: Fix the auth-gating spinner hang

**Files:**
- Modify: `packages/web/components/auth/AuthGuard.tsx`

**Interfaces:**
- Produces: `AuthGuard` gains an internal loading-timeout fallback; public props (`children`, `requireOnboarded`) unchanged.

The live audit found `/campaigns/create` hangs on an infinite spinner at 375px viewport while it redirects cleanly at 1440px, for the identical unauthenticated state. `AuthGuard`'s redirect `useEffect` has no viewport-dependent logic at all — the divergence is almost certainly Privy's SDK taking longer (or failing silently) to reach `ready: true` under certain viewport/user-agent conditions, which is outside this app's control. Regardless of the exact upstream cause, an indefinite spinner with no escape hatch is a real UX dead-end for any user it happens to. Add a timeout so the guard degrades to an actionable retry state instead of hanging forever.

- [ ] **Step 1: Add a timeout fallback**

Replace `packages/web/components/auth/AuthGuard.tsx`:

```tsx
"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/Spinner";

interface AuthGuardProps {
  children: ReactNode;
  /** When true, users without a username are redirected to /onboarding. */
  requireOnboarded?: boolean;
}

/**
 * Client-side guard for authed pages.
 *
 * - unauthenticated  → /auth/login
 * - not_whitelisted  → /request-access
 * - needsOnboarding  → /onboarding (only when requireOnboarded)
 * - error            → inline retry state
 */
export function AuthGuard({
  children,
  requireOnboarded = false,
}: AuthGuardProps) {
  const router = useRouter();
  const { status, needsOnboarding, refetch } = useAuth();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/login");
    } else if (status === "not_whitelisted") {
      router.replace("/request-access");
    } else if (
      status === "authenticated" &&
      requireOnboarded &&
      needsOnboarding
    ) {
      router.replace("/onboarding");
    }
  }, [status, needsOnboarding, requireOnboarded, router]);

  if (status === "error") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="max-w-sm text-text-secondary">
          We could not load your account. The API may be unavailable or still
          starting up.
        </p>
        <Button variant="outline" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (status !== "authenticated" || (requireOnboarded && needsOnboarding)) {
    return (
      <div
        className="flex min-h-[60vh] items-center justify-center"
        role="status"
        aria-label="Loading your account"
      >
        <Spinner size="lg" color="primary" />
      </div>
    );
  }

  return <>{children}</>;
}

export default AuthGuard;
```

with:

```tsx
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/Spinner";

interface AuthGuardProps {
  children: ReactNode;
  /** When true, users without a username are redirected to /onboarding. */
  requireOnboarded?: boolean;
}

/** How long the guard waits in the loading state before offering a manual retry. */
const LOADING_TIMEOUT_MS = 12_000;

/**
 * Client-side guard for authed pages.
 *
 * - unauthenticated  → /auth/login
 * - not_whitelisted  → /request-access
 * - needsOnboarding  → /onboarding (only when requireOnboarded)
 * - error            → inline retry state
 * - stuck loading    → inline retry state after LOADING_TIMEOUT_MS (Privy init
 *   can hang under some viewport/network conditions — never spin forever)
 */
export function AuthGuard({
  children,
  requireOnboarded = false,
}: AuthGuardProps) {
  const router = useRouter();
  const { status, needsOnboarding, refetch } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/login");
    } else if (status === "not_whitelisted") {
      router.replace("/request-access");
    } else if (
      status === "authenticated" &&
      requireOnboarded &&
      needsOnboarding
    ) {
      router.replace("/onboarding");
    }
  }, [status, needsOnboarding, requireOnboarded, router]);

  const isLoading =
    status !== "authenticated" && status !== "error"
      ? status === "unauthenticated" || status === "not_whitelisted"
        ? false // a redirect is already in flight, don't show the timeout UI
        : true
      : requireOnboarded && needsOnboarding;

  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setTimedOut(true), LOADING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isLoading]);

  if (status === "error" || (isLoading && timedOut)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="max-w-sm text-text-secondary">
          {status === "error"
            ? "We could not load your account. The API may be unavailable or still starting up."
            : "This is taking longer than expected to load."}
        </p>
        <Button variant="outline" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className="flex min-h-[60vh] items-center justify-center"
        role="status"
        aria-label="Loading your account"
      >
        <Spinner size="lg" color="primary" />
      </div>
    );
  }

  return <>{children}</>;
}

export default AuthGuard;
```

- [ ] **Step 2: Verify**

```bash
cd packages/web && npm run type-check
```
Expected: passes.

Manually: throttle the network in devtools (or use a mobile device emulation matching the audit's 375px case) and confirm that if `status` stays non-terminal for 12+ seconds, the spinner is replaced by a "This is taking longer than expected" message with a working "Try again" button, instead of spinning forever.

- [ ] **Step 3: Commit**

```bash
git add packages/web/components/auth/AuthGuard.tsx
git commit -m "fix(web): add loading-timeout fallback to AuthGuard so it never spins forever"
```

---

## Task 9: Styled 404 for campaign routes

**Files:**
- Create: `packages/web/app/not-found.tsx`
- Create: `packages/web/app/campaigns/[slug]/not-found.tsx`

**Interfaces:**
- Produces: two Next.js special-file route components, no props (per Next.js App Router `not-found.tsx` convention). `campaigns/[slug]/page.tsx` already calls `notFound()` from `next/navigation` on a missing campaign — these files are what Next.js renders instead of its built-in default 404 once they exist.

- [ ] **Step 1: Create the campaign-specific 404**

Create `packages/web/app/campaigns/[slug]/not-found.tsx`:

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Compass } from "@/components/ui/icons";

export default function CampaignNotFound() {
  return (
    <main
      id="main-content"
      className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-6 px-4 text-center"
    >
      <div
        aria-hidden="true"
        className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary-100)] text-[var(--color-primary-600)] dark:bg-[color-mix(in_srgb,var(--color-primary-900)_50%,transparent)] dark:text-[var(--color-primary-200)]"
      >
        <Compass size={30} />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Campaign not found
        </h1>
        <p className="max-w-md text-text-secondary">
          This campaign may have been unpublished, or the link is incorrect.
        </p>
      </div>
      <Button asChild>
        <Link href="/campaigns">Browse campaigns</Link>
      </Button>
    </main>
  );
}
```

Check `packages/web/components/ui/icons` exports a `Compass` icon (it's built from `lucide-react` re-exports per the existing icon barrel pattern used throughout `CampaignCard.tsx`/`Header.tsx`). If `Compass` isn't already exported, add it following the same pattern as the existing `Clock`/`Grid3X3` exports in that file (import from `lucide-react`, re-export by name) rather than introducing a new icon system.

- [ ] **Step 2: Create the global 404**

Create `packages/web/app/not-found.tsx`:

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Compass } from "@/components/ui/icons";

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-6 px-4 text-center"
    >
      <div
        aria-hidden="true"
        className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary-100)] text-[var(--color-primary-600)] dark:bg-[color-mix(in_srgb,var(--color-primary-900)_50%,transparent)] dark:text-[var(--color-primary-200)]"
      >
        <Compass size={30} />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Page not found
        </h1>
        <p className="max-w-md text-text-secondary">
          The page you're looking for doesn't exist or has moved.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Back to home</Link>
      </Button>
    </main>
  );
}
```

- [ ] **Step 3: Verify**

```bash
cd packages/web && npm run type-check && npm run build
```
Expected: both pass.

With the dev server running, visit `/campaigns/this-slug-does-not-exist` → should render the styled "Campaign not found" page, not Next.js's raw default 404. Visit `/some-random-path` → should render the styled global "Page not found".

- [ ] **Step 4: Commit**

```bash
git add packages/web/app/not-found.tsx "packages/web/app/campaigns/[slug]/not-found.tsx"
git commit -m "feat(web): add styled 404 pages for missing campaigns and unknown routes"
```

---

## Task 10: Mobile polish — category-rail scroll affordance, header button label

**Files:**
- Modify: `packages/web/app/campaigns/page.tsx`
- Modify: `packages/web/components/layout/Header.tsx`

**Interfaces:** none — visual-only.

- [ ] **Step 1: Find the mobile category chip rail**

In `packages/web/app/campaigns/page.tsx`, locate the mobile category-filter horizontal scroller (a `<div>` with `overflow-x-auto` wrapping the category chip buttons, rendered below the `md:` breakpoint — search for the sibling of `CategorySidebar` that renders on small screens). Wrap it with edge-fade masking:

Find the scroll container's `className` (it will include something like `flex gap-2 overflow-x-auto` plus `scrollbar-hidden` or similar) and add `[mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-32px),transparent)]` to its class list — this fades both edges so a partially-visible next chip signals "more content here" without needing an explicit arrow icon. Wrap the scroll container in a `relative` parent if it isn't already one (needed for the mask to render correctly against the rail's own background, not the page background).

- [ ] **Step 2: Fix the heading consistency issue flagged by the audit**

Also in `packages/web/app/campaigns/page.tsx`, find the page's `<h1>` (per the audit: `text-3xl font-bold text-foreground` with no `font-display` class). After Task 3 (which makes `font-display` the *default* for all `h1`–`h6`), this element already inherits the branded font automatically — **no change needed here**; this step is just a verification checkpoint, not an edit. Confirm it visually once Task 3 has landed.

- [ ] **Step 3: Give the mobile "Start a campaign" button a real label**

In `packages/web/components/layout/Header.tsx`, replace:

```tsx
              <Plus size={16} aria-hidden="true" />
              <span className="hidden sm:inline">Start a campaign</span>
```

with:

```tsx
              <Plus size={16} aria-hidden="true" />
              <span className="hidden sm:inline">Start a campaign</span>
              <span className="sm:hidden">Start</span>
```

This keeps the full label on larger screens and a short, still-visible (not icon-only) label on mobile, rather than relying solely on `aria-label` for sighted mobile users.

- [ ] **Step 4: Verify**

With the dev server running at a 375px viewport: `/campaigns` category rail shows a soft fade at both edges when chips overflow; the header's campaign-creation button shows the word "Start" next to the "+" icon instead of being icon-only.

```bash
cd packages/web && npm run type-check
```
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add packages/web/app/campaigns/page.tsx packages/web/components/layout/Header.tsx
git commit -m "fix(web): add mobile category-rail scroll affordance and visible header CTA label"
```

---

## Task 11: Rebuild the landing page

**Files:**
- Modify: `packages/web/app/page.tsx`

**Interfaces:**
- Consumes: `useCampaignsList` hook from `packages/web/hooks/useCampaigns.ts` (already used by `app/campaigns/page.tsx` — same signature, called here with a small page size for a "featured" strip), `CampaignCard`/`CampaignCardSkeleton` from `packages/web/components/campaigns/CampaignCard.tsx`, `CATEGORIES` from `packages/web/lib/campaigns.ts`.

Replaces the current one-block placeholder with hero + how-it-works + featured campaigns + trust/stats + closing CTA.

- [ ] **Step 1: Rebuild `app/page.tsx`**

Replace the entire file:

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center"
    >
      {/* Wordmark */}
      <h1 className="font-display text-5xl font-bold tracking-tight sm:text-7xl">
        <span className="bg-[linear-gradient(90deg,var(--color-primary)_0%,var(--color-purple-500)_50%,var(--color-soft-purple-500)_100%)] bg-clip-text text-transparent">
          FundBrave
        </span>
      </h1>

      {/* Tagline */}
      <p className="max-w-md text-lg text-text-secondary">
        Borderless fundraising, powered by crypto and owned by communities.
      </p>

      {/* Primary CTA */}
      <Button asChild size="lg">
        <Link href="/campaigns">Explore campaigns</Link>
      </Button>
    </main>
  );
}
```

with:

```tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCampaignsList } from "@/hooks/useCampaigns";
import {
  CampaignCard,
  CampaignCardSkeleton,
} from "@/components/campaigns/CampaignCard";
import { CATEGORIES } from "@/lib/campaigns";
import { CATEGORY_ICONS } from "@/components/campaigns/CampaignCard";
import { ArrowRight, Wallet, Rocket, ShieldCheck } from "@/components/ui/icons";

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
    icon: ShieldCheck,
    title: "Funds released with you in the loop",
    body: "Withdrawals require your signature plus platform co-approval — no single party can move donated funds alone.",
  },
] as const;

function FeaturedCampaigns() {
  const { data, isLoading } = useCampaignsList({
    page: 1,
    pageSize: 3,
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
```

Check the exact shape `useCampaignsList` returns before wiring `FeaturedCampaigns` — `app/campaigns/page.tsx` is the reference implementation; match its `data.items` / pagination field names exactly (read that file's usage of the hook if the field names above don't match what it actually returns, and adjust `FeaturedCampaigns` to match — do not guess a shape that differs from the working reference).

- [ ] **Step 2: Verify**

```bash
cd packages/web && npm run type-check && npm run build
```
Expected: both pass.

With the dev server running and at least one published campaign in the database (Task 12 provides seed data — if running this task before Task 12, verify the "no campaigns yet" empty state renders correctly instead), visually confirm: hero, three-step how-it-works, featured campaigns grid (or empty state), category grid, closing CTA band all render at both 1440px and 375px with no overflow or broken layout.

- [ ] **Step 3: Commit**

```bash
git add packages/web/app/page.tsx
git commit -m "feat(web): rebuild landing page with hero, how-it-works, featured campaigns, and category grid"
```

---

## Task 12: Seed realistic demo campaigns

**Files:**
- Create: `packages/api/prisma/seed-mvp.ts`
- Modify: `packages/api/package.json`

**Interfaces:**
- Consumes: existing Prisma schema (`Campaign`, `CampaignMedia`, `User` models per `packages/api/prisma/schema.prisma`, as described in `docs/MVP_PLAN.md` §5).
- Produces: a runnable `npm run seed --workspace=api` script. No application code changes.

Without this, the real product surface (cards, detail pages, dashboard) can't be visually verified — every prior screenshot audit only saw empty/404 states.

- [ ] **Step 1: Confirm the exact Prisma field names before writing the script**

Read `packages/api/prisma/schema.prisma`'s `Campaign`, `CampaignMedia`, and `User` models directly (do not rely on the field names summarized in `docs/MVP_PLAN.md` §5 — that section predates the actual implementation and may have drifted). Use the real field names/types from that file when writing Step 2.

- [ ] **Step 2: Write the seed script**

Create `packages/api/prisma/seed-mvp.ts` using the confirmed field names from Step 1. The script must:
- Upsert (not blindly insert, so it's safe to re-run) one demo `User` with `role: ADMIN` if one doesn't already exist matching the admin email already configured for local testing (reuse the same email documented in `docs/FIRST_RUN.md` §6 — do not invent a new admin identity).
- Create 6–8 `Campaign` rows spanning at least 5 different categories from `CATEGORIES` in `packages/web/lib/campaigns.ts` (education, health, disaster-relief, community, environment, animals, arts, technology, sports, other), with realistic titles/descriptions, `status: ACTIVE`, varied `goalUsd`/`raisedUsd` (include at least one near-fully-funded and one just-started, so the progress bar renders differently across cards), at least one with a `deadline` in the future and one with none.
- Attach 2–4 `CampaignMedia` rows of `type: IMAGE` per campaign, using `https://images.unsplash.com/...` URLs (already an allowed image host per `isNextImageHost` in `packages/web/components/campaigns/CampaignCard.tsx`) — pick real, working Unsplash photo URLs relevant to each category (e.g. a classroom photo for education, a clinic for health).
- Log a summary line per created campaign (title + slug) so a human running it can immediately visit `/campaigns/<slug>`.

- [ ] **Step 3: Add the npm script**

In `packages/api/package.json`, add to `"scripts"`:
```json
    "seed": "tsx prisma/seed-mvp.ts",
```
Check whether `tsx` is already a dependency (it likely is, given the existing `mvp:migrate`/`start:dev` scripts use a TS runner) — if not, add `tsx` as a devDependency instead of introducing a different runner, to stay consistent with how the rest of the `api` package runs TypeScript scripts.

- [ ] **Step 4: Verify**

```bash
npm run seed --workspace=api
```
Expected: script completes, prints 6–8 campaign title/slug lines. Then with both `npm run mvp:api` and `npm run mvp:web` running, visit `http://localhost:3000/campaigns` and confirm real cards render (not the empty state), and click into at least one campaign detail page to confirm it renders with real media instead of the placeholder gradient.

- [ ] **Step 5: Commit**

```bash
git add packages/api/prisma/seed-mvp.ts packages/api/package.json
git commit -m "feat(api): add MVP demo-campaign seed script for local design verification"
```

---

## Task 13: Final verification pass

**Files:** none modified — this task only runs checks.

- [ ] **Step 1: Full build/type-check**

```bash
cd packages/web && npm run type-check && npm run build
cd ../api && npm run build
```
Expected: all pass with zero errors.

- [ ] **Step 2: Re-run the live screenshot audit**

Dispatch a `ui-ux-reviewer` agent (same brief structure as the original audit that informed this plan) against the running app, covering the same routes as before — `/`, `/campaigns`, `/campaigns/[slug]` (now with real seeded data), `/auth/login`, `/onboarding`, `/request-access`, `/campaigns/create` — at 1440px and 375px, **in both light and dark mode this time** (Task 2 makes dark mode real). Confirm specifically:
- No page shows both coral/amber and blue/purple in the same view.
- Headings render in the Bricolage Grotesque display font, not fallback sans, on every page.
- The ghost/secondary button contrast issue is gone (spot-check against the Task 5 computed ratio).
- `/request-access` no longer shows stale messaging to an anonymous visitor.
- `/campaigns/create` on mobile either redirects promptly or shows the new timeout/retry UI within ~12s — never an indefinite spinner.
- `/campaigns/some-invalid-slug` shows the styled not-found page.
- Landing page has real content, not one centered block on blank white.
- Dark mode toggle works and every surface/border/text pairing is legible (no invisible-card-on-background repeat of the original bug).

- [ ] **Step 3: Code review gate**

Per this repo's standing conventions (`code-review.md`), run the `code-reviewer` and `typescript-reviewer` agents over the full diff (`git diff main...HEAD -- packages/web packages/api/prisma/seed-mvp.ts packages/api/package.json`) before considering this initiative done. Address any CRITICAL/HIGH findings before merging; MEDIUM/LOW are discretionary per the same convention.

- [ ] **Step 4: Update the design spec status**

In `docs/superpowers/specs/2026-07-26-web-mvp-redesign-design.md`, change the `**Status:**` line from `Approved for planning` to `Implemented`.

```bash
git add docs/superpowers/specs/2026-07-26-web-mvp-redesign-design.md
git commit -m "docs: mark web MVP redesign spec as implemented"
```
