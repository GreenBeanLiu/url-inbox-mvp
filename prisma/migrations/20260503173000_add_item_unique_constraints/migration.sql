DROP INDEX IF EXISTS "Item_sourceType_externalId_idx";
DROP INDEX IF EXISTS "Item_sourceType_canonicalUrl_idx";

CREATE UNIQUE INDEX "Item_sourceType_externalId_key" ON "Item"("sourceType", "externalId");
CREATE UNIQUE INDEX "Item_sourceType_canonicalUrl_key" ON "Item"("sourceType", "canonicalUrl");

CREATE INDEX "Item_sourceType_externalId_idx" ON "Item"("sourceType", "externalId");
CREATE INDEX "Item_sourceType_canonicalUrl_idx" ON "Item"("sourceType", "canonicalUrl");
