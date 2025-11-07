-- CreateTable
CREATE TABLE `course_run_partners` (
    `id` VARCHAR(191) NOT NULL,
    `courseRunId` VARCHAR(191) NOT NULL,
    `partnerId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `course_run_partners_courseRunId_idx`(`courseRunId`),
    INDEX `course_run_partners_partnerId_idx`(`partnerId`),
    UNIQUE INDEX `course_run_partners_courseRunId_partnerId_key`(`courseRunId`, `partnerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `course_run_partners` ADD CONSTRAINT `course_run_partners_courseRunId_fkey` FOREIGN KEY (`courseRunId`) REFERENCES `course_runs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_run_partners` ADD CONSTRAINT `course_run_partners_partnerId_fkey` FOREIGN KEY (`partnerId`) REFERENCES `partners`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
