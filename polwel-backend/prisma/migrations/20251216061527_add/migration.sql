-- AlterTable
ALTER TABLE `trainer_assignment_email_history` ADD COLUMN `attachmentId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `trainer_assignment_email_history_attachmentId_fkey` ON `trainer_assignment_email_history`(`attachmentId`);

-- AddForeignKey
ALTER TABLE `trainer_assignment_email_history` ADD CONSTRAINT `trainer_assignment_email_history_attachmentId_fkey` FOREIGN KEY (`attachmentId`) REFERENCES `media`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
