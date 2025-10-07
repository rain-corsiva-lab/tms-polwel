-- AlterTable
ALTER TABLE `course_run_learners` ADD COLUMN `confirmationEmailLastSentAt` DATETIME(3) NULL,
    ADD COLUMN `confirmationEmailStatus` ENUM('PENDING', 'SENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `course_runs` ADD COLUMN `cancelReason` TEXT NULL,
    ADD COLUMN `cancelledAt` DATETIME(3) NULL,
    ADD COLUMN `cancelledById` VARCHAR(191) NULL,
    ADD COLUMN `learnerEmailStatus` ENUM('NOT_REQUIRED', 'PENDING', 'IN_PROGRESS', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
    ADD COLUMN `learnerEmailStatusUpdatedAt` DATETIME(3) NULL,
    ADD COLUMN `statusLastEvaluatedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `course_runs_cancelledById_fkey` ON `course_runs`(`cancelledById`);

-- AddForeignKey
ALTER TABLE `course_runs` ADD CONSTRAINT `course_runs_cancelledById_fkey` FOREIGN KEY (`cancelledById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
