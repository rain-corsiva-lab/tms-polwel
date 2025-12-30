/*
  Warnings:

  - You are about to drop the column `attachmentId` on the `confirmation_email_history` table. All the data in the column will be lost.
  - You are about to drop the column `attachmentId` on the `trainer_assignment_email_history` table. All the data in the column will be lost.

*/

-- CreateTable
CREATE TABLE `trainer_email_attachments` (
    `id` VARCHAR(191) NOT NULL,
    `emailHistoryId` VARCHAR(191) NOT NULL,
    `mediaId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `trainer_email_attachments_emailHistoryId_idx`(`emailHistoryId`),
    INDEX `trainer_email_attachments_mediaId_idx`(`mediaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `confirmation_email_attachments` (
    `id` VARCHAR(191) NOT NULL,
    `emailHistoryId` VARCHAR(191) NOT NULL,
    `mediaId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `confirmation_email_attachments_emailHistoryId_idx`(`emailHistoryId`),
    INDEX `confirmation_email_attachments_mediaId_idx`(`mediaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Migrate existing data from trainer_assignment_email_history
INSERT INTO `trainer_email_attachments` (`id`, `emailHistoryId`, `mediaId`, `createdAt`)
SELECT UUID(), `id`, `attachmentId`, NOW()
FROM `trainer_assignment_email_history`
WHERE `attachmentId` IS NOT NULL;

-- Migrate existing data from confirmation_email_history
INSERT INTO `confirmation_email_attachments` (`id`, `emailHistoryId`, `mediaId`, `createdAt`)
SELECT UUID(), `id`, `attachmentId`, NOW()
FROM `confirmation_email_history`
WHERE `attachmentId` IS NOT NULL;

-- DropForeignKey
ALTER TABLE `confirmation_email_history` DROP FOREIGN KEY `confirmation_email_history_attachmentId_fkey`;

-- DropForeignKey
ALTER TABLE `trainer_assignment_email_history` DROP FOREIGN KEY `trainer_assignment_email_history_attachmentId_fkey`;

-- DropIndex
DROP INDEX `confirmation_email_history_attachmentId_fkey` ON `confirmation_email_history`;

-- DropIndex
DROP INDEX `trainer_assignment_email_history_attachmentId_fkey` ON `trainer_assignment_email_history`;

-- AlterTable
ALTER TABLE `confirmation_email_history` DROP COLUMN `attachmentId`;

-- AlterTable
ALTER TABLE `trainer_assignment_email_history` DROP COLUMN `attachmentId`;

-- AddForeignKey
ALTER TABLE `trainer_email_attachments` ADD CONSTRAINT `trainer_email_attachments_emailHistoryId_fkey` FOREIGN KEY (`emailHistoryId`) REFERENCES `trainer_assignment_email_history`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trainer_email_attachments` ADD CONSTRAINT `trainer_email_attachments_mediaId_fkey` FOREIGN KEY (`mediaId`) REFERENCES `media`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `confirmation_email_attachments` ADD CONSTRAINT `confirmation_email_attachments_emailHistoryId_fkey` FOREIGN KEY (`emailHistoryId`) REFERENCES `confirmation_email_history`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `confirmation_email_attachments` ADD CONSTRAINT `confirmation_email_attachments_mediaId_fkey` FOREIGN KEY (`mediaId`) REFERENCES `media`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
