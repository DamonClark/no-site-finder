-- AlterTable
ALTER TABLE "SearchEvent" ADD COLUMN     "escalated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "opportunityCount" INTEGER NOT NULL DEFAULT 0;
