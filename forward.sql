-- CreateEnum
CREATE TYPE "BotType" AS ENUM ('PRODUCER', 'MARKETER', 'CUSDEV');

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "botType" "BotType" NOT NULL;

-- CreateTable
CREATE TABLE "BotThread" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "botType" "BotType" NOT NULL,
    "threadId" TEXT,

    CONSTRAINT "BotThread_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BotThread_userId_botType_key" ON "BotThread"("userId", "botType");

-- AddForeignKey
ALTER TABLE "BotThread" ADD CONSTRAINT "BotThread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

