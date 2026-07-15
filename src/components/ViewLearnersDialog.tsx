import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Calendar, MapPin, User, Download, FileText, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { clientOrganizationsApi, courseRunsApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/errorHandler";
import { formatDate } from "@/lib/date";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:3001/api").replace(/\/$/, "");

const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

interface ViewLearnersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseRunId: string;
  courseRunData?: any;
  /** When set (e.g. TC dashboard list from getCoordinatorCourseRunsSelf), shown instead of raw API status */
  displayStatusOverride?: string;
}

interface LearnerRecord {
  id: string;
  learner: {
    id: string;
    fullname: string;
    email: string;
    designation: string;
    contactNumber: string;
  };
  enrollmentStatus: string;
  enrollmentDate?: string;
  completionStatus?: string;
  attendanceStatus?: string | null;
  waiverReason?: string | null;
  waiverStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
  waiverRejectReason?: string | null;
  waiverSubmittedAt?: string | Date | null;
  waiverReviewedAt?: string | Date | null;
}

/** Matches GET /course-runs/:id/certificates learner rows */
interface CertificateRow {
  id: string;
  learnerId: string;
  learnerName: string;
  learnerEmail: string;
  isPresent: boolean;
  waiverReason?: string | null;
  waiverStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
  waiverRejectReason?: string | null;
  waiverSubmittedAt?: Date | string | null;
  waiverReviewedAt?: Date | string | null;
}

interface WaiverFormData {
  reason: string;
  document: File | null;
}

const ViewLearnersDialog = ({ open, onOpenChange, courseRunId, courseRunData, displayStatusOverride }: ViewLearnersDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [courseRun, setCourseRun] = useState<any>(courseRunData || null);
  const [learners, setLearners] = useState<LearnerRecord[]>([]);
  const [certByEnrollmentId, setCertByEnrollmentId] = useState<Record<string, CertificateRow>>({});
  const [submittingWaiver, setSubmittingWaiver] = useState(false);
  const [waiverDialogOpen, setWaiverDialogOpen] = useState(false);
  const [selectedCertRow, setSelectedCertRow] = useState<CertificateRow | null>(null);
  const [waiverForm, setWaiverForm] = useState<WaiverFormData>({ reason: "", document: null });

  useEffect(() => {
    if (open && courseRunId) {
      setCourseRun(null);
      setLearners([]);
      setCertByEnrollmentId({});
      fetchData();
    }
  }, [open, courseRunId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const courseRunResponse = await courseRunsApi.getById(courseRunId);

      let fetchedCourseRun = null;
      if (courseRunResponse && typeof courseRunResponse === "object") {
        fetchedCourseRun = courseRunResponse.data || courseRunResponse.courseRun || courseRunResponse;
      }

      if (fetchedCourseRun) {
        setCourseRun(fetchedCourseRun);
      }

      const response = await clientOrganizationsApi.getCourseRunLearners(courseRunId, user?.id);

      let learnersList: LearnerRecord[] = [];
      if (Array.isArray(response)) {
        learnersList = response;
      } else if (response?.learners && Array.isArray(response.learners)) {
        learnersList = response.learners;
      } else if (response?.data && Array.isArray(response.data)) {
        learnersList = response.data;
      }

      setLearners(learnersList);

      try {
        const certRes = await courseRunsApi.getCertificates(courseRunId);
        if (certRes?.success && certRes?.data?.learners?.length) {
          const map: Record<string, CertificateRow> = {};
          for (const row of certRes.data.learners as CertificateRow[]) {
            map[row.id] = row;
          }
          setCertByEnrollmentId(map);
        }
      } catch {
        setCertByEnrollmentId({});
      }
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast({
        title: "Error loading data",
        description: getErrorMessage(error, "Failed to load course run details or learners"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resolveCertificateRow = (record: LearnerRecord): CertificateRow => {
    const fromApi = certByEnrollmentId[record.id];
    if (fromApi) return fromApi;

    const att = record.attendanceStatus;
    const isPresent = att === "PRESENT";
    return {
      id: record.id,
      learnerId: record.learner.id,
      learnerName: record.learner.fullname,
      learnerEmail: record.learner.email,
      isPresent,
      waiverReason: record.waiverReason,
      waiverStatus: record.waiverStatus ?? null,
      waiverRejectReason: record.waiverRejectReason ?? null,
      waiverSubmittedAt: record.waiverSubmittedAt ?? null,
      waiverReviewedAt: record.waiverReviewedAt ?? null,
    };
  };

  const handleDownloadCertificate = async (row: CertificateRow) => {
    try {
      toast({
        title: "Generating Certificate",
        description: `Generating certificate for ${row.learnerName}...`,
      });

      const token = localStorage.getItem("polwel_access_token");
      const response = await fetch(buildApiUrl(`/course-runs/${courseRunId}/certificates/${row.id}/pdf`), {
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
      a.download = `Certificate_${row.learnerName.replace(/\s+/g, "_")}_${courseRun?.serialNumber || courseRunId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Certificate Downloaded",
        description: `Certificate for ${row.learnerName} has been downloaded`,
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

  const handleOpenWaiverDialog = (row: CertificateRow) => {
    setSelectedCertRow(row);
    const isRejected = row.waiverStatus === "REJECTED";
    setWaiverForm({
      reason: isRejected ? "" : row.waiverReason || "",
      document: null,
    });
    setWaiverDialogOpen(true);
  };

  const handleSubmitWaiver = async () => {
    if (!selectedCertRow) return;

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

      const payload: Record<string, unknown> = {
        waiverReason: waiverForm.reason,
      };

      if (waiverForm.document) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(waiverForm.document!);
        });

        payload.waiverDocument = {
          filename: waiverForm.document.name,
          mimetype: waiverForm.document.type,
          size: waiverForm.document.size,
          base64,
        };
      }

      const response = await courseRunsApi.submitWaiver(courseRunId, selectedCertRow.id, payload);

      if (response?.success) {
        toast({
          title: "Waiver Submitted",
          description: `Waiver form for ${selectedCertRow.learnerName} has been submitted`,
        });
        setWaiverDialogOpen(false);
        setSelectedCertRow(null);
        setWaiverForm({ reason: "", document: null });
        fetchData();
      } else {
        throw new Error((response as any)?.message || "Failed to submit waiver");
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

  const enrolledLearners = learners.filter((l) => l.enrollmentStatus === "ENROLLED");
  const withdrawnLearners = learners.filter((l) => l.enrollmentStatus === "WITHDRAWN");

  const courseRunStatusForDisplay = displayStatusOverride ?? courseRun?.status;

  const attendanceBadge = (row: CertificateRow, record: LearnerRecord) => {
    if (row.isPresent) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">Present</Badge>;
    }
    const hasCertApi = Boolean(certByEnrollmentId[record.id]);
    if (hasCertApi) {
      return <Badge variant="destructive">Absent</Badge>;
    }
    const att = record.attendanceStatus;
    if (att === "ABSENT") {
      return <Badge variant="destructive">Absent</Badge>;
    }
    if (att === "PENDING" || att == null) {
      return (
        <Badge variant="secondary" className="text-foreground">
          Pending
        </Badge>
      );
    }
    return <Badge variant="destructive">Absent</Badge>;
  };

  const waiverActionLabel = (row: CertificateRow) => {
    const ws = row.waiverStatus;
    if (ws === "APPROVED" || ws === "PENDING") return "View Waiver";
    if (ws === "REJECTED") return "Resubmit Waiver";
    if (row.waiverReason) return "View Waiver";
    return "Submit Waiver";
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Course Run Learners</DialogTitle>
            <DialogDescription>Overview and learner list for this course run</DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading learners...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <Card className="border-l-4 border-l-[#F7941D]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">
                    {courseRun?.course?.title || courseRun?.courseName || courseRun?.title || "Strategic Thinking Masterclass"}
                  </CardTitle>
                  {courseRun?.course?.courseCode && (
                    <CardDescription className="text-sm text-muted-foreground">Course Code: {courseRun.course.courseCode}</CardDescription>
                  )}
                  {courseRun?.serialNumber && <CardDescription className="text-sm text-muted-foreground">Serial: {courseRun.serialNumber}</CardDescription>}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-orange-50 rounded-lg">
                        <Calendar className="h-4 w-4 text-[#F7941D]" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Duration</p>
                        <p className="text-sm font-semibold">
                          {courseRun?.startDatetime ? formatDate(courseRun.startDatetime) : "N/A"}
                          {courseRun?.endDatetime && courseRun?.startDatetime && " - "}
                          {courseRun?.endDatetime ? formatDate(courseRun.endDatetime) : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-orange-50 rounded-lg">
                        <MapPin className="h-4 w-4 text-[#F7941D]" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Venue</p>
                        <p className="text-sm font-semibold">{courseRun?.venue?.name || courseRun?.specifiedLocation || "POLWEL Learning Pod"}</p>
                        {courseRun?.venue?.address && <p className="text-xs text-muted-foreground mt-1">{courseRun.venue.address}</p>}
                      </div>
                    </div>

                    {courseRun?.courseRunTrainers && courseRun.courseRunTrainers.length > 0 && (
                      <div className="flex items-start gap-3 md:col-span-2">
                        <div className="p-2 bg-orange-50 rounded-lg">
                          <User className="h-4 w-4 text-[#F7941D]" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Trainer(s)</p>
                          <div className="space-y-1">
                            {courseRun.courseRunTrainers.map((ct: any, idx: number) => (
                              <div key={idx}>
                                <p className="text-sm font-semibold">{ct.trainer?.name || "Unknown Trainer"}</p>
                                {ct.trainer?.email && <p className="text-xs text-muted-foreground">{ct.trainer.email}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {courseRunStatusForDisplay && (
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-orange-50 rounded-lg">
                          <span className="text-sm">📊</span>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Status</p>
                          <p className="text-sm font-semibold capitalize">{courseRunStatusForDisplay.replace(/_/g, " ")}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Enrolled Learners ({enrolledLearners.length})</h3>
                  <Badge className="bg-green-100 text-green-800">{enrolledLearners.length}</Badge>
                </div>

                {enrolledLearners.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">No enrolled learners</CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50">
                              <TableHead className="font-semibold">Name</TableHead>
                              <TableHead className="font-semibold">Email</TableHead>
                              <TableHead className="font-semibold">Designation</TableHead>
                              <TableHead className="font-semibold">Contact</TableHead>
                              <TableHead className="font-semibold">Attendance</TableHead>
                              <TableHead className="font-semibold text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {enrolledLearners.map((record, idx) => {
                              const certRow = resolveCertificateRow(record);
                              return (
                                <TableRow key={record.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                                  <TableCell className="font-medium">{record.learner.fullname}</TableCell>
                                  <TableCell className="text-sm">{record.learner.email}</TableCell>
                                  <TableCell className="text-sm">{record.learner.designation || "—"}</TableCell>
                                  <TableCell className="text-sm">{record.learner.contactNumber || "—"}</TableCell>
                                  <TableCell>{attendanceBadge(certRow, record)}</TableCell>
                                  <TableCell className="text-right">
                                    {certRow.waiverStatus === "APPROVED" ? (
                                      "—"
                                    ) : certRow.isPresent ? (
                                      <Button variant="ghost" size="sm" onClick={() => handleDownloadCertificate(certRow)}>
                                        <Download className="h-4 w-4 mr-1" />
                                        PDF
                                      </Button>
                                    ) : (
                                      <Button variant="outline" size="sm" onClick={() => handleOpenWaiverDialog(certRow)}>
                                        <FileText className="h-4 w-4 mr-1" />
                                        {waiverActionLabel(certRow)}
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {withdrawnLearners.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Withdrawn Learners ({withdrawnLearners.length})</h3>
                    <Badge className="bg-red-100 text-red-800">{withdrawnLearners.length}</Badge>
                  </div>

                  <Card className="border-l-4 border-l-red-400">
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-red-50">
                              <TableHead className="font-semibold">Name</TableHead>
                              <TableHead className="font-semibold">Email</TableHead>
                              <TableHead className="font-semibold">Designation</TableHead>
                              <TableHead className="font-semibold">Contact</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {withdrawnLearners.map((record, idx) => (
                              <TableRow key={record.id} className={idx % 2 === 0 ? "bg-white" : "bg-red-50/30"}>
                                <TableCell className="font-medium">{record.learner.fullname}</TableCell>
                                <TableCell className="text-sm">{record.learner.email}</TableCell>
                                <TableCell className="text-sm">{record.learner.designation || "—"}</TableCell>
                                <TableCell className="text-sm">{record.learner.contactNumber || "—"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={waiverDialogOpen} onOpenChange={setWaiverDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedCertRow?.waiverStatus === "REJECTED"
                ? "Resubmit Waiver Form"
                : selectedCertRow?.waiverStatus === "APPROVED"
                  ? "Waiver Details — Approved"
                  : selectedCertRow?.waiverStatus === "PENDING"
                    ? "Waiver Details — Pending Review"
                    : "Submit Waiver Form"}
            </DialogTitle>
            <DialogDescription asChild>
              <div>
                Waiver form for <strong>{selectedCertRow?.learnerName}</strong> who was absent from the training.
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedCertRow?.waiverStatus === "APPROVED" && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="text-sm font-semibold text-green-800">✓ Waiver Approved</div>
                <div className="text-xs text-green-700 mt-1">
                  Approved on{" "}
                  {selectedCertRow.waiverReviewedAt ? new Date(selectedCertRow.waiverReviewedAt).toLocaleDateString() : "N/A"}.
                </div>
              </div>
            )}

            {selectedCertRow?.waiverStatus === "PENDING" && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="text-sm font-semibold text-yellow-800">⏳ Awaiting Review</div>
                <div className="text-xs text-yellow-700 mt-1">
                  Submitted on{" "}
                  {selectedCertRow.waiverSubmittedAt ? new Date(selectedCertRow.waiverSubmittedAt).toLocaleDateString() : "N/A"}.
                </div>
              </div>
            )}

            {selectedCertRow?.waiverStatus === "REJECTED" && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="text-sm font-semibold text-red-800">✗ Waiver Rejected</div>
                {selectedCertRow.waiverRejectReason && (
                  <div className="text-xs text-red-700 mt-1">Reason: {selectedCertRow.waiverRejectReason}</div>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="waiver-reason-vld">Reason for Absence *</Label>
              <Textarea
                id="waiver-reason-vld"
                value={waiverForm.reason}
                onChange={(e) => setWaiverForm({ ...waiverForm, reason: e.target.value })}
                placeholder="Please provide the reason for absence (e.g., medical emergency, family emergency, etc.)"
                rows={4}
                className="mt-2"
                disabled={selectedCertRow?.waiverStatus === "APPROVED" || selectedCertRow?.waiverStatus === "PENDING"}
              />
            </div>

            {selectedCertRow?.waiverStatus !== "APPROVED" && selectedCertRow?.waiverStatus !== "PENDING" && (
              <div>
                <Label htmlFor="waiver-doc-vld">Supporting Document (Optional)</Label>
                <Input id="waiver-doc-vld" type="file" onChange={handleFileChange} accept=".pdf,.doc,.docx,.jpg,.png" className="mt-2" />
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
            {(selectedCertRow?.waiverStatus === "REJECTED" ||
              (!selectedCertRow?.waiverStatus && !selectedCertRow?.waiverReason)) && (
              <Button onClick={handleSubmitWaiver} disabled={submittingWaiver}>
                {submittingWaiver ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : selectedCertRow?.waiverStatus === "REJECTED" ? (
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
};

export default ViewLearnersDialog;
