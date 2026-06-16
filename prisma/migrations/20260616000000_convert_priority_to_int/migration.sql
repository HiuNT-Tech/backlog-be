-- Convert priority column from Postgres enum "Priority" to integer.
-- Mapping: LOW → 1, MEDIUM → 2, HIGH → 3, URGENT → 4

ALTER TABLE "cards"
  ALTER COLUMN "priority" TYPE INTEGER
  USING CASE "priority"::text
    WHEN 'LOW'    THEN 1
    WHEN 'MEDIUM' THEN 2
    WHEN 'HIGH'   THEN 3
    WHEN 'URGENT' THEN 4
    ELSE NULL
  END;

DROP TYPE IF EXISTS "Priority";
