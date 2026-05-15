-- AlterTable: Add enhanced error tracking columns to email_logs
-- This migration adds comprehensive error classification and provider tracking
-- to ensure every email send attempt is fully captured regardless of failure source.

ALTER TABLE `email_logs`
  ADD COLUMN `provider`       VARCHAR(50)  NULL AFTER `errorCode`,
  ADD COLUMN `errorCategory`  VARCHAR(50)  NULL AFTER `provider`,
  ADD COLUMN `smtpResponse`   TEXT         NULL AFTER `errorCategory`,
  ADD COLUMN `errorStack`     TEXT         NULL AFTER `smtpResponse`,
  ADD COLUMN `sentAt`         DATETIME(3)  NULL AFTER `errorStack`;

-- Indexes for fast filtering by provider and errorCategory
CREATE INDEX `email_logs_provider_idx`       ON `email_logs`(`provider`);
CREATE INDEX `email_logs_errorCategory_idx`  ON `email_logs`(`errorCategory`);
