import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle2, Loader2, FileUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { importApi } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PreviewRow {
  rowNum: number;
  name: string;
  department: string;
  designation: string;
  email: string;
  contactNumber: string;
  paymentMode: string;
  feesBeforeGST: string;
  feesRemarks: string;
  poNumber: string;
  invoiceNo: string;
  receiptNo: string;
  buNumber: string;
  trainingOfficerName: string;
  trainingOfficerEmail: string;
  enrollmentStatus: string;
  attendanceStatus: string;
  courseRunTitle: string;
  courseRunStartDate: string;
}

interface ImportResults {
  total: number;
  learnersCreated: number;
  learnersUpdated: number;
  organizationsCreated: number;
  coordinatorsCreated: number;
  enrollmentsCreated: number;
  enrollmentsUpdated: number;
  billingsCreated: number;
  billingEntriesCreated: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ImportCourseRunLearners2Dialog({ onImportComplete }: { onImportComplete?: () => void }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [results, setResults] = useState<ImportResults | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const reset = () => {
    setFile(null);
    setStep("upload");
    setPreviewRows([]);
    setResults(null);
    setTotalRows(0);
  };

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) reset();
  };

  const handleFile = (f: File) => {
    if (!f.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast({
        title: "Invalid file",
        description: "Please upload an .xlsx, .xls, or .csv file.",
        variant: "destructive",
      });
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

  const handlePreview = async () => {
    if (!file) return;
    setPreviewing(true);
    try {
      const data = await importApi.previewCourseRunLearners2(file);
      setPreviewRows(data.rows ?? []);
      setTotalRows(data.totalRows ?? 0);
      setStep("preview");
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
      const data = await importApi.importCourseRunLearners2(file);
      setResults(data.results);
      setStep("result");
      if (onImportComplete) onImportComplete();
      toast({ title: "Import complete", description: data.message });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Import failed";
      toast({ title: "Import failed", description: msg, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const getEnrollmentBadge = (status: string) => {
    if (!status) return null;
    const upper = status.toUpperCase();
    if (upper === "ENROLLED") return <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px] px-1 py-0">Enrolled</Badge>;
    if (upper === "WITHDRAWN") return <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px] px-1 py-0">Withdrawn</Badge>;
    return (
      <Badge variant="outline" className="text-[10px] px-1 py-0">
        {status}
      </Badge>
    );
  };

  const getAttendanceBadge = (status: string) => {
    if (!status) return null;
    const upper = status.toUpperCase();
    if (upper === "PRESENT") return <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] px-1 py-0">Present</Badge>;
    if (upper === "ABSENT") return <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-[10px] px-1 py-0">Absent</Badge>;
    return (
      <Badge variant="outline" className="text-[10px] px-1 py-0">
        {status || "Pending"}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileUp className="h-4 w-4" />
          Import Learners 2 (SPF)
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Course Run Learners — SPF Format</DialogTitle>
          <DialogDescription>
            Upload an Excel file with SPF-format columns. Each row is matched to all course runs sharing the same Course Run Title and Start Date. Learners,
            organisations, training coordinators, billing records, and billing entries are created automatically if they do not exist.
          </DialogDescription>
        </DialogHeader>

        {/* ── Upload Step ──────────────────────────────────────────────────── */}
        {step === "upload" && (
          <div className="space-y-4">
            {/* Column reference */}
            <div className="rounded-md bg-muted/50 border p-3 text-xs space-y-1">
              <p className="font-medium text-sm mb-2">Expected Excel columns (row 1 header)</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-muted-foreground">
                <span>
                  <span className="font-medium text-foreground">Name</span> — Learner full name
                </span>
                <span>
                  <span className="font-medium text-foreground">Department</span> — SPF unit / client org name
                </span>
                <span>
                  <span className="font-medium text-foreground">Designation</span> — Learner designation
                </span>
                <span>
                  <span className="font-medium text-foreground">SPF Email Address</span> — Learner email
                </span>
                <span>
                  <span className="font-medium text-foreground">Contact Number</span> — Learner contact
                </span>
                <span>
                  <span className="font-medium text-foreground">Retiring Officer?</span> — Ignored
                </span>
                <span>
                  <span className="font-medium text-foreground">Payment Mode</span> — e.g. ULTF
                </span>
                <span>
                  <span className="font-medium text-foreground">Fees before GST</span> — e.g. $551.00
                </span>
                <span>
                  <span className="font-medium text-foreground">Fees Remarks</span>
                </span>
                <span>
                  <span className="font-medium text-foreground">PO No./ Payment Advice</span>
                </span>
                <span>
                  <span className="font-medium text-foreground">Invoice No.</span>
                </span>
                <span>
                  <span className="font-medium text-foreground">Receipt No.</span>
                </span>
                <span>
                  <span className="font-medium text-foreground">Business Unit Number</span> — e.g. MHA24
                </span>
                <span>
                  <span className="font-medium text-foreground">Training Officer's Name</span>
                </span>
                <span>
                  <span className="font-medium text-foreground">Training Officer's Email</span>
                </span>
                <span>
                  <span className="font-medium text-foreground">Training Officer's Phone Number</span>
                </span>
                <span>
                  <span className="font-medium text-foreground">Enrollment Status</span> — ENROLLED / WITHDRAWN
                </span>
                <span>
                  <span className="font-medium text-foreground">Attendance Status</span> — PRESENT / ABSENT
                </span>
                <span>
                  <span className="font-medium text-foreground">Course Run Title</span> — Exact course title
                </span>
                <span>
                  <span className="font-medium text-foreground">Course Run Start Date</span> — DD-MM-YYYY
                </span>
              </div>
            </div>

            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer ${
                dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                  >
                    <X className="h-4 w-4 text-red-500" />
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Drag &amp; drop your Excel file here, or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">Supported: .xlsx, .xls, .csv</p>
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
              <Button variant="ghost" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button onClick={handlePreview} disabled={!file || previewing}>
                {previewing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Preview Data
              </Button>
            </div>
          </div>
        )}

        {/* ── Preview Step ─────────────────────────────────────────────────── */}
        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing first <strong>{previewRows.length}</strong> of <strong>{totalRows}</strong> rows. Review before importing.
              </p>
              <Button variant="ghost" size="sm" onClick={() => setStep("upload")}>
                ← Back
              </Button>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-2 py-2 text-left font-medium whitespace-nowrap">#</th>
                    <th className="px-2 py-2 text-left font-medium whitespace-nowrap">Name</th>
                    <th className="px-2 py-2 text-left font-medium whitespace-nowrap">Department</th>
                    <th className="px-2 py-2 text-left font-medium whitespace-nowrap">Email</th>
                    <th className="px-2 py-2 text-left font-medium whitespace-nowrap">Payment Mode</th>
                    <th className="px-2 py-2 text-left font-medium whitespace-nowrap">Fees (GST excl.)</th>
                    <th className="px-2 py-2 text-left font-medium whitespace-nowrap">Invoice No.</th>
                    <th className="px-2 py-2 text-left font-medium whitespace-nowrap">BU No.</th>
                    <th className="px-2 py-2 text-left font-medium whitespace-nowrap">Training Officer</th>
                    <th className="px-2 py-2 text-left font-medium whitespace-nowrap">Enrollment</th>
                    <th className="px-2 py-2 text-left font-medium whitespace-nowrap">Attendance</th>
                    <th className="px-2 py-2 text-left font-medium whitespace-nowrap">Course Run</th>
                    <th className="px-2 py-2 text-left font-medium whitespace-nowrap">Start Date</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-muted/20"}>
                      <td className="px-2 py-1 text-muted-foreground">{r.rowNum}</td>
                      <td className="px-2 py-1 max-w-[120px] truncate font-medium">{r.name}</td>
                      <td className="px-2 py-1 max-w-[120px] truncate">{r.department}</td>
                      <td className="px-2 py-1 max-w-[140px] truncate">{r.email}</td>
                      <td className="px-2 py-1 whitespace-nowrap">{r.paymentMode}</td>
                      <td className="px-2 py-1 whitespace-nowrap">{r.feesBeforeGST}</td>
                      <td className="px-2 py-1 whitespace-nowrap">{r.invoiceNo}</td>
                      <td className="px-2 py-1 whitespace-nowrap">{r.buNumber}</td>
                      <td className="px-2 py-1 max-w-[110px] truncate">{r.trainingOfficerName}</td>
                      <td className="px-2 py-1">{getEnrollmentBadge(r.enrollmentStatus)}</td>
                      <td className="px-2 py-1">{getAttendanceBadge(r.attendanceStatus)}</td>
                      <td className="px-2 py-1 max-w-[160px] truncate">{r.courseRunTitle}</td>
                      <td className="px-2 py-1 whitespace-nowrap">{r.courseRunStartDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Import {totalRows} Rows
              </Button>
            </div>
          </div>
        )}

        {/* ── Result Step ──────────────────────────────────────────────────── */}
        {step === "result" && results && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <StatCard label="Total Rows" value={results.total} />
              <StatCard label="New Learners" value={results.learnersCreated} color="green" />
              <StatCard label="Learners Updated" value={results.learnersUpdated} color="blue" />
              <StatCard label="New Organisations" value={results.organizationsCreated} color="purple" />
              <StatCard label="New Coordinators" value={results.coordinatorsCreated} color="indigo" />
              <StatCard label="Enrollments Created" value={results.enrollmentsCreated} color="green" />
              <StatCard label="Enrollments Updated" value={results.enrollmentsUpdated} color="blue" />
              <StatCard label="Billings Created" value={results.billingsCreated} color="teal" />
              <StatCard label="Billing Entries" value={results.billingEntriesCreated} color="cyan" />
              <StatCard label="Skipped / Errors" value={results.skipped} color="amber" />
            </div>

            {results.errors.length > 0 && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 space-y-2">
                <div className="flex items-center gap-2 text-red-700 font-medium text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {results.errors.length} error{results.errors.length > 1 ? "s" : ""}
                </div>
                <ul className="text-xs text-red-600 space-y-1 max-h-48 overflow-y-auto">
                  {results.errors.map((e, i) => (
                    <li key={i}>
                      Row {e.row}: {e.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {results.errors.length === 0 && (
              <div className="flex items-center gap-2 text-green-700 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                All rows processed successfully.
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={reset}>
                Import Another File
              </Button>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────

type StatColor = "green" | "blue" | "amber" | "purple" | "indigo" | "teal" | "cyan";

const colorMap: Record<StatColor, { border: string; bg: string; text: string; sub: string }> = {
  green: { border: "border-green-200", bg: "bg-green-50", text: "text-green-700", sub: "text-green-600" },
  blue: { border: "border-blue-200", bg: "bg-blue-50", text: "text-blue-700", sub: "text-blue-600" },
  amber: { border: "border-amber-200", bg: "bg-amber-50", text: "text-amber-700", sub: "text-amber-600" },
  purple: { border: "border-purple-200", bg: "bg-purple-50", text: "text-purple-700", sub: "text-purple-600" },
  indigo: { border: "border-indigo-200", bg: "bg-indigo-50", text: "text-indigo-700", sub: "text-indigo-600" },
  teal: { border: "border-teal-200", bg: "bg-teal-50", text: "text-teal-700", sub: "text-teal-600" },
  cyan: { border: "border-cyan-200", bg: "bg-cyan-50", text: "text-cyan-700", sub: "text-cyan-600" },
};

function StatCard({ label, value, color }: { label: string; value: number; color?: StatColor }) {
  const c = color ? colorMap[color] : null;
  return (
    <div className={`rounded-lg border p-3 text-center ${c ? `${c.border} ${c.bg}` : ""}`}>
      <p className={`text-2xl font-bold ${c ? c.text : ""}`}>{value}</p>
      <p className={`text-xs ${c ? c.sub : "text-muted-foreground"}`}>{label}</p>
    </div>
  );
}
