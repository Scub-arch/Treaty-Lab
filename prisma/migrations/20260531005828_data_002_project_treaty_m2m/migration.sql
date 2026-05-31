-- CreateTable
CREATE TABLE "_ProjectTreaties" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ProjectTreaties_A_fkey" FOREIGN KEY ("A") REFERENCES "ProjectAssessment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ProjectTreaties_B_fkey" FOREIGN KEY ("B") REFERENCES "Treaty" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_ProjectTreaties_AB_unique" ON "_ProjectTreaties"("A", "B");

-- CreateIndex
CREATE INDEX "_ProjectTreaties_B_index" ON "_ProjectTreaties"("B");
