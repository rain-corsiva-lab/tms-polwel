import ExcelJS from 'exceljs';

const applyBorder = (cell: ExcelJS.Cell) => {
  cell.border = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' },
  };
};

const applyRowBorders = (row: ExcelJS.Row, startColumn = 1, endColumn = row.worksheet.columnCount) => {
  for (let col = startColumn; col <= endColumn; col += 1) {
    applyBorder(row.getCell(col));
  }
};

const formatHeadingCell = (cell: ExcelJS.Cell, fillColor: string) => {
  cell.font = { bold: true };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: fillColor },
  };
  applyBorder(cell);
};

const setCurrency = (cell: ExcelJS.Cell, value?: number | null) => {
  if (typeof value === 'number') {
    cell.value = value;
    cell.numFmt = '$#,##0.00';
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
  } else {
    cell.value = '';
  }
};

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDate = (value?: string | Date | null, shortMonth = false): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: shortMonth ? 'short' : '2-digit',
    year: 'numeric',
  });
};

const getDiscountMeta = (entry: any, courseRun: any): { text: string; noDiscount: number; discountGranted: number } => {
  if (!entry?.learners || !Array.isArray(entry.learners)) {
    return { text: '', noDiscount: 0, discountGranted: 0 };
  }

  const discountLookup = new Map<string, string>();
  if (courseRun?.courseDiscounts && Array.isArray(courseRun.courseDiscounts)) {
    (courseRun.courseDiscounts as any[]).forEach((discount: any) => {
      if (discount?.id) {
        discountLookup.set(discount.id, discount.name || 'Discount');
      }
    });
  }

  let noDiscount = 0;
  let discountGranted = 0;
  const grouped = new Map<string, { percentage: number; count: number }>();

  entry.learners.forEach((learner: any) => {
    const percentage = toNumber(learner?.discountPercentage);
    const hasDiscount = percentage > 0;
    if (hasDiscount) {
      discountGranted += 1;
    } else {
      noDiscount += 1;
    }

    const discountName = learner?.discountId && discountLookup.has(learner.discountId)
      ? discountLookup.get(learner.discountId)!
      : 'No Discount';
    const key = `${discountName}_${percentage}`;
    if (grouped.has(key)) {
      grouped.get(key)!.count += 1;
    } else {
      grouped.set(key, { percentage, count: 1 });
    }
  });

  const text = Array.from(grouped.entries())
    .map(([key, data]) => {
      const discountName = key.split('_')[0];
      return `[${discountName} ${data.percentage}% = ${data.count}]`;
    })
    .join(', ');

  return { text, noDiscount, discountGranted };
};

export async function generateConsolidatedBillingXLSX(exportData: any) {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Billing Report');

    // Set page setup for landscape
    worksheet.pageSetup = {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.25,
        right: 0.25,
        top: 0.75,
        bottom: 0.75,
        header: 0.3,
        footer: 0.3,
      },
    };

    // Define column widths for A-X (the 24 columns of the bottom table)
    worksheet.columns = [
      { width: 30 }, // A: Project Title (1)
      { width: 15 }, // B: Billing Rate PTR PAX (2)
      { width: 15 }, // C: Billing Rate PTR RUN (3)
      { width: 12 }, // D: Unit PAX (4)
      { width: 12 }, // E: Unit RUN (5)
      { width: 15 }, // F: Course Run Code (6) (hidden by default)
      { width: 20 }, // G: Course/Service/Delivery Date (7)
      { width: 8 },  // H: PM (8)
      { width: 15 }, // I: Value of Work Done Unit PAX (9)
      { width: 15 }, // J: Value of Work Done Unit RUN (10)
      { width: 15 }, // K: PBMS Ref (11)
      { width: 15 }, // L: PBMS Invoice Date (12)
      { width: 12 }, // M: No discounts (13)
      { width: 12 }, // N: Discount granted (14)
      { width: 15 }, // O: Actual Amount billed in current month (15)
      { width: 15 }, // P: Salary / Contract Fees (16)
      { width: 15 }, // Q: PBMS Ref2 (Invoice for contract fees) (17)
      { width: 15 }, // R: PBMS Invoice creation date for contract fees (18)
      { width: 15 }, // S: Contract Fees Payout in current month (19)
      { width: 15 }, // T: PBMS Ref3 (Invoice for venue expense) (20)
      { width: 15 }, // U: PBMS Invoice creation date for venue expense (21)
      { width: 15 }, // V: Venue Expenses in current month (22)
      { width: 30 }, // W: Remarks (23)
      { width: 30 }, // X: Other Remarks (24)
    ];

    // Hide Course Run Code column (Column F / Column 6) by default
    worksheet.getColumn(6).hidden = true;

    worksheet.views = [{ state: 'frozen', ySplit: 3 }];

    // Title row
    worksheet.mergeCells('A1:X1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `PDCS Estimated Billing for Month of ${exportData.billingMonth} (PDCS)`;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Note row
    worksheet.mergeCells('A2:X2');
    const noteCell = worksheet.getCell('A2');
    noteCell.value = '(All figures to exclude GST)';
    noteCell.font = { italic: true, size: 10 };
    noteCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Table headers in Row 3
    const headers = [
      'Project Title',
      'Billing Rate (if applicable) PTR PAX',
      'Billing Rate (if applicable) PTR RUN',
      'Unit PAX',
      'Unit RUN',
      'Course Run Code',
      'Course/Service/Delivery Date',
      'PM',
      'Value of Work Done (based on actual / forecast for the month) Unit PAX',
      'Value of Work Done (based on actual / forecast for the month) Unit RUN',
      'PBMS Ref',
      'PBMS Invoice Date',
      'No discounts',
      'Discount granted',
      'Actual Amount billed in current month',
      'Salary / Contract Fees',
      'PBMS Ref2 (Invoice for contract fees)',
      'PBMS Invoice creation date for contract fees',
      'Contract Fees Payout in current month',
      'PBMS Ref3 (Invoice for venue expense)',
      'PBMS Invoice creation date for venue expense',
      'Venue Expenses in current month',
      'Remarks',
      'Other Remarks',
    ];

    const headerRow = worksheet.getRow(3);
    headers.forEach((header, index) => {
      const col = index + 1;
      const cell = headerRow.getCell(col);
      cell.value = header;

      // Color coding headers aligned to client sample (shifted after Col 5)
      let fill = 'FFD9D9D9';
      if (col >= 11 && col <= 14) fill = 'FFAEC3DB';
      if (col === 15) fill = 'FFBFD0E3';
      if (col >= 16 && col <= 18) fill = 'FFCCC6D9';
      if (col >= 19 && col <= 22) fill = 'FFE8D8C8';
      if (col >= 23) fill = 'FFC4C8CF';

      formatHeadingCell(cell, fill);
      cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    });
    headerRow.height = 46;

    let currentRow = 4;
    // Sort course runs by Project Title to group runs of the same course
    const courseRuns = [...(exportData.courseRuns || [])].sort((a: any, b: any) => {
      const titleA = (a.courseTitle || '').toLowerCase();
      const titleB = (b.courseTitle || '').toLowerCase();
      return titleA.localeCompare(titleB);
    });

    // Totals accumulators
    let totalUnitPax = 0;
    let totalUnitRun = 0;
    let totalValuePax = 0;
    let totalValueRun = 0;
    let totalNoDiscounts = 0;
    let totalDiscountGranted = 0;
    let totalActualAmountBilled = 0;
    let totalContractFeesPayout = 0;
    let totalVenueExpenses = 0;

    // Calculate merge boundaries
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

    for (const courseRun of courseRuns) {
      const billing = courseRun.billing || {};
      const entries = Array.isArray(billing.entries) && billing.entries.length > 0 ? billing.entries : [null];
      const defaultCourseFee = toNumber(courseRun.defaultCourseFee);
      const start = formatDate(courseRun.startDate, true);
      const end = formatDate(courseRun.endDate, true);
      const dateRange = start && end ? `${start}${start === end ? '' : ` - ${end}`}` : '';

      const billingRatePerPax = defaultCourseFee > 0 ? defaultCourseFee : null;
      const billingRatePerRun = defaultCourseFee > 0 ? null : toNumber(billing.valueOfWorkDone);

      // 1. Calculate aggregated values for the Course Run
      let runUnitPax = 0;
      let runUnitRun = 0;
      let runValuePax = 0;
      let runValueRun = 0;

      entries.forEach((entry: any) => {
        const learnerCount = Array.isArray(entry?.learners) ? entry.learners.length : 0;
        const invoiceAmount = toNumber(entry?.invoiceAmount);
        
        runUnitPax += learnerCount;
        if (billingRatePerPax === null) {
          runUnitRun += 1;
        }

        const valueByPax = billingRatePerPax !== null ? invoiceAmount : null;
        const valueByRun = billingRatePerPax === null ? (invoiceAmount || toNumber(billing.valueOfWorkDone)) : null;

        if (valueByPax !== null) runValuePax += valueByPax;
        if (valueByRun !== null) runValueRun += valueByRun;
      });

      // 2. Write rows for each billing entry
      entries.forEach((entry: any, idx: number) => {
        const row = worksheet.getRow(currentRow);
        const learnerCount = Array.isArray(entry?.learners) ? entry.learners.length : 0;
        const discountMeta = getDiscountMeta(entry, courseRun);
        const invoiceAmount = toNumber(entry?.invoiceAmount);

        const valueByPax = billingRatePerPax !== null ? invoiceAmount : null;
        const valueByRun = billingRatePerPax === null ? (invoiceAmount || toNumber(billing.valueOfWorkDone)) : null;

        // Accumulate sheet totals
        totalUnitPax += learnerCount;
        totalUnitRun += 1;
        if (valueByPax !== null) totalValuePax += valueByPax;
        if (valueByRun !== null) totalValueRun += valueByRun;
        totalNoDiscounts += discountMeta.noDiscount;
        totalDiscountGranted += discountMeta.discountGranted;
        totalActualAmountBilled += invoiceAmount;
        if (idx === 0) {
          totalContractFeesPayout += toNumber(billing.contractInvoiceAmount);
          totalVenueExpenses += toNumber(billing.venueInvoiceAmount);
        }

        // Write course-level details only on the start row of this Course group
        const isCourseStartRow = mergesToApply.some(m => m.type === 'course' && m.start === currentRow);
        if (isCourseStartRow) {
          row.getCell(1).value = courseRun.courseTitle || '';
          setCurrency(row.getCell(2), billingRatePerPax);
          setCurrency(row.getCell(3), billingRatePerRun);
        }

        // Write course-run level details on the first row of this run
        if (idx === 0) {
          row.getCell(4).value = runUnitPax > 0 ? runUnitPax : '';
          row.getCell(5).value = runUnitRun > 0 ? runUnitRun : '';
          row.getCell(6).value = courseRun.courseRunCode || '';
          row.getCell(7).value = dateRange;
          row.getCell(8).value = 'N';
          setCurrency(row.getCell(9), runValuePax);
          setCurrency(row.getCell(10), runValueRun);

          row.getCell(16).value = 'Contract Fees';
          row.getCell(17).value = billing.contractFeePBMSBENumber || '';
          row.getCell(18).value = formatDate(billing.contractPBMSInvoiceDate);
          setCurrency(row.getCell(19), toNumber(billing.contractInvoiceAmount) || null);
          row.getCell(20).value = billing.venuePBMSBENumber || '';
          row.getCell(21).value = formatDate(billing.venuePBMSInvoiceDate);
          setCurrency(row.getCell(22), toNumber(billing.venueInvoiceAmount) || null);
          row.getCell(23).value = billing.finalRemarks || '';
        }

        // Write entry-specific fields (unmerged)
        row.getCell(11).value = entry?.pbmsInvoiceNumber || '';
        row.getCell(12).value = formatDate(entry?.pbmsInvoiceDate);
        row.getCell(13).value = discountMeta.noDiscount > 0 ? discountMeta.noDiscount : 0;
        row.getCell(14).value = discountMeta.discountGranted > 0 ? discountMeta.discountGranted : 0;
        setCurrency(row.getCell(15), invoiceAmount || null);
        row.getCell(24).value = entry?.remarks || '';

        // Apply deduction styling on entry remarks
        if (typeof row.getCell(24).value === 'string' && String(row.getCell(24).value).toLowerCase().includes('deduction')) {
          row.getCell(24).font = { color: { argb: 'FFFF0000' } };
        }

        // Apply borders and alignments
        for (let col = 1; col <= 24; col += 1) {
          applyBorder(row.getCell(col));
          if (![1, 7, 23, 24].includes(col) && !row.getCell(col).alignment) {
            row.getCell(col).alignment = { horizontal: 'center', vertical: 'middle' };
          }
        }

        row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        row.getCell(23).alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
        row.getCell(24).alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
        row.height = 24;

        currentRow += 1;
      });
    }

    // Apply all vertical merges
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

    // Add summary totals row
    const summaryRow = worksheet.getRow(currentRow);
    summaryRow.getCell(1).value = 'TOTAL';
    summaryRow.getCell(1).font = { bold: true };
    summaryRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    applyBorder(summaryRow.getCell(1));

    // Apply borders to all columns in totals row
    for (let col = 2; col <= 24; col++) {
      applyBorder(summaryRow.getCell(col));
    }

    summaryRow.getCell(4).value = totalUnitPax > 0 ? totalUnitPax : '';
    summaryRow.getCell(4).font = { bold: true };
    summaryRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };

    summaryRow.getCell(5).value = totalUnitRun > 0 ? totalUnitRun : '';
    summaryRow.getCell(5).font = { bold: true };
    summaryRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

    setCurrency(summaryRow.getCell(9), totalValuePax > 0 ? totalValuePax : null);
    summaryRow.getCell(9).font = { bold: true };

    setCurrency(summaryRow.getCell(10), totalValueRun > 0 ? totalValueRun : null);
    summaryRow.getCell(10).font = { bold: true };

    summaryRow.getCell(13).value = totalNoDiscounts;
    summaryRow.getCell(13).font = { bold: true };
    summaryRow.getCell(13).alignment = { horizontal: 'center', vertical: 'middle' };

    summaryRow.getCell(14).value = totalDiscountGranted;
    summaryRow.getCell(14).font = { bold: true };
    summaryRow.getCell(14).alignment = { horizontal: 'center', vertical: 'middle' };

    setCurrency(summaryRow.getCell(15), totalActualAmountBilled > 0 ? totalActualAmountBilled : null);
    summaryRow.getCell(15).font = { bold: true };

    setCurrency(summaryRow.getCell(19), totalContractFeesPayout > 0 ? totalContractFeesPayout : null);
    summaryRow.getCell(19).font = { bold: true };

    setCurrency(summaryRow.getCell(22), totalVenueExpenses > 0 ? totalVenueExpenses : null);
    summaryRow.getCell(22).font = { bold: true };

    summaryRow.height = 24;

    // Apply auto-fit for columns based on content and wrapping
    const columnWidths = [
      { min: 25, max: 40 },  // A: Project Title (1)
      { min: 15, max: 20 },  // B: Billing Rate PTR PAX (2)
      { min: 15, max: 20 },  // C: Billing Rate PTR RUN (3)
      { min: 10, max: 14 },  // D: Unit PAX (4)
      { min: 10, max: 14 },  // E: Unit RUN (5)
      { min: 12, max: 18 },  // F: Course Run Code (6) (hidden)
      { min: 18, max: 26 },  // G: Course/Service/Delivery Date (7)
      { min: 8, max: 12 },   // H: PM (8)
      { min: 15, max: 20 },  // I: Value PAX (9)
      { min: 15, max: 20 },  // J: Value RUN (10)
      { min: 12, max: 18 },  // K: PBMS Ref (11)
      { min: 12, max: 18 },  // L: PBMS Invoice Date (12)
      { min: 10, max: 14 },  // M: No discounts (13)
      { min: 10, max: 14 },  // N: Discount granted (14)
      { min: 15, max: 20 },  // O: Actual Amount billed (15)
      { min: 15, max: 20 },  // P: Salary / Contract Fees (16)
      { min: 12, max: 18 },  // Q: PBMS Ref2 (17)
      { min: 12, max: 18 },  // R: PBMS Invoice Date (18)
      { min: 15, max: 20 },  // S: Contract Payout (19)
      { min: 12, max: 18 },  // T: PBMS Ref3 (20)
      { min: 12, max: 18 },  // U: PBMS Invoice Date (21)
      { min: 15, max: 20 },  // V: Venue Expenses (22)
      { min: 28, max: 40 },  // W: Remarks (needs wrapping) (23)
      { min: 28, max: 40 },  // X: Other Remarks (needs wrapping) (24)
    ];

    // Auto-fit columns with content-based widths
    worksheet.columns.forEach((col, index) => {
      if (columnWidths[index]) {
        const { min, max } = columnWidths[index];
        let maxLength = min;
        
        // Check all cells in this column for content length
        worksheet.getColumn(index + 1).eachCell((cell) => {
          if (cell.value) {
            const cellLength = String(cell.value).length;
            maxLength = Math.max(maxLength, Math.min(cellLength * 1.1, max));
          }
        });
        
        col.width = Math.max(min, Math.min(maxLength, max));
      }
    });

    // Apply text wrapping and adjust row heights for wrapped text
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 3) { // Skip title and headers
        row.eachCell((cell) => {
          const wrapColumns = [1, 7, 23, 24];
          // Apply wrapping to cells that may have long content
          if (wrapColumns.includes(cell.col)) {
            cell.alignment = { 
              wrapText: true, 
              horizontal: 'left', 
              vertical: 'top',
              shrinkToFit: false
            };
          } else {
            // Ensure all cells have proper alignment
            if (!cell.alignment || !cell.alignment.vertical) {
              cell.alignment = { 
                ...cell.alignment,
                vertical: 'middle',
                shrinkToFit: false
              };
            }
          }
        });
        
        // Auto-adjust row height based on content
        let maxLines = 1;
        row.eachCell((cell) => {
          if (cell.value && [1, 7, 23, 24].includes(cell.col)) {
            const lines = String(cell.value).split('\n').length;
            const width = worksheet.getColumn(cell.col).width || 30;
            const estLines = Math.ceil(String(cell.value).length / (width * 1.5));
            maxLines = Math.max(maxLines, Math.max(lines, estLines));
          }
        });
        
        // Set row height based on lines (approximately 15 pixels per line)
        row.height = Math.max(24, Math.min(maxLines * 15, 80));
      }
    });

    // Ensure header row has adequate height
    if (worksheet.getRow(3)) worksheet.getRow(3).height = 46;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Billing_Report_${exportData.billingMonth.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    return true;
  } catch (error) {
    console.error('Error generating consolidated billing XLSX:', error);
    throw error;
  }
}
