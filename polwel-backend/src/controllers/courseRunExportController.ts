import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import ExcelJS from 'exceljs';

const prisma = new PrismaClient();

/**
 * Export Course Run History for a specific course
 * GET /api/courses/:id/runs/export
 * 
 * Generates an Excel workbook with multiple sheets - one per course run
 * Each sheet contains two tables: Active Learners and Withdrawn Learners
 */
export const exportCourseRunHistory = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Course ID is required'
      });
      return;
    }

    // Fetch course details
    const course = await prisma.course.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        courseCode: true
      }
    });

    if (!course) {
      res.status(404).json({
        success: false,
        message: 'Course not found'
      });
      return;
    }

    // Fetch ALL course runs with their learners and trainers
    // This includes runs with ANY status: DRAFT, PENDING, CONFIRMED, ACTIVE, 
    // IN_PROGRESS, PENDING_BILLING, COMPLETED, CANCELLED, etc.
    // Only excludes soft-deleted runs (deletedAt != null)
    const courseRuns = await prisma.courseRun.findMany({
      where: {
        courseId: id,
        deletedAt: null
        // NOTE: No status filter - we want ALL statuses
      },
      include: {
        courseRunLearners: {
          where: {
            deletedAt: null
          },
          include: {
            learner: {
              include: {
                clientOrganization: true,
                trainingCoordinator: true
              }
            },
            courseRunBillingEntry: true
          }
        },
        courseRunTrainers: {
          where: {
            deletedAt: null
          },
          include: {
            trainer: true
          }
        },
        venue: true,
        clientOrganization: true
      },
      orderBy: {
        startDatetime: 'asc'
      }
    });

    if (courseRuns.length === 0) {
      res.status(404).json({
        success: false,
        message: 'No course runs found for this course'
      });
      return;
    }

    // Log the fetched course runs for debugging
    console.log(`📊 Exporting ${courseRuns.length} course run(s) for course ${course.courseCode}:`);
    courseRuns.forEach((run, idx) => {
      const allLearners = run.courseRunLearners.length;
      const active = run.courseRunLearners.filter(l => l.enrollmentStatus !== 'WITHDRAWN').length;
      const withdrawn = run.courseRunLearners.filter(l => l.enrollmentStatus === 'WITHDRAWN').length;
      console.log(`  ${idx + 1}. Run ID: ${run.id}, Status: ${run.status}, Start: ${run.startDatetime}`);
      console.log(`      Total Learners: ${allLearners}, Active: ${active}, Withdrawn: ${withdrawn}`);
      
      // Log first learner details for debugging
      if (run.courseRunLearners.length > 0) {
        const firstLearner = run.courseRunLearners[0];
        console.log(`      First Learner: enrollmentStatus=${firstLearner?.enrollmentStatus}, learner=${firstLearner?.learner?.fullname}`);
      }
    });

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'POLWEL Training Management System';
    workbook.created = new Date();

    // Track sheet names to handle duplicates
    const usedSheetNames = new Map<string, number>();

    // Process each course run
    for (const run of courseRuns) {
      // Format sheet name as "11Jan24" from startDatetime
      let baseSheetName = formatSheetName(run.startDatetime);
      let sheetName = baseSheetName;
      
      // Handle duplicate sheet names by adding (2), (3), etc.
      if (usedSheetNames.has(baseSheetName)) {
        const count = usedSheetNames.get(baseSheetName)! + 1;
        usedSheetNames.set(baseSheetName, count);
        sheetName = `${baseSheetName}(${count})`;
      } else {
        usedSheetNames.set(baseSheetName, 1);
      }
      
      const worksheet = workbook.addWorksheet(sheetName, {
        pageSetup: {
          paperSize: 9, // A4
          orientation: 'landscape'
        }
      });

      // Get primary trainer (first trainer in the list)
      const primaryTrainer = run.courseRunTrainers[0];

      // Separate learners into active and withdrawn
      const activeLearners = run.courseRunLearners.filter(
        l => l.enrollmentStatus !== 'WITHDRAWN'
      );
      const withdrawnLearners = run.courseRunLearners.filter(
        l => l.enrollmentStatus === 'WITHDRAWN'
      );

      let currentRow = 1;

      // ===== ACTIVE LEARNERS TABLE =====
      currentRow = addLearnersTable(
        worksheet,
        activeLearners,
        primaryTrainer,
        currentRow,
        'Active Learners'
      );

      // Add spacing
      currentRow += 3;

      // ===== WAITLIST SECTION =====
      worksheet.getCell(`A${currentRow}`).value = 'WAITLIST';
      worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
      worksheet.getCell(`A${currentRow}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFF00' } // Yellow background
      };
      currentRow += 2;

      // ===== WITHDRAWALS TABLE =====
      worksheet.getCell(`A${currentRow}`).value = 'WITHDRAWALS';
      worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
      worksheet.getCell(`A${currentRow}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFF00' } // Yellow background
      };
      currentRow += 1;

      if (withdrawnLearners.length > 0) {
        addLearnersTable(
          worksheet,
          withdrawnLearners,
          primaryTrainer,
          currentRow,
          'Withdrawn Learners'
        );
      }

      // Auto-size columns
      worksheet.columns.forEach(column => {
        if (column.eachCell) {
          let maxLength = 10;
          column.eachCell({ includeEmpty: true }, cell => {
            const cellValue = cell.value ? cell.value.toString() : '';
            maxLength = Math.max(maxLength, cellValue.length);
          });
          column.width = Math.min(maxLength + 2, 50);
        }
      });
    }

    // Generate filename
    const filename = `${course.courseCode || course.id}_Course_Run_History_${formatDate(new Date())}.xlsx`;

    // Set response headers for Excel download
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );

    // Write workbook to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exporting course run history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export course run history',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Add a table of learners to the worksheet
 */
function addLearnersTable(
  worksheet: ExcelJS.Worksheet,
  learners: any[],
  primaryTrainer: any,
  startRow: number,
  tableTitle: string
): number {
  let currentRow = startRow;

  console.log(`  📝 Adding "${tableTitle}" table with ${learners.length} learners starting at row ${startRow}`);

  // Define column headers
  const headers = [
    'Name',
    'Department',
    'Designation',
    'SPF Email Address',
    'Contact Number',
    'Retiring Officer',
    'Payment Mode',
    'Fees before GST',
    'Fees Remarks',
    'Invoice/PO Number',
    'Business Unit Number',
    'Training Officer\'s Name',
    'Training Officer\'s Email',
    'Training Officer\'s Contact Number',
    'Remarks'
  ];

  // Add header row
  const headerRow = worksheet.getRow(currentRow);
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' } // Blue background
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
  currentRow++;

  // Add data rows
  learners.forEach((courseRunLearner, idx) => {
    const learner = courseRunLearner.learner;
    
    if (idx === 0) {
      console.log(`    First learner data check:`, {
        hasLearner: !!learner,
        fullname: learner?.fullname,
        email: learner?.email,
        enrollmentStatus: courseRunLearner?.enrollmentStatus,
        totalFees: courseRunLearner?.totalFees
      });
    }
    
    const organization = learner?.clientOrganization;
    const trainingCoordinator = learner?.trainingCoordinator;

    const row = worksheet.getRow(currentRow);
    const rowData = [
      learner?.fullname || '',
      organization?.name || learner?.departmentName || courseRunLearner?.departmentName || '',
      learner?.designation || '',
      learner?.email || '',
      learner?.contact || '',
      '', // Retiring Officer - not in schema
      courseRunLearner?.paymentMode || '',
      courseRunLearner?.totalFees ? Number(courseRunLearner.totalFees).toFixed(2) : '',
      courseRunLearner?.feesRemarks || '',
      courseRunLearner?.invoiceNumber || '',
      organization?.buNumber || '', // Business Unit Number
      trainingCoordinator?.name || primaryTrainer?.trainer?.name || '',
      trainingCoordinator?.email || primaryTrainer?.trainer?.email || '',
      trainingCoordinator?.contactNumber || primaryTrainer?.trainer?.contactNumber || '',
      courseRunLearner?.remarks || ''
    ];

    rowData.forEach((value, index) => {
      const cell = row.getCell(index + 1);
      cell.value = value;
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { vertical: 'middle' };
    });
    currentRow++;
  });

  // Add Total row
  if (learners.length > 0) {
    const totalRow = worksheet.getRow(currentRow);
    totalRow.getCell(1).value = 'Total';
    totalRow.getCell(1).font = { bold: true };

    // Calculate total fees
    const totalFees = learners.reduce((sum, l) => {
      return sum + (l.totalFees ? Number(l.totalFees) : 0);
    }, 0);

    totalRow.getCell(8).value = `$${totalFees.toFixed(2)}`;
    totalRow.getCell(8).font = { bold: true };

    // Add borders to total row
    for (let i = 1; i <= headers.length; i++) {
      const cell = totalRow.getCell(i);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
    currentRow++;

    // Add "Total (excluding POLWEL Staff)" row
    // Note: This would require filtering logic if you have a way to identify POLWEL staff
    const totalExcludingRow = worksheet.getRow(currentRow);
    totalExcludingRow.getCell(1).value = 'Total (excluding POLWEL Staff)';
    totalExcludingRow.getCell(1).font = { bold: true };
    totalExcludingRow.getCell(8).value = `$${totalFees.toFixed(2)}`; // Same for now
    totalExcludingRow.getCell(8).font = { bold: true };

    for (let i = 1; i <= headers.length; i++) {
      const cell = totalExcludingRow.getCell(i);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
    currentRow++;
  }

  return currentRow;
}

/**
 * Format date to ddMmmyy format (e.g., 11Jan24)
 */
function formatSheetName(date: Date | null): string {
  if (!date) return 'Unknown';

  const d = new Date(date);
  const day = d.getDate();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[d.getMonth()] || 'Jan';
  const year = d.getFullYear().toString().slice(-2);

  return `${day}${month}${year}`;
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const isoString = date.toISOString();
  const datePart = isoString.split('T')[0];
  return datePart || isoString;
}
