/*
  Warnings:

  - You are about to alter the column `status` on the `billing_reports` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(5))` to `Enum(EnumId(21))`.

*/
-- AlterTable
ALTER TABLE `billing_reports` MODIFY `status` ENUM('ALL_COMPLETED', 'MIXED_STATUS', 'ALL_INCOMPLETED') NOT NULL DEFAULT 'ALL_INCOMPLETED';
