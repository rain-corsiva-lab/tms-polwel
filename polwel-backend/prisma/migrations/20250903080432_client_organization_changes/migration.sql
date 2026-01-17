/*
  Warnings:

  - You are about to drop the column `industry` on the `organizations` table. All the data in the column will be lost.
  - You are about to drop the column `department` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `mfaEnabled` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `organizations` DROP COLUMN `industry`;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `department`,
    DROP COLUMN `mfaEnabled`,
    ADD COLUMN `designation` VARCHAR(191) NULL;
