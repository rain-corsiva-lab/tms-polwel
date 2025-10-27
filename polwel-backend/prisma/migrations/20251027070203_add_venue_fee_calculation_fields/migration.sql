-- AlterTable
ALTER TABLE `course_runs` ADD COLUMN `venueFinalFee` DECIMAL(10, 2) NULL,
    ADD COLUMN `venueMaxParticipants` INTEGER NULL,
    ADD COLUMN `venuePerHeadFeeIfMaxExceed` DECIMAL(10, 2) NULL;

-- AlterTable
ALTER TABLE `venues` ADD COLUMN `maxParticipants` INTEGER NULL,
    ADD COLUMN `perHeadPriceIfMaxExceed` DECIMAL(10, 2) NULL;
