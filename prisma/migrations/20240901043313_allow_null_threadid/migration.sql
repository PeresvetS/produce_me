-- AlterTable
ALTER TABLE "Conversation" ALTER COLUMN "botType" DROP NOT NULL;

-- AlterTable
ALTER TABLE "BotThread" ALTER COLUMN "threadId" DROP NOT NULL;