-- Development-only cleanup: project no longer migrates MongoDB data.
DROP TABLE IF EXISTS "refresh_token_sessions";

DROP INDEX IF EXISTS "users_legacy_mongo_id_key";
ALTER TABLE "users" DROP COLUMN IF EXISTS "legacy_mongo_id";

CREATE TABLE "refresh_token_sessions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" TEXT NOT NULL,
    "replaced_by_token_hash" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refresh_token_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "refresh_token_sessions_token_hash_key" ON "refresh_token_sessions"("token_hash");
CREATE INDEX "refresh_token_sessions_user_id_idx" ON "refresh_token_sessions"("user_id");
CREATE INDEX "refresh_token_sessions_expires_at_idx" ON "refresh_token_sessions"("expires_at");

ALTER TABLE "refresh_token_sessions"
ADD CONSTRAINT "refresh_token_sessions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
