-- Three separate campuses. Existing (test) data is assigned to the Boys campus; the temporary
-- default is dropped immediately so every new row must name its campus explicitly.

-- CreateTable
CREATE TABLE "campuses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campuses_pkey" PRIMARY KEY ("id")
);

INSERT INTO "campuses" ("id", "name", "code") VALUES
  ('campus_boys',  'Al-Abbas Boys Higher Secondary School Shah Jamal',  'boys'),
  ('campus_girls', 'Al-Abbas Girls Higher Secondary School Shah Jamal', 'girls'),
  ('campus_kids',  'Al-Abbas Kids Grammar Public School',               'kids');

-- Tag every existing row with the Boys campus
ALTER TABLE "expenses" ADD COLUMN "campusId" TEXT NOT NULL DEFAULT 'campus_boys';
ALTER TABLE "expenses" ALTER COLUMN "campusId" DROP DEFAULT;
ALTER TABLE "fee_payments" ADD COLUMN "campusId" TEXT NOT NULL DEFAULT 'campus_boys';
ALTER TABLE "fee_payments" ALTER COLUMN "campusId" DROP DEFAULT;
ALTER TABLE "students" ADD COLUMN "campusId" TEXT NOT NULL DEFAULT 'campus_boys';
ALTER TABLE "students" ALTER COLUMN "campusId" DROP DEFAULT;
ALTER TABLE "submissions" ADD COLUMN "campusId" TEXT NOT NULL DEFAULT 'campus_boys';
ALTER TABLE "submissions" ALTER COLUMN "campusId" DROP DEFAULT;
ALTER TABLE "users" ADD COLUMN "campusId" TEXT NOT NULL DEFAULT 'campus_boys';
ALTER TABLE "users" ALTER COLUMN "campusId" DROP DEFAULT;

-- CreateEnum
CREATE TYPE "ChargeKind" AS ENUM ('PAPER_FUND');

-- AlterEnum
ALTER TYPE "FeeType" ADD VALUE 'PAPER_FUND';

-- CreateTable
CREATE TABLE "monthly_charges" (
    "id" TEXT NOT NULL,
    "kind" "ChargeKind" NOT NULL DEFAULT 'PAPER_FUND',
    "forMonth" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "campusId" TEXT NOT NULL,
    "setById" TEXT NOT NULL,

    CONSTRAINT "monthly_charges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "campuses_name_key" ON "campuses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "campuses_code_key" ON "campuses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_charges_campusId_kind_forMonth_key" ON "monthly_charges"("campusId", "kind", "forMonth");

-- CreateIndex
CREATE INDEX "expenses_campusId_status_expenseDate_idx" ON "expenses"("campusId", "status", "expenseDate");

-- CreateIndex
CREATE INDEX "fee_payments_campusId_paymentDate_idx" ON "fee_payments"("campusId", "paymentDate");

-- CreateIndex
CREATE INDEX "students_campusId_status_idx" ON "students"("campusId", "status");

-- CreateIndex
CREATE INDEX "submissions_campusId_status_idx" ON "submissions"("campusId", "status");

-- CreateIndex
CREATE INDEX "users_campusId_role_idx" ON "users"("campusId", "role");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_charges" ADD CONSTRAINT "monthly_charges_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_charges" ADD CONSTRAINT "monthly_charges_setById_fkey" FOREIGN KEY ("setById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
