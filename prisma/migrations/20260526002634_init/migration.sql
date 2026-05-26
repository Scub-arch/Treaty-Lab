-- CreateTable
CREATE TABLE "Treaty" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "openedAt" DATETIME NOT NULL,
    "enteredIntoForceAt" DATETIME,
    "depository" TEXT,
    "summary" TEXT,
    "fullText" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Signature" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "treatyId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "signedAt" DATETIME,
    "ratifiedAt" DATETIME,
    "reservation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Signature_treatyId_fkey" FOREIGN KEY ("treatyId") REFERENCES "Treaty" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Signature_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    CONSTRAINT "Topic_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Topic" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_TreatyTopics" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_TreatyTopics_A_fkey" FOREIGN KEY ("A") REFERENCES "Topic" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_TreatyTopics_B_fkey" FOREIGN KEY ("B") REFERENCES "Treaty" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Treaty_slug_key" ON "Treaty"("slug");

-- CreateIndex
CREATE INDEX "Treaty_openedAt_idx" ON "Treaty"("openedAt");

-- CreateIndex
CREATE INDEX "Treaty_enteredIntoForceAt_idx" ON "Treaty"("enteredIntoForceAt");

-- CreateIndex
CREATE UNIQUE INDEX "Party_code_key" ON "Party"("code");

-- CreateIndex
CREATE INDEX "Party_type_idx" ON "Party"("type");

-- CreateIndex
CREATE INDEX "Signature_treatyId_idx" ON "Signature"("treatyId");

-- CreateIndex
CREATE INDEX "Signature_partyId_idx" ON "Signature"("partyId");

-- CreateIndex
CREATE INDEX "Signature_signedAt_idx" ON "Signature"("signedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Signature_treatyId_partyId_key" ON "Signature"("treatyId", "partyId");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_slug_key" ON "Topic"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "_TreatyTopics_AB_unique" ON "_TreatyTopics"("A", "B");

-- CreateIndex
CREATE INDEX "_TreatyTopics_B_index" ON "_TreatyTopics"("B");
