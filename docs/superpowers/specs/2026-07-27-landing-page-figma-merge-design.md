# FundBrave Landing Page — Figma Design Merge

**Date:** 2026-07-27
**Author:** Claude (with paschal533)
**Status:** Implemented
**Related:** `docs/superpowers/specs/2026-07-26-web-mvp-redesign-design.md`, Figma file `FundBrave/Logos` (frame "Onboarding", node 467:6)

## 1. Problem

The team's UI/UX designer produced a landing page design in Figma (`FundBrave/Logos`, frame "Onboarding") that hasn't been reconciled with the landing page actually shipped in `packages/web/app/page.tsx` (built in the prior MVP redesign, see the related spec above). The two diverge in real, structural ways — not just token-level polish:

- The Figma hero is a full-bleed dark photographic background with an overlapping stats card; the shipped hero is a centered, text-only block on the page background.
- The Figma's donation progress bars use a dark forest green; the shipped design system's success/positive color is a lighter, more vibrant mint (`#4ade80`).
- The Figma's "Discover Causes You Care About" section is a static 3×3 grid with a "Show more" button; the shipped "Campaigns making progress" section shows only 3 live campaigns with a "View all" link to `/campaigns`.
- The Figma includes a full 4-column footer; the shipped site has no footer at all (a gap independently flagged in the prior redesign's final verification pass).
- The Figma's CTA banner has 3 feature bullets, but all three show identical placeholder copy ("Easy and Streamless" / "Combine to causes quickly") — evidently unfinished in the source design, not intentional repetition.
- The Figma header shows `How it works` / `About` nav links and a search icon; the shipped header has `Campaigns` plus auth/admin controls, no search, no `/about` route.

Exact hex/spacing values could not be extracted from the Figma file — Dev Mode/inspect is gated behind Figma account sign-up in the anonymous session used to review it. This spec works from verified visual/structural review (multiple zoomed screenshots of the live file) plus direct comparison against the current `packages/web` source and design tokens, not exact numeric specs.

## 2. Design direction (decided)

Resolved through brainstorming with the founder:

- **Hero**: full replacement. New full-bleed section with a warm, documentary-style photo background (dark overlay for contrast) and the existing headline/CTA copy laid over it, styled as a **fixed-dark treatment independent of the site's light/dark toggle** — the same pattern already used successfully by the existing closing-CTA gradient band, which already overrides page theme. No stats card in this pass (no backing aggregate-stats API yet; dropped rather than shipped with fake numbers).
- **Progress bar color**: reconciled to the existing `mint` token. No new green token — one consistent success/positive color across the system, at the cost of an exact Figma color match.
- **Causes grid**: the Figma's 3×3 grid and the shipped "Campaigns making progress" section are the same section. Expand from a fixed 3 cards to a paginated grid starting at 9 (`limit: 9`), with a "Show more" button that grows the limit by 9 per click and hides itself once every campaign is shown. Still real, live campaign data via the existing `useCampaignsList` hook — no new API endpoint.
- **CTA banner copy**: the Figma's 3 identical placeholder bullets are replaced with 3 real, distinct value props, consistent with the existing "How it works" section's copy voice (no-seed-phrase wallets, 2-of-2 signed withdrawals, borderless donations).
- **Footer**: new, real component. Matches the Figma's 4-column structure. Links to pages that exist (`/campaigns`, `/campaigns/create`, `/auth/login`) are real links; links with no destination page yet (Privacy Policy, Terms, About) render as plain non-interactive text rather than a broken or fake link. Social icons only appear if real handles are supplied — omitted otherwise, never faked.
- **Header/nav**: out of scope. Left exactly as-is — it was already redesigned and audited in the prior pass (mobile-overlap fix, admin access relocation). This spec covers the landing page body and a new footer only.
- **Hero image**: sourced as a placeholder for implementation (a warm, documentary-style Unsplash photo matching the Figma's tone, same licensing pattern already used for seeded campaign images), behind a single swappable image-URL constant. The founder will supply the real asset to drop in later — this is a bounded, single-point substitution, not an open-ended TODO.

## 3. Scope

### 3.1 In scope

1. **Hero rebuild** (`packages/web/app/page.tsx`) — full-bleed dark photo background (a sourced placeholder photo behind a single swappable image-URL constant, per §2), gradient overlay, existing headline/tagline/CTAs restyled for on-photo contrast (reusing the WCAG-verified solid-coral + translucent-glass button pattern already proven on the closing CTA band).
2. **Causes grid expansion** (`FeaturedCampaigns` in `page.tsx`) — heading copy update, grid grows to 3×N starting at 9, "Show more" pagination via `useCampaignsList`'s existing `limit`/`total` fields, self-hiding button once fully loaded.
3. **CTA banner copy** — replace the existing single-CTA closing section's supporting copy with 3 real feature bullets (new content, existing gradient/contrast treatment unchanged).
4. **New footer component** (`packages/web/components/layout/Footer.tsx`) — 4-column layout, real links only where a destination exists, wired into the shared layout so it renders on every page.
5. **Verification**: `type-check`/`build` staying green, plus a live screenshot audit (light/dark × desktop/mobile) covering the new hero, causes grid, CTA banner, and footer on at least `/` and one other route (to confirm the footer renders correctly site-wide).

### 3.2 Out of scope

- Header/nav changes (search icon, `How it works`/`About` links, or any header restructuring) — explicitly deferred, no backing pages/features exist for them yet.
- Aggregate platform stats card (donor counts, "% towards a cause") — no backing API; would need its own scope if picked up later.
- New pages implied by Figma footer links with no current destination (Privacy Policy, Terms of Service, About, Careers) — these render as plain text, not stubbed out as new routes.
- Any progress-bar color token beyond reconciling to existing `mint`.
- `packages/frontend` (the old full platform) and `packages/api` — untouched. This is a `packages/web` frontend-only initiative; no backend changes.
- Mainnet chain / donation-flow changes — unrelated, tracked separately.

## 4. Sequencing

1. **Footer component** — fully independent of the rest; can be built and verified first.
2. **Hero rebuild** — independent of the causes grid and CTA banner; touches only the hero `<section>` in `page.tsx`.
3. **Causes grid expansion** — independent of the hero; touches only `FeaturedCampaigns` and its surrounding `<section>`.
4. **CTA banner copy** — independent, smallest change (copy only, no layout/token changes).
5. **Verification** — depends on all of the above landing in `page.tsx` and the shared layout.

Steps 1–4 have no dependencies on each other and can be implemented in any order (or in parallel across separate tasks).

## 5. Verification approach

- `npm run type-check` / `npm run build` in `packages/web` stay green after each step.
- Live screenshot audit (light/dark × 1440px/375px) covering `/` (hero, causes grid, CTA banner) and one other route (footer rendering, since it's shared-layout).
- Confirm the causes-grid "Show more" button correctly hides once all campaigns are loaded, using the real seeded dataset.
- Confirm footer links: every rendered `<a>`/`<Link>` resolves to a real route; every plain-text (non-link) item is visually distinct from a link (not styled to look clickable).
- Standard repo code-review gate (`code-reviewer` / `typescript-reviewer`) before considering the work done, per project conventions.
