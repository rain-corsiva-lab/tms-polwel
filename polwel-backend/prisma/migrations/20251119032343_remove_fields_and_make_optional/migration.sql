/*
  Warnings:

  - You are about to drop the column `courseFeeType` on the `course_runs` table. All the data in the column will be lost.
  - You are about to drop the column `courseFeeType` on the `courses` table. All the data in the column will be lost.
  - You are about to drop the column `courseOutline` on the `courses` table. All the data in the column will be lost.
  - You are about to drop the column `venue` on the `courses` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `course_runs` DROP COLUMN `courseFeeType`;

-- AlterTable
ALTER TABLE `courses` DROP COLUMN `courseFeeType`,
    DROP COLUMN `courseOutline`,
    DROP COLUMN `venue`,
    MODIFY `venueFee` DOUBLE NULL DEFAULT 0;
