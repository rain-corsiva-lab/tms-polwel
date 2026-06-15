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

    // Define column widths for A-W (the 23 columns of the bottom table)
    worksheet.columns = [
      { width: 30 }, // A: Project Title
      { width: 15 }, // B: Billing Rate (if applicable) PER PAX
      { width: 15 }, // C: Billing Rate (if applicable) PER RUN
      { width: 12 }, // D: Unit PAX
      { width: 12 }, // E: Unit RUN
      { width: 20 }, // F: Course/Service/Delivery Date
      { width: 8 },  // G: PM
      { width: 15 }, // H: Value of Work Done (Unit PAX)
      { width: 15 }, // I: Value of Work Done (Unit RUN)
      { width: 15 }, // J: PBMS Ref
      { width: 15 }, // K: PBMS Invoice Date
      { width: 12 }, // L: No discounts
      { width: 12 }, // M: Discount granted
      { width: 15 }, // N: Actual Amount billed in current month
      { width: 15 }, // O: Salary / Contract Fees
      { width: 15 }, // P: PBMS Ref2 (Invoice for contract fees)
      { width: 15 }, // Q: PBMS Invoice creation date for contract fees
      { width: 15 }, // R: Contract Fees Payout in current month
      { width: 15 }, // S: PBMS Ref3 (Invoice for venue expense)
      { width: 15 }, // T: PBMS Invoice creation date for venue expense
      { width: 15 }, // U: Venue Expenses in current month
      { width: 30 }, // V: Remarks
      { width: 30 }, // W: Other Remarks
    ];

    worksheet.views = [{ state: 'frozen', ySplit: 3 }];

    // Title row
    worksheet.mergeCells('A1:W1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `PDCS Estimated Billing for Month of ${exportData.billingMonth} (PDCS)`;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Note row
    worksheet.mergeCells('A2:W2');
    const noteCell = worksheet.getCell('A2');
    noteCell.value = '(All figures to exclude GST)';
    noteCell.font = { italic: true, size: 10 };
    noteCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Table headers in Row 3
    const headers = [
      'Project Title',
      'Billing Rate (if applicable) PER PAX',
      'Billing Rate (if applicable) PER RUN',
      'Unit PAX',
      'Unit RUN',
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

      // Color coding headers aligned to client sample
      let fill = 'FFD9D9D9';
      if (col >= 10 && col <= 13) fill = 'FFAEC3DB';
      if (col === 14) fill = 'FFBFD0E3';
      if (col >= 15 && col <= 17) fill = 'FFCCC6D9';
      if (col >= 18 && col <= 21) fill = 'FFE8D8C8';
      if (col >= 22) fill = 'FFC4C8CF';

      formatHeadingCell(cell, fill);
      cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    });
    headerRow.height = 46;

    let currentRow = 4;
    const courseRuns = exportData.courseRuns || [];

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

    for (const courseRun of courseRuns) {
      const billing = courseRun.billing || {};
      const entries = Array.isArray(billing.entries) && billing.entries.length > 0 ? billing.entries : [null];
      const defaultCourseFee = toNumber(courseRun.defaultCourseFee);
      const start = formatDate(courseRun.startDate, true);
      const end = formatDate(courseRun.endDate, true);
      const dateRange = start && end ? `${start}${start === end ? '' : ` - ${end}`}` : '';

      entries.forEach((entry: any, idx: number) => {
        const row = worksheet.getRow(currentRow);
        const learnerCount = Array.isArray(entry?.learners) ? entry.learners.length : 0;
        const discountMeta = getDiscountMeta(entry, courseRun);
        const invoiceAmount = toNumber(entry?.invoiceAmount);

        const billingRatePerPax = defaultCourseFee > 0 ? defaultCourseFee : null;
        const billingRatePerRun = defaultCourseFee > 0 ? null : toNumber(billing.valueOfWorkDone);
        const valueByPax = billingRatePerPax !== null ? invoiceAmount : null;
        const valueByRun = billingRatePerPax === null ? (invoiceAmount || toNumber(billing.valueOfWorkDone)) : null;

        // Accumulate totals
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

        row.getCell(1).value = courseRun.courseTitle || '';
        setCurrency(row.getCell(2), billingRatePerPax);
        setCurrency(row.getCell(3), billingRatePerRun);
        row.getCell(4).value = learnerCount > 0 ? learnerCount : '';
        row.getCell(5).value = 1;
        row.getCell(6).value = dateRange;
        row.getCell(7).value = 'N';
        setCurrency(row.getCell(8), valueByPax);
        setCurrency(row.getCell(9), valueByRun);
        row.getCell(10).value = entry?.pbmsInvoiceNumber || '';
        row.getCell(11).value = formatDate(entry?.pbmsInvoiceDate);
        row.getCell(12).value = discountMeta.noDiscount > 0 ? discountMeta.noDiscount : 0;
        row.getCell(13).value = discountMeta.discountGranted > 0 ? discountMeta.discountGranted : 0;
        setCurrency(row.getCell(14), invoiceAmount || null);
        row.getCell(15).value = 'Contract Fees';

        if (idx === 0) {
          row.getCell(16).value = billing.contractFeePBMSBENumber || '';
          row.getCell(17).value = formatDate(billing.contractPBMSInvoiceDate);
          setCurrency(row.getCell(18), toNumber(billing.contractInvoiceAmount) || null);
          row.getCell(19).value = billing.venuePBMSBENumber || '';
          row.getCell(20).value = formatDate(billing.venuePBMSInvoiceDate);
          setCurrency(row.getCell(21), toNumber(billing.venueInvoiceAmount) || null);
          row.getCell(22).value = billing.finalRemarks || '';
        }

        row.getCell(23).value = entry?.remarks || '';
        if (typeof row.getCell(23).value === 'string' && String(row.getCell(23).value).toLowerCase().includes('deduction')) {
          row.getCell(23).font = { color: { argb: 'FFFF0000' } };
        }

        for (let col = 1; col <= 23; col += 1) {
          applyBorder(row.getCell(col));
          if (![1, 6, 22, 23].includes(col) && !row.getCell(col).alignment) {
            row.getCell(col).alignment = { horizontal: 'center', vertical: 'middle' };
          }
        }

        row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        row.getCell(22).alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
        row.getCell(23).alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
        row.height = 24;

        currentRow += 1;
      });
    }

    // Add summary totals row
    const summaryRow = worksheet.getRow(currentRow);
    summaryRow.getCell(1).value = 'TOTAL';
    summaryRow.getCell(1).font = { bold: true };
    summaryRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    applyBorder(summaryRow.getCell(1));

    // Apply borders to all columns in totals row
    for (let col = 2; col <= 23; col++) {
      applyBorder(summaryRow.getCell(col));
    }

    summaryRow.getCell(4).value = totalUnitPax > 0 ? totalUnitPax : '';
    summaryRow.getCell(4).font = { bold: true };
    summaryRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };

    summaryRow.getCell(5).value = totalUnitRun > 0 ? totalUnitRun : '';
    summaryRow.getCell(5).font = { bold: true };
    summaryRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

    setCurrency(summaryRow.getCell(8), totalValuePax > 0 ? totalValuePax : null);
    summaryRow.getCell(8).font = { bold: true };

    setCurrency(summaryRow.getCell(9), totalValueRun > 0 ? totalValueRun : null);
    summaryRow.getCell(9).font = { bold: true };

    summaryRow.getCell(12).value = totalNoDiscounts;
    summaryRow.getCell(12).font = { bold: true };
    summaryRow.getCell(12).alignment = { horizontal: 'center', vertical: 'middle' };

    summaryRow.getCell(13).value = totalDiscountGranted;
    summaryRow.getCell(13).font = { bold: true };
    summaryRow.getCell(13).alignment = { horizontal: 'center', vertical: 'middle' };

    setCurrency(summaryRow.getCell(14), totalActualAmountBilled > 0 ? totalActualAmountBilled : null);
    summaryRow.getCell(14).font = { bold: true };

    setCurrency(summaryRow.getCell(18), totalContractFeesPayout > 0 ? totalContractFeesPayout : null);
    summaryRow.getCell(18).font = { bold: true };

    setCurrency(summaryRow.getCell(21), totalVenueExpenses > 0 ? totalVenueExpenses : null);
    summaryRow.getCell(21).font = { bold: true };

    summaryRow.height = 24;

    // Apply auto-fit for columns based on content and wrapping
    const columnWidths = [
      { min: 25, max: 40 },  // A: Project Title
      { min: 15, max: 20 },  // B: Billing Rate PER PAX
      { min: 15, max: 20 },  // C: Billing Rate PER RUN
      { min: 10, max: 14 },  // D: Unit PAX
      { min: 10, max: 14 },  // E: Unit RUN
      { min: 18, max: 26 },  // F: Course/Service/Delivery Date
      { min: 8, max: 12 },   // G: PM
      { min: 15, max: 20 },  // H: Value PAX
      { min: 15, max: 20 },  // I: Value RUN
      { min: 12, max: 18 },  // J: PBMS Ref
      { min: 12, max: 18 },  // K: PBMS Invoice Date
      { min: 10, max: 14 },  // L: No discounts
      { min: 10, max: 14 },  // M: Discount granted
      { min: 15, max: 20 },  // N: Actual Amount billed
      { min: 15, max: 20 },  // O: Salary / Contract Fees
      { min: 12, max: 18 },  // P: PBMS Ref2
      { min: 12, max: 18 },  // Q: PBMS Invoice Date
      { min: 15, max: 20 },  // R: Contract Payout
      { min: 12, max: 18 },  // S: PBMS Ref3
      { min: 12, max: 18 },  // T: PBMS Invoice Date
      { min: 15, max: 20 },  // U: Venue Expenses
      { min: 28, max: 40 },  // V: Remarks (needs wrapping)
      { min: 28, max: 40 },  // W: Other Remarks (needs wrapping)
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
          const wrapColumns = [1, 6, 22, 23];
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
          if (cell.value && [1, 6, 22, 23].includes(cell.col)) {
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
