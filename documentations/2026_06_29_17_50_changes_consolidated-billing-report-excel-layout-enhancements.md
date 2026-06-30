# Technical Documentation: Consolidated Billing Report Excel Layout Enhancements

* **Date & Time:** 29 June 2026, 17:50 (Local Time)
* **Title:** Consolidated Billing Report Excel Layout Enhancements
* **Author:** Antigravity AI Code Assistant

---

## 1. Goal Description
The objective of this task is to enhance the layout and row grouping/merging behavior in the Excel export of the Consolidated Monthly Billing Report to match the layout and design of the Naz template (version 3 and 4). 

Previously, details for different billing entries and course runs were output in an unmerged flat grid, or with all values concatenated into single cells. The new concept requires vertical cell merging for fields that remain constant across a given course run (e.g., project titles, base rates, dates, venue costs, contract payout details), while keeping unique billing entry details (such as invoice numbers, dates, discounts, and actual amounts billed) on distinct, separate rows.

---

## 2. Structural Database & Schema Context
A billing report maps to one month (e.g., `July 2026`). It relates to multiple course runs. For each course run:
* **CourseRunBilling**: Stores summary fields like `valueOfWorkDone`, `contractInvoiceAmount`, `venueInvoiceAmount`, and `finalRemarks`.
* **CourseRunBillingEntry**: Relates to `CourseRunBilling`. It represents a billing split (e.g., separate invoices for separate learner batches).
* **CourseRunLearner**: Relates to `CourseRun`. Some or all learners point to a `CourseRunBillingEntry` (`courseRunBillingEntryId`), which defines which batch or invoice they belong to.

---

## 3. Detailed Proposed and Implemented Code Changes

### A. Column Layout Expansion (24-Column Format)
A new column **Course Run Code** has been inserted at Column 6 (Column F). All subsequent columns are shifted to the right, expanding the spreadsheet width to 24 columns (Columns A through X):

1. **Column A (1):** Project Title
2. **Column B (2):** Billing Rate PTR PAX
3. **Column C (3):** Billing Rate PTR RUN
4. **Column D (4):** Unit PAX (Total summed quantity of participants across all billing entries of the run)
5. **Column E (5):** Unit RUN (Total summed quantity of runs)
6. **Column F (6):** Course Run Code (Serial Number of the run. Hidden by default using `worksheet.getColumn(6).hidden = true` to preserve the visual appearance of Naz's template layout).
7. **Column G (7):** Course/Service/Delivery Date
8. **Column H (8):** PM
9. **Column I (9):** Value of Work Done Unit PAX (Summed invoice amounts for billed per-pax runs)
10. **Column J (10):** Value of Work Done Unit RUN (Summed invoice amounts/valueOfWorkDone for billed per-run runs)
11. **Column K (11):** PBMS Ref (Individual billing entry invoice number)
12. **Column L (12):** PBMS Invoice Date (Individual billing entry invoice date)
13. **Column M (13):** No discounts (Individual billing entry quantity of full-paying learners)
14. **Column N (14):** Discount granted (Individual billing entry quantity of discounted learners)
15. **Column O (15):** Actual Amount billed in current month (Individual billing entry invoice amount)
16. **Column P (16):** Salary / Contract Fees
17. **Column Q (17):** PBMS Ref2
18. **Column R (18):** PBMS Invoice creation date for contract fees
19. **Column S (19):** Contract Fees Payout in current month
20. **Column T (20):** PBMS Ref3
21. **Column U (21):** PBMS Invoice creation date for venue expense
22. **Column V (22):** Venue Expenses in current month
23. **Column W (23):** Remarks
24. **Column X (24):** Other Remarks (Individual billing entry remarks)

### B. Vertical Cell Merging & Calculations
For each course run billing:
1. All billing entries are evaluated. If a run has multiple billing entries, a row is created for each billing entry.
2. The values of constant fields are set only on the first row (`idx === 0`).
3. For course runs with multiple entries, the rows from `startRow` to `currentRow - 1` are vertically merged for the following course-run-specific columns:
   * **Project Title** (Column 1 / A)
   * **Billing Rates** (Columns 2 & 3 / B & C)
   * **Learner Counts & Run Quantities** (Columns 4 & 5 / D & E)
   * **Course Run Code** (Column 6 / F)
   * **Course/Service/Delivery Date** (Column 7 / G)
   * **PM** (Column 8 / H)
   * **Value of Work Done** (Columns 9 & 10 / I & J)
   * **Salary/Contract Fees Details** (Columns 16, 17, 18 & 19 / P, Q, R & S)
   * **Venue Expenses Details** (Columns 20, 21 & 22 / T, U & V)
   * **Remarks** (Column 23 / W)
4. Split billing fields remain unmerged on separate rows:
   * **PBMS Ref** (Column 11 / K)
   * **PBMS Invoice Date** (Column 12 / L)
   * **No discounts** (Column 13 / M)
   * **Discount granted** (Column 14 / N)
   * **Actual Amount Billed** (Column 15 / O)
   * **Other Remarks** (Column 24 / X)

### C. Summary Totals Row Adjustments
The cell coordinates for the summary totals row are shifted:
* `TOTAL` label -> Column 1 (A)
* `totalUnitPax` -> Column 4 (D)
* `totalUnitRun` -> Column 5 (E)
* `totalValuePax` -> Column 9 (I)
* `totalValueRun` -> Column 10 (J)
* `totalNoDiscounts` -> Column 13 (M)
* `totalDiscountGranted` -> Column 14 (N)
* `totalActualAmountBilled` -> Column 15 (O)
* `totalContractFeesPayout` -> Column 19 (S)
* `totalVenueExpenses` -> Column 22 (V)

---

## 4. Verification Details
1. **Compilation Validation:** Production build completed successfully using `npm run build` with no type-checking failures or warnings.
2. **Database Seeding Verification:** Seeded 100 course runs in the local database across 4 courses for the `July 2026` monthly report to ensure the merging logic handles a large dataset efficiently.
3. **Local Testing:** Confirmed that the output file structure contains the exact merges matching the specification, with correct vertical spans and totals alignments.
