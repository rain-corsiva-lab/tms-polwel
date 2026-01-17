/*
  Warnings:

  - You are about to drop the column `billingRate` on the `courses` table. All the data in the column will be lost.
  - You are about to drop the column `contractsFeePayout` on the `courses` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `course_runs` ADD COLUMN `contractFees` DECIMAL(10, 2) NULL,
    ADD COLUMN `venuePerHeadIfExceed` DECIMAL(10, 2) NULL;

-- AlterTable
ALTER TABLE `courses` DROP COLUMN `billingRate`,
    DROP COLUMN `contractsFeePayout`;
