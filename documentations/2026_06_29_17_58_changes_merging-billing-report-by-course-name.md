# Technical Documentation: Merging Billing Report by Course Name

* **Date & Time:** 29 June 2026, 17:58 (Local Time)
* **Title:** Merging Billing Report by Course Name
* **Author:** Antigravity AI Code Assistant

---

## 1. Goal Description
The objective of this task is to further group and merge the Consolidated Monthly Billing Report rows by their Course/Project Title. 

Rather than showing multiple separate rows (or separate merged rows per individual run) for the same Course title, the spreadsheet now groups all runs of the same course together and merges:
* **Project Title** (Column A)
* **Billing Rate PTR PAX** (Column B)
* **Billing Rate PTR RUN** (Column C)

vertically across the entire span of the course group. This combines all runs under one single merged Course row block, while the other run-level and entry-level details adapt and merge correctly at their respective levels.

---

## 2. Merging & Sorting Logic
To achieve the correct multi-level cell merging structure:
1. **Sorting**: All course runs fetched from the database are sorted alphabetically by `courseTitle` (Project Title) to ensure runs belonging to the same course are grouped contiguously in the spreadsheet.
2. **Boundary Calculation**: A pre-loop pass evaluates the sorted course runs to compute the exact start and end row indices for:
   * **Course Groups** (spanning multiple course runs and all of their respective split billing entries).
   * **Run Groups** (spanning only the split billing entries of that specific run).
3. **Values Insertion**:
   * Course-level columns (A, B, C) are only populated on the **first row of the entire Course group**.
   * Run-level columns (D, E, F, G, H, I, J, P, Q, R, S, T, U, V, W) are only populated on the **first row of the individual Course Run**.
   * Entry-level columns (K, L, M, N, O, X) are written for every row index matching the billing entries.
4. **Excel Cell Merging**:
   * Course-level cell merges are executed over columns 1, 2, and 3 from the course group start row to the course group end row.
   * Run-level cell merges are executed over columns 4 to 10 and 16 to 23 from the individual run start row to the individual run end row.

---

## 3. Detailed Proposed and Implemented Code Changes

### A. Frontend Export Utility

#### [consolidatedBillingExport.ts](file:///c:/laragon/www/polwel/src/lib/consolidatedBillingExport.ts)
* Implemented the `courseRuns` sorting routine:
  ```typescript
  const courseRuns = [...(exportData.courseRuns || [])].sort((a: any, b: any) => {
    const titleA = (a.courseTitle || '').toLowerCase();
    const titleB = (b.courseTitle || '').toLowerCase();
    return titleA.localeCompare(titleB);
  });
  ```
* Added a pre-processing loop to calculate boundaries and populate `mergesToApply`:
  ```typescript
  let tempRow = 4;
  const mergesToApply: { type: 'course' | 'run'; start: number; end: number }[] = [];
  let currentCourseTitle = '';
  let courseStartRow = 4;

  for (let i = 0; i < courseRuns.length; i++) {
    const courseRun = courseRuns[i];
    const billing = courseRun.billing || {};
    const entries = Array.isArray(billing.entries) && billing.entries.length > 0 ? billing.entries : [null];
    const runStartRow = tempRow;
    const runEndRow = tempRow + entries.length - 1;

    mergesToApply.push({
      type: 'run',
      start: runStartRow,
      end: runEndRow
    });

    const isLastRun = i === courseRuns.length - 1;
    const nextRun = isLastRun ? null : courseRuns[i + 1];
    const nextCourseTitle = nextRun ? (nextRun.courseTitle || '') : '';

    if (i === 0) {
      currentCourseTitle = courseRun.courseTitle || '';
      courseStartRow = runStartRow;
    }

    if (isLastRun || (courseRun.courseTitle || '') !== nextCourseTitle) {
      mergesToApply.push({
        type: 'course',
        start: courseStartRow,
        end: runEndRow
      });

      if (!isLastRun) {
        currentCourseTitle = nextCourseTitle;
        courseStartRow = runEndRow + 1;
      }
    }

    tempRow = runEndRow + 1;
  }
  ```
* Modified the values writing loop:
  * Replaced `idx === 0` logic for Column A, B, and C with check for `isCourseStartRow`:
    ```typescript
    const isCourseStartRow = mergesToApply.some(m => m.type === 'course' && m.start === currentRow);
    if (isCourseStartRow) {
      row.getCell(1).value = courseRun.courseTitle || '';
      setCurrency(row.getCell(2), billingRatePerPax);
      setCurrency(row.getCell(3), billingRatePerRun);
    }
    ```
  * Retained the run-level cell values writing at `idx === 0` for run columns.
* Executed the merges:
  ```typescript
  mergesToApply.forEach((merge) => {
    if (merge.end > merge.start) {
      if (merge.type === 'course') {
        const colsToMerge = [1, 2, 3];
        colsToMerge.forEach((col) => {
          worksheet.mergeCells(merge.start, col, merge.end, col);
        });
      } else if (merge.type === 'run') {
        const colsToMerge = [4, 5, 6, 7, 8, 9, 10, 16, 17, 18, 19, 20, 21, 22, 23];
        colsToMerge.forEach((col) => {
          worksheet.mergeCells(merge.start, col, merge.end, col);
        });
      }
    }
  });
  ```

---

## 4. Verification Details
1. **Compilation Validation:** Ran `npm run build` which verified successful static analysis and production compilation.
2. **Cell Merges Validation:** Generated a sample report file locally using a database query and ran a custom validation script verifying:
   * **Course Group Merges**: Columns A, B, and C merge vertically over 50 rows (all runs/entries under the same course title).
   * **Run Group Merges**: Column D (Unit PAX) merges vertically over 2 rows for each individual run.
   * **Unmerged Rows**: Entries columns remain separate and unmerged.
