import ExcelJS from 'exceljs';
import { courseRunsApi } from './api';

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
    cell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
  } else {
    cell.value = '';
  }
};

const calculateOptimalColumnWidth = (value: string | number | null | undefined): number => {
  if (!value) return 12;
  const stringValue = String(value);
  // Add extra width for wrapped text
  const baseWidth = Math.max(stringValue.length, 12);
  return Math.min(baseWidth + 2, 50); // Cap at 50 for very long content
};

const calculateOptimalRowHeight = (cell: ExcelJS.Cell, columnWidth: number): number => {
  if (!cell.value) return 24;
  const content = String(cell.value);
  const lineCount = Math.ceil(content.length / (columnWidth * 0.7)); // Approximate characters per line
  return Math.max(24, lineCount * 15 + 5); // ~15 pixels per line + padding
};

export async function generateBillingXLSX(courseRunId: string, courseRunCode: string) {
  try {
    const response = await courseRunsApi.getBillingExport(courseRunId);

    if (!response?.success) {
      throw new Error(response?.message || 'Failed to fetch billing data');
    }

    const { courseRun, exportData } = response.data;
    const billing = courseRun.courseRunBilling || {};

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

    // Define column widths - align with consolidated billing format
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
      { width: 30 }, // N: Billing Remarks
      { width: 15 }, // O: Invoice Amount
      { width: 15 }, // P: Contract PBMS BE
      { width: 15 }, // Q: Contract Invoice Date
      { width: 15 }, // R: Contract Amount
      { width: 15 }, // S: Venue PBMS BE
      { width: 15 }, // T: Venue Invoice Date
      { width: 15 }, // U: Venue Amount
      { width: 15 }, // V: Trainer Fees
      { width: 15 }, // W: Additional Fees
      { width: 15 }, // X: Total Fee
      { width: 30 }, // Y: Remarks
    ];

    worksheet.views = [{ state: 'frozen', ySplit: 4 }];

  // Title row
  worksheet.mergeCells('A1:Y1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `PDCS Estimated Billing for Month of ${new Date().toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })}`;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Note row
  worksheet.mergeCells('A2:Y2');
    const noteCell = worksheet.getCell('A2');
    noteCell.value = '(All figures to exclude GST)';
    noteCell.font = { italic: true, size: 10 };
    noteCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Primary header row (grouped headers) - Row 3
    const primaryHeaders = [
      'Course Information',
      '', '', '', '', '', '', '', '',
      'Billing Entries',
      '', '', '', '',
      'Contract Details',
      '', '',
      'Venue Details',
      '', '',
      'Additional Costs',
      '', '',
      '',
    ];

    const primaryHeaderRow = worksheet.getRow(3);
    // Merge cells for grouped headers
    worksheet.mergeCells('A3:J3'); // Course Information
    worksheet.mergeCells('K3:O3'); // Billing Entries
    worksheet.mergeCells('P3:R3'); // Contract Details
    worksheet.mergeCells('S3:U3'); // Venue Details
    worksheet.mergeCells('V3:X3'); // Additional Costs
    worksheet.mergeCells('Y3:Y3'); // Remarks

    primaryHeaderRow.getCell(1).value = 'Course Information';
    formatHeadingCell(primaryHeaderRow.getCell(1), 'FF4472C4'); // Blue
    
    primaryHeaderRow.getCell(11).value = 'Billing Entries';
    formatHeadingCell(primaryHeaderRow.getCell(11), 'FF70AD47'); // Green
    
    primaryHeaderRow.getCell(16).value = 'Contract Details';
    formatHeadingCell(primaryHeaderRow.getCell(16), 'FFC5504B'); // Red/Brown
    
    primaryHeaderRow.getCell(19).value = 'Venue Details';
    formatHeadingCell(primaryHeaderRow.getCell(19), 'FFC5504B'); // Red/Brown
    
    primaryHeaderRow.getCell(22).value = 'Additional Costs';
    formatHeadingCell(primaryHeaderRow.getCell(22), 'FF9E480E'); // Orange
    
    primaryHeaderRow.getCell(25).value = 'Remarks';
    formatHeadingCell(primaryHeaderRow.getCell(25), 'FFE2E8F0'); // Gray

    primaryHeaderRow.height = 20;

    // Secondary header row with all columns - Row 4
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
      'Billing Remarks',
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
      'Remarks',
    ];

    const headerRow = worksheet.getRow(4);
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      // Color coding: Red for important fields, Yellow for data fields, Gray for others
      const redColumns = [0, 9]; // Title, Value of Work Done
      const yellowColumns = [1, 2, 3, 6, 10, 11, 12, 13, 14, 15, 16, 17, 21, 22]; // All data columns including Trainer Fees and Additional Fees
      const fillColor = redColumns.includes(index) ? 'FFFF4C4C' : yellowColumns.includes(index) ? 'FFFFFF99' : 'FFE2E8F0';
      formatHeadingCell(cell, fillColor);
    });
    headerRow.height = 30;

    // Calculate data
    const billingRate = Number(exportData.billingRate) || 0;
    const participantCount = Number(exportData.participantCount) || 0;
    const beforeGST = billingRate * participantCount;
    const valueOfWorkDone = typeof billing.valueOfWorkDone === 'number' ? billing.valueOfWorkDone : beforeGST;
    const courseDates = courseRun.startDatetime
      ? `${new Date(courseRun.startDatetime).toLocaleDateString('en-GB')} - ${new Date(courseRun.endDatetime).toLocaleDateString('en-GB')}`
      : '';

    const billingEntries = Array.isArray(billing.courseRunBillingEntries) ? billing.courseRunBillingEntries : [];
    const numBillingRows = Math.max(billingEntries.length, 1);

    // Data rows - merge cells for columns that don't change per billing entry
    const startRow = 5;
    const endRow = startRow + numBillingRows - 1;

    // Merge columns A-J (course info) across all billing rows
    if (numBillingRows > 1) {
      for (let col = 1; col <= 10; col++) {
        worksheet.mergeCells(startRow, col, endRow, col);
      }
      // Also merge contract, venue, trainer, and additional fee columns (P-X) including Total Fee
      for (let col = 16; col <= 24; col++) {
        worksheet.mergeCells(startRow, col, endRow, col);
      }
      // Merge final remarks column (Y)
      worksheet.mergeCells(startRow, 25, endRow, 25);
    }

    // Fill in the course data (merged cells - only set on first row)
    const firstDataRow = worksheet.getRow(startRow);
    
    // A: Title
    firstDataRow.getCell(1).value = exportData.title || '';
    firstDataRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    
    // B: Course Run #
    firstDataRow.getCell(2).value = exportData.serialNumber || '';
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
    firstDataRow.getCell(7).value = courseRun ? 1 : '';
    firstDataRow.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
    
    // H: Course Duration
    firstDataRow.getCell(8).value = courseDates;
    firstDataRow.getCell(8).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    
    // I: Project
    firstDataRow.getCell(9).value = exportData.projectCode || 'N';
    firstDataRow.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };
    
    // J: Value of Work Done
    setCurrency(firstDataRow.getCell(10), valueOfWorkDone);

    // P-R: Contract Fees (merged)
    firstDataRow.getCell(16).value = billing.contractFeePBMSBENumber || '';
    firstDataRow.getCell(16).alignment = { horizontal: 'center', vertical: 'middle' };

    firstDataRow.getCell(17).value = billing.contractPBMSInvoiceDate
      ? new Date(billing.contractPBMSInvoiceDate).toLocaleDateString('en-GB')
      : '';
    firstDataRow.getCell(17).alignment = { horizontal: 'center', vertical: 'middle' };

    const contractAmount = typeof billing.contractInvoiceAmount === 'number'
      ? billing.contractInvoiceAmount
      : billing.contractInvoiceAmount ? Number(billing.contractInvoiceAmount) : null;
    setCurrency(firstDataRow.getCell(18), contractAmount);

    // S-U: Venue Fees (merged)
    firstDataRow.getCell(19).value = billing.venuePBMSBENumber || '';
    firstDataRow.getCell(19).alignment = { horizontal: 'center', vertical: 'middle' };

    firstDataRow.getCell(20).value = billing.venuePBMSInvoiceDate
      ? new Date(billing.venuePBMSInvoiceDate).toLocaleDateString('en-GB')
      : '';
    firstDataRow.getCell(20).alignment = { horizontal: 'center', vertical: 'middle' };

    const venueAmount = typeof billing.venueInvoiceAmount === 'number'
      ? billing.venueInvoiceAmount
      : billing.venueInvoiceAmount ? Number(billing.venueInvoiceAmount) : null;
    setCurrency(firstDataRow.getCell(21), venueAmount);

    // V: Trainer Fees (merged) - Calculate from courseRunTrainers
    let trainerFeesTotal = 0;
    if (courseRun.courseRunTrainers && Array.isArray(courseRun.courseRunTrainers)) {
      trainerFeesTotal = courseRun.courseRunTrainers.reduce((sum: number, trainer: any) => {
        const baseFee = typeof trainer.trainerBaseAmount === 'number' ? trainer.trainerBaseAmount : Number(trainer.trainerBaseAmount || 0);
        const additionalCost = typeof trainer.additionalCost === 'number' ? trainer.additionalCost : Number(trainer.additionalCost || 0);
        return sum + baseFee + additionalCost;
      }, 0);
    }
    setCurrency(firstDataRow.getCell(22), trainerFeesTotal);

    // W: Additional Fees (merged) - contingencyFee + adminFee + otherFee
    const contingencyFee = typeof courseRun.contingencyFee === 'number' ? courseRun.contingencyFee : Number(courseRun.contingencyFee || 0);
    const adminFee = typeof courseRun.adminFee === 'number' ? courseRun.adminFee : Number(courseRun.adminFee || 0);
    const otherFee = typeof courseRun.otherFee === 'number' ? courseRun.otherFee : Number(courseRun.otherFee || 0);
    const additionalFeesTotal = contingencyFee + adminFee + otherFee;
    setCurrency(firstDataRow.getCell(23), additionalFeesTotal);

    // X: Total Fee (Contract + Venue + Trainer + Additional)
    const contractAmt = contractAmount || 0;
    const venueAmt = venueAmount || 0;
    setCurrency(firstDataRow.getCell(24), contractAmt + venueAmt + trainerFeesTotal + additionalFeesTotal);

    // Y: Remarks (merged)
    firstDataRow.getCell(25).value = billing.finalRemarks || '';
    firstDataRow.getCell(25).alignment = { horizontal: 'left', vertical: 'top', wrapText: true };

  // Apply borders to all cells in first data row
  applyRowBorders(firstDataRow, 1, 25);
    firstDataRow.height = 24 * numBillingRows;

    // Fill in billing entries (columns K-O not merged)
    if (billingEntries.length === 0) {
      const row = worksheet.getRow(startRow);
      row.getCell(11).value = '';
      row.getCell(11).alignment = { horizontal: 'center', vertical: 'middle' };
      applyBorder(row.getCell(11));

      row.getCell(12).value = '';
      row.getCell(12).alignment = { horizontal: 'center', vertical: 'middle' };
      applyBorder(row.getCell(12));

      row.getCell(13).value = '';
      row.getCell(13).alignment = { horizontal: 'left', vertical: 'middle' };
      applyBorder(row.getCell(13));

      row.getCell(14).value = '';
      row.getCell(14).alignment = { horizontal: 'left', vertical: 'middle' };
      applyBorder(row.getCell(14));

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
        row.getCell(12).value = entry.pbmsInvoiceDate
          ? new Date(entry.pbmsInvoiceDate).toLocaleDateString('en-GB')
          : '';
        row.getCell(12).alignment = { horizontal: 'center', vertical: 'middle' };
        applyBorder(row.getCell(12));

        // M: Discount List - format: [discount_name percentage% - count]
        let discountList = '';
        if (entry.courseRunLearners && Array.isArray(entry.courseRunLearners)) {
          const discountMap = new Map<string, { percentage: number; count: number }>();
          
          // Parse course discounts array to create a lookup map
          const discountLookup = new Map<string, string>();
          if (courseRun.course?.discounts && Array.isArray(courseRun.course.discounts)) {
            (courseRun.course.discounts as any[]).forEach((discount: any) => {
              if (discount.id) {
                discountLookup.set(discount.id, discount.name || 'Discount');
              }
            });
          }

          entry.courseRunLearners.forEach((learner: any) => {
            // Map discountId to discount name from course discounts
            const discountId = learner.discountId;
            const discountName = discountId && discountLookup.has(discountId) 
              ? discountLookup.get(discountId)! 
              : 'No Discount';
            const discountPercentage = learner.discountPercentage ? Number(learner.discountPercentage) : 0;
            const key = `${discountName}_${discountPercentage}`;

            if (discountMap.has(key)) {
              discountMap.get(key)!.count += 1;
            } else {
              discountMap.set(key, { percentage: discountPercentage, count: 1 });
            }
          });

          const discountArray = Array.from(discountMap.entries()).map(([key, data]) => {
            const discountName = key.split('_')[0];
            return `[${discountName} ${data.percentage}% = ${data.count}]`;
          });

          discountList = discountArray.join(', ');
        }
        row.getCell(13).value = discountList;
        row.getCell(13).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        applyBorder(row.getCell(13));

        // N: Billing Remarks
        row.getCell(14).value = entry.remarks || '';
        row.getCell(14).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        applyBorder(row.getCell(14));

        // O: Invoice Amount
        setCurrency(row.getCell(15), typeof entry.invoiceAmount === 'number' ? entry.invoiceAmount : entry.invoiceAmount ? Number(entry.invoiceAmount) : null);
        applyBorder(row.getCell(15));

        row.height = 24;
      });
    }

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
      { min: 28, max: 40 },  // N: Billing Remarks (needs wrapping)
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
      { min: 28, max: 40 },  // Y: Remarks (needs wrapping)
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
      if (rowNumber > 4) { // Skip header rows
        row.eachCell((cell) => {
          // Column indices for wrapping (M=13, N=14, Y=25)
          const wrapColumns = ['M', 'N', 'Y'];
          // Apply wrapping to cells that may have long content
          if (wrapColumns.includes(String(cell.col))) {
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
          if (cell.value && ['M', 'N', 'Y'].includes(String(cell.col))) {
            const lines = String(cell.value).split('\n').length;
            const width = worksheet.getColumn(String(cell.col)).width || 30;
            const estLines = Math.ceil(String(cell.value).length / (width * 1.5));
            maxLines = Math.max(maxLines, Math.max(lines, estLines));
          }
        });
        
        // Set row height based on lines (approximately 15 pixels per line)
        row.height = Math.max(24, Math.min(maxLines * 15, 80));
      }
    });

    // Ensure header rows have adequate height
    if (worksheet.getRow(3)) worksheet.getRow(3).height = 22;
    if (worksheet.getRow(4)) worksheet.getRow(4).height = 35;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Billing_Report_${courseRunCode}_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    return true;
  } catch (error) {
    console.error('Error generating billing XLSX:', error);
    throw error;
  }
}
