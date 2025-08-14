/*
  Warnings:

  - You are about to drop the column `permissionId` on the `user_permissions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,permissionName]` on the table `user_permissions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `permissionName` to the `user_permissions` table without a default value. This is not possible if the table is not empty.

*/

-- First, add the new column with a temporary default
ALTER TABLE "public"."user_permissions" ADD COLUMN "permissionName" TEXT DEFAULT 'temp';

-- Update the permission names based on the existing permissionId relationships
UPDATE "public"."user_permissions" 
SET "permissionName" = p.name 
FROM "public"."permissions" p 
WHERE "user_permissions"."permissionId" = p.id;

-- Remove the temporary default
ALTER TABLE "public"."user_permissions" ALTER COLUMN "permissionName" DROP DEFAULT;

-- Now make it NOT NULL
ALTER TABLE "public"."user_permissions" ALTER COLUMN "permissionName" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "public"."user_permissions" DROP CONSTRAINT "user_permissions_permissionId_fkey";

-- DropIndex
DROP INDEX "public"."user_permissions_userId_permissionId_key";

-- AlterTable (drop the old permissionId column)
ALTER TABLE "public"."user_permissions" DROP COLUMN "permissionId";

-- CreateIndex
CREATE UNIQUE INDEX "user_permissions_userId_permissionName_key" ON "public"."user_permissions"("userId", "permissionName");
