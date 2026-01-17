/*
  Warnings:

  - You are about to drop the column `name` on the `billing_reports` table. All the data in the column will be lost.
  - You are about to drop the column `billingReportId` on the `course_runs` table. All the data in the column will be lost.
  - Added the required column `billingMonth` to the `billing_reports` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `course_runs` DROP FOREIGN KEY `course_runs_billingReportId_fkey`;

-- DropIndex
DROP INDEX `course_runs_billingReportId_fkey` ON `course_runs`;

-- AlterTable
ALTER TABLE `billing_reports` DROP COLUMN `name`,
    ADD COLUMN `billingMonth` DATETIME(3) NOT NULL,
    ADD COLUMN `contractFees` DECIMAL(15, 2) NULL,
    ADD COLUMN `status` ENUM('PENDING', 'SUBMITTED', 'APPROVED', 'PAID', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    ADD COLUMN `totalAmount` DECIMAL(15, 2) NULL,
    ADD COLUMN `totalCourseRuns` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `totalParticipants` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `venueFees` DECIMAL(15, 2) NULL;

-- AlterTable
ALTER TABLE `course_run_billings` ADD COLUMN `billingReportId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `course_runs` DROP COLUMN `billingReportId`,
    MODIFY `status` ENUM('DRAFT', 'PENDING', 'CONFIRMED_PENDING_TA_APPROVAL', 'ACTIVE', 'INACTIVE', 'CONFIRMED', 'CONFIRMED_PENDING_CONFIRMATION_EMAILS', 'IN_PROGRESS', 'PENDING_BILLING', 'COMPLETED', 'INCOMPLETED', 'CANCELLED', 'ARCHIVED', 'PUBLISHED', 'ONGOING') NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE `courses` MODIFY `status` ENUM('DRAFT', 'PENDING', 'CONFIRMED_PENDING_TA_APPROVAL', 'ACTIVE', 'INACTIVE', 'CONFIRMED', 'CONFIRMED_PENDING_CONFIRMATION_EMAILS', 'IN_PROGRESS', 'PENDING_BILLING', 'COMPLETED', 'INCOMPLETED', 'CANCELLED', 'ARCHIVED', 'PUBLISHED', 'ONGOING') NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX `billing_reports_billingMonth_idx` ON `billing_reports`(`billingMonth`);

-- CreateIndex
CREATE INDEX `course_run_billings_billingReportId_idx` ON `course_run_billings`(`billingReportId`);

-- AddForeignKey
ALTER TABLE `course_run_billings` ADD CONSTRAINT `course_run_billings_billingReportId_fkey` FOREIGN KEY (`billingReportId`) REFERENCES `billing_reports`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
