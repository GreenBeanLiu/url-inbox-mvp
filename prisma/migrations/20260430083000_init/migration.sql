-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "canonicalUrl" TEXT NOT NULL,
    "externalId" TEXT,
    "title" TEXT,
    "summary" TEXT,
    "contentText" TEXT,
    "authorName" TEXT,
    "authorHandle" TEXT,
    "siteName" TEXT,
    "coverImageUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "note" TEXT,
    "status" TEXT NOT NULL,
    "fetchStatus" TEXT NOT NULL,
    "fetchError" TEXT,
    "rawPayload" JSONB,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Item_sourceType_externalId_idx" ON "Item"("sourceType", "externalId");

-- CreateIndex
CREATE INDEX "Item_sourceType_canonicalUrl_idx" ON "Item"("sourceType", "canonicalUrl");
