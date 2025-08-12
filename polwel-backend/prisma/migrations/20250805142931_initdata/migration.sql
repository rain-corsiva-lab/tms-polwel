-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('POLWEL', 'TRAINING_COORDINATOR', 'TRAINER', 'LEARNER');

-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING', 'LOCKED');

-- CreateEnum
CREATE TYPE "public"."AvailabilityStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'LIMITED');

-- CreateEnum
CREATE TYPE "public"."PaymentMode" AS ENUM ('ULTF', 'TRANSITION_DOLLARS', 'BANK_TRANSFER', 'CHEQUE');

-- CreateEnum
CREATE TYPE "public"."CourseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."VenueStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "public"."FeeType" AS ENUM ('PER_HEAD', 'PER_VENUE', 'FIXED');

-- CreateEnum
CREATE TYPE "public"."AuditActionType" AS ENUM ('LOGIN', 'LOGOUT', 'CREATION', 'UPDATE', 'DELETION', 'STATUS_CHANGE', 'PERMISSION_CHANGE', 'PASSWORD_CHANGE', 'PROFILE_UPDATE');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "status" "public"."UserStatus" NOT NULL DEFAULT 'PENDING',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "lastLogin" TIMESTAMP(3),
    "passwordExpiry" TIMESTAMP(3),
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "refreshToken" TEXT,
    "permissionLevel" TEXT,
    "department" TEXT,
    "organizationId" TEXT,
    "division" TEXT,
    "buCostCentre" TEXT,
    "buNumberRequired" BOOLEAN,
    "paymentMode" "public"."PaymentMode",
    "contactNumber" TEXT,
    "additionalEmails" TEXT[],
    "availabilityStatus" "public"."AvailabilityStatus",
    "partnerOrganization" TEXT,
    "bio" TEXT,
    "specializations" TEXT[],
    "certifications" TEXT[],
    "profileImage" TEXT,
    "experience" TEXT,
    "rating" DOUBLE PRECISION,
    "employeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "industry" TEXT,
    "address" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "buNumber" TEXT,
    "divisionAddress" TEXT,
    "status" "public"."UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."courses" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "objectives" TEXT[],
    "duration" INTEGER NOT NULL,
    "maxParticipants" INTEGER NOT NULL,
    "minParticipants" INTEGER NOT NULL DEFAULT 1,
    "category" TEXT,
    "level" TEXT,
    "prerequisites" TEXT[],
    "materials" TEXT[],
    "status" "public"."CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "courseFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountPerPax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adminFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contingencyFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "serviceFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vitalFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "syllabus" TEXT,
    "assessmentMethod" TEXT,
    "certificationType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."course_runs" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Singapore',
    "venueId" TEXT,
    "trainerId" TEXT,
    "externalTrainerName" TEXT,
    "maxParticipants" INTEGER NOT NULL,
    "currentParticipants" INTEGER NOT NULL DEFAULT 0,
    "status" "public"."CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "trainerFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "venueFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."venues" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "capacity" TEXT NOT NULL,
    "description" TEXT,
    "facilities" TEXT[],
    "contactName" TEXT,
    "contactNumber" TEXT,
    "contactEmail" TEXT,
    "feeType" "public"."FeeType" NOT NULL DEFAULT 'PER_VENUE',
    "fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "public"."VenueStatus" NOT NULL DEFAULT 'ACTIVE',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bookings" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "courseRunId" TEXT,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "venueId" TEXT,
    "participantCount" INTEGER NOT NULL DEFAULT 1,
    "status" "public"."BookingStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "specialRequirements" TEXT,
    "customStartDate" TIMESTAMP(3),
    "customEndDate" TIMESTAMP(3),
    "customStartTime" TEXT,
    "customEndTime" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentStatus" TEXT DEFAULT 'PENDING',
    "paymentReference" TEXT,
    "bookingReference" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."trainer_blockouts" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringPattern" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trainer_blockouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "actionType" "public"."AuditActionType" NOT NULL,
    "tableName" TEXT,
    "recordId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "performedBy" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."permissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_permissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "dataType" TEXT NOT NULL DEFAULT 'string',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_bookingReference_key" ON "public"."bookings"("bookingReference");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "public"."permissions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_permissions_userId_permissionId_key" ON "public"."user_permissions"("userId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "public"."system_settings"("key");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."courses" ADD CONSTRAINT "courses_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."course_runs" ADD CONSTRAINT "course_runs_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."course_runs" ADD CONSTRAINT "course_runs_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "public"."venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."course_runs" ADD CONSTRAINT "course_runs_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."venues" ADD CONSTRAINT "venues_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bookings" ADD CONSTRAINT "bookings_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bookings" ADD CONSTRAINT "bookings_courseRunId_fkey" FOREIGN KEY ("courseRunId") REFERENCES "public"."course_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bookings" ADD CONSTRAINT "bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bookings" ADD CONSTRAINT "bookings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bookings" ADD CONSTRAINT "bookings_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "public"."venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bookings" ADD CONSTRAINT "bookings_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."trainer_blockouts" ADD CONSTRAINT "trainer_blockouts_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
