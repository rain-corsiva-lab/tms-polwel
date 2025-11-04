/*
  Warnings:

  - You are about to drop the column `contractFees` on the `billing_reports` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `billing_reports` table. All the data in the column will be lost.
  - You are about to drop the column `totalCourseRuns` on the `billing_reports` table. All the data in the column will be lost.
  - You are about to drop the column `totalParticipants` on the `billing_reports` table. All the data in the column will be lost.
  - You are about to drop the column `venueFees` on the `billing_reports` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `billing_reports` DROP COLUMN `contractFees`,
    DROP COLUMN `totalAmount`,
    DROP COLUMN `totalCourseRuns`,
    DROP COLUMN `totalParticipants`,
    DROP COLUMN `venueFees`;
