-- Baseline: not executed — applied via `prisma migrate resolve --applied`.
-- searchLimit default is already 3 live (matches current schema.prisma);
-- the original init migration's DEFAULT 10 was changed directly on the DB
-- and never captured as a migration.
ALTER TABLE "User" ALTER COLUMN "searchLimit" SET DEFAULT 3;
