/*
  Warnings:

  - You are about to drop the column `__legacy_financial_backup` on the `courses` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `courses` DROP COLUMN `__legacy_financial_backup`;
