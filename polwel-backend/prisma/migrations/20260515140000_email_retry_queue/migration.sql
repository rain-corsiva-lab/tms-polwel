-- CreateEnum
ALTER TABLE `email_logs` ADD COLUMN `retryQueueId` VARCHAR(30) NULL;
CREATE INDEX `email_logs_retryQueueId_idx` ON `email_logs`(`retryQueueId`);

-- CreateTable
CREATE TABLE `email_retry_queue` (
    `id`            VARCHAR(30) NOT NULL,
    `emailType`     VARCHAR(100) NOT NULL,
    `recipient`     VARCHAR(2000) NOT NULL,
    `subject`       VARCHAR(500) NULL,
    `payload`       JSON NOT NULL,
    `status`        ENUM('PENDING','PROCESSING','SENT','ABANDONED') NOT NULL DEFAULT 'PENDING',
    `attempts`      INTEGER NOT NULL DEFAULT 1,
    `maxAttempts`   INTEGER NOT NULL DEFAULT 10,
    `nextRunAt`     DATETIME(3) NOT NULL,
    `lastError`     TEXT NULL,
    `errorCategory` VARCHAR(50) NULL,
    `courseRunId`   VARCHAR(30) NULL,
    `createdAt`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `email_retry_queue_status_nextRunAt_idx` ON `email_retry_queue`(`status`, `nextRunAt`);
CREATE INDEX `email_retry_queue_emailType_idx`         ON `email_retry_queue`(`emailType`);
CREATE INDEX `email_retry_queue_courseRunId_idx`       ON `email_retry_queue`(`courseRunId`);

-- AddForeignKey
ALTER TABLE `email_logs` ADD CONSTRAINT `email_logs_retryQueueId_fkey`
    FOREIGN KEY (`retryQueueId`) REFERENCES `email_retry_queue`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
