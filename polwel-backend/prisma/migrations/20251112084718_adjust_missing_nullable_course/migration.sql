/*
  Warnings:

  - Made the column `minParticipants` on table `courses` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `courses` MODIFY `maxParticipants` INTEGER NULL DEFAULT 25,
    MODIFY `minParticipants` INTEGER NOT NULL DEFAULT 1;
