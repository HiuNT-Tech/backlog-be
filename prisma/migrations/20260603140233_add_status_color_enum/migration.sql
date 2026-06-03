/*
  Warnings:

  - The `status_color` column on the `columns` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status_color` column on the `issue_types` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `products` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "StatusColor" AS ENUM ('GRAY', 'RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE', 'PURPLE');

-- AlterTable
ALTER TABLE "columns" DROP COLUMN "status_color",
ADD COLUMN     "status_color" "StatusColor" NOT NULL DEFAULT 'GRAY';

-- AlterTable
ALTER TABLE "issue_types" DROP COLUMN "status_color",
ADD COLUMN     "status_color" "StatusColor" NOT NULL DEFAULT 'GRAY';

-- DropTable
DROP TABLE "products";
