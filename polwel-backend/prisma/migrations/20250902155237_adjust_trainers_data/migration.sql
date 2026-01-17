-- AlterTable
ALTER TABLE `trainer_fees` MODIFY `remarks` TEXT NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `onboardingDate` DATETIME(3) NULL;

-- RenameIndex
ALTER TABLE `trainer_fees` RENAME INDEX `trainer_fees_trainerId_courseId_unique` TO `trainer_fees_trainerId_courseId_key`;
