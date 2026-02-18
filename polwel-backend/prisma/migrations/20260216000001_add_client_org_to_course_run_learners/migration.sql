-- AlterTable: Move organization and coordinator fields from learners to course_run_learners
-- This migration moves enrollment-specific data to the course_run_learners table

-- Step 1: Add columns to course_run_learners first (before removing from learners)
ALTER TABLE `course_run_learners` 
  ADD COLUMN `clientOrganizationId` VARCHAR(191) NULL,
  ADD COLUMN `trainingCoordinatorId` VARCHAR(191) NULL,
  ADD COLUMN `buNumber` VARCHAR(191) NULL,
  ADD COLUMN `division` VARCHAR(191) NULL;

-- Step 2: Add indexes
CREATE INDEX `course_run_learners_clientOrganizationId_idx` ON `course_run_learners`(`clientOrganizationId`);
CREATE INDEX `course_run_learners_trainingCoordinatorId_idx` ON `course_run_learners`(`trainingCoordinatorId`);

-- Step 3: Add foreign keys
ALTER TABLE `course_run_learners` 
  ADD CONSTRAINT `course_run_learners_clientOrganizationId_fkey` 
  FOREIGN KEY (`clientOrganizationId`) REFERENCES `organizations`(`id`) 
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `course_run_learners` 
  ADD CONSTRAINT `course_run_learners_trainingCoordinatorId_fkey` 
  FOREIGN KEY (`trainingCoordinatorId`) REFERENCES `users`(`id`) 
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 4: Remove deprecated columns from learners table (if they exist)
-- Note: These will fail silently if columns don't exist, which is expected
SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0;

-- Drop foreign keys if they exist
SET @drop_fk1 = (SELECT IF(
  EXISTS(
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'learners'
    AND CONSTRAINT_NAME = 'learners_clientOrganizationId_fkey'
  ),
  'ALTER TABLE learners DROP FOREIGN KEY learners_clientOrganizationId_fkey',
  'SELECT 1'
));
PREPARE stmt1 FROM @drop_fk1;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

SET @drop_fk2 = (SELECT IF(
  EXISTS(
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'learners'
    AND CONSTRAINT_NAME = 'learners_trainingCoordinatorId_fkey'
  ),
  'ALTER TABLE learners DROP FOREIGN KEY learners_trainingCoordinatorId_fkey',
  'SELECT 1'
));
PREPARE stmt2 FROM @drop_fk2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Drop indexes if they exist
SET @drop_idx1 = (SELECT IF(
  EXISTS(
    SELECT 1 FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'learners'
    AND INDEX_NAME = 'learners_clientOrganizationId_idx'
  ),
  'ALTER TABLE learners DROP INDEX learners_clientOrganizationId_idx',
  'SELECT 1'
));
PREPARE stmt3 FROM @drop_idx1;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;

SET @drop_idx2 = (SELECT IF(
  EXISTS(
    SELECT 1 FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'learners'
    AND INDEX_NAME = 'learners_trainingCoordinatorId_idx'
  ),
  'ALTER TABLE learners DROP INDEX learners_trainingCoordinatorId_idx',
  'SELECT 1'
));
PREPARE stmt4 FROM @drop_idx2;
EXECUTE stmt4;
DEALLOCATE PREPARE stmt4;

-- Drop columns if they exist
SET @drop_col1 = (SELECT IF(
  EXISTS(
    SELECT 1 FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'learners'
    AND COLUMN_NAME = 'clientOrganizationId'
  ),
  'ALTER TABLE learners DROP COLUMN clientOrganizationId',
  'SELECT 1'
));
PREPARE stmt5 FROM @drop_col1;
EXECUTE stmt5;
DEALLOCATE PREPARE stmt5;

SET @drop_col2 = (SELECT IF(
  EXISTS(
    SELECT 1 FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'learners'
    AND COLUMN_NAME = 'trainingCoordinatorId'
  ),
  'ALTER TABLE learners DROP COLUMN trainingCoordinatorId',
  'SELECT 1'
));
PREPARE stmt6 FROM @drop_col2;
EXECUTE stmt6;
DEALLOCATE PREPARE stmt6;

SET @drop_col3 = (SELECT IF(
  EXISTS(
    SELECT 1 FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'learners'
    AND COLUMN_NAME = 'departmentName'
  ),
  'ALTER TABLE learners DROP COLUMN departmentName',
  'SELECT 1'
));
PREPARE stmt7 FROM @drop_col3;
EXECUTE stmt7;
DEALLOCATE PREPARE stmt7;

-- Drop venues capacity column if it exists
SET @drop_col4 = (SELECT IF(
  EXISTS(
    SELECT 1 FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'venues'
    AND COLUMN_NAME = 'capacity'
  ),
  'ALTER TABLE venues DROP COLUMN capacity',
  'SELECT 1'
));
PREPARE stmt8 FROM @drop_col4;
EXECUTE stmt8;
DEALLOCATE PREPARE stmt8;

SET SQL_NOTES=@OLD_SQL_NOTES;
