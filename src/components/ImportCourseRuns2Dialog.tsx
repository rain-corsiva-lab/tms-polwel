import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle2, Loader2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { importApi } from "@/lib/api";
import ExcelJS from "exceljs";

interface PreviewRow {
  rowNum: number;
  courseTitle: string;
  serialNumber: string;
  courseRunType: string;
  clientOrganization: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  venueType: string;
  venueName: string;
  specifiedLocation: string;
  minClassSize: string;
  maxClassSize: string;
  indivReg: string;
  baseCourseFee: string;
  courseRunFeeType: string;
  venueFinalFee: string;
  venueMaxParticipants: string;
  perHeadFeeIfMaxExceed: string;
  trainer1: string;
  trainer2: string;
  trainer3: string;
  partner1: string;
  partner2: string;
  partner3: string;
  remarks: string;
  status: string;
}

interface ImportResults {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
}

export function ImportCourseRuns2Dialog({ onImportComplete }: { onImportComplete?: () => void }) {
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

  const handleDownloadTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Course Runs Template");

      // Define Columns
      worksheet.columns = [
        { header: "Course Title *", key: "courseTitle", width: 30 },
        { header: "Course Run Code", key: "serialNumber", width: 22 },
        { header: "Course Run Type *", key: "courseRunType", width: 20 },
        { header: "Client Organisation", key: "clientOrganization", width: 26 },
        { header: "Start Date *", key: "startDate", width: 16 },
        { header: "End Date", key: "endDate", width: 16 },
        { header: "Start Time", key: "startTime", width: 12 },
        { header: "End Time", key: "endTime", width: 12 },
        { header: "Venue Type *", key: "venueType", width: 18 },
        { header: "Venue Name", key: "venueName", width: 26 },
        { header: "Specified Location", key: "specifiedLocation", width: 28 },
        { header: "Min Class Size", key: "minClassSize", width: 15 },
        { header: "Max Class Size", key: "maxClassSize", width: 15 },
        { header: "Individual Registration Required", key: "indivReg", width: 32 },
        { header: "Base Course Fee", key: "baseCourseFee", width: 18 },
        { header: "Course Run Fee Type", key: "courseRunFeeType", width: 22 },
        { header: "Venue Final Fee", key: "venueFinalFee", width: 18 },
        { header: "Venue Max Participants", key: "venueMaxParticipants", width: 22 },
        { header: "Per Head Fee if Max Exceeded", key: "perHeadFeeIfMaxExceed", width: 28 },
        { header: "Trainer 1", key: "trainer1", width: 20 },
        { header: "Trainer 2", key: "trainer2", width: 20 },
        { header: "Trainer 3", key: "trainer3", width: 20 },
        { header: "Partner 1", key: "partner1", width: 20 },
        { header: "Partner 2", key: "partner2", width: 20 },
        { header: "Partner 3", key: "partner3", width: 20 },
        { header: "Remarks", key: "remarks", width: 30 },
        { header: "Course Status", key: "status", width: 18 },
      ];

      // Format Header Row
      const headerRow = worksheet.getRow(1);
      headerRow.height = 28;
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Segoe UI", size: 11 };
      headerRow.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF1F2937" }, // Premium dark grey fill
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FF374151" } },
          left: { style: "thin", color: { argb: "FF374151" } },
          bottom: { style: "medium", color: { argb: "FF111827" } },
          right: { style: "thin", color: { argb: "FF374151" } },
        };
      });

      // Define Comments/Notes for Headers
      const notes: Record<string, string> = {
        A1: "Required.\nName of the course as registered in the system (e.g. 'Advanced Leadership Development').",
        B1: "Optional.\nUnique code for this course run. If left blank, it will be auto-generated from course code and start date.",
        C1: "Required.\nMust be one of:\n- OPEN\n- DEDICATED\n- TALKS\n- CUSTOMIZED",
        D1: "Optional.\nName of client organisation. Required if Course Run Type is DEDICATED, TALKS, or CUSTOMIZED.",
        E1: "Required.\nStart date in DD/MM/YYYY format.",
        F1: "Optional.\nEnd date in DD/MM/YYYY format. Defaults to Start Date if left blank.",
        G1: "Optional.\nStart time in HH:MM format (24-hour, e.g. 09:00). Defaults to 09:00 if left blank.",
        H1: "Optional.\nEnd time in HH:MM format (24-hour, e.g. 17:00). Defaults to 17:00 if left blank.",
        I1: "Required.\nMust be one of:\n- HOTEL\n- ON_PREMISE\n- CLIENT_FACILITY",
        J1: "Optional.\nName of the venue as registered in the system.",
        K1: "Optional.\nSpecific address or location details (e.g. 'Ballroom Level 3').",
        L1: "Optional.\nMinimum number of participants required (positive integer).",
        M1: "Optional.\nMaximum class size limit (positive integer).",
        N1: "Optional.\nMust be one of:\n- Yes\n- No\nDefaults to No if left blank.",
        O1: "Optional.\nBase fee for this course run. Must be a numeric value.",
        P1: "Optional.\nMust be one of:\n- PER_HEAD\n- PER_RUN\nDefaults to PER_HEAD if left blank.",
        Q1: "Optional.\nOverride for the venue fee (numeric value).",
        R1: "Optional.\nOverride for venue maximum capacity.",
        S1: "Optional.\nOverride fee per excess participant if capacity exceeded.",
        T1: "Optional.\nFull name of Trainer 1 as registered in the system.",
        U1: "Optional.\nFull name of Trainer 2 as registered in the system.",
        V1: "Optional.\nFull name of Trainer 3 as registered in the system.",
        W1: "Optional.\nFull name of Partner 1 as registered in the system.",
        X1: "Optional.\nFull name of Partner 2 as registered in the system.",
        Y1: "Optional.\nFull name of Partner 3 as registered in the system.",
        Z1: "Optional.\nAdministrative or extra notes about this course run.",
        AA1: "Optional.\nMust be one of:\n- DRAFT\n- PENDING\n- ACTIVE\n- CONFIRMED\n- COMPLETED\n- CANCELLED\nDefaults to DRAFT if left blank.",
      };

      Object.entries(notes).forEach(([cellRef, noteText]) => {
        const cell = worksheet.getCell(cellRef);
        cell.note = noteText;
      });

      // Data Validations for Rows 2 to 100
      worksheet.dataValidations.add("C2:C100", {
        type: "list",
        allowBlank: true,
        formulae: ['"OPEN,DEDICATED,TALKS,CUSTOMIZED"'],
        showErrorMessage: true,
        errorTitle: "Invalid Course Run Type",
        error: "Please select an option from the list: OPEN, DEDICATED, TALKS, CUSTOMIZED.",
      });

      worksheet.dataValidations.add("I2:I100", {
        type: "list",
        allowBlank: true,
        formulae: ['"HOTEL,ON_PREMISE,CLIENT_FACILITY"'],
        showErrorMessage: true,
        errorTitle: "Invalid Venue Type",
        error: "Please select an option from the list: HOTEL, ON_PREMISE, CLIENT_FACILITY.",
      });

      worksheet.dataValidations.add("N2:N100", {
        type: "list",
        allowBlank: true,
        formulae: ['"Yes,No"'],
        showErrorMessage: true,
        errorTitle: "Invalid Input",
        error: "Please select Yes or No.",
      });

      worksheet.dataValidations.add("P2:P100", {
        type: "list",
        allowBlank: true,
        formulae: ['"PER_HEAD,PER_RUN"'],
        showErrorMessage: true,
        errorTitle: "Invalid Course Run Fee Type",
        error: "Please select PER_HEAD or PER_RUN.",
      });

      worksheet.dataValidations.add("AA2:AA100", {
        type: "list",
        allowBlank: true,
        formulae: ['"DRAFT,PENDING,ACTIVE,CONFIRMED,COMPLETED,CANCELLED"'],
        showErrorMessage: true,
        errorTitle: "Invalid Status",
        error: "Please select a valid Course Status from the list.",
      });

      // Add 5 realistic example rows
      const examples = [
        {
          courseTitle: "Advanced Leadership Development",
          serialNumber: "ALD-220626",
          courseRunType: "OPEN",
          clientOrganization: "",
          startDate: "22/06/2026",
          endDate: "24/06/2026",
          startTime: "09:00",
          endTime: "17:00",
          venueType: "HOTEL",
          venueName: "Grand Copthorne Waterfront",
          specifiedLocation: "Level 3 Ballroom",
          minClassSize: 5,
          maxClassSize: 20,
          indivReg: "No",
          baseCourseFee: 1200.0,
          courseRunFeeType: "PER_HEAD",
          venueFinalFee: 450.0,
          venueMaxParticipants: 25,
          perHeadFeeIfMaxExceed: 20.0,
          trainer1: "John Smith",
          trainer2: "Sarah Johnson",
          trainer3: "",
          partner1: "Apex Training Group",
          partner2: "",
          partner3: "",
          remarks: "Annual leadership run for open public.",
          status: "CONFIRMED",
        },
        {
          courseTitle: "Effective Communications for Professionals",
          serialNumber: "ECP-050726",
          courseRunType: "DEDICATED",
          clientOrganization: "Ministry of Home Affairs",
          startDate: "05/07/2026",
          endDate: "05/07/2026",
          startTime: "09:00",
          endTime: "13:00",
          venueType: "ON_PREMISE",
          venueName: "POLWEL Training Room 1",
          specifiedLocation: "Room 1A",
          minClassSize: 10,
          maxClassSize: 30,
          indivReg: "Yes",
          baseCourseFee: 350.0,
          courseRunFeeType: "PER_HEAD",
          venueFinalFee: 0.0,
          venueMaxParticipants: 30,
          perHeadFeeIfMaxExceed: 0.0,
          trainer1: "Michael Brown",
          trainer2: "",
          trainer3: "",
          partner1: "",
          partner2: "",
          partner3: "",
          remarks: "Dedicated run for MHA officers.",
          status: "PENDING",
        },
        {
          courseTitle: "Cybersecurity Awareness Seminar",
          serialNumber: "CAS-120726",
          courseRunType: "TALKS",
          clientOrganization: "Singapore Police Force",
          startDate: "12/07/2026",
          endDate: "12/07/2026",
          startTime: "14:00",
          endTime: "16:00",
          venueType: "CLIENT_FACILITY",
          venueName: "",
          specifiedLocation: "SPF Headquarters Auditorium",
          minClassSize: 20,
          maxClassSize: 100,
          indivReg: "No",
          baseCourseFee: 1500.0,
          courseRunFeeType: "PER_RUN",
          venueFinalFee: 0.0,
          venueMaxParticipants: 100,
          perHeadFeeIfMaxExceed: 0.0,
          trainer1: "Sarah Johnson",
          trainer2: "",
          trainer3: "",
          partner1: "Cyber Security Alliance",
          partner2: "",
          partner3: "",
          remarks: "SPF cybersecurity briefing talk.",
          status: "ACTIVE",
        },
        {
          courseTitle: "Strategic Project Management",
          serialNumber: "",
          courseRunType: "CUSTOMIZED",
          clientOrganization: "Singapore Prison Service",
          startDate: "18/07/2026",
          endDate: "20/07/2026",
          startTime: "09:00",
          endTime: "17:00",
          venueType: "HOTEL",
          venueName: "Orchard Hotel",
          specifiedLocation: "Meeting Room A",
          minClassSize: 8,
          maxClassSize: 15,
          indivReg: "Yes",
          baseCourseFee: 2500.0,
          courseRunFeeType: "PER_RUN",
          venueFinalFee: 600.0,
          venueMaxParticipants: 20,
          perHeadFeeIfMaxExceed: 50.0,
          trainer1: "John Smith",
          trainer2: "Michael Brown",
          trainer3: "",
          partner1: "Project Management Institute SG",
          partner2: "",
          partner3: "",
          remarks: "Custom project management syllabus.",
          status: "DRAFT",
        },
        {
          courseTitle: "Crisis Management & Communication",
          serialNumber: "CMC-250726",
          courseRunType: "OPEN",
          clientOrganization: "",
          startDate: "25/07/2026",
          endDate: "26/07/2026",
          startTime: "09:30",
          endTime: "17:30",
          venueType: "ON_PREMISE",
          venueName: "POLWEL HQ Conference Room",
          specifiedLocation: "",
          minClassSize: 6,
          maxClassSize: 12,
          indivReg: "No",
          baseCourseFee: 950.0,
          courseRunFeeType: "PER_HEAD",
          venueFinalFee: 100.0,
          venueMaxParticipants: 15,
          perHeadFeeIfMaxExceed: 15.0,
          trainer1: "Sarah Johnson",
          trainer2: "",
          trainer3: "",
          partner1: "",
          partner2: "",
          partner3: "",
          remarks: "Crisis communication scenario drill.",
          status: "COMPLETED",
        },
      ];

      examples.forEach((item) => {
        worksheet.addRow(item);
      });

      // Format data rows with borders, alignment, fonts
      for (let r = 2; r <= 6; r++) {
        const row = worksheet.getRow(r);
        row.font = { name: "Segoe UI", size: 10 };
        row.eachCell((cell) => {
          cell.alignment = { vertical: "middle", horizontal: "left" };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE5E7EB" } },
            left: { style: "thin", color: { argb: "FFE5E7EB" } },
            bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
            right: { style: "thin", color: { argb: "FFE5E7EB" } },
          };
        });
      }

      // Generate buffer and trigger download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "course_runs_import_template_v2.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Template downloaded",
        description: "Review columns, validation list dropdowns, and mock rows.",
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Download failed",
        description: err.message || "Failed to generate Excel template",
        variant: "destructive",
      });
    }
  };

  const handlePreview = async () => {
    if (!file) return;
    setPreviewing(true);
    try {
      const data = await importApi.previewCourseRuns2(file);
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
      const data = await importApi.importCourseRuns2(file);
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
        <Button variant="outline" className="gap-2 border-primary/50 hover:bg-primary/5">
          <FileSpreadsheet className="h-4 w-4 text-primary" />
          Import Course Runs 2
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Course Runs (Comprehensive V2)</DialogTitle>
          <DialogDescription>
            Upload an Excel sheet to bulk import complete course run configurations. Required fields are marked with an asterisk (*). Use cell notes for help.
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
              <div>
                <p className="font-semibold text-sm">Need a template?</p>
                <p className="text-xs text-muted-foreground">Download our pre-styled template with enums as dropdown inputs and 5 mock rows.</p>
              </div>
              <Button onClick={handleDownloadTemplate} size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Download Template
              </Button>
            </div>

            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
                dragging ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground/60" />
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
                  <span className="font-medium text-emerald-700">{file.name}</span>
                  <button
                    type="button"
                    className="ml-1 rounded-full p-1 hover:bg-red-100"
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
                  <p className="text-sm font-medium">Drag & drop your Excel template here, or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-2">Accepts formatted .xlsx or .xls spreadsheets</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
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
                Showing first {previewRows.length} of <strong>{totalRows}</strong> rows from Excel. Review formatting before importing.
              </p>
              <Button variant="ghost" size="sm" onClick={() => setStep("upload")}>
                ← Back
              </Button>
            </div>

            <div className="overflow-x-auto rounded-md border max-h-[50vh] overflow-y-auto">
              <table className="w-full text-[11px] border-collapse">
                <thead className="bg-muted sticky top-0">
                  <tr className="border-b">
                    <th className="px-3 py-2 text-left font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium min-w-[150px]">Course Title</th>
                    <th className="px-3 py-2 text-left font-medium">Code</th>
                    <th className="px-3 py-2 text-left font-medium">Type</th>
                    <th className="px-3 py-2 text-left font-medium">Client Organisation</th>
                    <th className="px-3 py-2 text-left font-medium">Date & Time</th>
                    <th className="px-3 py-2 text-left font-medium">Venue Type</th>
                    <th className="px-3 py-2 text-left font-medium">Venue Name</th>
                    <th className="px-3 py-2 text-left font-medium">Class Size</th>
                    <th className="px-3 py-2 text-left font-medium">Indiv Reg</th>
                    <th className="px-3 py-2 text-left font-medium">Trainers</th>
                    <th className="px-3 py-2 text-left font-medium">Partners</th>
                    <th className="px-3 py-2 text-left font-medium">Fees</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r, i) => (
                    <tr key={i} className={`border-b hover:bg-muted/20 ${i % 2 === 0 ? "bg-white" : "bg-muted/30"}`}>
                      <td className="px-3 py-2 text-muted-foreground">{r.rowNum}</td>
                      <td className="px-3 py-2 font-medium max-w-[150px] truncate" title={r.courseTitle}>{r.courseTitle}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.serialNumber || "—"}</td>
                      <td className="px-3 py-2">{r.courseRunType}</td>
                      <td className="px-3 py-2 max-w-[120px] truncate" title={r.clientOrganization}>{r.clientOrganization || "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {r.startDate}{r.endDate ? ` → ${r.endDate}` : ""} <br />
                        <span className="text-[10px] text-muted-foreground">{r.startTime} - {r.endTime}</span>
                      </td>
                      <td className="px-3 py-2">{r.venueType}</td>
                      <td className="px-3 py-2 max-w-[120px] truncate" title={r.venueName}>{r.venueName || "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        Min: {r.minClassSize || "—"} <br /> Max: {r.maxClassSize || "—"}
                      </td>
                      <td className="px-3 py-2 text-center">{r.indivReg}</td>
                      <td className="px-3 py-2 max-w-[100px] truncate" title={[r.trainer1, r.trainer2, r.trainer3].filter(Boolean).join(", ")}>
                        {[r.trainer1, r.trainer2, r.trainer3].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="px-3 py-2 max-w-[100px] truncate" title={[r.partner1, r.partner2, r.partner3].filter(Boolean).join(", ")}>
                        {[r.partner1, r.partner2, r.partner3].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        Course: ${r.baseCourseFee || "—"} <br />
                        Venue: ${r.venueFinalFee || "—"}
                      </td>
                      <td className="px-3 py-2">{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
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
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-xl border p-4 text-center">
                <p className="text-3xl font-bold">{results.total}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Rows</p>
              </div>
              <div className="rounded-xl border border-green-200 bg-green-50/50 p-4 text-center">
                <p className="text-3xl font-bold text-green-700">{results.created}</p>
                <p className="text-xs text-green-600 mt-1">Created</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-center">
                <p className="text-3xl font-bold text-blue-700">{results.updated}</p>
                <p className="text-xs text-blue-600 mt-1">Updated</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-center">
                <p className="text-3xl font-bold text-amber-700">{results.skipped}</p>
                <p className="text-xs text-amber-600 mt-1">Skipped</p>
              </div>
            </div>

            {results.errors.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
                  <AlertCircle className="h-5 w-5" />
                  {results.errors.length} error{results.errors.length > 1 ? "s" : ""} occurred during parsing:
                </div>
                <ul className="text-xs text-red-600 space-y-1.5 max-h-48 overflow-y-auto pl-2 list-disc">
                  {results.errors.map((e, i) => (
                    <li key={i} className="leading-relaxed">
                      <strong>Row {e.row}:</strong> {e.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {results.errors.length === 0 && (
              <div className="flex items-center gap-3 text-green-700 text-sm bg-green-50 border border-green-200 rounded-xl p-4">
                <CheckCircle2 className="h-5 w-5" />
                All course run records imported successfully!
              </div>
            )}

            <div className="flex justify-end gap-2 border-t pt-4">
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
