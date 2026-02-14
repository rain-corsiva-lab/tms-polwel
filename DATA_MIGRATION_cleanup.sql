-- Migrate existing data from learners to course_run_learners
UPDATE `course_run_learners` crl
INNER JOIN `learners` l ON crl.learnerId = l.id
SET 
  crl.clientOrganizationId = COALESCE(crl.clientOrganizationId, l.clientOrganizationId),
  crl.trainingCoordinatorId = COALESCE(crl.trainingCoordinatorId, l.trainingCoordinatorId),
  crl.departmentName = COALESCE(crl.departmentName, l.departmentName);

-- Drop indexes from learners table
ALTER TABLE `learners` DROP INDEX `learners_clientOrganizationId_idx`;
ALTER TABLE `learners` DROP INDEX `learners_trainingCoordinatorId_idx`;

-- Drop old columns from learners table
ALTER TABLE `learners` DROP COLUMN `clientOrganizationId`;
ALTER TABLE `learners` DROP COLUMN `departmentName`;
ALTER TABLE `learners` DROP COLUMN `trainingCoordinatorId`;
