-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "BotType" AS ENUM ('PRODUCER', 'MARKETER', 'CUSDEV');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "botType" "BotType";

-- Update existing conversations
UPDATE "Conversation" SET "botType" = 'PRODUCER' WHERE "botType" IS NULL;

-- Make botType NOT NULL after updating existing rows
ALTER TABLE "Conversation" ALTER COLUMN "botType" SET NOT NULL;

-- CreateTable
CREATE TABLE IF NOT EXISTS "BotThread" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "botType" "BotType" NOT NULL,
    "threadId" TEXT NOT NULL,
    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BotThread_userId_botType_key" ON "BotThread"("userId", "botType");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "BotThread" 
    ADD CONSTRAINT "BotThread_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Migrate existing threadIds
INSERT INTO "BotThread" ("userId", "botType", "threadId")
SELECT "userId", 'PRODUCER', "threadId"
FROM "User"
WHERE "threadId" IS NOT NULL
ON CONFLICT ("userId", "botType") DO NOTHING;