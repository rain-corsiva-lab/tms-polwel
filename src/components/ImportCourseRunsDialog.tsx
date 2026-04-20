import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { importApi } from "@/lib/api";

interface PreviewRow {
  rowNum: number;
  courseTitle: string;
  courseRunType: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  status: string;
  venueType: string;
  venue: string;
  trainer1: string;
  trainer2: string;
  defaultCost: string;
}

interface ImportResults {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
}

export function ImportCourseRunsDialog({ onImportComplete }: { onImportComplete?: () => void }) {
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

  const handlePreview = async () => {
    if (!file) return;
    setPreviewing(true);
    try {
      const data = await importApi.previewCourseRuns(file);
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
      const data = await importApi.importCourseRuns(file);
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Import Course Runs
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Course Runs from Excel</DialogTitle>
          <DialogDescription>
            Upload an .xlsx file with columns: Course Title, Course Run Type, Start Date, End Date, Start Time, End Time, Course Status, Venue Type, Venue,
            Specified Location, Individual Registration Required, Dedicated Division, Trainer1, Trainer2, Default Cost, Fee Type
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
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
                  <p className="text-sm text-muted-foreground">Drag & drop your Excel file here, or click to browse</p>
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

        {/* Step 2: Preview */}
        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing first {previewRows.length} of <strong>{totalRows}</strong> rows. Review before importing.
              </p>
              <Button variant="ghost" size="sm" onClick={() => setStep("upload")}>
                ← Back
              </Button>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-2 py-2 text-left font-medium">#</th>
                    <th className="px-2 py-2 text-left font-medium">Course Title</th>
                    <th className="px-2 py-2 text-left font-medium">Type</th>
                    <th className="px-2 py-2 text-left font-medium">Start</th>
                    <th className="px-2 py-2 text-left font-medium">End</th>
                    <th className="px-2 py-2 text-left font-medium">Status</th>
                    <th className="px-2 py-2 text-left font-medium">Venue</th>
                    <th className="px-2 py-2 text-left font-medium">Trainer1</th>
                    <th className="px-2 py-2 text-left font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-muted/30"}>
                      <td className="px-2 py-1 text-muted-foreground">{r.rowNum}</td>
                      <td className="px-2 py-1 font-medium max-w-[180px] truncate">{r.courseTitle}</td>
                      <td className="px-2 py-1">{r.courseRunType}</td>
                      <td className="px-2 py-1 whitespace-nowrap">
                        {r.startDate} {r.startTime}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap">
                        {r.endDate} {r.endTime}
                      </td>
                      <td className="px-2 py-1">{r.status}</td>
                      <td className="px-2 py-1 max-w-[120px] truncate">{r.venue}</td>
                      <td className="px-2 py-1 max-w-[100px] truncate">{r.trainer1}</td>
                      <td className="px-2 py-1">{r.defaultCost}</td>
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

        {/* Step 3: Results */}
        {step === "result" && results && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold">{results.total}</p>
                <p className="text-xs text-muted-foreground">Total Rows</p>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{results.created}</p>
                <p className="text-xs text-green-600">Created</p>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{results.updated}</p>
                <p className="text-xs text-blue-600">Updated</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
                <p className="text-2xl font-bold text-amber-700">{results.skipped}</p>
                <p className="text-xs text-amber-600">Skipped</p>
              </div>
            </div>

            {results.errors.length > 0 && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 space-y-2">
                <div className="flex items-center gap-2 text-red-700 font-medium text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {results.errors.length} error{results.errors.length > 1 ? "s" : ""}
                </div>
                <ul className="text-xs text-red-600 space-y-1 max-h-40 overflow-y-auto">
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
