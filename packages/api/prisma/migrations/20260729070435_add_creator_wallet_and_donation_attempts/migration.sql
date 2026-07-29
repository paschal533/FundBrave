-- AlterEnum
ALTER TYPE "DonationStatus" ADD VALUE 'ORPHANED';

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "creatorWallet" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "donations" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0;

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
