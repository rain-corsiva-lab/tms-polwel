-- AlterTable: Make trainerEmail optional in partner_trainers table
ALTER TABLE `partner_trainers` MODIFY COLUMN `trainerEmail` VARCHAR(255) NULL;
