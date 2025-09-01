-- CreateTable Trainer Fees
CREATE TABLE `trainer_fees` (
  `id` varchar(191) NOT NULL,
  `trainerId` varchar(191) NOT NULL,
  `courseId` varchar(191) NOT NULL,
  `feePerRun` double NOT NULL DEFAULT 0,
  `remarks` longtext NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `createdBy` varchar(191) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `trainer_fees_trainerId_courseId_unique` (`trainerId`,`courseId`),
  KEY `trainer_fees_trainerId_idx` (`trainerId`),
  KEY `trainer_fees_courseId_idx` (`courseId`),
  KEY `trainer_fees_createdBy_idx` (`createdBy`),
  CONSTRAINT `trainer_fees_trainerId_fkey` FOREIGN KEY (`trainerId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `trainer_fees_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `trainer_fees_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
