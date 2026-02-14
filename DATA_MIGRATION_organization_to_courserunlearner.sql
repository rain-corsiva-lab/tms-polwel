-- Step 1: Add new columns to course_run_learners
-- Note: These will fail if columns already exist, but that's okay
ALTER TABLE `course_run_learners` ADD COLUMN `clientOrganizationId` VARCHAR(191) NULL;
ALTER TABLE `course_run_learners` ADD COLUMN `trainingCoordinatorId` VARCHAR(191) NULL;
ALTER TABLE `course_run_learners` ADD COLUMN `division` VARCHAR(191) NULL;
ALTER TABLE `course_run_learners` ADD COLUMN `buNumber` VARCHAR(191) NULL;

-- Step 2: Migrate existing data from learners to course_run_learners
UPDATE `course_run_learners` crl
INNER JOIN `learners` l ON crl.learnerId = l.id
SET 
  crl.clientOrganizationId = l.clientOrganizationId,
  crl.trainingCoordinatorId = l.trainingCoordinatorId
WHERE 
  crl.clientOrganizationId IS NULL 
  OR crl.trainingCoordinatorId IS NULL;

-- Step 3: Copy departmentName if not already set in course_run_learners
UPDATE `course_run_learners` crl
INNER JOIN `learners` l ON crl.learnerId = l.id
SET crl.departmentName = l.departmentName
WHERE l.departmentName IS NOT NULL 
  AND (crl.departmentName IS NULL OR crl.departmentName = '');

-- Step 4: Add indexes for the new foreign keys
CREATE INDEX `course_run_learners_clientOrganizationId_idx` ON `course_run_learners`(`clientOrganizationId`);
CREATE INDEX `course_run_learners_trainingCoordinatorId_idx` ON `course_run_learners`(`trainingCoordinatorId`);

-- Step 5: Drop foreign key constraints from learners table first
ALTER TABLE `learners` DROP FOREIGN KEY `learners_clientOrganizationId_fkey`;
ALTER TABLE `learners` DROP FOREIGN KEY `learners_trainingCoordinatorId_fkey`;

-- Step 6: Drop indexes
ALTER TABLE `learners` DROP INDEX `learners_clientOrganizationId_fkey`;
ALTER TABLE `learners` DROP INDEX `learners_trainingCoordinatorId_fkey`;

-- Step 7: Drop old columns from learners table
ALTER TABLE `learners` DROP COLUMN `clientOrganizationId`;
ALTER TABLE `learners` DROP COLUMN `departmentName`;
ALTER TABLE `learners` DROP COLUMN `trainingCoordinatorId`;

-- Note: Foreign key constraints will be added by Prisma after this migration
