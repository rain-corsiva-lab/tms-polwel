-- AlterTable
ALTER TABLE `course_run_learners` ADD COLUMN `waiverRejectReason` TEXT NULL,
    ADD COLUMN `waiverReviewedAt` DATETIME(3) NULL,
    ADD COLUMN `waiverReviewedBy` VARCHAR(191) NULL,
    ADD COLUMN `waiverStatus` ENUM('PENDING', 'APPROVED', 'REJECTED') NULL;

-- CreateIndex
CREATE INDEX `course_run_learners_waiverReviewedBy_idx` ON `course_run_learners`(`waiverReviewedBy`);

-- AddForeignKey
ALTER TABLE `course_run_learners` ADD CONSTRAINT `course_run_learners_waiverReviewedBy_fkey` FOREIGN KEY (`waiverReviewedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
