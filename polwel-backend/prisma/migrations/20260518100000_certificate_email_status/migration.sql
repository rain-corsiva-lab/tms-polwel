-- AlterTable: add certificateEmailStatus and certificateEmailSentAt to course_run_learners
ALTER TABLE `course_run_learners`
  ADD COLUMN `certificateEmailStatus` ENUM('NOT_SENT','SENDING','SENT','FAILED') NOT NULL DEFAULT 'NOT_SENT',
  ADD COLUMN `certificateEmailSentAt` DATETIME(3) NULL;
