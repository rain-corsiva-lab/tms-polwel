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

    worksheet.views = [{ state: 'frozen', ySplit: 6 }];
    worksheet.columns = [
      { width: 38 },
      { width: 18 },
      { width: 18 },
      { width: 18 },
      { width: 12 },
      { width: 14 },
      { width: 18 },
      { width: 28 },
      { width: 12 },
      { width: 22 },
      { width: 16 },
      { width: 18 },
    ];

    worksheet.mergeCells('A1:L1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `PDCS Estimated Billing for Month of ${new Date().toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })}`;
    titleCell.font = { bold: true, size: 14 };

    worksheet.mergeCells('A2:L2');
    const noteCell = worksheet.getCell('A2');
    noteCell.value = '(All figures to exclude GST)';
    noteCell.font = { italic: true };

    worksheet.mergeCells('A4:L4');
    const summaryHeading = worksheet.getCell('A4');
    summaryHeading.value = 'Part 1: Summary';
    summaryHeading.font = { bold: true };
    summaryHeading.alignment = { horizontal: 'left', vertical: 'middle' };
    summaryHeading.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    };

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
      'Value of Work Done (for the month)',
      '',
      '',
    ];

    const headerRow = worksheet.getRow(6);
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      const isRed = index === 0 || index === 9;
      const isYellow = index === 1 || index === 2 || index === 3 || index === 6 || index === 10 || index === 11;
      const fillColor = isRed ? 'FFFF4C4C' : isYellow ? 'FFFFFF99' : 'FFE2E8F0';
      formatHeadingCell(cell, fillColor);
    });
    headerRow.height = 28;

    const billingRate = Number(exportData.billingRate) || 0;
    const participantCount = Number(exportData.participantCount) || 0;
    const beforeGST = billingRate * participantCount;
    const valueOfWorkDone = typeof billing.valueOfWorkDone === 'number' ? billing.valueOfWorkDone : beforeGST;
    const courseDates = courseRun.startDatetime
      ? `${new Date(courseRun.startDatetime).toLocaleDateString('en-GB')} - ${new Date(courseRun.endDatetime).toLocaleDateString('en-GB')}`
      : '';

    const dataRow = worksheet.getRow(7);
    dataRow.getCell(1).value = exportData.title || '';
    dataRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    dataRow.getCell(2).value = exportData.serialNumber || '';
    dataRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    setCurrency(dataRow.getCell(3), billingRate);
    setCurrency(dataRow.getCell(4), beforeGST);
    dataRow.getCell(5).value = participantCount || '';
    dataRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
    dataRow.getCell(6).value = participantCount ? 'HEAD' : '';
    dataRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
    dataRow.getCell(7).value = exportData.billing?.numberOfUnits || 1;
    dataRow.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
    dataRow.getCell(8).value = courseDates;
    dataRow.getCell(8).alignment = { horizontal: 'left', vertical: 'middle' };
    dataRow.getCell(9).value = exportData.projectCode || 'N';
    dataRow.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };
    setCurrency(dataRow.getCell(10), valueOfWorkDone);
    dataRow.getCell(11).value = '';
    dataRow.getCell(12).value = '';
    applyRowBorders(dataRow, 1, 12);
    dataRow.height = 24;

    let currentRow = 9;

    worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
    const invoicingHeading = worksheet.getCell(`A${currentRow}`);
    invoicingHeading.value = 'Invoicing for work done';
    invoicingHeading.font = { bold: true };
    invoicingHeading.alignment = { horizontal: 'left', vertical: 'middle' };
    invoicingHeading.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    };
    currentRow++;

    const invoicingHeaderRow = worksheet.getRow(currentRow);
    const invoicingHeaders = ['Value of Work Done', 'PBMS Ref', 'PBMS Invoice'];
    invoicingHeaders.forEach((header, index) => {
      const cell = invoicingHeaderRow.getCell(10 + index);
      cell.value = header;
      const fillColor = index === 0 ? 'FFFF4C4C' : 'FFFFFF99';
      formatHeadingCell(cell, fillColor);
    });
    invoicingHeaderRow.height = 24;
    currentRow++;

    const billingEntries = Array.isArray(billing.courseRunBillingEntries)
      ? billing.courseRunBillingEntries
      : [];

    if (billingEntries.length === 0) {
      const row = worksheet.getRow(currentRow);
      for (let i = 10; i <= 12; i += 1) {
        const cell = row.getCell(i);
        cell.value = i === 10 ? valueOfWorkDone : '';
        if (i === 10) {
          setCurrency(cell, valueOfWorkDone);
        }
        applyBorder(cell);
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
      currentRow++;
    } else {
      billingEntries.forEach((entry: any) => {
        const entryRow = worksheet.getRow(currentRow);
        const invoiceAmount = typeof entry.invoiceAmount === 'number' ? entry.invoiceAmount : entry.invoiceAmount ? Number(entry.invoiceAmount) : 0;
        setCurrency(entryRow.getCell(10), invoiceAmount || null);
        entryRow.getCell(11).value = entry.pbmsInvoiceNumber || '';
        entryRow.getCell(11).alignment = { horizontal: 'center', vertical: 'middle' };
        entryRow.getCell(12).value = entry.pbmsInvoiceDate
          ? new Date(entry.pbmsInvoiceDate).toLocaleDateString('en-GB')
          : '';
        entryRow.getCell(12).alignment = { horizontal: 'center', vertical: 'middle' };
        applyRowBorders(entryRow, 10, 12);
        entryRow.height = 22;
        currentRow++;
      });
    }

    currentRow += 2;

    worksheet.mergeCells(`A${currentRow}:L${currentRow}`);
    const expenseHeading = worksheet.getCell(`A${currentRow}`);
    expenseHeading.value = 'Expenses (Contract Fees to Trainer / Partners + Venue Expenses)';
    expenseHeading.font = { bold: true };
    expenseHeading.alignment = { horizontal: 'left', vertical: 'middle' };
    expenseHeading.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    };
    currentRow++;

    worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
    const contractHeading = worksheet.getCell(`A${currentRow}`);
    contractHeading.value = 'Contract Fees';
    contractHeading.font = { bold: true };
    contractHeading.alignment = { horizontal: 'left', vertical: 'middle' };
    currentRow++;

    const contractHeaderRow = worksheet.getRow(currentRow);
    const contractHeaders = ['Description', 'PBMS Ref', 'PBMS Invoice', 'Amount'];
    contractHeaders.forEach((header, index) => {
      const cell = contractHeaderRow.getCell(index + 1);
      cell.value = header;
      formatHeadingCell(cell, 'FFFFFF99');
    });
    contractHeaderRow.height = 22;
    currentRow++;

    const contractRow = worksheet.getRow(currentRow);
    contractRow.getCell(1).value = 'Trainer / Partner Fees';
    contractRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    contractRow.getCell(2).value = billing.contractFeePBMSBENumber || '';
    contractRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    contractRow.getCell(3).value = billing.contractPBMSInvoiceDate
      ? new Date(billing.contractPBMSInvoiceDate).toLocaleDateString('en-GB')
      : '';
    contractRow.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
    setCurrency(contractRow.getCell(4), typeof billing.contractInvoiceAmount === 'number' ? billing.contractInvoiceAmount : null);
    applyRowBorders(contractRow, 1, 4);

    currentRow += 2;

    worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
    const venueHeading = worksheet.getCell(`A${currentRow}`);
    venueHeading.value = `Venue Fees - ${exportData.venue || ''}`.trim();
    venueHeading.font = { bold: true };
    venueHeading.alignment = { horizontal: 'left', vertical: 'middle' };
    currentRow++;

    const venueHeaderRow = worksheet.getRow(currentRow);
    const venueHeaders = ['PBMS Ref', 'PBMS Invoice', 'Amount'];
    venueHeaders.forEach((header, index) => {
      const cell = venueHeaderRow.getCell(index + 1);
      cell.value = header;
      formatHeadingCell(cell, 'FFFFFF99');
    });
    venueHeaderRow.height = 22;
    currentRow++;

    const venueRow = worksheet.getRow(currentRow);
    venueRow.getCell(1).value = billing.venuePBMSBENumber || '';
    venueRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    venueRow.getCell(2).value = billing.venuePBMSInvoiceDate
      ? new Date(billing.venuePBMSInvoiceDate).toLocaleDateString('en-GB')
      : '';
    venueRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
  const venueAmount = typeof billing.venueInvoiceAmount === 'number' ? billing.venueInvoiceAmount : billing.venueInvoiceAmount ? Number(billing.venueInvoiceAmount) : null;
  setCurrency(venueRow.getCell(3), venueAmount);
  applyRowBorders(venueRow, 1, 3);

    currentRow += 2;

    worksheet.mergeCells(`A${currentRow}:L${currentRow}`);
    const remarksHeading = worksheet.getCell(`A${currentRow}`);
    remarksHeading.value = 'For the staff to enter special notes';
    remarksHeading.font = { bold: true };
    remarksHeading.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF0000' },
    };
    currentRow++;

  worksheet.mergeCells(`A${currentRow}:L${currentRow + 1}`);
  const remarksCell = worksheet.getCell(`A${currentRow}`);
  remarksCell.value = billing.finalRemarks || '';
  remarksCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
  applyBorder(remarksCell);
  worksheet.getRow(currentRow).height = 60;

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
