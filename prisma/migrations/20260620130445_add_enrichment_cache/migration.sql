-- CreateTable
CREATE TABLE "EnrichmentCache" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "facebookUrl" TEXT,
    "fbConfidence" TEXT,
    "fbSource" TEXT,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnrichmentCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EnrichmentCache_placeId_key" ON "EnrichmentCache"("placeId");
