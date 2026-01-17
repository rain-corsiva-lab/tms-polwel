-- AlterTable
ALTER TABLE `course_runs` ADD COLUMN `clientOrganizationId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `course_runs_clientOrganizationId_idx` ON `course_runs`(`clientOrganizationId`);

-- AddForeignKey
ALTER TABLE `course_runs` ADD CONSTRAINT `course_runs_clientOrganizationId_fkey` FOREIGN KEY (`clientOrganizationId`) REFERENCES `organizations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
