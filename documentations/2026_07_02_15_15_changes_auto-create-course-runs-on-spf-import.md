# Technical Documentation: Auto-Create Course and Course Runs during SPF Learner Import

* **Date & Time:** 2 July 2026, 15:15 (Local Time)
* **Title:** Auto-Create Course Runs on SPF Import
* **Author:** Antigravity AI Code Assistant

---

## 1. Goal Description
During the "Import Learners 2 (SPF)" import execution, the system links learner records to existing Course Runs based on the course run's title and start date. Previously, if the corresponding Course or CourseRun was missing in the database, the import skipped the row and returned a "No course run found" error.

This enhancement modifies the import controller to automatically verify the existence of the Course and CourseRun. If they do not exist, they are programmatically created with appropriate system-wide defaults so that the learners can be fully registered and enrolled under the new run.

---

## 2. Implemented Code Changes

### Backend - Import Controller

#### [importController.ts](file:///c:/laragon/www/polwel/polwel-backend/src/controllers/importController.ts)
* Extracted the `Fees before GST` parsing earlier in the Excel row processing loop to make it available for the default Course creation.
* Updated Step 4 (Course & CourseRun resolution block) to perform the following:
  1. **Course Verification**: If the Course (by title) is not found:
     - Generates a unique course code: `AUTO-<CLEAN_TITLE>-<RANDOM_SUFFIX>`.
     - Inserts the new Course with status `ACTIVE`, duration `1 day`, min class size `1`, max class size `25`, and default course fee set to the parsed learner's fee (or `$0.00` if not present).
  2. **CourseRun Verification**: If no CourseRun starts on the target SGT calendar date for the resolved course:
     - Generates a unique serial number (Course Run Code) using the formula: `<courseCode>-<DD><MM><YY>` based on the start date.
     - Inserts the new CourseRun with type `OPEN`, start time `09:00` SGT, end time `17:00` SGT, status `COMPLETED` (ready for billing and walkthrough), and fee type `PER_HEAD`.
     - Appends the new run to the SGT date resolver list.

---

## 3. Verification Details
1. **Compilation Validation:** Ran `npm run build` in the `polwel-backend` directory. The build completed successfully.
2. **Database Simulation Verification:** Ran a verification script (`test-import-autocreate.ts`) simulating database cleanup, missing Course / CourseRun conditions, and SPF importer resolution:
   - **Result**:
     ```
     Auto-creating missing course: "New Auto Created Course for Testing" with code "AUTO-NEWAUTOCREATEDC-7983"
     Auto-creating missing CourseRun: "AUTO-NEWAUTOCREATEDC-7983-010826" for course: "New Auto Created Course for Testing"
     
     --- Verification Assertions ---
     Course Auto-created successfully: true
     Course Title: New Auto Created Course for Testing
     Course Code: AUTO-NEWAUTOCREATEDC-7983
     Course defaultCourseFee: 650
     CourseRun Auto-created successfully: true
     CourseRun Code: AUTO-NEWAUTOCREATEDC-7983-010826
     CourseRun Type: OPEN
     CourseRun Status: COMPLETED
     CourseRun startDatetime: 2026-08-01T01:00:00.000Z
     CourseRun endDatetime: 2026-08-01T09:00:00.000Z
     ```
   - Auto-creation behavior and date/time offsets (SGT conversion) function exactly as specified.
