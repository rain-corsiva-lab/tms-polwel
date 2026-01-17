/*
  Warnings:

  - You are about to drop the column `displayName` on the `organizations` table. All the data in the column will be lost.
  - The values [CHEQUE] on the enum `users_paymentMode` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `organizations` DROP COLUMN `displayName`;

-- AlterTable
ALTER TABLE `users` MODIFY `paymentMode` ENUM('COMPANY_BILLING', 'CREDIT_CARD', 'BANK_TRANSFER', 'ULTF', 'TRANSITION_DOLLARS', 'SELF_SPONSORED', 'GOVERNMENT_FUNDING', 'NOT_APPLICABLE') NULL;
