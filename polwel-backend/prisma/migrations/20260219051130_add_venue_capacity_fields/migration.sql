-- AlterTable
ALTER TABLE `venues` ADD COLUMN `maxParticipants` INTEGER NULL,
    ADD COLUMN `perHeadPriceIfMaxExceed` DECIMAL(10, 2) NULL;
