-- Add board/project code and issue key fields.
-- Existing dev data is assigned deterministic placeholder codes before NOT NULL constraints.

ALTER TABLE "boards" ADD COLUMN "board_code" VARCHAR(16);
ALTER TABLE "boards" ADD COLUMN "next_card_number" INTEGER NOT NULL DEFAULT 1;

UPDATE "boards"
SET "board_code" = 'BOARD' || "id"
WHERE "board_code" IS NULL;

ALTER TABLE "boards" ALTER COLUMN "board_code" SET NOT NULL;

CREATE UNIQUE INDEX "uq_boards_board_code" ON "boards"("board_code");

ALTER TABLE "cards" ADD COLUMN "card_number" INTEGER;
ALTER TABLE "cards" ADD COLUMN "card_code" VARCHAR(40);

WITH numbered_cards AS (
    SELECT
        "id",
        "board_id",
        ROW_NUMBER() OVER (PARTITION BY "board_id" ORDER BY "created_at", "id") AS generated_number
    FROM "cards"
)
UPDATE "cards"
SET
    "card_number" = numbered_cards.generated_number,
    "card_code" = "boards"."board_code" || '-' || numbered_cards.generated_number
FROM numbered_cards
JOIN "boards" ON "boards"."id" = numbered_cards."board_id"
WHERE "cards"."id" = numbered_cards."id";

UPDATE "boards"
SET "next_card_number" = COALESCE(
    (
        SELECT MAX("cards"."card_number") + 1
        FROM "cards"
        WHERE "cards"."board_id" = "boards"."id"
    ),
    1
);

ALTER TABLE "cards" ALTER COLUMN "card_number" SET NOT NULL;
ALTER TABLE "cards" ALTER COLUMN "card_code" SET NOT NULL;

CREATE UNIQUE INDEX "uq_cards_card_code" ON "cards"("card_code");
CREATE UNIQUE INDEX "uq_cards_board_card_number" ON "cards"("board_id", "card_number");
