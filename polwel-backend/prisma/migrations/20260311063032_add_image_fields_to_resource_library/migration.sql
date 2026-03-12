-- AlterTable
ALTER TABLE `resource_library` ADD COLUMN `imageName` VARCHAR(191) NULL,
    ADD COLUMN `imageSize` INTEGER NULL,
    ADD COLUMN `imageUrl` VARCHAR(191) NULL;
