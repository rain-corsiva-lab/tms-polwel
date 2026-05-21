-- AddColumn: poNumber and receiptNumber to course_run_learners
-- These fields support the "Course Run Learner 2" bulk import feature
-- which maps PO No./Payment Advice and Receipt No. from Excel columns

ALTER TABLE `course_run_learners` ADD COLUMN `poNumber` VARCHAR(255) NULL;
ALTER TABLE `course_run_learners` ADD COLUMN `receiptNumber` VARCHAR(255) NULL;
