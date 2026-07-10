-- CreateEnum
CREATE TYPE "CommentType" AS ENUM ('USER', 'SYSTEM');

-- AlterTable
ALTER TABLE "comments" ADD COLUMN "type" "CommentType" NOT NULL DEFAULT 'USER';
