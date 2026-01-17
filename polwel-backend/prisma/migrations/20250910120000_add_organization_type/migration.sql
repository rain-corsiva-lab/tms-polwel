-- Add enum for organization type and update organizations table
ALTER TABLE `organizations` 
  ADD COLUMN `organizationType` ENUM('POLWEL','SPF','PUBLIC_SECTOR','PRIVATE_SECTOR') NOT NULL DEFAULT 'POLWEL';

-- Drop legacy divisionAddress column if exists
ALTER TABLE `organizations` 
  DROP COLUMN `divisionAddress`;
