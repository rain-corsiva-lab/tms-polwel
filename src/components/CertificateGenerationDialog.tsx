import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errorHandler";
import { Award, Download, FileDown, Loader2, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { courseRunsApi } from "@/lib/api";
import ExcelJS from "exceljs";

interface Learner {
  id: string;
  name: string;
  email: string;
  attendanceStatus: "PRESENT" | "ABSENT";
  certificateGeneratedAt?: string | null;
  certificateEmailStatus?: "NOT_SENT" | "SENDING" | "SENT" | "FAILED" | null;
  certificateEmailSentAt?: string | null;
}

interface CourseRunInfo {
  id: string;
  serialNumber: string;
  course: {
    title: string;
    duration: string;
    durationType: string;
  };
  endDatetime: string;
}

interface CertificateGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseRun: CourseRunInfo | null;
  learners: Learner[];
  onSuccess?: () => void;
}

interface WaiverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  learner: Learner | null;
  courseRunId: string;
  onSuccess?: () => void;
}

function WaiverDialog({ open, onOpenChange, learner, courseRunId, onSuccess }: WaiverDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState("");
  const [document, setDocument] = useState<File | null>(null);

  const handleSubmit = async () => {
    if (!learner || !reason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a reason for absence.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      let documentData: { filename: string; mimetype: string; size: number; base64: string } | undefined;

      if (document) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(document);
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.onerror = reject;
        });

        documentData = {
          filename: document.name,
          mimetype: document.type,
          size: document.size,
          base64,
        };
      }

      const response = await fetch(`/api/course-runs/${courseRunId}/learners/${learner.id}/submit-waiver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason,
          supportingDocument: documentData,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to submit waiver form");
      }

      toast({
        title: "Waiver Submitted",
        description: `Waiver form for ${learner.name} has been submitted successfully.`,
      });

      setReason("");
      setDocument(null);
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error submitting waiver:", error);
      toast({
        title: "Submission Failed",
        description: getErrorMessage(error, "Failed to submit waiver form"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Submit Waiver Form</DialogTitle>
          <DialogDescription>
            Submit a waiver form for <strong>{learner?.name}</strong> who was absent from the training.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason for Absence <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Please provide the reason for absence (e.g., medical emergency, family emergency, etc.)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="document">Supporting Document (Optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="document"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => setDocument(e.target.files?.[0] || null)}
                className="cursor-pointer"
              />
              {document && (
                <Button variant="ghost" size="icon" onClick={() => setDocument(null)} className="shrink-0">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Supported formats: PDF, DOC, DOCX, JPG, PNG (max 5MB)</p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Waiver"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CertificateGenerationDialog({ open, onOpenChange, courseRun, learners, onSuccess }: CertificateGenerationDialogProps) {
  const { toast } = useToast();
  const [selectedLearners, setSelectedLearners] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewSubject, setPreviewSubject] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [waiverDialog, setWaiverDialog] = useState<{ open: boolean; learner: Learner | null }>({
    open: false,
    learner: null,
  });

  const [exportingParticipants, setExportingParticipants] = useState(false);

  const presentLearners = learners.filter((l) => l.attendanceStatus === "PRESENT");
  const absentLearners = learners.filter((l) => l.attendanceStatus === "ABSENT");

  const eligibleLearners = presentLearners;

  const handleExportParticipantList = async () => {
    setExportingParticipants(true);
    try {
      const response = await courseRunsApi.getById(courseRun!.id);
      if (!response.success) throw new Error("Failed to fetch course run data");
      const fullRun = response.courseRun;

      const getPaymentModeLabel = (mode: string | null | undefined) => {
        const map: Record<string, string> = {
          SELF_SPONSORED: "Self-Payment",
          TRANSITION_DOLLARS: "Transition Dollar (TS)",
          ULTF: "Unit Local Training Fund (ULTF)",
          COMPANY_BILLING: "Company-Sponsored (Non-Home Team)",
          GOVERNMENT_FUNDING: "Polwel Training Subsidy",
          CREDIT_CARD: "Credit Card",
          BANK_TRANSFER: "Bank Transfer",
          NOT_APPLICABLE: "Not Applicable",
        };
        return map[mode as string] || mode || "-";
      };

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Participants");
      const headers = [
        "No",
        "Name",
        "Department",
        "Designation",
        "Email Address",
        "Contact Number",
        "Retiring Officer?",
        "Payment Mode",
        "Fees before GST",
        "Fees Remarks",
        "PO No. / Payment Advice",
        "Invoice No.",
        "Receipt No.",
        "Business Unit Number",
        "Training Officer's Name",
        "Training Officer's Email",
        "Training Officer's Phone Number",
        "Remarks",
      ];

      const enrolled = (fullRun.courseRunLearners || []).filter((r: any) => r.enrollmentStatus === "ENROLLED");
      const withdrawn = (fullRun.courseRunLearners || []).filter((r: any) => r.enrollmentStatus === "WITHDRAWN");

      const meta = [
        fullRun.course?.title || "Course",
        `Course Code: ${fullRun.course?.courseCode || "N/A"}`,
        `Duration: ${fullRun.startDatetime ? new Date(fullRun.startDatetime).toLocaleDateString("en-SG") : "N/A"} - ${fullRun.endDatetime ? new Date(fullRun.endDatetime).toLocaleDateString("en-SG") : "N/A"}`,
        `Venue: ${fullRun.venue?.name || fullRun.specifiedLocation || "TBD"}`,
      ];

      let row = 1;
      meta.forEach((text) => {
        const r = worksheet.getRow(row);
        r.getCell(1).value = text;
        worksheet.mergeCells(row, 1, row, Math.ceil(headers.length / 2));
        r.height = 22;
        const colors = ["FF1F4E78", "FF2F5496", "FF3D6EB3", "FF4472C4"];
        for (let c = 1; c <= headers.length; c++) {
          const cell = r.getCell(c);
          cell.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors[row - 1] } };
          cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
        }
        row++;
      });
      row++;

      headers.forEach((h, i) => {
        worksheet.getCell(row, i + 1).value = h;
      });
      const hRow = worksheet.getRow(row);
      hRow.height = 22;
      for (let c = 1; c <= headers.length; c++) {
        const cell = worksheet.getCell(row, c);
        cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
        cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
      }
      row++;

      enrolled.forEach((lr: any, idx: number) => {
        const l = lr.learner;
        const bg = idx % 2 === 0 ? "FFE7EFF7" : "FFFFFFFF";
        const r = worksheet.getRow(row);
        r.getCell(1).value = idx + 1;
        r.getCell(2).value = l.fullname || "";
        r.getCell(3).value = lr.clientOrganization?.name || fullRun.clientOrganization?.name || "";
        r.getCell(4).value = l.designation || "";
        r.getCell(5).value = l.email || "";
        r.getCell(6).value = l.contactNumber || "";
        r.getCell(7).value = "";
        r.getCell(8).value = getPaymentModeLabel(lr.paymentMode);
        r.getCell(9).value = "";
        r.getCell(10).value = "";
        r.getCell(11).value = "";
        r.getCell(12).value = "";
        r.getCell(13).value = "";
        r.getCell(14).value = fullRun.clientOrganization?.buNumber || "";
        r.getCell(15).value = lr.trainingCoordinator?.name || "";
        r.getCell(16).value = lr.trainingCoordinator?.email || "";
        r.getCell(17).value = lr.trainingCoordinator?.contactNumber || "";
        r.getCell(18).value = "";
        r.height = 18;
        for (let c = 1; c <= headers.length; c++) {
          worksheet.getCell(row, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
          worksheet.getCell(row, c).border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
        }
        row++;
      });

      if (withdrawn.length > 0) {
        row += 2;
        const wTitle = worksheet.getRow(row);
        wTitle.getCell(1).value = "WITHDRAWN";
        worksheet.mergeCells(row, 1, row, headers.length);
        wTitle.getCell(1).font = { bold: true, size: 13 };
        wTitle.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFC000" } };
        wTitle.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
        row += 2;
        headers.forEach((h, i) => {
          worksheet.getCell(row, i + 1).value = h;
        });
        for (let c = 1; c <= headers.length; c++) {
          const cell = worksheet.getCell(row, c);
          cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
        }
        row++;
        withdrawn.forEach((lr: any, idx: number) => {
          const l = lr.learner;
          const bg = idx % 2 === 0 ? "FFFEF5E7" : "FFFFFFFF";
          const r = worksheet.getRow(row);
          r.getCell(1).value = idx + 1;
          r.getCell(2).value = l.fullname || "";
          r.getCell(3).value = lr.clientOrganization?.name || fullRun.clientOrganization?.name || "";
          r.getCell(4).value = l.designation || "";
          r.getCell(5).value = l.email || "";
          r.getCell(6).value = l.contactNumber || "";
          r.getCell(8).value = getPaymentModeLabel(lr.paymentMode);
          for (let c = 1; c <= headers.length; c++) {
            worksheet.getCell(row, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
          }
          row++;
        });
      }

      worksheet.columns = [6, 25, 20, 22, 32, 18, 16, 20, 18, 18, 26, 18, 18, 22, 24, 32, 36, 28].map((w) => ({ width: w }));

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `participant-list-${fullRun.serialNumber || fullRun.id}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Exported", description: `${enrolled.length} participant${enrolled.length !== 1 ? "s" : ""} exported.` });
    } catch (err: any) {
      toast({ title: "Export failed", description: err?.message || "Failed to export participant list", variant: "destructive" });
    } finally {
      setExportingParticipants(false);
    }
  };
  const certificatesGenerated = eligibleLearners.filter((l) => l.certificateGeneratedAt).length;

  useEffect(() => {
    if (open) {
      setSelectedLearners(eligibleLearners.map((l) => l.id));
    }
  }, [open, learners]);

  useEffect(() => {
    if (!open || !courseRun) {
      setPreviewHtml(null);
      setPreviewSubject(null);
      setPreviewError(null);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(null);
    courseRunsApi
      .previewCertificateEmail(courseRun.id)
      .then((res: any) => {
        if (cancelled) return;
        if (res?.success && typeof res.html === "string") {
          setPreviewHtml(res.html);
          setPreviewSubject(typeof res.subject === "string" ? res.subject : null);
        } else {
          setPreviewError(res?.message || res?.error || "Could not load preview");
          setPreviewHtml(null);
          setPreviewSubject(null);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPreviewError(err instanceof Error ? err.message : "Could not load preview");
        setPreviewHtml(null);
        setPreviewSubject(null);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, courseRun?.id]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLearners(eligibleLearners.map((l) => l.id));
    } else {
      setSelectedLearners([]);
    }
  };

  const handleSelectLearner = (learnerId: string, checked: boolean) => {
    if (checked) {
      setSelectedLearners((prev) => [...prev, learnerId]);
    } else {
      setSelectedLearners((prev) => prev.filter((id) => id !== learnerId));
    }
  };

  const handleDownloadSingle = async (learnerId: string) => {
    if (!courseRun) return;

    try {
      setDownloading(learnerId);

      const response = await fetch(`/api/course-runs/${courseRun.id}/certificates/${learnerId}`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to generate certificate");
      }

      const blob = await response.blob();
      const learner = learners.find((l) => l.id === learnerId);
      const filename = `Certificate_${learner?.name.replace(/\s+/g, "_")}_${courseRun.serialNumber}.pdf`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Certificate Downloaded",
        description: `Certificate for ${learner?.name} has been downloaded.`,
      });

      onSuccess?.();
    } catch (error: any) {
      console.error("Error downloading certificate:", error);
      toast({
        title: "Download Failed",
        description: getErrorMessage(error, "Failed to download certificate"),
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
    }
  };

  const handleExportZip = async () => {
    if (!courseRun || selectedLearners.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one participant to export certificates.",
        variant: "destructive",
      });
      return;
    }

    try {
      setGenerating(true);

      const response = await fetch(`/api/course-runs/${courseRun.id}/certificates/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learnerIds: selectedLearners }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate certificates");
      }

      const blob = await response.blob();
      const filename = `Certificates_${courseRun.serialNumber}_${new Date().getTime()}.zip`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Certificates Downloaded",
        description: `${selectedLearners.length} certificate(s) have been exported as ZIP.`,
      });

      onSuccess?.();
    } catch (error: any) {
      console.error("Error exporting certificates:", error);
      toast({
        title: "Export Failed",
        description: getErrorMessage(error, "Failed to export certificates"),
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenWaiver = (learner: Learner) => {
    setWaiverDialog({ open: true, learner });
  };

  if (!courseRun) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Generate Certificates - {courseRun.serialNumber}
            </DialogTitle>
            <DialogDescription>
              <div className="space-y-1 mt-2">
                <div>
                  <strong>Course:</strong> {courseRun.course.title}
                </div>
                <div className="flex gap-4 text-sm">
                  <span>
                    <strong>Present:</strong> {presentLearners.length}
                  </span>
                  <span>
                    <strong>Absent:</strong> {absentLearners.length}
                  </span>
                  <span>
                    <strong>Certificates Generated:</strong> {certificatesGenerated}
                  </span>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Present Learners */}
            {eligibleLearners.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Checkbox id="select-all" checked={selectedLearners.length === eligibleLearners.length} onCheckedChange={handleSelectAll} />
                    <Label htmlFor="select-all" className="cursor-pointer font-medium">
                      Select All Eligible ({eligibleLearners.length})
                    </Label>
                  </div>
                  <Badge variant="secondary">{selectedLearners.length} selected</Badge>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Participant Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Attendance</TableHead>
                        <TableHead>Email Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eligibleLearners.map((learner) => (
                        <TableRow key={learner.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedLearners.includes(learner.id)}
                              onCheckedChange={(checked) => handleSelectLearner(learner.id, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{learner.name}</TableCell>
                          <TableCell>{learner.email}</TableCell>
                          <TableCell>
                            <Badge variant="default" className="bg-green-600">
                              Present
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {learner.certificateEmailStatus === "SENT" ? (
                              <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                                Sent
                              </Badge>
                            ) : learner.certificateEmailStatus === "SENDING" ? (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                                Sending…
                              </Badge>
                            ) : learner.certificateEmailStatus === "FAILED" ? (
                              <Badge variant="destructive">Failed</Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                Not Sent
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" onClick={() => handleDownloadSingle(learner.id)} disabled={downloading === learner.id}>
                              {downloading === learner.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Download className="h-4 w-4 mr-1" />
                                  PDF
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Absent Learners */}
            {absentLearners.length > 0 && (
              <div>
                <h4 className="font-medium mb-3 text-sm text-muted-foreground">Absent Learners</h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Participant Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Attendance</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {absentLearners.map((learner) => (
                        <TableRow key={learner.id} className="opacity-60">
                          <TableCell className="font-medium">{learner.name}</TableCell>
                          <TableCell>{learner.email}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">Absent</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => handleOpenWaiver(learner)}>
                              <FileText className="h-4 w-4 mr-1" />
                              Submit Waiver Form
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          {/* Certificate email preview */}
          <div className="border rounded-lg overflow-hidden bg-slate-100">
            <div className="px-3 py-2 border-b bg-white flex items-center justify-between gap-2">
              <h3 className="font-semibold text-sm">Certificate email preview</h3>
              {previewLoading && <span className="text-xs text-muted-foreground">Loading…</span>}
            </div>
            {previewSubject && (
              <div className="px-3 py-2 bg-white border-b text-xs">
                <span className="text-muted-foreground">Subject: </span>
                <span className="font-medium text-foreground break-all">{previewSubject}</span>
              </div>
            )}
            {previewError && <div className="p-3 text-sm text-destructive bg-white">{previewError}</div>}
            <div className="relative bg-[#0f172a] min-h-[280px] max-h-[45vh] overflow-auto">
              {previewLoading && !previewHtml && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400 z-10 bg-[#0f172a]/80">Loading preview…</div>
              )}
              {previewHtml && (
                <iframe
                  title="Certificate email preview"
                  srcDoc={previewHtml}
                  sandbox="allow-same-origin"
                  className="w-full min-h-[400px] border-0 block bg-white"
                  style={{ minHeight: "min(45vh, 560px)" }}
                />
              )}
            </div>
            <div className="p-3 bg-gray-50 border-t text-xs text-muted-foreground">
              Preview shows the email each learner will receive when certificates are sent (displayed with a placeholder name).
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button variant="outline" onClick={handleExportParticipantList} disabled={exportingParticipants}>
                {exportingParticipants ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                {exportingParticipants ? "Exporting..." : "Export participant list"}
              </Button>
            </div>
            <Button onClick={handleExportZip} disabled={generating || selectedLearners.length === 0}>
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileDown className="mr-2 h-4 w-4" />
                  Export ZIP ({selectedLearners.length})
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <WaiverDialog
        open={waiverDialog.open}
        onOpenChange={(open) => setWaiverDialog({ open, learner: null })}
        learner={waiverDialog.learner}
        courseRunId={courseRun.id}
        onSuccess={onSuccess}
      />
    </>
  );
}
