-- Written to be replay-safe for the same reason as 0_init: an environment
-- provisioned with `prisma db push` from the current schema already has these
-- objects, and `prisma migrate deploy` would otherwise fail on them.

-- AlterEnum
ALTER TYPE "DonationStatus" ADD VALUE IF NOT EXISTS 'ORPHANED';

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "creatorWallet" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "donations" ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0;

-- Backfill creatorWallet for campaigns published before this column existed.
-- Best-effort: uses the creator's current walletAddress, which is exactly
-- the assumption this migration exists to stop relying on going forward —
-- but for already-published pre-mainnet campaigns there is no other source
-- of truth, and this only affects test data.
UPDATE "campaigns" c
SET "creatorWallet" = u."walletAddress"
FROM "users" u
WHERE c."creatorId" = u.id
  AND c."status" != 'DRAFT'
  AND c."creatorWallet" = '';
