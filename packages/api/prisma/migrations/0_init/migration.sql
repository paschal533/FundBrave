-- Baseline migration.
--
-- This schema was originally provisioned with `prisma db push`, which creates
-- no migration history, so this file was generated after the fact to give the
-- database a starting point. Every statement is therefore written to be safe to
-- replay against a database that ALREADY has these objects (any environment
-- that was also provisioned via `db push`) — otherwise `prisma migrate deploy`
-- would fail on the very first statement there, and the only way through would
-- be an undocumented manual `prisma migrate resolve --applied 0_init`.
--
-- Postgres has no `IF NOT EXISTS` for `CREATE TYPE` or `ALTER TABLE ... ADD
-- CONSTRAINT`, so those are wrapped in DO blocks that swallow duplicate_object.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "DonationStatus" AS ENUM ('DETECTED', 'CONFIRMED', 'EXCLUDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'EXECUTED', 'REJECTED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "privyDid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "username" TEXT,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "whitelist_entries" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "invitedBy" TEXT,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whitelist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "campaigns" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "goalUsd" DECIMAL(18,2) NOT NULL,
    "raisedUsd" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "deadline" TIMESTAMP(3),
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "safeAddress" TEXT NOT NULL,
    "safeSalt" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "donorsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "campaign_media" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "safe_deployments" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "txHash" TEXT NOT NULL,
    "deployedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "safe_deployments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "donations" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "txHash" TEXT NOT NULL,
    "logIndex" INTEGER NOT NULL DEFAULT -1,
    "tokenAddress" TEXT,
    "tokenSymbol" TEXT NOT NULL,
    "amountRaw" TEXT NOT NULL,
    "amountUsd" DECIMAL(18,2) NOT NULL,
    "priceUsd" DECIMAL(18,8) NOT NULL,
    "donorAddress" TEXT NOT NULL,
    "donorId" TEXT,
    "status" "DonationStatus" NOT NULL DEFAULT 'DETECTED',
    "blockNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "withdrawal_requests" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "tokenAddress" TEXT,
    "amountRaw" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "nonce" INTEGER NOT NULL DEFAULT 0,
    "safeTxHash" TEXT,
    "creatorSignature" TEXT,
    "adminSignature" TEXT,
    "execTxHash" TEXT,
    "deployTxHash" TEXT,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdrawal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "token_prices" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "usd" DECIMAL(18,8) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "chain_sync_states" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "lastBlock" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chain_sync_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_privyDid_key" ON "users"("privyDid");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_walletAddress_key" ON "users"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "whitelist_entries_email_key" ON "whitelist_entries"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "campaigns_slug_key" ON "campaigns"("slug");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "campaigns_safeAddress_key" ON "campaigns"("safeAddress");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "campaigns_status_category_idx" ON "campaigns"("status", "category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "campaigns_creatorId_idx" ON "campaigns"("creatorId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "campaign_media_campaignId_idx" ON "campaign_media"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "safe_deployments_campaignId_chainId_key" ON "safe_deployments"("campaignId", "chainId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "donations_campaignId_status_idx" ON "donations"("campaignId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "donations_donorAddress_idx" ON "donations"("donorAddress");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "donations_chainId_txHash_logIndex_key" ON "donations"("chainId", "txHash", "logIndex");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "withdrawal_requests_campaignId_idx" ON "withdrawal_requests"("campaignId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "withdrawal_requests_status_idx" ON "withdrawal_requests"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "token_prices_symbol_fetchedAt_idx" ON "token_prices"("symbol", "fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "chain_sync_states_chainId_key" ON "chain_sync_states"("chainId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "admin_audit_logs_adminId_idx" ON "admin_audit_logs"("adminId");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "campaign_media" ADD CONSTRAINT "campaign_media_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "safe_deployments" ADD CONSTRAINT "safe_deployments_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "donations" ADD CONSTRAINT "donations_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "donations" ADD CONSTRAINT "donations_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
