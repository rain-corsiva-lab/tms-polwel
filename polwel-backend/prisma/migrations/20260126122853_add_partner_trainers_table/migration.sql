/*
  Warnings:

  - You are about to drop the column `partnerOrganization` on the `partners` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `partners` DROP COLUMN `partnerOrganization`;

-- CreateTable
CREATE TABLE `partner_trainers` (
    `id` VARCHAR(191) NOT NULL,
    `partnerId` VARCHAR(191) NOT NULL,
    `trainerInformation` TEXT NULL,
    `trainerName` VARCHAR(191) NOT NULL,
    `trainerWriteUp` TEXT NULL,
    `trainerEmail` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `partner_trainers_partnerId_idx`(`partnerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `partner_trainers` ADD CONSTRAINT `partner_trainers_partnerId_fkey` FOREIGN KEY (`partnerId`) REFERENCES `partners`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
