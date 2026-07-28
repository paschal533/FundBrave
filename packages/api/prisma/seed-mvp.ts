/**
 * MVP demo-campaign seed script.
 *
 * Without seed data, /campaigns and /campaigns/<slug> only ever render
 * empty/404 states, so the real product surface (cards, progress bars,
 * detail pages) can't be visually verified. This script fixes that by
 * upserting one ADMIN user and a handful of realistic ACTIVE campaigns
 * with cover images.
 *
 * Idempotent — safe to re-run:
 *  - The admin user is upserted by `email` (the unique key), reusing the
 *    same identity documented in docs/FIRST_RUN.md §6 rather than
 *    inventing a new one. If that user already exists (e.g. from a real
 *    Privy login), its privyDid/walletAddress are left untouched.
 *  - Each campaign is upserted by its unique `slug`.
 *  - `safeAddress`/`safeSalt` are derived deterministically from the slug
 *    (not from the real Safe CREATE2 prediction flow — these campaigns
 *    are never published through the normal flow) so they stay stable
 *    across re-runs instead of violating the `safeAddress` unique
 *    constraint.
 *  - Each campaign's media rows are replaced (delete + recreate) on every
 *    run instead of appended, so re-running never duplicates images.
 *
 * Run: npm run seed --workspace=api
 */
import { createHash } from "node:crypto";
import {
  PrismaClient,
  Role,
  CampaignStatus,
  MediaType,
} from "@prisma/client";

const prisma = new PrismaClient();

/**
 * The admin identity already used for local testing — see
 * docs/FIRST_RUN.md §6. Reused here, not invented, so this script never
 * creates a second admin identity that conflicts with a real login.
 */
const ADMIN_EMAIL = "okwuosahpaschal@gmail.com";

/** Deterministic fake Safe address for a slug — stable across re-runs. */
function fakeSafeAddress(seed: string): string {
  const hash = createHash("sha256").update(`safe-address:${seed}`).digest("hex");
  return `0x${hash.slice(0, 40)}`;
}

/** Deterministic fake CREATE2 salt nonce for a slug — stable across re-runs. */
function fakeSafeSalt(seed: string): string {
  const hash = createHash("sha256").update(`safe-salt:${seed}`).digest("hex");
  return BigInt(`0x${hash.slice(0, 16)}`).toString();
}

/** Deterministic fake wallet address, used for the seeded admin only. */
function fakeWalletAddress(seed: string): string {
  return fakeSafeAddress(`wallet:${seed}`);
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function unsplash(photoId: string): string {
  return `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=1200&q=80`;
}

interface SeedCampaign {
  slug: string;
  title: string;
  description: string;
  category: string;
  goalUsd: string;
  raisedUsd: string;
  deadline: Date | null;
  donorsCount: number;
  mediaPhotoIds: string[];
}

const CAMPAIGNS: SeedCampaign[] = [
  {
    slug: "books-laptops-ilorin-community-school",
    title: "Books & Laptops for Ilorin Community School",
    description:
      "Olorunda Community Primary School in Ilorin serves over 400 children, but the library has fewer than 50 usable textbooks and not a single working computer. This campaign funds a starter set of laptops, a printer, and a full run of primary-level textbooks so every classroom has the basics it needs for the new term. Every donation, big or small, goes straight to procurement, delivered and photographed by our on-the-ground volunteer coordinator.",
    category: "education",
    goalUsd: "8000.00",
    raisedUsd: "7600.00", // near-fully-funded (95%)
    deadline: daysFromNow(21),
    donorsCount: 182,
    mediaPhotoIds: [
      "1523240795612-9a054b0db644",
      "1509062522246-3755977927d7",
      "1580582932707-520aed937b7b",
    ],
  },
  {
    slug: "mobile-clinic-rural-enugu-villages",
    title: "Mobile Clinic for Rural Enugu Villages",
    description:
      "Six villages outside Enugu share one clinic that's a two-hour walk from the farthest homes. We're outfitting a retrofitted van with basic diagnostic equipment, a cold chain fridge for vaccines, and a rotating team of two nurses so care can come to the villages instead of the other way around. Funds cover the van retrofit, six months of fuel and supplies, and staff stipends.",
    category: "health",
    goalUsd: "15000.00",
    raisedUsd: "4200.00", // 28%
    deadline: null, // no deadline
    donorsCount: 67,
    mediaPhotoIds: [
      "1516549655169-df83a0774514",
      "1584982751601-97dcc096659c",
      "1584515933487-779824d29309",
    ],
  },
  {
    slug: "flood-relief-lagos-mainland",
    title: "Flood Relief Fund for Lagos Mainland",
    description:
      "Last week's flooding displaced more than 300 families across Lagos Mainland, many of whom lost bedding, cooking equipment, and clean water access overnight. This fund provides emergency shelter kits, water purification tablets, and hot meals through our partner community kitchen while families wait for the water to recede and begin repairs. We're posting daily distribution updates on the campaign page.",
    category: "disaster-relief",
    goalUsd: "30000.00",
    raisedUsd: "850.00", // just-started (~3%)
    deadline: daysFromNow(10), // urgent
    donorsCount: 9,
    mediaPhotoIds: [
      "1547683905-f686c993aae5",
      "1618375569909-3c8616cf7733",
      "1587556930799-8dca6fad6d41",
    ],
  },
  {
    slug: "rebuild-abeokuta-youth-center",
    title: "Rebuild the Abeokuta Youth Center",
    description:
      "The Abeokuta Youth Center's roof collapsed during the last storm season, closing the only free after-school space for over 200 local teenagers. We're rebuilding with a stronger roof, repainting the hall, and replacing the furniture that was damaged. The center runs free tutoring, a small library, and weekend sports leagues, all of it on hold until the building reopens.",
    category: "community",
    goalUsd: "12000.00",
    raisedUsd: "6300.00", // 52.5%
    deadline: daysFromNow(45),
    donorsCount: 94,
    mediaPhotoIds: [
      "1531482615713-2afd69097998",
      "1560252829-804f1aedf1be",
      "1521791136064-7986c2920216",
    ],
  },
  {
    slug: "plant-10000-trees-ogun-state",
    title: "Plant 10,000 Trees Across Ogun State",
    description:
      "Ogun State has lost significant forest cover to logging and land clearing over the past decade. Working with three local farming cooperatives, we're funding seedlings, planting labor, and two years of maintenance for a 10,000-tree reforestation effort focused on native, drought-resistant species. Every $5 plants and maintains one tree through its first growing season.",
    category: "environment",
    goalUsd: "5000.00",
    raisedUsd: "3100.00", // 62%
    deadline: null, // no deadline
    donorsCount: 58,
    mediaPhotoIds: [
      "1497435334941-8c899ee9e8e9",
      "1441974231531-c6227db76b6e",
      "1440342359743-84fcb8c21f21",
    ],
  },
  {
    slug: "shelter-vet-care-abuja-street-dogs",
    title: "Shelter & Vet Care for Abuja Street Dogs",
    description:
      "Our small volunteer-run shelter takes in injured and abandoned dogs from across Abuja, but we've outgrown our current vet budget. This campaign funds vaccinations, spay/neuter surgeries, and basic medical care for the 40+ dogs currently in our care, plus food and bedding until each one finds a home.",
    category: "animals",
    goalUsd: "6000.00",
    raisedUsd: "1500.00", // 25%
    deadline: daysFromNow(60),
    donorsCount: 41,
    mediaPhotoIds: [
      "1543466835-00a7907e9de1",
      "1583512603805-3cc6b41f3edb",
      "1450778869180-41d0601e046e",
    ],
  },
  {
    slug: "coding-bootcamp-laptops-girls-in-tech",
    title: "Laptops for a Girls-in-Tech Coding Bootcamp",
    description:
      "Our 12-week coding bootcamp for young women in Port Harcourt has a waitlist of 60 students but only 15 working laptops. This campaign funds 25 refurbished laptops, a backup internet router, and a small stipend for two volunteer instructors so we can finally clear the waitlist for the next cohort.",
    category: "technology",
    goalUsd: "10000.00",
    raisedUsd: "9700.00", // near-fully-funded (97%), ending soon
    deadline: daysFromNow(5),
    donorsCount: 261,
    mediaPhotoIds: [
      "1518770660439-4636190af475",
      "1519389950473-47ba0277781c",
      "1531297484001-80022131f5a1",
    ],
  },
];

async function seedAdmin() {
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      privyDid: `seed:admin:${ADMIN_EMAIL}`,
      email: ADMIN_EMAIL,
      walletAddress: fakeWalletAddress(ADMIN_EMAIL),
      username: "fundbrave-admin",
      displayName: "FundBrave Admin",
      role: Role.ADMIN,
    },
  });
  console.log(`Admin user ready: ${admin.email} (role=${admin.role})\n`);
  return admin;
}

async function seedCampaign(seed: SeedCampaign, creatorId: string) {
  const safeAddress = fakeSafeAddress(seed.slug);
  const safeSalt = fakeSafeSalt(seed.slug);

  const shared = {
    title: seed.title,
    description: seed.description,
    category: seed.category,
    goalUsd: seed.goalUsd,
    raisedUsd: seed.raisedUsd,
    deadline: seed.deadline,
    status: CampaignStatus.ACTIVE,
    donorsCount: seed.donorsCount,
    safeAddress,
    safeSalt,
  };

  const campaign = await prisma.campaign.upsert({
    where: { slug: seed.slug },
    update: shared,
    create: {
      slug: seed.slug,
      creatorId,
      ...shared,
    },
  });

  // Replace this campaign's media on every run instead of appending, so
  // re-running the script never duplicates images.
  await prisma.campaignMedia.deleteMany({
    where: { campaignId: campaign.id },
  });
  await prisma.campaignMedia.createMany({
    data: seed.mediaPhotoIds.map((photoId, index) => ({
      campaignId: campaign.id,
      type: MediaType.IMAGE,
      url: unsplash(photoId),
      order: index,
    })),
  });

  console.log(`- ${campaign.title}  ->  /campaigns/${campaign.slug}`);
}

async function main() {
  console.log("Seeding FundBrave MVP demo data...\n");

  const admin = await seedAdmin();

  for (const seed of CAMPAIGNS) {
    await seedCampaign(seed, admin.id);
  }

  console.log(`\nDone. Seeded ${CAMPAIGNS.length} campaigns.`);
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
