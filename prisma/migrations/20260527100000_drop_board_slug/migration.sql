DROP INDEX IF EXISTS "uq_boards_slug";

ALTER TABLE "boards" DROP COLUMN IF EXISTS "slug";
