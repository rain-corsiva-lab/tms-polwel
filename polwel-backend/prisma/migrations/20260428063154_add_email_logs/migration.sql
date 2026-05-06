-- CreateTable
CREATE TABLE `email_logs` (
    `id` VARCHAR(191) NOT NULL,
    `emailType` VARCHAR(100) NOT NULL,
    `recipient` VARCHAR(2000) NOT NULL,
    `cc` VARCHAR(2000) NULL,
    `subject` VARCHAR(500) NULL,
    `status` ENUM('PENDING', 'SENT', 'FAILED', 'RETRYING') NOT NULL DEFAULT 'PENDING',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `lastAttemptAt` DATETIME(3) NULL,
    `messageId` VARCHAR(255) NULL,
    `errorMessage` TEXT NULL,
    `errorCode` VARCHAR(100) NULL,
    `courseRunId` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `email_logs_status_idx`(`status`),
    INDEX `email_logs_emailType_idx`(`emailType`),
    INDEX `email_logs_courseRunId_idx`(`courseRunId`),
    INDEX `email_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `email_logs` ADD CONSTRAINT `email_logs_courseRunId_fkey` FOREIGN KEY (`courseRunId`) REFERENCES `course_runs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
