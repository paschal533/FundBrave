import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { fetchCampaigns } from "@/lib/campaigns";

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
  { url: `${SITE_URL}/campaigns`, changeFrequency: "hourly", priority: 0.9 },
];

async function fetchAllActiveCampaignSlugs(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  let page = 1;
  const limit = 48;

  // Safety cap: at 48/page this covers 4,800 campaigns, well beyond MVP
  // scale, without risking an unbounded loop if `pages` is ever wrong.
  const MAX_PAGES = 100;

  while (page <= MAX_PAGES) {
    let batch;
    try {
      batch = await fetchCampaigns({ page, limit, sort: "newest" });
    } catch {
      // Sitemap generation shouldn't fail the whole route if the API is
      // briefly unreachable — just stop with whatever was fetched so far.
      break;
    }
    for (const c of batch.items) {
      entries.push({
        url: `${SITE_URL}/campaigns/${c.slug}`,
        lastModified: c.createdAt,
        changeFrequency: "daily",
        priority: 0.7,
      });
    }
    if (page >= batch.pages) break;
    page++;
  }

  return entries;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const campaignEntries = await fetchAllActiveCampaignSlugs();
  return [...STATIC_ROUTES, ...campaignEntries];
}
