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

const buildClientActualSection = (worksheet: ExcelJS.Worksheet, startRow: number, billingMonth: string, courseRuns: any[]) => {
  worksheet.mergeCells(startRow, 1, startRow, 28);
  const sectionTitle = worksheet.getCell(startRow, 1);
  sectionTitle.value = `PDCS Estimated Billing for Month of ${billingMonth} (PDCS)`;
  sectionTitle.font = { bold: true, size: 14 };
  sectionTitle.alignment = { horizontal: 'left', vertical: 'middle' };

  const headerRowNum = startRow + 1;
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
    'Actual Amount billed before current month',
    'Actual Amount billed in current month',
    'Actual Amount billed after current month',
    'Salary / Contract Fees',
    'PBMS Ref2 (Invoice for contract fees)',
    'PBMS Invoice creation date for contract fees',
    'Contract Fees Payout before month',
    'Contract Fees Payout in current month',
    'Contract Fees Payout after months',
    'PBMS Ref3 (Invoice for venue expense)',
    'PBMS Invoice creation date for venue expense',
    'Venue Expenses in current month',
    'Venue Expenses in other months',
    'Remarks',
    'Other Remarks',
  ];

  const sectionHeader = worksheet.getRow(headerRowNum);
  headers.forEach((header, index) => {
    const col = index + 1;
    const cell = sectionHeader.getCell(col);
    cell.value = header;

    let fill = 'FFD9D9D9';
    if (col >= 10 && col <= 13) fill = 'FFAEC3DB';
    if (col >= 14 && col <= 16) fill = 'FFBFD0E3';
    if (col >= 17 && col <= 22) fill = 'FFCCC6D9';
    if (col >= 23 && col <= 26) fill = 'FFE8D8C8';
    if (col >= 27) fill = 'FFC4C8CF';

    formatHeadingCell(cell, fill);
    cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
  });
  sectionHeader.height = 46;

  let rowNum = headerRowNum + 1;

  for (const courseRun of courseRuns) {
    const billing = courseRun.billing || {};
    const entries = Array.isArray(billing.entries) && billing.entries.length > 0 ? billing.entries : [null];
    const defaultCourseFee = toNumber(courseRun.defaultCourseFee);
    const start = formatDate(courseRun.startDate, true);
    const end = formatDate(courseRun.endDate, true);
    const dateRange = start && end ? `${start}${start === end ? '' : ` - ${end}`}` : '';

    entries.forEach((entry: any, idx: number) => {
      const row = worksheet.getRow(rowNum);
      const learnerCount = Array.isArray(entry?.learners) ? entry.learners.length : 0;
      const discountMeta = getDiscountMeta(entry, courseRun);
      const invoiceAmount = toNumber(entry?.invoiceAmount);

      const billingRatePerPax = defaultCourseFee > 0 ? defaultCourseFee : null;
      const billingRatePerRun = defaultCourseFee > 0 ? null : toNumber(billing.valueOfWorkDone);
      const valueByPax = billingRatePerPax !== null ? invoiceAmount : null;
      const valueByRun = billingRatePerPax === null ? (invoiceAmount || toNumber(billing.valueOfWorkDone)) : null;

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
      row.getCell(14).value = '';
      setCurrency(row.getCell(15), invoiceAmount || null);
      row.getCell(16).value = '';
      row.getCell(17).value = 'Contract Fees';

      if (idx === 0) {
        row.getCell(18).value = billing.contractFeePBMSBENumber || '';
        row.getCell(19).value = formatDate(billing.contractPBMSInvoiceDate);
        row.getCell(20).value = '';
        setCurrency(row.getCell(21), toNumber(billing.contractInvoiceAmount) || null);
        row.getCell(22).value = '';
        row.getCell(23).value = billing.venuePBMSBENumber || '';
        row.getCell(24).value = formatDate(billing.venuePBMSInvoiceDate);
        setCurrency(row.getCell(25), toNumber(billing.venueInvoiceAmount) || null);
        row.getCell(26).value = '';
        row.getCell(27).value = billing.finalRemarks || '';
      }

      row.getCell(28).value = entry?.remarks || '';
      if (typeof row.getCell(28).value === 'string' && String(row.getCell(28).value).toLowerCase().includes('deduction')) {
        row.getCell(28).font = { color: { argb: 'FFFF0000' } };
      }

      for (let col = 1; col <= 28; col += 1) {
        applyBorder(row.getCell(col));
        if (![1, 6, 27, 28].includes(col) && !row.getCell(col).alignment) {
          row.getCell(col).alignment = { horizontal: 'center', vertical: 'middle' };
        }
      }

      row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      row.getCell(27).alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
      row.getCell(28).alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
      row.height = 24;

      rowNum += 1;
    });
  }

  return rowNum;
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

    // Define column widths (A-AB). Top section uses A-Y, client comparison section uses A-AB.
    worksheet.columns = [
      { width: 30 }, // A: Title
      { width: 15 }, // B: Course Run #
      { width: 12 }, // C: Billing Rate
      { width: 12 }, // D: Before GST
      { width: 8 },  // E: Qty
      { width: 10 }, // F: Unit (HEAD)
      { width: 12 }, // G: Number of Unit
      { width: 20 }, // H: Course Duration
      { width: 8 },  // I: Project
      { width: 15 }, // J: Value of Work Done
      { width: 15 }, // K: PBMS Ref (Invoice)
      { width: 15 }, // L: PBMS Invoice Date
      { width: 30 }, // M: Discount List
      { width: 25 }, // N: Entry Remarks
      { width: 12 }, // O: Invoice Amount
      { width: 15 }, // P: Contract PBMS BE
      { width: 15 }, // Q: Contract Invoice Date
      { width: 15 }, // R: Contract Amount
      { width: 15 }, // S: Venue PBMS BE
      { width: 15 }, // T: Venue Invoice Date
      { width: 15 }, // U: Venue Amount
      { width: 15 }, // V: Trainer Fees (NEW)
      { width: 15 }, // W: Additional Fees (NEW)
      { width: 15 }, // X: Total Fee
      { width: 30 }, // Y: Final Remarks
      { width: 12 }, // Z: Venue Expenses in other months
      { width: 30 }, // AA: Remarks
      { width: 30 }, // AB: Other Remarks
    ];

    worksheet.views = [{ state: 'frozen', ySplit: 3 }];

    // Title row
    worksheet.mergeCells('A1:Y1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `PDCS Estimated Billing for Month of ${exportData.billingMonth}`;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Note row
    worksheet.mergeCells('A2:Y2');
    const noteCell = worksheet.getCell('A2');
    noteCell.value = '(All figures to exclude GST)';
    noteCell.font = { italic: true, size: 10 };
    noteCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Header row with all columns including new fee columns
    const headers = [
      'Title',
      'Course Run #',
      'Billing Rate',
      'Before GST',
      'Qty',
      'Unit (HEAD)',
      'Number of Unit (RUN)',
      'Course Duration',
      'Project',
      'Value of Work Done',
      'PBMS Ref',
      'PBMS Invoice',
      'Discount List',
      'Entry Remarks',
      'Invoice Amount',
      'Contract PBMS BE',
      'Contract Invoice Date',
      'Contract Amount',
      'Venue PBMS BE',
      'Venue Invoice Date',
      'Venue Amount',
      'Trainer Fees',
      'Additional Fees',
      'Total Fee',
      'Final Remarks',
    ];

    const headerRow = worksheet.getRow(3);
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      // Header palette aligned to client sample
      const redColumns = [0, 9]; // Title, Value of Work Done
      const greenColumns = [2, 3, 21, 23]; // Billing Rate, Before GST, Trainer Fees, Total Fee
      const yellowColumns = [1, 6, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22];
      const fillColor = redColumns.includes(index)
        ? 'FFFF4C4C'
        : greenColumns.includes(index)
          ? 'FF00B050'
          : yellowColumns.includes(index)
            ? 'FFFFFF99'
            : 'FFDCE6F1';
      formatHeadingCell(cell, fillColor);
    });
    headerRow.height = 30;

    // Process each course run
    let currentRow = 4;
    const courseRuns = exportData.courseRuns || [];

    for (const courseRun of courseRuns) {
      const billing = courseRun.billing || {};
      const billingEntries = billing.entries || [];
      const numBillingRows = Math.max(billingEntries.length, 1);

      const startRow = currentRow;
      const endRow = currentRow + numBillingRows - 1;

      // Calculate data for this course run
      const contractFees = courseRun.contractFees || 0;
      const participantCount = courseRun.participants || 0;
      const defaultCourseFee = toNumber(courseRun.defaultCourseFee);

      // Billing rate should follow the configured default course fee when available.
      const billingRate = defaultCourseFee > 0 ? defaultCourseFee : (participantCount > 0 ? contractFees / participantCount : 0);
      const beforeGST = contractFees; // This is the contract amount before GST
      const valueOfWorkDone = billing.valueOfWorkDone || beforeGST;
      
      const courseDates = courseRun.startDate && courseRun.endDate
        ? `${new Date(courseRun.startDate).toLocaleDateString('en-GB')} - ${new Date(courseRun.endDate).toLocaleDateString('en-GB')}`
        : '';

      // Merge columns A-J and P-X across all billing rows if there are multiple entries
      if (numBillingRows > 1) {
        for (let col = 1; col <= 10; col++) {
          worksheet.mergeCells(startRow, col, endRow, col);
        }
        // Also merge contract and venue columns (P-X) including new fee columns and Total Fee
        for (let col = 16; col <= 24; col++) {
          worksheet.mergeCells(startRow, col, endRow, col);
        }
        // Merge final remarks column (Y)
        worksheet.mergeCells(startRow, 25, endRow, 25);
      }

      // Fill in the course data (merged cells - only set on first row)
      const firstDataRow = worksheet.getRow(startRow);
      
      // A: Title
      firstDataRow.getCell(1).value = courseRun.courseTitle || '';
      firstDataRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      
      // B: Course Run #
      firstDataRow.getCell(2).value = courseRun.courseRunCode || '';
      firstDataRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      
      // C: Billing Rate
      setCurrency(firstDataRow.getCell(3), billingRate);
      
      // D: Before GST
      setCurrency(firstDataRow.getCell(4), beforeGST);
      
      // E: Qty
      firstDataRow.getCell(5).value = participantCount || '';
      firstDataRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
      
      // F: Unit
      firstDataRow.getCell(6).value = participantCount ? 'HEAD' : '';
      firstDataRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
      
      // G: Number of Unit
      firstDataRow.getCell(7).value = 1;
      firstDataRow.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
      
      // H: Course Duration
      firstDataRow.getCell(8).value = courseDates;
      firstDataRow.getCell(8).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      
      // I: Project
      firstDataRow.getCell(9).value = 'N';
      firstDataRow.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };
      
      // J: Value of Work Done
      setCurrency(firstDataRow.getCell(10), valueOfWorkDone);

      // P: Contract PBMS BE
      firstDataRow.getCell(16).value = billing.contractFeePBMSBENumber || '';
      firstDataRow.getCell(16).alignment = { horizontal: 'center', vertical: 'middle' };
      
      // Q: Contract Invoice Date
      firstDataRow.getCell(17).value = billing.contractPBMSInvoiceDate
        ? new Date(billing.contractPBMSInvoiceDate).toLocaleDateString('en-GB')
        : '';
      firstDataRow.getCell(17).alignment = { horizontal: 'center', vertical: 'middle' };
      
      // R: Contract Amount
      setCurrency(firstDataRow.getCell(18), billing.contractInvoiceAmount);

      // S: Venue PBMS BE
      firstDataRow.getCell(19).value = billing.venuePBMSBENumber || '';
      firstDataRow.getCell(19).alignment = { horizontal: 'center', vertical: 'middle' };
      
      // T: Venue Invoice Date
      firstDataRow.getCell(20).value = billing.venuePBMSInvoiceDate
        ? new Date(billing.venuePBMSInvoiceDate).toLocaleDateString('en-GB')
        : '';
      firstDataRow.getCell(20).alignment = { horizontal: 'center', vertical: 'middle' };
      
      // U: Venue Amount
      setCurrency(firstDataRow.getCell(21), billing.venueInvoiceAmount);

      // V: Trainer Fees (NEW)
      const trainerFees = courseRun.trainerFees || 0;
      setCurrency(firstDataRow.getCell(22), trainerFees);

      // W: Additional Fees (NEW)
      const additionalFees = courseRun.additionalFees || 0;
      setCurrency(firstDataRow.getCell(23), additionalFees);

      // X: Total Fee (Contract + Venue + Trainer + Additional)
      const contractAmount = billing.contractInvoiceAmount || 0;
      const venueAmount = billing.venueInvoiceAmount || 0;
      const totalFee = contractAmount + venueAmount + trainerFees + additionalFees;
      setCurrency(firstDataRow.getCell(24), totalFee);

      // Y: Final Remarks
      firstDataRow.getCell(25).value = billing.finalRemarks || '';
      firstDataRow.getCell(25).alignment = { horizontal: 'left', vertical: 'top', wrapText: true };

      // Apply borders to all cells in first data row
      applyRowBorders(firstDataRow, 1, 25);
      firstDataRow.height = 24 * numBillingRows;

      // Fill in billing entries (columns K-O only, not merged)
      if (billingEntries.length === 0) {
        const row = worksheet.getRow(startRow);
        // K: PBMS Ref
        row.getCell(11).value = '';
        row.getCell(11).alignment = { horizontal: 'center', vertical: 'middle' };
        applyBorder(row.getCell(11));
        
        // L: PBMS Invoice Date
        row.getCell(12).value = '';
        row.getCell(12).alignment = { horizontal: 'center', vertical: 'middle' };
        applyBorder(row.getCell(12));
        
        // M: Discount List
        row.getCell(13).value = '';
        row.getCell(13).alignment = { horizontal: 'left', vertical: 'middle' };
        applyBorder(row.getCell(13));
        
        // N: Entry Remarks
        row.getCell(14).value = '';
        row.getCell(14).alignment = { horizontal: 'left', vertical: 'middle' };
        applyBorder(row.getCell(14));
        
        // O: Invoice Amount
        row.getCell(15).value = '';
        row.getCell(15).alignment = { horizontal: 'right', vertical: 'middle' };
        applyBorder(row.getCell(15));
      } else {
        billingEntries.forEach((entry: any, index: number) => {
          const row = worksheet.getRow(startRow + index);
          
          // K: PBMS Ref (invoice number)
          row.getCell(11).value = entry.pbmsInvoiceNumber || '';
          row.getCell(11).alignment = { horizontal: 'center', vertical: 'middle' };
          applyBorder(row.getCell(11));
          
          // L: PBMS Invoice Date
          row.getCell(12).value = entry.pbmsInvoiceDate || '';
          row.getCell(12).alignment = { horizontal: 'center', vertical: 'middle' };
          applyBorder(row.getCell(12));
          
          const discountMeta = getDiscountMeta(entry, courseRun);
          row.getCell(13).value = discountMeta.text;
          row.getCell(13).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
          applyBorder(row.getCell(13));
          
          // N: Entry Remarks
          row.getCell(14).value = entry.remarks || '';
          row.getCell(14).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
          applyBorder(row.getCell(14));
          
          // O: Invoice Amount
          setCurrency(row.getCell(15), entry.invoiceAmount);
          applyBorder(row.getCell(15));
          
          row.height = 24;
        });
      }

      currentRow += numBillingRows;
    }

    // Add summary totals row
    const summaryRow = worksheet.getRow(currentRow + 1);
    
    // Calculate totals from all course runs
    let totalCourseRuns = 0;
    let totalParticipants = 0;
    let totalContractFees = 0;
    let totalVenueFees = 0;
    let totalTrainerFees = 0;
    let totalAdditionalFees = 0;
    
    for (const courseRun of courseRuns) {
      totalCourseRuns += 1;
      totalParticipants += courseRun.participants || 0;
      const billing = courseRun.billing || {};
      totalContractFees += billing.contractInvoiceAmount || 0;
      totalVenueFees += billing.venueInvoiceAmount || 0;
      totalTrainerFees += courseRun.trainerFees || 0;
      totalAdditionalFees += courseRun.additionalFees || 0;
    }
    
    const totalAllFees = totalContractFees + totalVenueFees + totalTrainerFees + totalAdditionalFees;
    
    // A: Label
    summaryRow.getCell(1).value = 'TOTAL';
    summaryRow.getCell(1).font = { bold: true };
    summaryRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    applyBorder(summaryRow.getCell(1));
    
    // B-G: Empty cells with borders
    for (let col = 2; col <= 7; col++) {
      applyBorder(summaryRow.getCell(col));
    }
    
    // E: Total Participants (in Qty column)
    summaryRow.getCell(5).value = totalParticipants;
    summaryRow.getCell(5).font = { bold: true };
    summaryRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
    applyBorder(summaryRow.getCell(5));
    
    // H-P: Empty cells with borders
    for (let col = 8; col <= 16; col++) {
      applyBorder(summaryRow.getCell(col));
    }
    
    // Q: Empty with border
    applyBorder(summaryRow.getCell(17));
    
    // R: Total Contract Fees
    setCurrency(summaryRow.getCell(18), totalContractFees);
    summaryRow.getCell(18).font = { bold: true };
    applyBorder(summaryRow.getCell(18));
    
    // S: Empty with border
    applyBorder(summaryRow.getCell(19));
    
    // T: Empty with border
    applyBorder(summaryRow.getCell(20));
    
    // U: Total Venue Fees
    setCurrency(summaryRow.getCell(21), totalVenueFees);
    summaryRow.getCell(21).font = { bold: true };
    applyBorder(summaryRow.getCell(21));
    
    // V: Total Trainer Fees
    setCurrency(summaryRow.getCell(22), totalTrainerFees);
    summaryRow.getCell(22).font = { bold: true };
    applyBorder(summaryRow.getCell(22));
    
    // W: Total Additional Fees
    setCurrency(summaryRow.getCell(23), totalAdditionalFees);
    summaryRow.getCell(23).font = { bold: true };
    applyBorder(summaryRow.getCell(23));
    
    // X: Total All Fees (moved from V to X due to new columns)
    setCurrency(summaryRow.getCell(24), totalAllFees);
    summaryRow.getCell(24).font = { bold: true, color: { argb: 'FFFF0000' } }; // Red font
    applyBorder(summaryRow.getCell(24));
    
    // Y: Total Course Runs as text (moved from W to Y)
    summaryRow.getCell(25).value = `Total Runs: ${totalCourseRuns}`;
    summaryRow.getCell(25).font = { bold: true };
    summaryRow.getCell(25).alignment = { horizontal: 'left', vertical: 'middle' };
    applyBorder(summaryRow.getCell(25));
    
    summaryRow.height = 24;

    // Apply auto-fit for columns based on content and wrapping
    const columnWidths = [
      { min: 25, max: 40 },  // A: Title
      { min: 12, max: 18 },  // B: Course Run #
      { min: 12, max: 16 },  // C: Billing Rate
      { min: 12, max: 16 },  // D: Before GST
      { min: 8, max: 12 },   // E: Qty
      { min: 10, max: 14 },  // F: Unit (HEAD)
      { min: 12, max: 18 },  // G: Number of Unit
      { min: 18, max: 26 },  // H: Course Duration
      { min: 8, max: 12 },   // I: Project
      { min: 12, max: 18 },  // J: Value of Work Done
      { min: 12, max: 18 },  // K: PBMS Ref (Invoice)
      { min: 12, max: 18 },  // L: PBMS Invoice Date
      { min: 28, max: 40 },  // M: Discount List (needs wrapping)
      { min: 25, max: 40 },  // N: Entry Remarks (needs wrapping)
      { min: 12, max: 18 },  // O: Invoice Amount
      { min: 12, max: 18 },  // P: Contract PBMS BE
      { min: 12, max: 18 },  // Q: Contract Invoice Date
      { min: 12, max: 18 },  // R: Contract Amount
      { min: 12, max: 18 },  // S: Venue PBMS BE
      { min: 12, max: 18 },  // T: Venue Invoice Date
      { min: 12, max: 18 },  // U: Venue Amount
      { min: 12, max: 18 },  // V: Trainer Fees
      { min: 12, max: 18 },  // W: Additional Fees
      { min: 12, max: 18 },  // X: Total Fee
      { min: 28, max: 40 },  // Y: Final Remarks (needs wrapping)
      { min: 12, max: 18 },  // Z
      { min: 28, max: 40 },  // AA
      { min: 28, max: 40 },  // AB
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
      if (rowNumber > 3) { // Skip header rows
        row.eachCell((cell) => {
          // Wrap long text columns
          const wrapColumns = [13, 14, 25, 27, 28];
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
          if (cell.value && [13, 14, 25, 27, 28].includes(cell.col)) {
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
    if (worksheet.getRow(3)) worksheet.getRow(3).height = 35;

    // Add client-aligned comparison layout section (A-AB)
    const secondSectionStartRow = currentRow + 4;
    buildClientActualSection(worksheet, secondSectionStartRow, exportData.billingMonth, courseRuns);

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
