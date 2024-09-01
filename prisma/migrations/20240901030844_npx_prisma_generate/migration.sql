/*
  Warnings:

  - You are about to drop the column `botType` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the `BotThread` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "BotThread" DROP CONSTRAINT "BotThread_userId_fkey";

-- AlterTable
ALTER TABLE "Conversation" DROP COLUMN "botType";

-- DropTable
DROP TABLE "BotThread";

-- DropEnum
DROP TYPE "BotType";
