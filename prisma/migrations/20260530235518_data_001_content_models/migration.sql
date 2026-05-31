-- CreateTable
CREATE TABLE "EvidenceItem" (
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
    "limitations" JSONB
);

-- CreateTable
CREATE TABLE "Indicator" (
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
    "updatedAt" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ProjectAssessment" (
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
    "recommendedCommunityQuestions" JSONB NOT NULL
);

-- CreateTable
CREATE TABLE "ProjectFinance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "structure" TEXT NOT NULL,
    "totalCostEstimate" TEXT,
    "costOverrunsNoted" TEXT,
    "loanGuarantor" TEXT,
    "riskCarrier" TEXT NOT NULL,
    CONSTRAINT "ProjectFinance_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProjectAssessment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlainLanguageExplainer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "shortAnswer" TEXT NOT NULL,
    "body" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ModuleConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "lede" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "PartyReference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "statementUrl" TEXT,
    "order" INTEGER NOT NULL,
    CONSTRAINT "PartyReference_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProjectAssessment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "Claim_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProjectAssessment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClaimSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "claimId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "citing" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "ClaimSource_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClaimSource_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "EvidenceItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IndicatorSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "indicatorId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "citing" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "IndicatorSource_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "Indicator" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IndicatorSource_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "EvidenceItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "citing" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "ProjectSource_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProjectAssessment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectSource_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "EvidenceItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectFinanceSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "financeId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "citing" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "ProjectFinanceSource_financeId_fkey" FOREIGN KEY ("financeId") REFERENCES "ProjectFinance" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectFinanceSource_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "EvidenceItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExplainerEvidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "explainerId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "ExplainerEvidence_explainerId_fkey" FOREIGN KEY ("explainerId") REFERENCES "PlainLanguageExplainer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExplainerEvidence_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "EvidenceItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExplainerProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "explainerId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "ExplainerProject_explainerId_fkey" FOREIGN KEY ("explainerId") REFERENCES "PlainLanguageExplainer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExplainerProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProjectAssessment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ModuleFeaturedIndicator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "moduleId" TEXT NOT NULL,
    "indicatorId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "ModuleFeaturedIndicator_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "ModuleConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ModuleFeaturedIndicator_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "Indicator" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ModuleFeaturedProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "moduleId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "ModuleFeaturedProject_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "ModuleConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ModuleFeaturedProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProjectAssessment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "EvidenceItem_slug_key" ON "EvidenceItem"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Indicator_slug_key" ON "Indicator"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAssessment_slug_key" ON "ProjectAssessment"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectFinance_projectId_key" ON "ProjectFinance"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "PlainLanguageExplainer_slug_key" ON "PlainLanguageExplainer"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleConfig_slug_key" ON "ModuleConfig"("slug");

-- CreateIndex
CREATE INDEX "PartyReference_projectId_idx" ON "PartyReference"("projectId");

-- CreateIndex
CREATE INDEX "Claim_projectId_idx" ON "Claim"("projectId");

-- CreateIndex
CREATE INDEX "ClaimSource_claimId_idx" ON "ClaimSource"("claimId");

-- CreateIndex
CREATE INDEX "ClaimSource_evidenceId_idx" ON "ClaimSource"("evidenceId");

-- CreateIndex
CREATE INDEX "IndicatorSource_indicatorId_idx" ON "IndicatorSource"("indicatorId");

-- CreateIndex
CREATE INDEX "IndicatorSource_evidenceId_idx" ON "IndicatorSource"("evidenceId");

-- CreateIndex
CREATE INDEX "ProjectSource_projectId_idx" ON "ProjectSource"("projectId");

-- CreateIndex
CREATE INDEX "ProjectSource_evidenceId_idx" ON "ProjectSource"("evidenceId");

-- CreateIndex
CREATE INDEX "ProjectFinanceSource_financeId_idx" ON "ProjectFinanceSource"("financeId");

-- CreateIndex
CREATE INDEX "ProjectFinanceSource_evidenceId_idx" ON "ProjectFinanceSource"("evidenceId");

-- CreateIndex
CREATE INDEX "ExplainerEvidence_evidenceId_idx" ON "ExplainerEvidence"("evidenceId");

-- CreateIndex
CREATE UNIQUE INDEX "ExplainerEvidence_explainerId_evidenceId_key" ON "ExplainerEvidence"("explainerId", "evidenceId");

-- CreateIndex
CREATE INDEX "ExplainerProject_projectId_idx" ON "ExplainerProject"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ExplainerProject_explainerId_projectId_key" ON "ExplainerProject"("explainerId", "projectId");

-- CreateIndex
CREATE INDEX "ModuleFeaturedIndicator_indicatorId_idx" ON "ModuleFeaturedIndicator"("indicatorId");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleFeaturedIndicator_moduleId_indicatorId_key" ON "ModuleFeaturedIndicator"("moduleId", "indicatorId");

-- CreateIndex
CREATE INDEX "ModuleFeaturedProject_projectId_idx" ON "ModuleFeaturedProject"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleFeaturedProject_moduleId_projectId_key" ON "ModuleFeaturedProject"("moduleId", "projectId");
