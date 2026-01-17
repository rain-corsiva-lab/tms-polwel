-- AlterTable
ALTER TABLE `course_run_learners` ADD COLUMN `withdrawnAt` DATETIME(3) NULL,
    ADD COLUMN `withdrawnBy` VARCHAR(191) NULL;
