-- CreateTable
CREATE TABLE `partners` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'PENDING', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
    `pointOfContact` VARCHAR(191) NULL,
    `contactNumber` VARCHAR(191) NULL,
    `contactDesignation` VARCHAR(191) NULL,
    `coursesAssigned` JSON NULL,
    `onboardingDate` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
