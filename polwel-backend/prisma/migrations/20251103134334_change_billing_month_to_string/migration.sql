/*
  Warnings:

  - The values [ARCHIVED,PUBLISHED,ONGOING] on the enum `course_runs_status` will be removed. If these variants are still used in the database, this will fail.
  - The values [ARCHIVED,PUBLISHED,ONGOING] on the enum `course_runs_status` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[billingMonth]` on the table `billing_reports` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `billing_reports_billingMonth_idx` ON `billing_reports`;

-- AlterTable
ALTER TABLE `billing_reports` MODIFY `billingMonth` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `course_runs` MODIFY `status` ENUM('DRAFT', 'PENDING', 'CONFIRMED_PENDING_TA_APPROVAL', 'ACTIVE', 'INACTIVE', 'CONFIRMED', 'CONFIRMED_PENDING_CONFIRMATION_EMAILS', 'IN_PROGRESS', 'PENDING_BILLING', 'COMPLETED', 'INCOMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE `courses` MODIFY `status` ENUM('DRAFT', 'PENDING', 'CONFIRMED_PENDING_TA_APPROVAL', 'ACTIVE', 'INACTIVE', 'CONFIRMED', 'CONFIRMED_PENDING_CONFIRMATION_EMAILS', 'IN_PROGRESS', 'PENDING_BILLING', 'COMPLETED', 'INCOMPLETED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE UNIQUE INDEX `billing_reports_billingMonth_key` ON `billing_reports`(`billingMonth`);
