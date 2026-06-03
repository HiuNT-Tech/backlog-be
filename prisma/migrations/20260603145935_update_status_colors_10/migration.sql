/*
  Warnings:

  - The values [GRAY,PURPLE] on the enum `StatusColor` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "StatusColor_new" AS ENUM ('RED', 'ORANGE', 'PINK', 'INDIGO', 'BLUE', 'TEAL', 'GREEN', 'YELLOW', 'BRIGHT_RED', 'BLACK');
ALTER TABLE "public"."columns" ALTER COLUMN "status_color" DROP DEFAULT;
ALTER TABLE "public"."issue_types" ALTER COLUMN "status_color" DROP DEFAULT;
ALTER TABLE "columns" ALTER COLUMN "status_color" TYPE "StatusColor_new" USING ("status_color"::text::"StatusColor_new");
ALTER TABLE "issue_types" ALTER COLUMN "status_color" TYPE "StatusColor_new" USING ("status_color"::text::"StatusColor_new");
ALTER TYPE "StatusColor" RENAME TO "StatusColor_old";
ALTER TYPE "StatusColor_new" RENAME TO "StatusColor";
DROP TYPE "public"."StatusColor_old";
ALTER TABLE "columns" ALTER COLUMN "status_color" SET DEFAULT 'BLUE';
ALTER TABLE "issue_types" ALTER COLUMN "status_color" SET DEFAULT 'BLUE';
COMMIT;

-- AlterTable
ALTER TABLE "columns" ALTER COLUMN "status_color" SET DEFAULT 'BLUE';

-- AlterTable
ALTER TABLE "issue_types" ALTER COLUMN "status_color" SET DEFAULT 'BLUE';
