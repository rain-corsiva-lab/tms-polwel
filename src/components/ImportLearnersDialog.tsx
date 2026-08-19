import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle2, Loader2, Users, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { importApi, courseRunsApi, clientOrganizationsApi } from "@/lib/api";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";

export interface ImportLearnersDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  courseRunId?: string;
  courseRun?: any;
  baseCourseFee?: number;
  onSuccess?: () => void;
  onImportComplete?: () => void;
}

interface PreviewRow {
  rowNum: number;
  courseTitle?: string;
  startDate?: string;
  endDate?: string;
  learnerName: string;
  orgName?: string;
  email: string;
  contact?: string;
  designation?: string;
  paymentMethod?: string;
  buNumber?: string;
  invoice?: string;
  valid?: boolean;
  validationError?: string;
}

interface ImportResults {
  total: number;
  learnersCreated: number;
  learnersUpdated: number;
  enrollmentsCreated: number;
  enrollmentsUpdated: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
}

export function ImportLearnersDialog({
  open: controlledOpen,
  onOpenChange,
  courseRunId,
  courseRun,
  baseCourseFee = 0,
  onSuccess,
  onImportComplete,
}: ImportLearnersDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = (next: boolean) => {
    if (!isControlled) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  };

  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [parsedLearnerRows, setParsedLearnerRows] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [results, setResults] = useState<ImportResults | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const reset = () => {
    setFile(null);
    setStep("upload");
    setPreviewRows([]);
    setParsedLearnerRows([]);
    setResults(null);
    setTotalRows(0);
  };

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) reset();
  };

  const handleFile = (f: File) => {
    if (!f.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast({ title: "Invalid file", description: "Please upload an .xlsx, .xls, or .csv file.", variant: "destructive" });
      return;
    }
    setFile(f);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const handleDownloadTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet("Learners");

      const headers = [
        "Name",
        "Email",
        "Contact",
        "Designation",
        "Organization Type",
        "Client Organisation Name",
        "Department",
        "BU Number",
        "Payment Method",
        "Training Coordinator Name",
        "Training Coordinator Email",
        "Training Coordinator Contact",
      ];

      const exampleRow = [
        "Jane Doe",
        "jane.doe@example.com",
        "+65 9123 4567",
        "Senior Officer",
        "SPF",
        "Singapore Police Force",
        "Operations",
        "BU12345",
        "Unit Local Training Fund (ULTF)",
        "John Smith",
        "john.smith@spf.gov.sg",
        "+65 6789 0123",
      ];

      ws.addRow(headers);
      ws.addRow(exampleRow);

      ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
      ws.getRow(1).alignment = { horizontal: "center", vertical: "middle" };
      ws.getRow(1).height = 26;

      const colWidths = [22, 28, 18, 20, 20, 28, 18, 15, 30, 25, 28, 20];
      ws.columns.forEach((col, idx) => {
        col.width = colWidths[idx] || 18;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "learner_import_template.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "Template Downloaded", description: "Learner import template has been saved to your downloads." });
    } catch (err) {
      console.error("Error downloading template:", err);
      toast({ title: "Error", description: "Failed to generate template", variant: "destructive" });
    }
  };

  const handlePreview = async () => {
    if (!file) return;
    setPreviewing(true);
    try {
      if (courseRunId) {
        // Course-run-scoped parsing directly in browser
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error("Empty spreadsheet");
        const sheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (rawJson.length === 0) {
          throw new Error("No data rows found in spreadsheet");
        }

        const parsedRows: PreviewRow[] = [];
        const validEnrollmentLearners: any[] = [];

        rawJson.forEach((row, idx) => {
          const rowNum = idx + 2;
          const name = String(row["Name"] || row["Learner Name"] || row["Full Name"] || row["Participant Name"] || "").trim();
          const email = String(row["Email"] || row["Email Address"] || row["SPF Email Address"] || "").trim();
          const contact = String(row["Contact"] || row["Contact Number"] || row["Phone"] || "").trim();
          const designation = String(row["Designation"] || "").trim();
          const orgName = String(row["Client Organisation Name"] || row["Organisation"] || row["Organization"] || row["Department"] || "").trim();
          const buNumber = String(row["BU Number"] || row["Business Unit Number"] || "").trim();
          const paymentMethod = String(row["Payment Method"] || row["Payment Mode"] || "ULTF").trim();
          const invoice = String(row["Invoice"] || row["Invoice Number"] || "").trim();

          let valid = true;
          let validationError = "";

          if (!name) {
            valid = false;
            validationError = "Missing Name";
          } else if (!email) {
            valid = false;
            validationError = "Missing Email";
          } else if (!email.includes("@")) {
            valid = false;
            validationError = "Invalid Email";
          }

          parsedRows.push({
            rowNum,
            learnerName: name,
            email,
            contact,
            designation,
            orgName,
            buNumber,
            paymentMethod,
            invoice,
            valid,
            validationError,
          });

          if (valid) {
            validEnrollmentLearners.push({
              fullName: name,
              email,
              contactNumber: contact,
              designation,
              departmentName: orgName,
              buNumber,
              paymentMode: paymentMethod,
            });
          }
        });

        setPreviewRows(parsedRows);
        setParsedLearnerRows(validEnrollmentLearners);
        setTotalRows(rawJson.length);
        setStep("preview");
      } else {
        // System-wide import via backend API
        const data = await importApi.previewLearners(file);
        setPreviewRows(data.rows ?? []);
        setTotalRows(data.totalRows ?? 0);
        setStep("preview");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Preview failed";
      toast({ title: "Preview failed", description: msg, variant: "destructive" });
    } finally {
      setPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    try {
      if (courseRunId) {
        // Import into current course run
        if (parsedLearnerRows.length === 0) {
          throw new Error("No valid learner rows to import");
        }

        // Fetch organizations to match org names if available
        let orgs: any[] = [];
        try {
          const orgsRes = await clientOrganizationsApi.getAll({ limit: 1000 });
          orgs = orgsRes.organizations || [];
        } catch {
          // ignore
        }

        const defaultOrg = orgs[0]?.id || courseRun?.clientOrganizationId || null;

        // Group into enrollment payload
        const cleanGroupData = {
          organizationType: "SPF",
          division: defaultOrg,
          departmentName: courseRun?.clientOrganization?.name || "Operations",
          buNumber: courseRun?.clientOrganization?.buNumber || "",
          paymentMode: "ULTF",
          currentDefaultCourseFee: baseCourseFee || courseRun?.baseCourseFee || 0,
          discountPercentage: 0,
          totalFees: baseCourseFee || courseRun?.baseCourseFee || 0,
          learners: parsedLearnerRows.map((l) => ({
            fullName: l.fullName,
            email: l.email,
            contactNumber: l.contactNumber || "",
            designation: l.designation || "",
          })),
        };

        await courseRunsApi.enrollLearners(courseRunId, {
          mode: "group",
          data: cleanGroupData,
        });

        const importRes: ImportResults = {
          total: totalRows,
          learnersCreated: parsedLearnerRows.length,
          learnersUpdated: 0,
          enrollmentsCreated: parsedLearnerRows.length,
          enrollmentsUpdated: 0,
          skipped: totalRows - parsedLearnerRows.length,
          errors: previewRows
            .filter((r) => !r.valid)
            .map((r) => ({ row: r.rowNum, reason: r.validationError || "Invalid row" })),
        };

        setResults(importRes);
        setStep("result");
        if (onSuccess) onSuccess();
        if (onImportComplete) onImportComplete();
        toast({ title: "Import complete", description: `Successfully enrolled ${parsedLearnerRows.length} learners into this course run.` });
      } else {
        // System-wide import
        const data = await importApi.importLearners(file);
        setResults(data.results);
        setStep("result");
        if (onSuccess) onSuccess();
        if (onImportComplete) onImportComplete();
        toast({ title: "Import complete", description: data.message });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Import failed";
      toast({ title: "Import failed", description: msg, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Users className="h-4 w-4" />
            Import Learners
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Learners from Excel / CSV</DialogTitle>
          <DialogDescription>
            {courseRunId
              ? "Upload an .xlsx or .csv file to batch-enroll learners into this course run."
              : "Upload an .xlsx file with course and learner particulars to batch-import system-wide."}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="text-xs text-blue-900">
                Need the standard spreadsheet format? Download our pre-formatted template.
              </div>
              <Button size="sm" variant="outline" onClick={handleDownloadTemplate} className="bg-white gap-1.5 h-8">
                <Download className="h-3.5 w-3.5" />
                Download Template
              </Button>
            </div>

            <div
              className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer ${
                dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-700">{file.name}</span>
                  <button
                    type="button"
                    className="ml-1 rounded-full p-0.5 hover:bg-red-100"
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  >
                    <X className="h-4 w-4 text-red-500" />
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Drag & drop your Excel or CSV file here, or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">Supported formats: .xlsx, .xls, .csv</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => handleClose(false)}>Cancel</Button>
              <Button onClick={handlePreview} disabled={!file || previewing}>
                {previewing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Preview Data
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {previewRows.length} rows. Review before importing.
              </p>
              <Button variant="ghost" size="sm" onClick={() => setStep("upload")}>
                ← Back
              </Button>
            </div>

            <div className="overflow-x-auto rounded-md border max-h-[50vh]">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-2 py-2 text-left font-medium">#</th>
                    <th className="px-2 py-2 text-left font-medium">Learner Name</th>
                    <th className="px-2 py-2 text-left font-medium">Email</th>
                    <th className="px-2 py-2 text-left font-medium">Contact</th>
                    <th className="px-2 py-2 text-left font-medium">Designation</th>
                    <th className="px-2 py-2 text-left font-medium">Organisation</th>
                    <th className="px-2 py-2 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r, i) => (
                    <tr key={i} className={r.valid === false ? "bg-red-50/50" : i % 2 === 0 ? "bg-white" : "bg-muted/30"}>
                      <td className="px-2 py-1.5 text-muted-foreground">{r.rowNum}</td>
                      <td className="px-2 py-1.5 font-medium">{r.learnerName || "—"}</td>
                      <td className="px-2 py-1.5">{r.email || "—"}</td>
                      <td className="px-2 py-1.5">{r.contact || "—"}</td>
                      <td className="px-2 py-1.5">{r.designation || "—"}</td>
                      <td className="px-2 py-1.5">{r.orgName || "—"}</td>
                      <td className="px-2 py-1.5">
                        {r.valid === false ? (
                          <span className="text-red-600 font-medium">{r.validationError}</span>
                        ) : (
                          <span className="text-green-600 font-medium">Ready</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => handleClose(false)}>Cancel</Button>
              <Button onClick={handleImport} disabled={importing || (courseRunId ? parsedLearnerRows.length === 0 : false)}>
                {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Import {courseRunId ? parsedLearnerRows.length : totalRows} Learners
              </Button>
            </div>
          </div>
        )}

        {step === "result" && results && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold">{results.total}</p>
                <p className="text-xs text-muted-foreground">Total Rows</p>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{results.enrollmentsCreated || results.learnersCreated}</p>
                <p className="text-xs text-green-600">Learners Enrolled</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
                <p className="text-2xl font-bold text-amber-700">{results.skipped}</p>
                <p className="text-xs text-amber-600">Skipped / Invalid</p>
              </div>
            </div>

            {results.errors.length > 0 && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 space-y-2">
                <div className="flex items-center gap-2 text-red-700 font-medium text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {results.errors.length} issue{results.errors.length > 1 ? "s" : ""} reported
                </div>
                <ul className="text-xs text-red-600 space-y-1 max-h-40 overflow-y-auto">
                  {results.errors.map((e, i) => (
                    <li key={i}>Row {e.row}: {e.reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {results.errors.length === 0 && (
              <div className="flex items-center gap-2 text-green-700 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                All learners enrolled successfully.
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={reset}>Import Another File</Button>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
