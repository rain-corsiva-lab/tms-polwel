/*
  Warnings:

  - You are about to drop the column `currentParticipants` on the `course_runs` table. All the data in the column will be lost.
  - You are about to drop the column `endDate` on the `course_runs` table. All the data in the column will be lost.
  - You are about to drop the column `endTime` on the `course_runs` table. All the data in the column will be lost.
  - You are about to drop the column `externalTrainerName` on the `course_runs` table. All the data in the column will be lost.
  - You are about to drop the column `maxParticipants` on the `course_runs` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `course_runs` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `course_runs` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `course_runs` table. All the data in the column will be lost.
  - You are about to drop the column `timezone` on the `course_runs` table. All the data in the column will be lost.
  - You are about to drop the column `totalCost` on the `course_runs` table. All the data in the column will be lost.
  - You are about to drop the column `trainerFee` on the `course_runs` table. All the data in the column will be lost.
  - You are about to drop the column `trainerId` on the `course_runs` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `course_runs` DROP FOREIGN KEY `course_runs_trainerId_fkey`;

-- DropIndex
DROP INDEX `course_runs_trainerId_fkey` ON `course_runs`;

-- AlterTable
ALTER TABLE `course_runs` DROP COLUMN `currentParticipants`,
    DROP COLUMN `endDate`,
    DROP COLUMN `endTime`,
    DROP COLUMN `externalTrainerName`,
    DROP COLUMN `maxParticipants`,
    DROP COLUMN `notes`,
    DROP COLUMN `startDate`,
    DROP COLUMN `startTime`,
    DROP COLUMN `timezone`,
    DROP COLUMN `totalCost`,
    DROP COLUMN `trainerFee`,
    DROP COLUMN `trainerId`,
    ADD COLUMN `adminFee` DECIMAL(10, 2) NULL,
    ADD COLUMN `baseCourseFee` DECIMAL(10, 2) NULL,
    ADD COLUMN `billingReportId` VARCHAR(191) NULL,
    ADD COLUMN `contingencyFee` DECIMAL(10, 2) NULL,
    ADD COLUMN `courseRunType` ENUM('OPEN', 'DEDICATED', 'TALKS', 'CUSTOMIZED') NULL,
    ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `endDatetime` DATETIME(3) NULL,
    ADD COLUMN `feeType` ENUM('PER_HEAD', 'PER_VENUE', 'FIXED') NULL,
    ADD COLUMN `individualRegistrationRequired` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `maxClassSize` INTEGER NULL,
    ADD COLUMN `minClassSize` INTEGER NULL,
    ADD COLUMN `otherFee` DECIMAL(10, 2) NULL,
    ADD COLUMN `remarks` TEXT NULL,
    ADD COLUMN `serialNumber` VARCHAR(191) NULL,
    ADD COLUMN `specifiedLocation` VARCHAR(191) NULL,
    ADD COLUMN `startDatetime` DATETIME(3) NULL,
    ADD COLUMN `venueType` ENUM('HOTEL', 'ON_PREMISE', 'CLIENT_FACILITY') NULL,
    MODIFY `venueFee` DECIMAL(10, 2) NULL;

-- AlterTable
ALTER TABLE `venues` ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `venueType` ENUM('HOTEL', 'ON_PREMISE', 'CLIENT_FACILITY') NULL;

-- CreateTable
CREATE TABLE `course_run_billings` (
    `id` VARCHAR(191) NOT NULL,
    `courseRunId` VARCHAR(191) NOT NULL,
    `valueOfWorkDone` INTEGER NULL,
    `contractFeePBMSBENumber` VARCHAR(191) NULL,
    `contractPBMSInvoiceDate` DATETIME(3) NULL,
    `contractInvoiceAmount` DECIMAL(10, 2) NULL,
    `venuePBMSBENumber` VARCHAR(191) NULL,
    `venuePBMSInvoiceDate` DATETIME(3) NULL,
    `venueInvoiceAmount` DECIMAL(10, 2) NULL,
    `finalRemarks` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `course_run_billings_courseRunId_key`(`courseRunId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `course_run_billing_entries` (
    `id` VARCHAR(191) NOT NULL,
    `courseRunBillingId` VARCHAR(191) NOT NULL,
    `pbmsInvoiceNumber` VARCHAR(191) NULL,
    `pbmsInvoiceDate` VARCHAR(191) NULL,
    `invoiceAmount` DECIMAL(10, 2) NULL,
    `remarks` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `course_run_billing_entries_courseRunBillingId_idx`(`courseRunBillingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `course_run_trainers` (
    `id` VARCHAR(191) NOT NULL,
    `courseRunId` VARCHAR(191) NOT NULL,
    `trainerId` VARCHAR(191) NOT NULL,
    `trainerBaseAmount` DECIMAL(10, 2) NULL,
    `additionalCost` DECIMAL(10, 2) NULL,
    `remarks` TEXT NULL,
    `trainerAssignmentEmailStatus` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `course_run_trainers_courseRunId_idx`(`courseRunId`),
    INDEX `course_run_trainers_trainerId_idx`(`trainerId`),
    UNIQUE INDEX `course_run_trainers_courseRunId_trainerId_key`(`courseRunId`, `trainerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `learners` (
    `id` VARCHAR(191) NOT NULL,
    `fullname` VARCHAR(191) NOT NULL,
    `designation` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `contact` VARCHAR(191) NULL,
    `clientOrganizationId` VARCHAR(191) NULL,
    `paymentMode` VARCHAR(191) NULL,
    `departmentName` VARCHAR(191) NULL,
    `trainingCoordinatorId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `learners_clientOrganizationId_idx`(`clientOrganizationId`),
    INDEX `learners_trainingCoordinatorId_idx`(`trainingCoordinatorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `course_run_learners` (
    `id` VARCHAR(191) NOT NULL,
    `courseRunId` VARCHAR(191) NOT NULL,
    `learnerId` VARCHAR(191) NOT NULL,
    `currentDefaultCourseFee` DECIMAL(10, 2) NULL,
    `discountId` VARCHAR(191) NULL,
    `discountPercentage` DECIMAL(5, 2) NULL,
    `discountAmount` DECIMAL(10, 2) NULL,
    `totalFees` DECIMAL(10, 2) NULL,
    `feesRemarks` TEXT NULL,
    `invoiceNumber` VARCHAR(191) NULL,
    `remarks` TEXT NULL,
    `attendanceStatus` ENUM('PRESENT', 'ABSENT') NULL DEFAULT 'PRESENT',
    `enrollmentStatus` ENUM('ENROLLED', 'WITHDRAWN') NULL DEFAULT 'ENROLLED',
    `withdrawnReason` TEXT NULL,
    `supportingDocumentWithdrawnId` VARCHAR(191) NULL,
    `courseRunBillingEntryId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `course_run_learners_courseRunId_idx`(`courseRunId`),
    INDEX `course_run_learners_learnerId_idx`(`learnerId`),
    INDEX `course_run_learners_courseRunBillingEntryId_idx`(`courseRunBillingEntryId`),
    UNIQUE INDEX `course_run_learners_courseRunId_learnerId_key`(`courseRunId`, `learnerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `course_run_learner_attendance` (
    `id` VARCHAR(191) NOT NULL,
    `courseRunId` VARCHAR(191) NOT NULL,
    `learnerId` VARCHAR(191) NOT NULL,
    `day` INTEGER NOT NULL,
    `attendAM` BOOLEAN NOT NULL DEFAULT false,
    `attendPM` BOOLEAN NOT NULL DEFAULT false,
    `editedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `course_run_learner_attendance_courseRunId_idx`(`courseRunId`),
    INDEX `course_run_learner_attendance_learnerId_idx`(`learnerId`),
    UNIQUE INDEX `course_run_learner_attendance_courseRunId_learnerId_day_key`(`courseRunId`, `learnerId`, `day`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `media` (
    `id` VARCHAR(191) NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `originalName` VARCHAR(191) NULL,
    `mimeType` VARCHAR(191) NULL,
    `size` INTEGER NULL,
    `path` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `billing_reports` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trainer_assignment_email_history` (
    `id` VARCHAR(191) NOT NULL,
    `trainerId` VARCHAR(191) NOT NULL,
    `courseRunId` VARCHAR(191) NOT NULL,
    `cc` TEXT NULL,
    `additionalBodyContent` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `trainer_assignment_email_history_trainerId_idx`(`trainerId`),
    INDEX `trainer_assignment_email_history_courseRunId_idx`(`courseRunId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `confirmation_email_history` (
    `id` VARCHAR(191) NOT NULL,
    `courseRunLearnersId` VARCHAR(191) NOT NULL,
    `courseRunId` VARCHAR(191) NOT NULL,
    `remarks` TEXT NULL,
    `attachmentId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `confirmation_email_history_courseRunLearnersId_idx`(`courseRunLearnersId`),
    INDEX `confirmation_email_history_courseRunId_idx`(`courseRunId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `course_runs_billingReportId_fkey` ON `course_runs`(`billingReportId`);

-- AddForeignKey
ALTER TABLE `course_runs` ADD CONSTRAINT `course_runs_billingReportId_fkey` FOREIGN KEY (`billingReportId`) REFERENCES `billing_reports`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_run_billings` ADD CONSTRAINT `course_run_billings_courseRunId_fkey` FOREIGN KEY (`courseRunId`) REFERENCES `course_runs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_run_billing_entries` ADD CONSTRAINT `course_run_billing_entries_courseRunBillingId_fkey` FOREIGN KEY (`courseRunBillingId`) REFERENCES `course_run_billings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_run_trainers` ADD CONSTRAINT `course_run_trainers_courseRunId_fkey` FOREIGN KEY (`courseRunId`) REFERENCES `course_runs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_run_trainers` ADD CONSTRAINT `course_run_trainers_trainerId_fkey` FOREIGN KEY (`trainerId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `learners` ADD CONSTRAINT `learners_clientOrganizationId_fkey` FOREIGN KEY (`clientOrganizationId`) REFERENCES `organizations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `learners` ADD CONSTRAINT `learners_trainingCoordinatorId_fkey` FOREIGN KEY (`trainingCoordinatorId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_run_learners` ADD CONSTRAINT `course_run_learners_courseRunId_fkey` FOREIGN KEY (`courseRunId`) REFERENCES `course_runs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_run_learners` ADD CONSTRAINT `course_run_learners_learnerId_fkey` FOREIGN KEY (`learnerId`) REFERENCES `learners`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_run_learners` ADD CONSTRAINT `course_run_learners_supportingDocumentWithdrawnId_fkey` FOREIGN KEY (`supportingDocumentWithdrawnId`) REFERENCES `media`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_run_learners` ADD CONSTRAINT `course_run_learners_courseRunBillingEntryId_fkey` FOREIGN KEY (`courseRunBillingEntryId`) REFERENCES `course_run_billing_entries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_run_learner_attendance` ADD CONSTRAINT `course_run_learner_attendance_courseRunId_fkey` FOREIGN KEY (`courseRunId`) REFERENCES `course_runs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_run_learner_attendance` ADD CONSTRAINT `course_run_learner_attendance_learnerId_fkey` FOREIGN KEY (`learnerId`) REFERENCES `learners`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_run_learner_attendance` ADD CONSTRAINT `course_run_learner_attendance_editedBy_fkey` FOREIGN KEY (`editedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trainer_assignment_email_history` ADD CONSTRAINT `trainer_assignment_email_history_trainerId_fkey` FOREIGN KEY (`trainerId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trainer_assignment_email_history` ADD CONSTRAINT `trainer_assignment_email_history_courseRunId_fkey` FOREIGN KEY (`courseRunId`) REFERENCES `course_runs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `confirmation_email_history` ADD CONSTRAINT `confirmation_email_history_courseRunLearnersId_fkey` FOREIGN KEY (`courseRunLearnersId`) REFERENCES `course_run_learners`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `confirmation_email_history` ADD CONSTRAINT `confirmation_email_history_courseRunId_fkey` FOREIGN KEY (`courseRunId`) REFERENCES `course_runs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `confirmation_email_history` ADD CONSTRAINT `confirmation_email_history_attachmentId_fkey` FOREIGN KEY (`attachmentId`) REFERENCES `media`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
