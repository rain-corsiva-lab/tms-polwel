-- AlterTable
ALTER TABLE `bookings` MODIFY `notes` TEXT NULL,
    MODIFY `specialRequirements` TEXT NULL,
    MODIFY `cancellationReason` TEXT NULL;

-- AlterTable
ALTER TABLE `course_runs` MODIFY `notes` TEXT NULL;

-- AlterTable
ALTER TABLE `courses` MODIFY `remarks` TEXT NULL,
    MODIFY `targetAudience` TEXT NULL,
    MODIFY `syllabus` TEXT NULL,
    MODIFY `assessmentMethod` TEXT NULL;

-- AlterTable
ALTER TABLE `trainer_blockouts` MODIFY `description` TEXT NULL;

-- AlterTable
ALTER TABLE `users` MODIFY `mfaSecret` TEXT NULL,
    MODIFY `refreshToken` TEXT NULL,
    MODIFY `resetToken` TEXT NULL;

-- AlterTable
ALTER TABLE `venues` MODIFY `remarks` TEXT NULL;
