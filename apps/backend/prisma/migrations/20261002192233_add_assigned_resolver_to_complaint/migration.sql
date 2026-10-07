-- AlterTable
ALTER TABLE "complaints" ADD COLUMN     "assigned_resolver_id" TEXT;

-- AlterTable
ALTER TABLE "organizations" ALTER COLUMN "join_code" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "complaints_assigned_resolver_id_idx" ON "complaints"("assigned_resolver_id");

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_assigned_resolver_id_fkey" FOREIGN KEY ("assigned_resolver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
