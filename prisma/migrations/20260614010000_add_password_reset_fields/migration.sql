-- Add password-reset (forgot/reset password) fields to users.

-- AlterTable
ALTER TABLE "users" ADD COLUMN "reset_password_token" TEXT;
ALTER TABLE "users" ADD COLUMN "reset_password_expires_at" TIMESTAMP(3);
