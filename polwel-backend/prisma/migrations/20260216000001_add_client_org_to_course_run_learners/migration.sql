-- AlterTable: Move organization and coordinator fields from learners to course_run_learners
-- This migration moves enrollment-specific data to the course_run_learners table

-- Step 1: Remove deprecated columns from learners table (if they exist)
-- Using stored procedure for compatibility with older MySQL versions
DELIMITER $$

CREATE PROCEDURE DropLearnersColumnsIfExists()
BEGIN
    -- Drop indexes if they exist
    IF EXISTS (
        SELECT 1 FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'learners'
        AND INDEX_NAME = 'learners_clientOrganizationId_idx'
    ) THEN
        ALTER TABLE `learners` DROP INDEX `learners_clientOrganizationId_idx`;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'learners'
        AND INDEX_NAME = 'learners_trainingCoordinatorId_idx'
    ) THEN
        ALTER TABLE `learners` DROP INDEX `learners_trainingCoordinatorId_idx`;
    END IF;

    -- Drop foreign keys if they exist
    IF EXISTS (
        SELECT 1 FROM information_schema.TABLE_CONSTRAINTS 
        WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'learners'
        AND CONSTRAINT_NAME = 'learners_clientOrganizationId_fkey'
    ) THEN
        ALTER TABLE `learners` DROP FOREIGN KEY `learners_clientOrganizationId_fkey`;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.TABLE_CONSTRAINTS 
        WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'learners'
        AND CONSTRAINT_NAME = 'learners_trainingCoordinatorId_fkey'
    ) THEN
        ALTER TABLE `learners` DROP FOREIGN KEY `learners_trainingCoordinatorId_fkey`;
    END IF;

    -- Drop columns if they exist
    IF EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'learners'
        AND COLUMN_NAME = 'clientOrganizationId'
    ) THEN
        ALTER TABLE `learners` DROP COLUMN `clientOrganizationId`;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'learners'
        AND COLUMN_NAME = 'trainingCoordinatorId'
    ) THEN
        ALTER TABLE `learners` DROP COLUMN `trainingCoordinatorId`;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'learners'
        AND COLUMN_NAME = 'departmentName'
    ) THEN
        ALTER TABLE `learners` DROP COLUMN `departmentName`;
    END IF;
END$$

DELIMITER ;

CALL DropLearnersColumnsIfExists();
DROP PROCEDURE DropLearnersColumnsIfExists;

-- Step 2: Add columns to course_run_learners (if they don't exist)
DELIMITER $$

CREATE PROCEDURE AddCourseRunLearnersColumnsIfNotExists()
BEGIN
    -- Add clientOrganizationId if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'course_run_learners'
        AND COLUMN_NAME = 'clientOrganizationId'
    ) THEN
        ALTER TABLE `course_run_learners` ADD COLUMN `clientOrganizationId` VARCHAR(191) NULL;
    END IF;

    -- Add trainingCoordinatorId if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'course_run_learners'
        AND COLUMN_NAME = 'trainingCoordinatorId'
    ) THEN
        ALTER TABLE `course_run_learners` ADD COLUMN `trainingCoordinatorId` VARCHAR(191) NULL;
    END IF;

    -- Add buNumber if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'course_run_learners'
        AND COLUMN_NAME = 'buNumber'
    ) THEN
        ALTER TABLE `course_run_learners` ADD COLUMN `buNumber` VARCHAR(191) NULL;
    END IF;

    -- Add division if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'course_run_learners'
        AND COLUMN_NAME = 'division'
    ) THEN
        ALTER TABLE `course_run_learners` ADD COLUMN `division` VARCHAR(191) NULL;
    END IF;
END$$

DELIMITER ;

CALL AddCourseRunLearnersColumnsIfNotExists();
DROP PROCEDURE AddCourseRunLearnersColumnsIfNotExists;

-- Step 3: Add indexes (if they don't exist)
DELIMITER $$

CREATE PROCEDURE AddCourseRunLearnersIndexesIfNotExists()
BEGIN
    -- Add clientOrganizationId index if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'course_run_learners'
        AND INDEX_NAME = 'course_run_learners_clientOrganizationId_idx'
    ) THEN
        CREATE INDEX `course_run_learners_clientOrganizationId_idx` ON `course_run_learners`(`clientOrganizationId`);
    END IF;

    -- Add trainingCoordinatorId index if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'course_run_learners'
        AND INDEX_NAME = 'course_run_learners_trainingCoordinatorId_idx'
    ) THEN
        CREATE INDEX `course_run_learners_trainingCoordinatorId_idx` ON `course_run_learners`(`trainingCoordinatorId`);
    END IF;
END$$

DELIMITER ;

CALL AddCourseRunLearnersIndexesIfNotExists();
DROP PROCEDURE AddCourseRunLearnersIndexesIfNotExists;

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
DELIMITER $$

CREATE PROCEDURE DropVenuesCapacityIfExists()
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'venues'
        AND COLUMN_NAME = 'capacity'
    ) THEN
        ALTER TABLE `venues` DROP COLUMN `capacity`;
    END IF;
END$$

DELIMITER ;

CALL DropVenuesCapacityIfExists();
DROP PROCEDURE DropVenuesCapacityIfExists;
