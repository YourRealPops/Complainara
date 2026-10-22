-- Multi-branch support (ADDITIVE ONLY — safe against live production data).
--
-- This migration never drops or rewrites existing data. The old
-- organizations.join_code and categories.default_unit_id columns stay in
-- place (still used by the currently-deployed code) and are removed by a
-- later migration, after the multi-branch release is deployed and verified.
--
-- Every backfill is idempotent: re-running the whole file is safe
-- (guarded with NOT EXISTS / IS NULL so already-migrated or since-edited
-- rows are never overwritten).

-- CreateEnum
ALTER TYPE "UserRole" ADD VALUE 'BRANCH_ADMIN';

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "join_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "branches_join_code_key" ON "branches"("join_code");

-- CreateIndex
CREATE INDEX "branches_org_id_idx" ON "branches"("org_id");

-- Backfill: every existing org gets a default "Main" branch, carrying the
-- org's existing join code so already-shared links keep working.
-- Idempotent: skipped when the org already has a Main branch (e.g. created
-- by the new signup flow on a re-run).
INSERT INTO "branches" ("id", "org_id", "name", "join_code")
SELECT gen_random_uuid()::TEXT, o."id", 'Main', o."join_code"
FROM "organizations" o
WHERE NOT EXISTS (
    SELECT 1 FROM "branches" b
    WHERE b."org_id" = o."id" AND b."name" = 'Main'
)
ON CONFLICT ("join_code") DO NOTHING;

-- AlterTable
ALTER TABLE "users" ADD COLUMN "branch_id" TEXT;

-- AlterTable
ALTER TABLE "units" ADD COLUMN "branch_id" TEXT;

-- AlterTable
ALTER TABLE "complaints" ADD COLUMN "branch_id" TEXT,
ADD COLUMN "escalation_level" INTEGER NOT NULL DEFAULT 0;

-- Backfill: existing units belong to their org's Main branch.
-- Idempotent: only fills rows where branch_id is still NULL.
UPDATE "units" u
SET "branch_id" = b."id"
FROM "branches" b
WHERE b."org_id" = u."org_id" AND b."name" = 'Main'
  AND u."branch_id" IS NULL;

-- Backfill: existing complaints belong to their org's Main branch.
UPDATE "complaints" c
SET "branch_id" = b."id"
FROM "branches" b
WHERE b."org_id" = c."org_id" AND b."name" = 'Main'
  AND c."branch_id" IS NULL;

-- Backfill: existing users belong to their org's Main branch, EXCEPT HQ
-- roles (ORG_ADMIN / SUPER_ADMIN), which stay branch-less (NULL).
UPDATE "users" us
SET "branch_id" = b."id"
FROM "branches" b
WHERE b."org_id" = us."org_id" AND b."name" = 'Main'
  AND us."role" NOT IN ('ORG_ADMIN', 'SUPER_ADMIN')
  AND us."branch_id" IS NULL;

-- CreateTable
CREATE TABLE "category_routes" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,

    CONSTRAINT "category_routes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "category_routes_category_id_branch_id_key" ON "category_routes"("category_id", "branch_id");

-- CreateIndex
CREATE INDEX "category_routes_branch_id_idx" ON "category_routes"("branch_id");

-- CreateIndex
CREATE INDEX "category_routes_unit_id_idx" ON "category_routes"("unit_id");

-- Backfill: migrate each category's default unit into a CategoryRoute for
-- its org's Main branch. Idempotent: skips categories that already have a
-- route for the Main branch (and the unique index backstops duplicates).
INSERT INTO "category_routes" ("id", "category_id", "branch_id", "unit_id")
SELECT gen_random_uuid()::TEXT, c."id", b."id", c."default_unit_id"
FROM "categories" c
JOIN "branches" b ON b."org_id" = c."org_id" AND b."name" = 'Main'
WHERE c."default_unit_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "category_routes" r
    WHERE r."category_id" = c."id" AND r."branch_id" = b."id"
  )
ON CONFLICT ("category_id", "branch_id") DO NOTHING;

-- CreateIndex
CREATE INDEX "users_branch_id_idx" ON "users"("branch_id");

-- CreateIndex
CREATE INDEX "units_branch_id_idx" ON "units"("branch_id");

-- CreateIndex
CREATE INDEX "complaints_branch_id_idx" ON "complaints"("branch_id");

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_routes" ADD CONSTRAINT "category_routes_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_routes" ADD CONSTRAINT "category_routes_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_routes" ADD CONSTRAINT "category_routes_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
