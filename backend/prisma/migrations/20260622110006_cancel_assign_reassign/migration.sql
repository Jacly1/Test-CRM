-- AlterEnum
ALTER TYPE "LeadStatus" ADD VALUE 'CANCELLED';

-- AlterEnum
ALTER TYPE "SpkFinanceStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "Spk" ADD COLUMN     "assignedFinanceId" TEXT;

-- CreateIndex
CREATE INDEX "Spk_assignedFinanceId_idx" ON "Spk"("assignedFinanceId");

-- AddForeignKey
ALTER TABLE "Spk" ADD CONSTRAINT "Spk_assignedFinanceId_fkey" FOREIGN KEY ("assignedFinanceId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
