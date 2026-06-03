-- CreateIndex
CREATE UNIQUE INDEX "uq_columns_board_title" ON "columns"("board_id", "title");

-- CreateIndex
CREATE UNIQUE INDEX "uq_versions_board_name" ON "versions"("board_id", "name");
