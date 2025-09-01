-- Add new course refactor fields
ALTER TABLE `courses`
  ADD COLUMN `courseCode` VARCHAR(50) NULL,
  ADD COLUMN `specifiedLocation` VARCHAR(191) NULL,
  ADD COLUMN `defaultCourseFee` DOUBLE NOT NULL DEFAULT 0,
  ADD COLUMN `discounts` JSON NULL,
  ADD COLUMN `billingRate` DOUBLE NOT NULL DEFAULT 0,
  ADD COLUMN `contractsFeePayout` DOUBLE NOT NULL DEFAULT 0;

-- Create unique index for courseCode
CREATE UNIQUE INDEX `courses_courseCode_key` ON `courses`(`courseCode`);
