# FundBrave MVP (`packages/web`) Visual & UX Redesign — Design

**Date:** 2026-07-26
**Author:** Claude (with paschal533)
**Status:** Approved for planning
**Related:** `docs/MVP_PLAN.md`, PR #46

## 1. Problem

`packages/web` is the simplified fundraising MVP built per `docs/MVP_PLAN.md` (whitelisted signup, campaign creation, donations, admin — no staking/DAO/wealth-building). The founder tested it live and found the colors "off" and the UI/UX generally unpolished. A code audit plus a live screenshot audit (desktop 1440px + mobile 375px, every route) turned up a small number of root causes producing most of the surface-level complaints, plus several concrete functional bugs unrelated to color.

### 1.1 Root causes (fix once, fixes everywhere)

1. **Split brand identity.** `packages/web/app/globals.css` was copied verbatim from `packages/frontend` (the full-featured platform) and carries two unreconciled color systems: a blue/purple "brand" system (`--primary: #450cf0`) and a separate warm coral/amber/mint/teal accent system. The shared `Button` component (`components/ui/button.tsx`) — the single most-reused primitive in the app — is hardcoded 100% to the blue/purple gradient, while `CampaignCard`, the dashboard, admin, donate panel, and withdrawals all use the warm palette. Every CTA looks like it belongs to a different product than the page around it.
2. **Broken, inconsistently-applied display font.** `--font-display: "Gilgan"` `@font-face`s to `/fonts/Gilgan.woff2`, which does not exist anywhere in the repo (`public/fonts/` isn't even created in `packages/web` or `packages/frontend`). It's a Figma-only asset with no shippable license. Headings silently fall back to system sans — and inconsistently, since some pages (`/campaigns`) don't apply the `font-display` class at all while others (landing, login) do, producing two different-looking heading treatments that both happen to be the same broken fallback.
3. **Dead CSS bloat.** A full `.dark` theme exists in `globals.css` but is never activated anywhere in the app (no toggle, no code path ever applies `.dark` to any element). Additionally, CSS for features explicitly out of MVP scope per `docs/MVP_PLAN.md` — `.staking-pillar`, `.split-bar` (78/20/2 split), `.bg-yield-gradient`, `.kpi-glow-*`, wealth-building aurora backgrounds — was copied over unused.
4. **"Floating centered card on blank white" is the entire layout language.** Landing (`/`), login, and the request-access screen are each just one centered block with huge dead vertical margins — no page composition, sections, or supporting content. It reads as a set of auth/status screens standing in for the whole product.

### 1.2 Concrete bugs (independent of visual direction, found via live audit)

- Ghost button (`bg-[rgba(69,12,240,0.10)]`-style secondary/ghost treatments) measured contrast ~1.21:1 against its background — fails WCAG AA (needs ≥3:1), text is nearly illegible.
- `/request-access` (`app/request-access/page.tsx`) renders "You are on the list" unconditionally — an anonymous, never-logged-in visitor sees the same message as an authenticated-but-unwhitelisted user. No branch exists for "not authenticated at all."
- `/campaigns/create` diverges by viewport for the identical unauthenticated state: desktop redirects cleanly to `/auth/login`; mobile (375px) hangs on an infinite loading spinner and never redirects (reproduced twice).
- An invalid/nonexistent campaign slug at `/campaigns/[slug]` falls through to Next.js's raw default 404 page — completely unstyled, breaks out of the app's design system.
- The dev database has zero seed campaigns, so the actual product surface (campaign cards, campaign detail, dashboard content) has never been visually evaluated — audits so far only saw empty/404 states.
- Mobile header hides the "Start a campaign" button label below `sm:` breakpoint, leaving a bare icon-only "+" affordance.
- Mobile category filter rail on `/campaigns` is a hard-cut horizontal scroller with no edge/fade affordance indicating more content.

## 2. Design direction (decided)

- **Primary palette**: coral (`#FF8A5C`) becomes `--primary`. Amber is the secondary accent. Mint = success/positive (donation confirmed, active status). Teal = info/links/tertiary. **The blue/purple brand system is retired entirely** — not demoted to a secondary role, removed — since keeping it "for wallet UI only" is exactly how the split-identity problem started.
- **Typography**: replace the broken `Gilgan` reference with a real, license-clean display font self-hosted via `next/font`, applied through one shared typography primitive (e.g. a `Heading` component or a single consistently-used utility) rather than ad hoc per-page opt-in.
- **Dark mode**: implemented for real — a working toggle (e.g. `next-themes`), `.dark` class applied to `<html>`, every token pair audited for contrast in both themes. Light-mode surface/border tokens also get fixed in the process (currently dark-theme leftovers: ~2% lightness difference between `--surface-elevated` and `--background`, `border-white/10` used on white backgrounds).
- **Cleanup**: remove CSS for out-of-scope features (staking/split-bar/yield-gradient/kpi-glow/aurora) not used anywhere in `packages/web`.

## 3. Scope

### 3.1 In scope
1. **Design token foundation** — new color system in `globals.css`, real dark mode wiring, font replacement, dead-CSS removal.
2. **Component sweep** — rewrite `Button` variants on the new palette; sweep every hardcoded color reference (`MediaPlaceholder` gradient, request-access icon circle, badge colors, etc.) onto tokens; unify heading treatment across pages.
3. **Bug fixes** (independent, parallelizable): ghost button contrast, request-access auth-state branching, mobile create-flow spinner hang, custom `not-found.tsx` for campaign routes, mobile category rail scroll affordance, mobile header button label.
4. **Page composition rebuild**: landing page gets a real hero + value-proposition + featured-campaigns + trust-signals composition; login/request-access get proper card framing on the fixed surface tokens.
5. **Seed data**: realistic demo campaigns (varied categories, images, progress states) in the dev DB so cards/detail/dashboard can actually be designed against and verified.
6. **Verification**: re-run the live screenshot audit (before/after, both themes, both breakpoints) plus a targeted accessibility contrast pass.

### 3.2 Out of scope
- Any staking/DAO/wealth-building UI (correctly excluded from the MVP already).
- Backend/API changes — this is a `packages/web` frontend-only initiative. (The request-access bug fix touches only client-side auth-state branching, not the auth API contract.)
- `packages/frontend` (the old full platform) — untouched, not part of this effort.
- New features beyond what `docs/MVP_PLAN.md` already specifies (e.g. no new donation flows, no new admin capabilities).

## 4. Sequencing

1. **Foundation** — tokens, font, dark mode, dead-CSS removal. Everything downstream depends on this.
2. **Component sweep** — `Button` rewrite + hardcoded-color sweep + heading unification. Depends on (1).
3. **Bug fixes** — independent of (1)/(2), can run in parallel with foundation work.
4. **Page composition rebuild** — landing/login/request-access. Depends on (1) and (2) (needs final tokens and button styles in place).
5. **Seed data** — independent, can run any time; needed before (6).
6. **Verification** — re-audit with screenshots (both themes/breakpoints) + accessibility contrast check + `code-reviewer`/`typescript-reviewer` pass. Depends on everything above.

## 5. Verification approach

- Live screenshot re-audit via a browser-driving agent, same routes/breakpoints as the original audit, both light and dark mode this time.
- Contrast check specifically on the previously-failing ghost button and any new color pairings introduced by the palette swap.
- `npm run build` in `packages/web` must stay green throughout.
- Standard repo code-review gate (`code-reviewer` / `typescript-reviewer`) before considering the work done, per project conventions.
