-- AlterTable
ALTER TABLE `course_runs` ADD COLUMN `courseRunFeeType` ENUM('PER_RUN', 'PER_HEAD') NULL DEFAULT 'PER_RUN';
