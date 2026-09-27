-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "status" "ExpenseStatus" NOT NULL DEFAULT 'APPROVED';

-- CreateIndex
CREATE INDEX "expenses_status_idx" ON "expenses"("status");

-- CreateIndex
CREATE INDEX "expenses_addedById_status_idx" ON "expenses"("addedById", "status");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
