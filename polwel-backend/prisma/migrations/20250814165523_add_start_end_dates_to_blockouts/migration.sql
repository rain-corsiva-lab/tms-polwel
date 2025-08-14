/*
  Warnings:

  - You are about to drop the column `date` on the `trainer_blockouts` table. All the data in the column will be lost.
  - Added the required column `endDate` to the `trainer_blockouts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDate` to the `trainer_blockouts` table without a default value. This is not possible if the table is not empty.

*/
-- Add new columns with temporary default values
ALTER TABLE "public"."trainer_blockouts" 
ADD COLUMN "startDate" TIMESTAMP(3),
ADD COLUMN "endDate" TIMESTAMP(3);

-- Migrate existing data: use existing date as both start and end date
UPDATE "public"."trainer_blockouts" 
SET "startDate" = "date", "endDate" = "date";

-- Make the columns NOT NULL
ALTER TABLE "public"."trainer_blockouts" 
ALTER COLUMN "startDate" SET NOT NULL,
ALTER COLUMN "endDate" SET NOT NULL;

-- Drop the old date column
ALTER TABLE "public"."trainer_blockouts" DROP COLUMN "date";
