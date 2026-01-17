-- AlterTable
ALTER TABLE `courses` ADD COLUMN `venueId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `courses` ADD CONSTRAINT `courses_venueId_fkey` FOREIGN KEY (`venueId`) REFERENCES `venues`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Remove old venue column after migration
-- This will be done in a separate migration if needed
