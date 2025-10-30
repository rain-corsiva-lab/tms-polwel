-- AlterTable
ALTER TABLE `course_run_learners` ADD COLUMN `certificateGeneratedAt` DATETIME(3) NULL,
    ADD COLUMN `waiverReason` TEXT NULL,
    ADD COLUMN `waiverSubmittedAt` DATETIME(3) NULL,
    ADD COLUMN `waiverSupportingDocumentId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `course_run_learners_waiverSupportingDocumentId_idx` ON `course_run_learners`(`waiverSupportingDocumentId`);

-- AddForeignKey
ALTER TABLE `course_run_learners` ADD CONSTRAINT `course_run_learners_waiverSupportingDocumentId_fkey` FOREIGN KEY (`waiverSupportingDocumentId`) REFERENCES `media`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
