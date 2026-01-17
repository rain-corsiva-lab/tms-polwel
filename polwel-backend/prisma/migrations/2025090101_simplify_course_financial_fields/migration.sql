-- Manual migration: simplify course financial fields
-- Backup deprecated financial data into remarks column (JSON appended) before dropping columns

ALTER TABLE `courses`
  ADD COLUMN `__legacy_financial_backup` JSON NULL;

UPDATE `courses` SET `__legacy_financial_backup` = JSON_OBJECT(
  'courseFee', courseFee,
  'trainerFee', trainerFee,
  'adminFees', adminFees,
  'contingencyFees', contingencyFees,
  'serviceFees', serviceFees,
  'vitalFees', vitalFees,
  'amountPerPax', amountPerPax,
  'discount', discount
);

-- Optionally append summary to remarks for human readability
UPDATE `courses`
SET remarks = CONCAT(IFNULL(remarks, ''),
  '\n[Legacy Financials] ',
  'courseFee=', IFNULL(courseFee,'0'), ', trainerFee=', IFNULL(trainerFee,'0'),
  ', adminFees=', IFNULL(adminFees,'0'), ', contingencyFees=', IFNULL(contingencyFees,'0'),
  ', serviceFees=', IFNULL(serviceFees,'0'), ', vitalFees=', IFNULL(vitalFees,'0'),
  ', amountPerPax=', IFNULL(amountPerPax,'0'), ', discount=', IFNULL(discount,'0')
) WHERE (courseFee IS NOT NULL OR trainerFee IS NOT NULL OR adminFees IS NOT NULL OR contingencyFees IS NOT NULL OR serviceFees IS NOT NULL OR vitalFees IS NOT NULL OR amountPerPax IS NOT NULL OR discount IS NOT NULL);

ALTER TABLE `courses`
  DROP COLUMN `courseFee`,
  DROP COLUMN `trainerFee`,
  DROP COLUMN `adminFees`,
  DROP COLUMN `contingencyFees`,
  DROP COLUMN `serviceFees`,
  DROP COLUMN `vitalFees`,
  DROP COLUMN `amountPerPax`,
  DROP COLUMN `discount`;

-- Leave backup JSON column for potential future reference (can be dropped later manually)
