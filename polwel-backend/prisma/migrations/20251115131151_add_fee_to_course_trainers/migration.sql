-- AlterTable
ALTER TABLE `course_trainers` ADD COLUMN `feePerRun` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `remarks` TEXT NULL;
