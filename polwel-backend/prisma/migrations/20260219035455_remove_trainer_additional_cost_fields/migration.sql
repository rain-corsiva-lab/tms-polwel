-- Remove additionalCost and additionalCostUnit fields from course_run_trainers table
-- Use conditional checks for MySQL 5.7 compatibility

SET @drop_col1 = (SELECT IF(
  EXISTS(
    SELECT 1 FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'course_run_trainers'
    AND COLUMN_NAME = 'additionalCost'
  ),
  'ALTER TABLE course_run_trainers DROP COLUMN additionalCost',
  'SELECT 1'
));
PREPARE stmt1 FROM @drop_col1;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

SET @drop_col2 = (SELECT IF(
  EXISTS(
    SELECT 1 FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'course_run_trainers'
    AND COLUMN_NAME = 'additionalCostUnit'
  ),
  'ALTER TABLE course_run_trainers DROP COLUMN additionalCostUnit',
  'SELECT 1'
));
PREPARE stmt2 FROM @drop_col2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

