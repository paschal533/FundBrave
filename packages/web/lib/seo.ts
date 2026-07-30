/** Shared SEO constants — reused by layout metadata, OG image, robots.ts, sitemap.ts, and per-campaign metadata. */

export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");

export const SITE_NAME = "FundBrave";

export const SITE_DESCRIPTION =
  "Borderless fundraising, powered by crypto and owned by communities. Create a campaign, raise funds across chains, and withdraw through a transparent 2-of-2 signed wallet.";

export const SITE_TAGLINE =
  "Borderless fundraising, powered by crypto and owned by communities.";
