-- AlterTable
ALTER TABLE `course_run_learners` MODIFY `attendanceStatus` ENUM('PENDING', 'PRESENT', 'ABSENT') NULL DEFAULT 'PENDING';
