-- AlterTable
ALTER TABLE `course_run_trainers` ADD COLUMN `additionalCostUnit` ENUM('PER_PAX', 'PER_CLASS') NULL DEFAULT 'PER_CLASS';
