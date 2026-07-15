-- AlterTable
ALTER TABLE `email_retry_queue` MODIFY `courseRunId` VARCHAR(191) NULL,
    ALTER COLUMN `updatedAt` DROP DEFAULT;

-- CreateTable
CREATE TABLE `user_organizations` (
    `userId` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`userId`, `organizationId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_organizations` ADD CONSTRAINT `user_organizations_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_organizations` ADD CONSTRAINT `user_organizations_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
