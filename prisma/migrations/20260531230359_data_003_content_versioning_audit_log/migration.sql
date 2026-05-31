-- CreateTable
CREATE TABLE "ContentRevision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entity" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "editedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EvidenceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "author" TEXT,
    "publishedAt" TEXT,
    "url" TEXT,
    "citation" TEXT,
    "reliability" TEXT NOT NULL,
    "plainSummary" TEXT NOT NULL,
    "tags" JSONB NOT NULL,
    "supports" JSONB NOT NULL,
    "limitations" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "editedBy" TEXT,
    "editedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME
);
INSERT INTO "new_EvidenceItem" ("author", "citation", "id", "limitations", "plainSummary", "publishedAt", "reliability", "slug", "sourceType", "supports", "tags", "title", "url") SELECT "author", "citation", "id", "limitations", "plainSummary", "publishedAt", "reliability", "slug", "sourceType", "supports", "tags", "title", "url" FROM "EvidenceItem";
DROP TABLE "EvidenceItem";
ALTER TABLE "new_EvidenceItem" RENAME TO "EvidenceItem";
CREATE UNIQUE INDEX "EvidenceItem_slug_key" ON "EvidenceItem"("slug");
CREATE TABLE "new_Indicator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "numericValue" REAL,
    "unit" TEXT,
    "severity" TEXT NOT NULL,
    "trend" TEXT NOT NULL,
    "note" TEXT,
    "updatedAt" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "editedBy" TEXT,
    "editedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME
);
INSERT INTO "new_Indicator" ("domain", "id", "name", "note", "numericValue", "severity", "slug", "summary", "trend", "unit", "updatedAt", "value") SELECT "domain", "id", "name", "note", "numericValue", "severity", "slug", "summary", "trend", "unit", "updatedAt", "value" FROM "Indicator";
DROP TABLE "Indicator";
ALTER TABLE "new_Indicator" RENAME TO "Indicator";
CREATE UNIQUE INDEX "Indicator_slug_key" ON "Indicator"("slug");
CREATE TABLE "new_ModuleConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "lede" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "editedBy" TEXT,
    "editedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME
);
INSERT INTO "new_ModuleConfig" ("id", "lede", "slug", "tagline", "title") SELECT "id", "lede", "slug", "tagline", "title" FROM "ModuleConfig";
DROP TABLE "ModuleConfig";
ALTER TABLE "new_ModuleConfig" RENAME TO "ModuleConfig";
CREATE UNIQUE INDEX "ModuleConfig_slug_key" ON "ModuleConfig"("slug");
CREATE TABLE "new_PlainLanguageExplainer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "shortAnswer" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "editedBy" TEXT,
    "editedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME
);
INSERT INTO "new_PlainLanguageExplainer" ("body", "id", "question", "shortAnswer", "slug") SELECT "body", "id", "question", "shortAnswer", "slug" FROM "PlainLanguageExplainer";
DROP TABLE "PlainLanguageExplainer";
ALTER TABLE "new_PlainLanguageExplainer" RENAME TO "PlainLanguageExplainer";
CREATE UNIQUE INDEX "PlainLanguageExplainer_slug_key" ON "PlainLanguageExplainer"("slug");
CREATE TABLE "new_ProjectAssessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "status" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "proponent" TEXT NOT NULL,
    "governmentObjective" TEXT NOT NULL,
    "proponentObjective" TEXT NOT NULL,
    "evidenceConfidence" TEXT NOT NULL,
    "lastReviewed" TEXT NOT NULL,
    "jurisdictions" JSONB NOT NULL,
    "domains" JSONB NOT NULL,
    "governanceQuestions" JSONB NOT NULL,
    "recommendedCommunityQuestions" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "editedBy" TEXT,
    "editedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME
);
INSERT INTO "new_ProjectAssessment" ("domains", "evidenceConfidence", "governanceQuestions", "governmentObjective", "id", "jurisdictions", "lastReviewed", "location", "name", "proponent", "proponentObjective", "recommendedCommunityQuestions", "shortName", "slug", "status", "summary") SELECT "domains", "evidenceConfidence", "governanceQuestions", "governmentObjective", "id", "jurisdictions", "lastReviewed", "location", "name", "proponent", "proponentObjective", "recommendedCommunityQuestions", "shortName", "slug", "status", "summary" FROM "ProjectAssessment";
DROP TABLE "ProjectAssessment";
ALTER TABLE "new_ProjectAssessment" RENAME TO "ProjectAssessment";
CREATE UNIQUE INDEX "ProjectAssessment_slug_key" ON "ProjectAssessment"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ContentRevision_entity_slug_idx" ON "ContentRevision"("entity", "slug");

-- CreateIndex
CREATE INDEX "ContentRevision_createdAt_idx" ON "ContentRevision"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContentRevision_entity_slug_version_key" ON "ContentRevision"("entity", "slug", "version");
