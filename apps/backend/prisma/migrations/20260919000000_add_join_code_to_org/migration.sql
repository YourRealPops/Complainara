-- AlterTable
ALTER TABLE "organizations" ADD COLUMN "join_code" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "allowed_email_domain" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "organizations_join_code_key" ON "organizations"("join_code");
