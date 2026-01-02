import React, { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { courseRunsApi, clientOrganizationsApi } from "@/lib/api";
import { Download, Loader2, UploadCloud } from "lucide-react";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";

type ImportLearnerRow = {
  name: string;
  email: string;
  contact?: string;
  designation?: string;
  clientOrganizationName: string;
  department?: string;
  paymentMethod?: string;
  coordinatorEmail?: string;
  discountName?: string;
  feesRemarks?: string;
  invoiceRemarks?: string;
  remarks?: string;
  buNumber?: string;
  trainingCoordinatorName?: string;
  trainingCoordinatorEmail?: string;
  trainingCoordinatorContact?: string;
};

type ImportLearnerResultSummary = {
  imported: number;
  failed: number;
  successes: Array<{ row: number; learnerId: string; learnerName: string }>;
  errors: Array<{ row: number; email?: string; name?: string; reason: string }>;
};

const IMPORT_TEMPLATE_COLUMNS: Array<{ header: string; key: keyof ImportLearnerRow; required?: boolean; example?: string }> = [
  { header: "Name", key: "name", required: true, example: "Jane Doe" },
  { header: "Department", key: "department", example: "Operations" },
  { header: "Designation", key: "designation", example: "Training Officer" },
  { header: "Email", key: "email", required: true, example: "jane.doe@example.com" },
  { header: "Contact", key: "contact", example: "+65 6123 4567" },
  { header: "Client Organisation Name", key: "clientOrganizationName", required: true, example: "Singapore Police Force" },
  { header: "Payment Method", key: "paymentMethod", example: "Company-Sponsored (Non-Home Team)" },
  { header: "BU Number", key: "buNumber", example: "BU123456" },
  { header: "Training Coordinator Name", key: "trainingCoordinatorName", example: "John Smith" },
  { header: "Training Coordinator Email", key: "trainingCoordinatorEmail", example: "coordinator@example.com" },
  { header: "Training Coordinator Contact", key: "trainingCoordinatorContact", example: "+65 6789 0123" },
  { header: "Discount Name", key: "discountName", example: "Home Team Subsidy" },
  { header: "Fees Remarks", key: "feesRemarks" },
  { header: "Invoice Remarks", key: "invoiceRemarks" },
  { header: "Remarks", key: "remarks" },
];

const PAYMENT_MODES = [
  "Self-Payment",
  "Transition Dollar (TS)",
  "Unit Local Training Fund (ULTF)",
  "Company-Sponsored (Non-Home Team)",
  "Polwel Training Subsidy",
];

interface ImportLearnersDialogProps {
  courseRunId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  baseCourseFee?: number;
}

export const ImportLearnersDialog: React.FC<ImportLearnersDialogProps> = ({ courseRunId, open, onOpenChange, onSuccess, baseCourseFee = 0 }) => {
  const { toast } = useToast();
  const [rows, setRows] = useState<ImportLearnerRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [result, setResult] = useState<ImportLearnerResultSummary | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetState = () => {
    setRows([]);
    setFileName("");
    setParseErrors([]);
    setResult(null);
    setIsParsing(false);
    setIsSubmitting(false);
  };

  const handleDownloadTemplate = async () => {
    try {
      // Fetch all organizations first
      const orgsResponse = await clientOrganizationsApi.getAll({ limit: 1000 });
      const organizations = orgsResponse.organizations || [];

      console.log("Fetched organizations for import template:", organizations.length);

      const workbook = new ExcelJS.Workbook();

      // Create Participants sheet with current columns
      const learnersSheet = workbook.addWorksheet("Learners");
      const headers = IMPORT_TEMPLATE_COLUMNS.map((column) => column.header);
      const exampleRow = IMPORT_TEMPLATE_COLUMNS.map((column) => column.example ?? "");

      // Add headers
      learnersSheet.addRow(headers);

      // Add example row
      learnersSheet.addRow(exampleRow);

      // Style header row
      learnersSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      learnersSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF366092" } };
      learnersSheet.getRow(1).alignment = { horizontal: "center", vertical: "middle" };

      // Set column widths
      const columnWidths = [20, 18, 20, 25, 18, 30, 30, 15, 25, 25, 20, 20, 15, 15, 15];
      learnersSheet.columns.forEach((col, idx) => {
        col.width = columnWidths[idx] || 15;
      });

      // Add data validation dropdown for Payment Method column (column G, index 6)
      // Validation applies to rows 2-1000
      const paymentMethods = PAYMENT_MODES.join(",");
      for (let row = 2; row <= 1000; row++) {
        const cell = learnersSheet.getCell(`G${row}`);
        (cell.dataValidation as any) = {
          type: "list",
          formulae: [`"${paymentMethods}"`],
        };
      }

      // Add data validation dropdown for Client Organisation Name column (column F, index 5)
      // Reference the organization names from the "Name of Organisation" sheet
      const orgCount = organizations.length;
      if (orgCount > 0) {
        for (let row = 2; row <= 1000; row++) {
          const cell = learnersSheet.getCell(`F${row}`);
          (cell.dataValidation as any) = {
            type: "list",
            formulae: [`='Name of Organisation'!$A$2:$A$${orgCount + 1}`],
          };
        }
      }

      // Create Payment Method reference sheet
      const refSheet = workbook.addWorksheet("Payment Method");
      refSheet.addRow(["Payment Method", "Description", "Code"]);
      refSheet.addRow(["Self-Payment", "Participant pays their own fees", "SELF_SPONSORED"]);
      refSheet.addRow(["Transition Dollar (TS)", "Using Transition Dollar funding", "TRANSITION_DOLLARS"]);
      refSheet.addRow(["Unit Local Training Fund (ULTF)", "Using Unit Local Training Fund", "ULTF"]);
      refSheet.addRow(["Company-Sponsored (Non-Home Team)", "Company sponsored training", "COMPANY_BILLING"]);
      refSheet.addRow(["Polwel Training Subsidy", "Government training subsidy", "GOVERNMENT_FUNDING"]);

      // Style reference sheet header
      refSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      refSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF366092" } };
      refSheet.getRow(1).alignment = { horizontal: "center", vertical: "middle" };

      // Set column widths for reference sheet
      refSheet.columns[0].width = 35;
      refSheet.columns[1].width = 40;
      refSheet.columns[2].width = 20;

      // Create Name of Organisation reference sheet
      const orgSheet = workbook.addWorksheet("Name of Organisation");
      orgSheet.addRow(["Organization Name", "Organization Type"]);
      organizations.forEach((org) => {
        orgSheet.addRow([org.name, org.organizationType || ""]);
      });

      // Style organization sheet header
      orgSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      orgSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF366092" } };
      orgSheet.getRow(1).alignment = { horizontal: "center", vertical: "middle" };

      // Set column widths for organization sheet
      orgSheet.columns[0].width = 40;
      orgSheet.columns[1].width = 25;

      // Generate file and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "participant-import-template.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Template Downloaded",
        description: "Your participant import template has been downloaded successfully.",
      });
    } catch (error) {
      console.error("Failed to generate participant import template:", error);
      toast({
        title: "Unable to download template",
        description: "Please try again or contact support if the issue persists.",
        variant: "destructive",
      });
    }
  };

  const handleClear = () => {
    setRows([]);
    setFileName("");
    setParseErrors([]);
    setResult(null);
    setIsParsing(false);
  };

  const parseFile = async (file: File | null) => {
    if (!file) {
      handleClear();
      return;
    }

    setIsParsing(true);
    setParseErrors([]);
    setResult(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });

      if (!workbook.SheetNames.length) {
        setParseErrors(["The selected file does not contain any sheets."]);
        setRows([]);
        setFileName(file.name);
        return;
      }

      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
        defval: "",
        raw: false,
      });

      if (!rawRows.length) {
        setParseErrors(["The selected file does not contain any data rows."]);
        setRows([]);
        setFileName(file.name);
        return;
      }

      const normalizedHeaders = new Set<string>();
      rawRows.forEach((row) => {
        Object.keys(row).forEach((key) => {
          if (typeof key === "string" && key.trim()) {
            normalizedHeaders.add(key.trim().toLowerCase());
          }
        });
      });

      const missingHeaders = IMPORT_TEMPLATE_COLUMNS.filter((column) => column.required).filter(
        (column) => !normalizedHeaders.has(column.header.toLowerCase())
      );

      if (missingHeaders.length) {
        setParseErrors([
          `Missing required columns: ${missingHeaders
            .map((column) => column.header)
            .join(", ")}. Please download the template and ensure the headers are unchanged.`,
        ]);
        setRows([]);
        setFileName(file.name);
        return;
      }

      const processedRows: ImportLearnerRow[] = rawRows
        .map((row) => {
          const extractValue = (keys: string[]): string => {
            for (const key of keys) {
              if (key in row) {
                const value = row[key];
                if (value === undefined || value === null) {
                  continue;
                }
                const stringValue = typeof value === "string" ? value : String(value);
                const trimmed = stringValue.trim();
                if (trimmed) {
                  return trimmed;
                }
              }
            }
            return "";
          };

          const mappedRow: ImportLearnerRow = {
            name: extractValue(["Name", "name"]),
            email: extractValue(["Email", "email"]),
            contact: extractValue(["Contact", "contact", "Contact Number", "Phone"]),
            designation: extractValue(["Designation", "designation", "Title"]),
            clientOrganizationName: extractValue(["Client Organization Name", "clientOrganizationName", "Client Organisation Name"]),
            department: extractValue(["Department", "department", "Department Name", "departmentName"]),
            paymentMethod: extractValue(["Payment Method", "paymentMethod", "Payment Mode"]),
            coordinatorEmail: extractValue(["Coordinator Email", "coordinatorEmail", "Training Coordinator Email"]),
            discountName: extractValue(["Discount Name", "discountName"]),
            feesRemarks: extractValue(["Fees Remarks", "feesRemarks", "Fee Remarks"]),
            invoiceRemarks: extractValue(["Invoice Remarks", "invoiceRemarks", "Invoice Number"]),
            remarks: extractValue(["Remarks", "remarks"]),
          };

          return mappedRow;
        })
        .filter((row) => Object.values(row).some((value) => typeof value === "string" && value.trim().length));

      if (!processedRows.length) {
        setParseErrors(["No participant rows were detected. Please ensure your file contains participant information starting from the second row."]);
        setRows([]);
        setFileName(file.name);
        return;
      }

      const rowValidationIssues: string[] = [];
      processedRows.forEach((row, index) => {
        const missingFields: string[] = [];
        if (!row.name) missingFields.push("Name");
        if (!row.email) missingFields.push("Email");
        if (!row.clientOrganizationName) missingFields.push("Client Organization Name");
        if (missingFields.length) {
          rowValidationIssues.push(
            `Row ${index + 2}: Missing ${missingFields.join(", ")}. These participants will fail to import until the details are provided.`
          );
        }
      });

      setRows(processedRows);
      setFileName(file.name);
      setParseErrors(rowValidationIssues);
    } catch (error) {
      console.error("Failed to parse participant import file:", error);
      setParseErrors(["We couldn't read this file. Please ensure it's a CSV or Excel file that follows the latest template."]);
      setRows([]);
      setFileName("");
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmit = async () => {
    if (isParsing) {
      toast({
        title: "Processing file",
        description: "Please wait for the file to finish processing before importing.",
        variant: "destructive",
      });
      return;
    }

    if (!rows.length) {
      toast({
        title: "No participants detected",
        description: "Upload a CSV or Excel file that follows the template before importing.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await courseRunsApi.importLearners(courseRunId, { rows });

      const successes = Array.isArray(response?.results?.successes) ? response.results.successes : [];
      const errors = Array.isArray(response?.results?.errors) ? response.results.errors : [];
      const importedCount = typeof response?.imported === "number" ? response.imported : successes.length;
      const failedCount = typeof response?.failed === "number" ? response.failed : errors.length;

      const summary: ImportLearnerResultSummary = {
        imported: importedCount,
        failed: failedCount,
        successes,
        errors,
      };
      setResult(summary);

      const descriptionParts: string[] = [];
      descriptionParts.push(`${importedCount} learner${importedCount === 1 ? "" : "s"} imported`);
      if (failedCount > 0) {
        descriptionParts.push(`${failedCount} failed`);
      }

      toast({
        title: failedCount > 0 ? "Import completed with issues" : "Import completed",
        description: descriptionParts.join(", "),
        ...(failedCount > 0 && importedCount === 0 ? { variant: "destructive" as const } : {}),
      });

      if (importedCount > 0) {
        onSuccess?.();
      }
    } catch (error) {
      console.error("Failed to import participants:", error);
      toast({
        title: "Import failed",
        description: "We couldn't import learners. Please review your file and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedBaseFee = new Intl.NumberFormat("en-SG", { style: "currency", currency: "SGD" }).format(baseCourseFee || 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) {
          resetState();
        }
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import participants from CSV/XLSX</DialogTitle>
        </DialogHeader>

        <ImportLearnersForm
          rows={rows}
          fileName={fileName}
          parseErrors={parseErrors}
          result={result}
          isParsing={isParsing}
          isSubmitting={isSubmitting}
          onFileSelected={parseFile}
          onDownloadTemplate={handleDownloadTemplate}
          onClear={handleClear}
          baseCourseFee={formattedBaseFee}
        />

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || isParsing || rows.length === 0}>
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </span>
            ) : (
              "Import now"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface ImportLearnersFormProps {
  rows: ImportLearnerRow[];
  fileName: string;
  parseErrors: string[];
  result: ImportLearnerResultSummary | null;
  isParsing: boolean;
  isSubmitting: boolean;
  onFileSelected: (file: File | null) => void;
  onDownloadTemplate: () => void;
  onClear: () => void;
  baseCourseFee: string;
}

const ImportLearnersForm: React.FC<ImportLearnersFormProps> = ({
  rows,
  fileName,
  parseErrors,
  result,
  isParsing,
  isSubmitting,
  onFileSelected,
  onDownloadTemplate,
  onClear,
  baseCourseFee,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewRows = rows.slice(0, 5);
  const hasMoreRows = rows.length > previewRows.length;
  const requiredColumns = IMPORT_TEMPLATE_COLUMNS.filter((column) => column.required).map((column) => column.header);
  const optionalColumns = IMPORT_TEMPLATE_COLUMNS.filter((column) => !column.required).map((column) => column.header);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    onFileSelected(nextFile);
    event.target.value = "";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle> Participant import template</CardTitle>
          <CardDescription>
            Required columns: {requiredColumns.join(", ")}. Optional columns: {optionalColumns.join(", ") || "None"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-3xl">
              Use the latest template so headers stay consistent. Client organisations are matched by name, coordinators by email, and discounts by their exact
              name. Base course fee defaults to {baseCourseFee}; discounts will be applied automatically.
            </p>
            <Button type="button" variant="outline" onClick={onDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download template
            </Button>
          </div>
          <ul className="list-disc pl-6 space-y-1">
            <li>Supports CSV and Excel (.xlsx) files.</li>
            <li>Leave optional columns blank if not applicable.</li>
            <li>Ensure participant emails are unique per row.</li>
            <li>one participant per row; duplicate rows will be flagged during import.</li>
          </ul>
        </CardContent>
      </Card>

      <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 p-6 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="flex flex-col items-center gap-3">
          <UploadCloud className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Drop your CSV/XLSX file here</p>
            <p className="text-xs text-muted-foreground">or click below to browse.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={isParsing || isSubmitting}>
              {isParsing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <UploadCloud className="h-4 w-4" />
                  Choose file
                </span>
              )}
            </Button>
            {(rows.length > 0 || fileName) && (
              <Button type="button" variant="ghost" onClick={onClear} disabled={isParsing || isSubmitting}>
                Clear selection
              </Button>
            )}
          </div>
          {fileName ? (
            <p className="text-xs text-muted-foreground">
              Selected file: <span className="font-medium text-foreground">{fileName}</span> – {rows.length} learner{rows.length === 1 ? "" : "s"} detected.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Accepted formats: .csv, .xlsx</p>
          )}
        </div>
      </div>

      {parseErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>File warnings</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5 space-y-1">
              {parseErrors.slice(0, 5).map((message, index) => (
                <li key={index}>{message}</li>
              ))}
              {parseErrors.length > 5 && <li>...and {parseErrors.length - 5} more issue(s).</li>}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {rows.length > 0 && (
        <Card>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                Showing the first {previewRows.length} row{previewRows.length === 1 ? "" : "s"} out of {rows.length} detected.
              </CardDescription>
            </div>
            <Badge variant="secondary">
              {rows.length} learner{rows.length === 1 ? "" : "s"}
            </Badge>
          </CardHeader>
          <CardContent className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  {IMPORT_TEMPLATE_COLUMNS.map((column) => (
                    <TableHead key={column.header}>{column.header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{index + 1}</TableCell>
                    {IMPORT_TEMPLATE_COLUMNS.map((column) => {
                      const cellValue = row[column.key] as string | undefined;
                      return <TableCell key={column.header}>{cellValue ? cellValue : <span className="text-muted-foreground">—</span>}</TableCell>;
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {hasMoreRows && (
              <p className="mt-3 text-xs text-muted-foreground">Showing a partial preview. Import will include all {rows.length} participants.</p>
            )}
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Import summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Imported {result.imported}</Badge>
              <Badge variant={result.failed > 0 ? "destructive" : "secondary"}>Failed {result.failed}</Badge>
            </div>
            {result.successes.length > 0 && (
              <div>
                <h4 className="font-medium text-foreground">Imported participants</h4>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  {result.successes.slice(0, 5).map((item) => (
                    <li key={item.learnerId}>
                      Row {item.row}: {item.learnerName}
                    </li>
                  ))}
                  {result.successes.length > 5 && <li>...and {result.successes.length - 5} more learner(s).</li>}
                </ul>
              </div>
            )}
            {result.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTitle>Rows that could not be imported</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5 space-y-1">
                    {result.errors.slice(0, 5).map((error, index) => (
                      <li key={`${error.row}-${index}`}>
                        Row {error.row}
                        {error.name ? ` (${error.name})` : ""}
                        {error.email ? ` <${error.email}>` : ""}: {error.reason}
                      </li>
                    ))}
                    {result.errors.length > 5 && <li>...and {result.errors.length - 5} more issue(s).</li>}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ImportLearnersDialog;
