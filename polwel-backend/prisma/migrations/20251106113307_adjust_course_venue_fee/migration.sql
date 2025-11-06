/*
  Warnings:

  - You are about to alter the column `venueFeeType` on the `courses` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(14))`.

*/
-- AlterTable
ALTER TABLE `courses` ADD COLUMN `perHeadPriceIfMaxExceed` DECIMAL(10, 2) NULL,
    ADD COLUMN `venueMaxParticipants` INTEGER NULL,
    MODIFY `venueFeeType` ENUM('PER_HEAD', 'PER_VENUE', 'FIXED') NULL DEFAULT 'PER_HEAD';
