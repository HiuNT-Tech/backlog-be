-- Replace dangling integer `priority_id` (no priorities table) with a global Priority enum.

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- DropIndex
DROP INDEX IF EXISTS "idx_cards_priority_id";

-- AlterTable: add the new enum column
ALTER TABLE "cards" ADD COLUMN "priority" "Priority";

-- Migrate existing data (old DTO allowed 1..3): 1=LOW, 2=MEDIUM, 3=HIGH
UPDATE "cards"
SET "priority" = CASE "priority_id"
    WHEN 1 THEN 'LOW'::"Priority"
    WHEN 2 THEN 'MEDIUM'::"Priority"
    WHEN 3 THEN 'HIGH'::"Priority"
    ELSE NULL
  END
WHERE "priority_id" IS NOT NULL;

-- DropColumn
ALTER TABLE "cards" DROP COLUMN "priority_id";

-- CreateIndex
CREATE INDEX "idx_cards_priority" ON "cards"("priority");
