-- CreateTable
CREATE TABLE `course_run_cancellation_attachments` (
    `id` VARCHAR(191) NOT NULL,
    `courseRunId` VARCHAR(191) NOT NULL,
    `mediaId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `course_run_cancellation_attachments_courseRunId_mediaId_key`(`courseRunId`, `mediaId`),
    INDEX `course_run_cancellation_attachments_courseRunId_idx`(`courseRunId`),
    INDEX `course_run_cancellation_attachments_mediaId_idx`(`mediaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `course_run_cancellation_attachments` ADD CONSTRAINT `course_run_cancellation_attachments_courseRunId_fkey` FOREIGN KEY (`courseRunId`) REFERENCES `course_runs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_run_cancellation_attachments` ADD CONSTRAINT `course_run_cancellation_attachments_mediaId_fkey` FOREIGN KEY (`mediaId`) REFERENCES `media`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
