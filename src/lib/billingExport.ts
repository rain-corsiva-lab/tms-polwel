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
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
  } else {
    cell.value = '';
  }
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
      { width: 15 }, // V: Total Fee
      { width: 30 }, // W: Remarks
    ];

    worksheet.views = [{ state: 'frozen', ySplit: 3 }];

    worksheet.views = [{ state: 'frozen', ySplit: 3 }];

  // Title row
  worksheet.mergeCells('A1:W1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `PDCS Estimated Billing for Month of ${new Date().toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })}`;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Note row
  worksheet.mergeCells('A2:W2');
    const noteCell = worksheet.getCell('A2');
    noteCell.value = '(All figures to exclude GST)';
    noteCell.font = { italic: true, size: 10 };
    noteCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Header row with all columns
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
      'Total Fee',
      'Remarks',
    ];

    const headerRow = worksheet.getRow(3);
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      // Color coding: Red for important fields, Yellow for data fields, Gray for others
      const redColumns = [0, 9]; // Title, Value of Work Done
      const yellowColumns = [1, 2, 3, 6, 10, 11, 12, 13, 14, 15, 16, 17]; // All data columns
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
    const startRow = 4;
    const endRow = startRow + numBillingRows - 1;

    // Merge columns A-J (course info) across all billing rows
    if (numBillingRows > 1) {
      for (let col = 1; col <= 10; col++) {
        worksheet.mergeCells(startRow, col, endRow, col);
      }
      // Also merge contract and venue columns (P-U)
      for (let col = 16; col <= 21; col++) {
        worksheet.mergeCells(startRow, col, endRow, col);
      }
      // Merge final remarks column (W)
      worksheet.mergeCells(startRow, 23, endRow, 23);
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

    // V: Total Fee (Contract + Venue)
    const contractAmt = contractAmount || 0;
    const venueAmt = venueAmount || 0;
    setCurrency(firstDataRow.getCell(22), contractAmt + venueAmt);

    // W: Remarks (merged)
    firstDataRow.getCell(23).value = billing.finalRemarks || '';
    firstDataRow.getCell(23).alignment = { horizontal: 'left', vertical: 'top', wrapText: true };

  // Apply borders to all cells in first data row
  applyRowBorders(firstDataRow, 1, 23);
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
        if (entry.learners && Array.isArray(entry.learners)) {
          const discountMap = new Map<string, { percentage: number; count: number }>();

          entry.learners.forEach((learner: any) => {
            const discountName = learner.discountName || 'no discount';
            const discountPercentage = learner.discountPercentage || 0;
            const key = `${discountName}_${discountPercentage}`;

            if (discountMap.has(key)) {
              discountMap.get(key)!.count += 1;
            } else {
              discountMap.set(key, { percentage: discountPercentage, count: 1 });
            }
          });

          const discountArray = Array.from(discountMap.entries()).map(([key, data]) => {
            const discountName = key.split('_')[0];
            return `[${discountName} ${data.percentage}% - ${data.count}]`;
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
