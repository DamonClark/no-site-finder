-- Baseline: reconcile migration history with live DB state (not executed —
-- applied via `prisma migrate resolve --applied`, since introspection already
-- confirmed the DB matches this end state).
--
-- EnrichmentCache: created by migration 20260620130445_add_enrichment_cache,
-- unused by any application code, already absent from the live DB.
DROP TABLE IF EXISTS "EnrichmentCache";

-- calendlyUrl: already present live from unmerged Calendly-booking branch work.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "calendlyUrl" TEXT;
