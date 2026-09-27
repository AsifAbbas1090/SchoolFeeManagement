-- Add required free-text class to students.
-- Existing rows get a temporary placeholder so the NOT NULL column can be added safely;
-- the default is then dropped so every new student must be given a real class.
ALTER TABLE "students" ADD COLUMN "className" TEXT NOT NULL DEFAULT 'Unassigned';
ALTER TABLE "students" ALTER COLUMN "className" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "students_className_idx" ON "students"("className");
