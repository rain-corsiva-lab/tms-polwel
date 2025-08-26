-- AlterTable
ALTER TABLE `users` ADD COLUMN `old_email` VARCHAR(191) NULL,
    MODIFY `email` VARCHAR(191) NULL;
