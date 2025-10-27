/*
  Warnings:

  - You are about to drop the column `venueMaxParticipants` on the `course_runs` table. All the data in the column will be lost.
  - You are about to drop the column `venuePerHeadFeeIfMaxExceed` on the `course_runs` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `course_runs` DROP COLUMN `venueMaxParticipants`,
    DROP COLUMN `venuePerHeadFeeIfMaxExceed`,
    ADD COLUMN `perHeadFeeIfMaxExceed` DECIMAL(10, 2) NULL,
    ADD COLUMN `venueMaxParticipant` INTEGER NULL;
