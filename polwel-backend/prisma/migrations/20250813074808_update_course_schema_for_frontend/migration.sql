-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."CourseStatus" ADD VALUE 'ACTIVE';
ALTER TYPE "public"."CourseStatus" ADD VALUE 'ARCHIVED';

-- AlterTable
ALTER TABLE "public"."courses" ADD COLUMN     "certificates" TEXT NOT NULL DEFAULT 'polwel',
ADD COLUMN     "courseOutline" JSONB,
ADD COLUMN     "durationType" TEXT NOT NULL DEFAULT 'days',
ADD COLUMN     "remarks" TEXT,
ADD COLUMN     "targetAudience" TEXT,
ADD COLUMN     "trainerFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "trainers" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "venue" TEXT,
ADD COLUMN     "venueFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "objectives" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "duration" SET DATA TYPE TEXT,
ALTER COLUMN "maxParticipants" SET DEFAULT 25,
ALTER COLUMN "prerequisites" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "materials" SET DEFAULT ARRAY[]::TEXT[];
