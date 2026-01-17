/*
  Warnings:

  - You are about to drop the column `status` on the `courses` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `courses` DROP COLUMN `status`,
    ADD COLUMN `venueFeeType` VARCHAR(191) NULL;
