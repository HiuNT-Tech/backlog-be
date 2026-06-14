-- CreateEnum
CREATE TYPE "BoardInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "board_invitations" (
    "id" SERIAL NOT NULL,
    "board_id" INTEGER NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "invitee_user_id" INTEGER,
    "invited_by_user_id" INTEGER,
    "role" "BoardMemberRole" NOT NULL DEFAULT 'MEMBER',
    "status" "BoardInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "board_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_board_invitations_token" ON "board_invitations"("token");

-- CreateIndex
CREATE INDEX "idx_board_invitations_board_id" ON "board_invitations"("board_id");

-- CreateIndex
CREATE INDEX "idx_board_invitations_invitee_user_id" ON "board_invitations"("invitee_user_id");

-- CreateIndex
CREATE INDEX "idx_board_invitations_email" ON "board_invitations"("email");

-- CreateIndex
CREATE INDEX "idx_board_invitations_status" ON "board_invitations"("status");

-- CreateIndex
-- Partial unique: chi cho phep 1 loi moi PENDING cho moi (board, email).
-- Sau khi DECLINED/REVOKED/EXPIRED van moi lai duoc. Prisma schema khong dien dat
-- duoc dieu kien WHERE nen index nay duoc khai bao thu cong tai day.
CREATE UNIQUE INDEX "uq_board_invitations_board_email_pending"
    ON "board_invitations"("board_id", "email")
    WHERE "status" = 'PENDING';

-- AddForeignKey
ALTER TABLE "board_invitations" ADD CONSTRAINT "board_invitations_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_invitations" ADD CONSTRAINT "board_invitations_invitee_user_id_fkey" FOREIGN KEY ("invitee_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_invitations" ADD CONSTRAINT "board_invitations_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
