-- AlterTable: Move organization and coordinator fields from learners to course_run_learners
-- This migration moves enrollment-specific data to the course_run_learners table

-- Step 1: Remove deprecated columns from learners table (if they exist)
ALTER TABLE `learners` 
  DROP INDEX IF EXISTS `learners_clientOrganizationId_idx`,
  DROP INDEX IF EXISTS `learners_trainingCoordinatorId_idx`,
  DROP FOREIGN KEY IF EXISTS `learners_clientOrganizationId_fkey`,
  DROP FOREIGN KEY IF EXISTS `learners_trainingCoordinatorId_fkey`;

ALTER TABLE `learners` 
  DROP COLUMN IF EXISTS `clientOrganizationId`,
  DROP COLUMN IF EXISTS `trainingCoordinatorId`,
  DROP COLUMN IF EXISTS `departmentName`;

-- Step 2: Add columns to course_run_learners (if they don't exist)
ALTER TABLE `course_run_learners` 
  ADD COLUMN IF NOT EXISTS `clientOrganizationId` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `trainingCoordinatorId` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `buNumber` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `division` VARCHAR(191) NULL;

-- Step 3: Add indexes
CREATE INDEX IF NOT EXISTS `course_run_learners_clientOrganizationId_idx` ON `course_run_learners`(`clientOrganizationId`);
CREATE INDEX IF NOT EXISTS `course_run_learners_trainingCoordinatorId_idx` ON `course_run_learners`(`trainingCoordinatorId`);

-- Step 4: Add foreign keys (only if they don't exist)
-- Note: MySQL doesn't support IF NOT EXISTS for foreign keys, so we'll use a procedure
DELIMITER $$

CREATE PROCEDURE AddForeignKeyIfNotExists()
BEGIN
    -- Check and add clientOrganizationId foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.TABLE_CONSTRAINTS 
        WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'course_run_learners'
        AND CONSTRAINT_NAME = 'course_run_learners_clientOrganizationId_fkey'
    ) THEN
        ALTER TABLE `course_run_learners` 
            ADD CONSTRAINT `course_run_learners_clientOrganizationId_fkey` 
            FOREIGN KEY (`clientOrganizationId`) REFERENCES `organizations`(`id`) 
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    -- Check and add trainingCoordinatorId foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.TABLE_CONSTRAINTS 
        WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'course_run_learners'
        AND CONSTRAINT_NAME = 'course_run_learners_trainingCoordinatorId_fkey'
    ) THEN
        ALTER TABLE `course_run_learners` 
            ADD CONSTRAINT `course_run_learners_trainingCoordinatorId_fkey` 
            FOREIGN KEY (`trainingCoordinatorId`) REFERENCES `users`(`id`) 
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END$$

DELIMITER ;

CALL AddForeignKeyIfNotExists();
DROP PROCEDURE AddForeignKeyIfNotExists;

-- Step 5: Remove capacity column from venues if it exists
ALTER TABLE `venues` DROP COLUMN IF EXISTS `capacity`;
