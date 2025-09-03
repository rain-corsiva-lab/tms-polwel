/*
  Warnings:

  - You are about to drop the column `reason` on the `trainer_blockouts` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `trainer_blockouts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `trainer_blockouts` DROP COLUMN `reason`,
    DROP COLUMN `type`,
    ADD COLUMN `remarks` TEXT NULL;
