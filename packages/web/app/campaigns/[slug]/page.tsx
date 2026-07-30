import type { Metadata } from "next";
import { fetchCampaign } from "@/lib/campaigns";
import { CampaignDetailClient } from "./CampaignDetailClient";

/** Trims a description to a clean sentence/word boundary near maxLen. */
function truncateDescription(text: string, maxLen = 160): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxLen) return collapsed;
  const cut = collapsed.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : maxLen)}…`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    const campaign = await fetchCampaign(slug);
    const description = truncateDescription(campaign.description);
    const image = campaign.media.find((m) => m.type === "IMAGE")?.url;

    return {
      title: campaign.title,
      description,
      alternates: { canonical: `/campaigns/${campaign.slug}` },
      openGraph: {
        type: "website",
        url: `/campaigns/${campaign.slug}`,
        title: campaign.title,
        description,
        images: image ? [{ url: image }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title: campaign.title,
        description,
        images: image ? [image] : undefined,
      },
    };
  } catch {
    // Campaign not found / API unreachable — fall back to generic metadata
    // rather than failing the page; CampaignDetailClient handles the actual
    // not-found / error UI client-side.
    return { title: "Campaign" };
  }
}

export default function CampaignDetailPage() {
  return <CampaignDetailClient />;
}
