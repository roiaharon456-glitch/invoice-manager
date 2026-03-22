-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'gmail',
    "date" DATETIME NOT NULL,
    "driveFileId" TEXT NOT NULL,
    "driveUrl" TEXT NOT NULL,
    "gmailMsgId" TEXT NOT NULL,
    "emailSubject" TEXT,
    "emailSender" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Document" ("createdAt", "date", "driveFileId", "driveUrl", "emailSender", "emailSubject", "filename", "gmailMsgId", "id", "type", "userId") SELECT "createdAt", "date", "driveFileId", "driveUrl", "emailSender", "emailSubject", "filename", "gmailMsgId", "id", "type", "userId" FROM "Document";
DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
