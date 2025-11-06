/*
  Warnings:

  - You are about to drop the column `maxParticipants` on the `venues` table. All the data in the column will be lost.
  - You are about to drop the column `perHeadPriceIfMaxExceed` on the `venues` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `venues` DROP COLUMN `maxParticipants`,
    DROP COLUMN `perHeadPriceIfMaxExceed`;
