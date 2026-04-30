-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "publishedAt" DATETIME,
    "note" TEXT,
    "status" TEXT NOT NULL,
    "fetchStatus" TEXT NOT NULL,
    "fetchError" TEXT,
    "rawPayload" JSONB,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Item_sourceType_externalId_idx" ON "Item"("sourceType", "externalId");

-- CreateIndex
CREATE INDEX "Item_sourceType_canonicalUrl_idx" ON "Item"("sourceType", "canonicalUrl");
