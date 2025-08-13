/*
  Warnings:

  - You are about to drop the column `contactEmail` on the `venues` table. All the data in the column will be lost.
  - You are about to drop the column `contactName` on the `venues` table. All the data in the column will be lost.
  - You are about to drop the column `contactNumber` on the `venues` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."venues" DROP COLUMN "contactEmail",
DROP COLUMN "contactName",
DROP COLUMN "contactNumber",
ADD COLUMN     "contacts" JSONB[] DEFAULT ARRAY[]::JSONB[];
