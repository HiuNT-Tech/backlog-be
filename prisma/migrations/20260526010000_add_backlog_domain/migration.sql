-- CreateEnum
CREATE TYPE "BoardType" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "BoardMemberRole" AS ENUM ('ADMIN', 'PM', 'MEMBER', 'GUEST');

-- CreateTable
CREATE TABLE "boards" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(50) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "description" VARCHAR(255),
    "type" "BoardType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_members" (
    "id" SERIAL NOT NULL,
    "board_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" "BoardMemberRole" NOT NULL DEFAULT 'MEMBER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "board_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "columns" (
    "id" SERIAL NOT NULL,
    "board_id" INTEGER NOT NULL,
    "title" VARCHAR(50) NOT NULL,
    "status_color" SMALLINT NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "columns_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "columns_status_color_check" CHECK ("status_color" BETWEEN 1 AND 10)
);

-- CreateTable
CREATE TABLE "issue_types" (
    "id" SERIAL NOT NULL,
    "board_id" INTEGER NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "status_color" SMALLINT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "issue_types_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "issue_types_status_color_check" CHECK ("status_color" BETWEEN 1 AND 10)
);

-- CreateTable
CREATE TABLE "versions" (
    "id" SERIAL NOT NULL,
    "board_id" INTEGER NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "start_date" DATE,
    "end_date" DATE,
    "description" VARCHAR(500) NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards" (
    "id" SERIAL NOT NULL,
    "board_id" INTEGER NOT NULL,
    "column_id" INTEGER NOT NULL,
    "title" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "priority_id" INTEGER,
    "assignee_user_id" INTEGER,
    "registered_by_user_id" INTEGER,
    "created_by_user_id" INTEGER,
    "issue_type_id" INTEGER,
    "version_id" INTEGER,
    "start_date" DATE,
    "due_date" DATE,
    "estimated_hours" VARCHAR(32),
    "actual_hours" VARCHAR(32),
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_boards_slug" ON "boards"("slug");

-- CreateIndex
CREATE INDEX "idx_boards_deleted_at" ON "boards"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_board_members_board_user" ON "board_members"("board_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_board_members_user_id" ON "board_members"("user_id");

-- CreateIndex
CREATE INDEX "idx_board_members_board_id" ON "board_members"("board_id");

-- CreateIndex
CREATE INDEX "idx_columns_board_position" ON "columns"("board_id", "position");

-- CreateIndex
CREATE INDEX "idx_columns_board_id" ON "columns"("board_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_issue_types_board_name" ON "issue_types"("board_id", "name");

-- CreateIndex
CREATE INDEX "idx_issue_types_board_id" ON "issue_types"("board_id");

-- CreateIndex
CREATE INDEX "idx_versions_board_id" ON "versions"("board_id");

-- CreateIndex
CREATE INDEX "idx_versions_board_dates" ON "versions"("board_id", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "idx_cards_board_deleted_at" ON "cards"("board_id", "deleted_at");

-- CreateIndex
CREATE INDEX "idx_cards_column_position" ON "cards"("column_id", "position");

-- CreateIndex
CREATE INDEX "idx_cards_assignee_user_id" ON "cards"("assignee_user_id");

-- CreateIndex
CREATE INDEX "idx_cards_registered_by_user_id" ON "cards"("registered_by_user_id");

-- CreateIndex
CREATE INDEX "idx_cards_created_by_user_id" ON "cards"("created_by_user_id");

-- CreateIndex
CREATE INDEX "idx_cards_issue_type_id" ON "cards"("issue_type_id");

-- CreateIndex
CREATE INDEX "idx_cards_version_id" ON "cards"("version_id");

-- CreateIndex
CREATE INDEX "idx_cards_priority_id" ON "cards"("priority_id");

-- CreateIndex
CREATE INDEX "idx_cards_start_date" ON "cards"("start_date");

-- CreateIndex
CREATE INDEX "idx_cards_due_date" ON "cards"("due_date");

-- AddForeignKey
ALTER TABLE "board_members" ADD CONSTRAINT "board_members_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_members" ADD CONSTRAINT "board_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "columns" ADD CONSTRAINT "columns_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_types" ADD CONSTRAINT "issue_types_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "versions" ADD CONSTRAINT "versions_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_column_id_fkey" FOREIGN KEY ("column_id") REFERENCES "columns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_assignee_user_id_fkey" FOREIGN KEY ("assignee_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_registered_by_user_id_fkey" FOREIGN KEY ("registered_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_issue_type_id_fkey" FOREIGN KEY ("issue_type_id") REFERENCES "issue_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
