/*
  Warnings:

  - You are about to drop the `trainer_fees` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `trainer_fees` DROP FOREIGN KEY `trainer_fees_courseId_fkey`;

-- DropForeignKey
ALTER TABLE `trainer_fees` DROP FOREIGN KEY `trainer_fees_createdBy_fkey`;

-- DropForeignKey
ALTER TABLE `trainer_fees` DROP FOREIGN KEY `trainer_fees_trainerId_fkey`;

-- AlterTable
ALTER TABLE `courses` ALTER COLUMN `venueFee` DROP DEFAULT;

-- DropTable
DROP TABLE `trainer_fees`;
