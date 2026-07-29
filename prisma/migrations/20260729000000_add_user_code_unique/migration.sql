-- Backfill mã người dùng cho các user đã tồn tại.
-- Mã sinh từ id nên không thể trùng nhau, chạy được một lần là đủ.
UPDATE "users"
SET "user_code" = 'U-' || lpad("id"::text, 6, '0')
WHERE "user_code" IS NULL;

-- CreateIndex
-- Postgres cho phép nhiều NULL trong unique index, nên index này vẫn an toàn
-- kể cả khi sau này có user chưa được gán mã.
CREATE UNIQUE INDEX "uq_users_user_code" ON "users"("user_code");
