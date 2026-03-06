import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { courseRunsApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/errorHandler";
import { Award, Download, FileArchive, Loader2, X, FileText, Mail } from "lucide-react";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:3001/api").replace(/\/$/, "");

const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

interface LearnerWithAttendance {
  id: string;
  learnerId: string;
  learnerName: string;
  learnerEmail: string;
  isPresent: boolean;
  totalDays: number;
  presentDays: number;
  waiverReason?: string | null;
  waiverDocument?: string | null;
  waiverSubmittedAt?: Date | null;
  waiverStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
  waiverRejectReason?: string | null;
  waiverReviewedAt?: Date | null;
}

interface CourseRunInfo {
  id: string;
  serialNumber?: string;
  courseName: string;
  courseCode: string;
  duration: number;
  durationType: string;
  startDate: string;
  endDate: string;
  venue: string;
}

interface GenerateCertificatesDialogProps {
  courseRunId: string;
  courseRunCode?: string;
  trigger?: React.ReactNode;
}

interface WaiverFormData {
  reason: string;
  document: File | null;
}

export function GenerateCertificatesDialog({ courseRunId, courseRunCode, trigger }: GenerateCertificatesDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submittingWaiver, setSubmittingWaiver] = useState(false);
  const [sendingCertificates, setSendingCertificates] = useState(false);
  const [courseRun, setCourseRun] = useState<CourseRunInfo | null>(null);
  const [learners, setLearners] = useState<LearnerWithAttendance[]>([]);
  const [selectedLearners, setSelectedLearners] = useState<string[]>([]);
  const [waiverDialogOpen, setWaiverDialogOpen] = useState(false);
  const [selectedLearnerForWaiver, setSelectedLearnerForWaiver] = useState<LearnerWithAttendance | null>(null);
  const [waiverForm, setWaiverForm] = useState<WaiverFormData>({
    reason: "",
    document: null,
  });

  const { toast } = useToast();

  const presentLearners = learners.filter((l) => l.isPresent);
  const absentLearners = learners.filter((l) => !l.isPresent);

  useEffect(() => {
    if (open) {
      fetchCertificateData();
    }
  }, [open, courseRunId]);

  const fetchCertificateData = async () => {
    try {
      setLoading(true);
      const response = await courseRunsApi.getCertificates(courseRunId);

      if (response?.success) {
        setCourseRun(response.data.courseRun);
        setLearners(response.data.learners || []);
        // Select all present learners by default
        const presentIds = response.data.learners.filter((l: LearnerWithAttendance) => l.isPresent).map((l: LearnerWithAttendance) => l.id);
        setSelectedLearners(presentIds);
      } else {
        throw new Error(response?.message || "Failed to load certificate data");
      }
    } catch (error: any) {
      console.error("Error fetching certificate data:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to load certificate data"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLearners(presentLearners.map((l) => l.id));
    } else {
      setSelectedLearners([]);
    }
  };

  const handleSelectLearner = (learnerId: string, checked: boolean) => {
    if (checked) {
      setSelectedLearners([...selectedLearners, learnerId]);
    } else {
      setSelectedLearners(selectedLearners.filter((id) => id !== learnerId));
    }
  };

  const handleDownloadCertificate = async (learner: LearnerWithAttendance) => {
    try {
      toast({
        title: "Generating Certificate",
        description: `Generating certificate for ${learner.learnerName}...`,
      });

      // Call API to generate PDF certificate
      const token = localStorage.getItem("polwel_access_token");

      const response = await fetch(buildApiUrl(`/course-runs/${courseRunId}/certificates/${learner.id}/pdf`), {
        method: "GET",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to generate certificate");
      }

      const contentType = response.headers.get("Content-Type") || "";
      if (!contentType.includes("application/pdf")) {
        const fallbackMessage = await response.text().catch(() => "Unable to generate certificate");
        throw new Error(fallbackMessage || "Received unexpected response format");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Certificate_${learner.learnerName.replace(/\s+/g, "_")}_${courseRunCode || courseRunId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Certificate Downloaded",
        description: `Certificate for ${learner.learnerName} has been downloaded`,
      });
    } catch (error: any) {
      console.error("Error downloading certificate:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to download certificate"),
        variant: "destructive",
      });
    }
  };

  const handleExportZip = async () => {
    if (selectedLearners.length === 0) {
      toast({
        title: "No Learners Selected",
        description: "Please select at least one participant to export certificates",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Generating ZIP",
        description: `Generating ${selectedLearners.length} certificate(s)...`,
      });

      // Call API to generate ZIP of certificates
      const token = localStorage.getItem("polwel_access_token");

      const response = await fetch(buildApiUrl(`/course-runs/${courseRunId}/certificates/bulk-zip`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ learnerIds: selectedLearners }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate certificate ZIP");
      }

      const contentType = response.headers.get("Content-Type") || "";
      if (!contentType.includes("application/zip")) {
        const fallbackMessage = await response.text().catch(() => "Unable to generate ZIP");
        throw new Error(fallbackMessage || "Received unexpected response format");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Certificates_${courseRunCode || courseRunId}_${selectedLearners.length}learners.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "ZIP Downloaded",
        description: `${selectedLearners.length} certificate(s) have been downloaded`,
      });
    } catch (error: any) {
      console.error("Error exporting ZIP:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to export certificates"),
        variant: "destructive",
      });
    }
  };

  const handleSendCertificates = async () => {
    if (selectedLearners.length === 0) {
      toast({
        title: "No Learners Selected",
        description: "Please select at least one participant to send certificates",
        variant: "destructive",
      });
      return;
    }

    try {
      setSendingCertificates(true);
      toast({
        title: "Sending Certificates",
        description: `Sending certificates to ${selectedLearners.length} participant(s)...`,
      });

      const response = await courseRunsApi.sendCertificatesToLearners(courseRunId, selectedLearners);

      if (response?.success) {
        const { success, failed, total } = response.data || {};
        toast({
          title: "Certificates Sent",
          description: `Successfully sent ${success || 0} certificate(s)${failed > 0 ? `. ${failed} failed` : ""}`,
        });
      } else {
        throw new Error(response?.error || response?.message || "Failed to send certificates");
      }
    } catch (error: any) {
      console.error("Error sending certificates:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to send certificates"),
        variant: "destructive",
      });
    } finally {
      setSendingCertificates(false);
    }
  };

  const handleOpenWaiverDialog = (learner: LearnerWithAttendance) => {
    setSelectedLearnerForWaiver(learner);
    // For REJECTED waivers, clear the form to allow fresh resubmission
    // For PENDING/APPROVED, show the existing reason read-only
    const isRejected = learner.waiverStatus === "REJECTED";
    setWaiverForm({
      reason: isRejected ? "" : learner.waiverReason || "",
      document: null,
    });
    setWaiverDialogOpen(true);
  };

  const handleSubmitWaiver = async () => {
    if (!selectedLearnerForWaiver) return;

    if (!waiverForm.reason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a reason for absence",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmittingWaiver(true);

      const payload: any = {
        waiverReason: waiverForm.reason,
      };

      // If there's a document, convert to base64 and include in payload
      if (waiverForm.document) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(waiverForm.document!);
        });

        payload.waiverDocument = {
          filename: waiverForm.document.name,
          mimetype: waiverForm.document.type,
          size: waiverForm.document.size,
          base64: base64,
        };
      }

      const response = await courseRunsApi.submitWaiver(courseRunId, selectedLearnerForWaiver.id, payload);

      if (response?.success) {
        toast({
          title: "Waiver Submitted",
          description: `Waiver form for ${selectedLearnerForWaiver.learnerName} has been submitted`,
        });
        setWaiverDialogOpen(false);
        setSelectedLearnerForWaiver(null);
        setWaiverForm({ reason: "", document: null });
        // Refresh data
        fetchCertificateData();
      } else {
        throw new Error(response?.message || "Failed to submit waiver");
      }
    } catch (error: any) {
      console.error("Error submitting waiver:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to submit waiver form"),
        variant: "destructive",
      });
    } finally {
      setSubmittingWaiver(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Maximum file size is 5MB",
          variant: "destructive",
        });
        return;
      }
      setWaiverForm({ ...waiverForm, document: file });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm">
              <Award className="h-4 w-4 mr-2" />
              Generate Certificates
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Generate Certificates - {courseRunCode || courseRunId}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-1 text-sm">
                {courseRun && (
                  <>
                    <div>
                      <strong>Course:</strong> {courseRun.courseName} ({courseRun.courseCode})
                    </div>
                    <div>
                      <strong>Duration:</strong> {courseRun.duration} {courseRun.durationType}
                    </div>
                  </>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{learners.length}</div>
                  <div className="text-sm text-muted-foreground">Total Participants</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{presentLearners.length}</div>
                  <div className="text-sm text-muted-foreground">Present</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{absentLearners.length}</div>
                  <div className="text-sm text-muted-foreground">Absent</div>
                </div>
              </div>

              {/* Present Learners */}
              {presentLearners.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="select-all"
                        checked={selectedLearners.length === presentLearners.length && presentLearners.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                      <Label htmlFor="select-all" className="font-medium">
                        Select All Eligible ({presentLearners.length})
                      </Label>
                    </div>
                    <Badge variant="secondary">{selectedLearners.length} selected</Badge>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Participant Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Attendance</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {presentLearners.map((learner) => (
                        <TableRow key={learner.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedLearners.includes(learner.id)}
                              onCheckedChange={(checked) => handleSelectLearner(learner.id, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{learner.learnerName}</TableCell>
                          <TableCell>{learner.learnerEmail}</TableCell>
                          <TableCell>
                            <Badge variant="default">Present</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleDownloadCertificate(learner)}>
                              <Download className="h-4 w-4 mr-1" />
                              PDF
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Absent Learners */}
              {absentLearners.length > 0 && (
                <div className="space-y-2">
                  <div className="font-medium">Absent Learners ({absentLearners.length})</div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Participant Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Waiver</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {absentLearners.map((learner) => {
                        const waiverStatus = learner.waiverStatus;
                        const hasWaiver = !!learner.waiverReason;

                        // Waiver status badge
                        let waiverBadge: React.ReactNode = <span className="text-xs text-muted-foreground">No waiver</span>;
                        if (waiverStatus === "APPROVED") {
                          waiverBadge = <Badge className="bg-green-100 text-green-800 border-green-200">Waiver Approved</Badge>;
                        } else if (waiverStatus === "PENDING") {
                          waiverBadge = <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Waiver Pending</Badge>;
                        } else if (waiverStatus === "REJECTED") {
                          waiverBadge = <Badge className="bg-red-100 text-red-800 border-red-200">Waiver Rejected</Badge>;
                        } else if (hasWaiver) {
                          waiverBadge = <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Waiver Pending</Badge>;
                        }

                        // Action button label
                        let actionLabel = "Submit Waiver";
                        if (waiverStatus === "APPROVED") actionLabel = "View Waiver";
                        else if (waiverStatus === "PENDING") actionLabel = "View Waiver";
                        else if (waiverStatus === "REJECTED") actionLabel = "Resubmit Waiver";
                        else if (hasWaiver) actionLabel = "View Waiver";

                        return (
                          <TableRow key={learner.id}>
                            <TableCell className="font-medium">{learner.learnerName}</TableCell>
                            <TableCell>{learner.learnerEmail}</TableCell>
                            <TableCell>
                              <Badge variant="destructive">Absent</Badge>
                            </TableCell>
                            <TableCell>{waiverBadge}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="outline" size="sm" onClick={() => handleOpenWaiverDialog(learner)}>
                                <FileText className="h-4 w-4 mr-1" />
                                {actionLabel}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">Certificates Generated: {selectedLearners.length}</div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
              <Button onClick={handleExportZip} disabled={selectedLearners.length === 0}>
                <FileArchive className="h-4 w-4 mr-2" />
                Export ZIP ({selectedLearners.length})
              </Button>
              <Button onClick={handleSendCertificates} disabled={selectedLearners.length === 0 || sendingCertificates}>
                {sendingCertificates ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send to Learners ({selectedLearners.length})
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Waiver Form Dialog */}
      <Dialog open={waiverDialogOpen} onOpenChange={setWaiverDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedLearnerForWaiver?.waiverStatus === "REJECTED"
                ? "Resubmit Waiver Form"
                : selectedLearnerForWaiver?.waiverStatus === "APPROVED"
                  ? "Waiver Details — Approved"
                  : selectedLearnerForWaiver?.waiverStatus === "PENDING"
                    ? "Waiver Details — Pending Review"
                    : "Submit Waiver Form"}
            </DialogTitle>
            <DialogDescription asChild>
              <div>
                Waiver form for <strong>{selectedLearnerForWaiver?.learnerName}</strong> who was absent from the training.
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Status banner for APPROVED / PENDING / REJECTED */}
            {selectedLearnerForWaiver?.waiverStatus === "APPROVED" && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="text-sm font-semibold text-green-800">✓ Waiver Approved</div>
                <div className="text-xs text-green-700 mt-1">
                  Approved on {selectedLearnerForWaiver.waiverReviewedAt ? new Date(selectedLearnerForWaiver.waiverReviewedAt).toLocaleDateString() : "N/A"}.
                  This participant will not be billed for the course.
                </div>
              </div>
            )}

            {selectedLearnerForWaiver?.waiverStatus === "PENDING" && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="text-sm font-semibold text-yellow-800">⏳ Awaiting Review</div>
                <div className="text-xs text-yellow-700 mt-1">
                  Submitted on {selectedLearnerForWaiver.waiverSubmittedAt ? new Date(selectedLearnerForWaiver.waiverSubmittedAt).toLocaleDateString() : "N/A"}.
                  This participant can still be billed until the waiver is approved.
                </div>
              </div>
            )}

            {selectedLearnerForWaiver?.waiverStatus === "REJECTED" && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="text-sm font-semibold text-red-800">✗ Waiver Rejected</div>
                {selectedLearnerForWaiver.waiverRejectReason && (
                  <div className="text-xs text-red-700 mt-1">Reason: {selectedLearnerForWaiver.waiverRejectReason}</div>
                )}
                <div className="text-xs text-red-700 mt-1">You may submit a new waiver request below. This participant can still be billed.</div>
              </div>
            )}

            <div>
              <Label htmlFor="reason">Reason for Absence *</Label>
              <Textarea
                id="reason"
                value={waiverForm.reason}
                onChange={(e) => setWaiverForm({ ...waiverForm, reason: e.target.value })}
                placeholder="Please provide the reason for absence (e.g., medical emergency, family emergency, etc.)"
                rows={4}
                className="mt-2"
                disabled={selectedLearnerForWaiver?.waiverStatus === "APPROVED" || selectedLearnerForWaiver?.waiverStatus === "PENDING"}
              />
            </div>

            {/* Document upload — only for new submission or resubmission */}
            {selectedLearnerForWaiver?.waiverStatus !== "APPROVED" && selectedLearnerForWaiver?.waiverStatus !== "PENDING" && (
              <div>
                <Label htmlFor="document">Supporting Document (Optional)</Label>
                <Input id="document" type="file" onChange={handleFileChange} accept=".pdf,.doc,.docx,.jpg,.png" className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">Supported formats: PDF, DOC, DOCX, JPG, PNG (max 5MB)</p>
                {waiverForm.document && (
                  <div className="flex items-center gap-2 mt-2 text-sm">
                    <FileText className="h-4 w-4" />
                    <span>{waiverForm.document.name}</span>
                    <Button variant="ghost" size="sm" onClick={() => setWaiverForm({ ...waiverForm, document: null })}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setWaiverDialogOpen(false)}>
              Close
            </Button>
            {/* Show submit button only when no waiver yet, or waiver was REJECTED */}
            {(selectedLearnerForWaiver?.waiverStatus === "REJECTED" ||
              (!selectedLearnerForWaiver?.waiverStatus && !selectedLearnerForWaiver?.waiverReason)) && (
              <Button onClick={handleSubmitWaiver} disabled={submittingWaiver}>
                {submittingWaiver ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : selectedLearnerForWaiver?.waiverStatus === "REJECTED" ? (
                  "Resubmit Waiver"
                ) : (
                  "Submit Waiver"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
