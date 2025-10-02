/*
  Warnings:

  - You are about to drop the column `trainers` on the `courses` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `courses` DROP COLUMN `trainers`;

-- CreateTable
CREATE TABLE `course_trainers` (
    `id` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,
    `trainerId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `course_trainers_courseId_fkey`(`courseId`),
    INDEX `course_trainers_trainerId_fkey`(`trainerId`),
    UNIQUE INDEX `course_trainers_courseId_trainerId_key`(`courseId`, `trainerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `course_trainers` ADD CONSTRAINT `course_trainers_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_trainers` ADD CONSTRAINT `course_trainers_trainerId_fkey` FOREIGN KEY (`trainerId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
