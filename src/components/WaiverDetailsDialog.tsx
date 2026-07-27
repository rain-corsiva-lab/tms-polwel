import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { waiversApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, FileText, Check, X } from "lucide-react";

interface WaiverDetail {
  id: string;
  courseRunId: string;
  learnerId: string;
  learner: {
    id: string;
    fullname: string;
    email: string;
    division: string | null;
    buNumber: string | null;
  };
  organization: {
    id: string;
    name: string;
    type: string;
    address: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    contactPerson: string | null;
  } | null;
  courseRun: {
    id: string;
    startDatetime: string | null;
    endDatetime: string | null;
    course: {
      id: string;
      title: string;
      courseCode: string | null;
      category: string | null;
      description: string | null;
    };
    venue: {
      id: string;
      name: string;
      address: string | null;
    } | null;
  };
  waiverReason: string;
  waiverStatus: "PENDING" | "APPROVED" | "REJECTED";
  waiverRejectReason: string | null;
  waiverSubmittedAt: string;
  waiverReviewedAt: string | null;
  waiverReviewer: {
    id: string;
    name: string;
    email: string;
  } | null;
  submittedBy: {
    id: string;
    name: string;
    email: string;
    contactNumber: string | null;
    designation: string | null;
  } | null;
  supportingDocument: {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    path: string;
    url: string;
  } | null;
  attendanceStatus: string | null;
  enrollmentStatus: string | null;
}

interface WaiverDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  waiverId: string | null;
  onAction: () => void;
}

export const WaiverDetailsDialog: React.FC<WaiverDetailsDialogProps> = ({ open, onOpenChange, waiverId, onAction }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [waiver, setWaiver] = useState<WaiverDetail | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch waiver details when dialog opens
  useEffect(() => {
    if (open && waiverId) {
      fetchWaiverDetails();
    } else {
      setWaiver(null);
      setRejectionReason("");
      setError(null);
    }
  }, [open, waiverId]);

  const fetchWaiverDetails = async () => {
    if (!waiverId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await waiversApi.getById(waiverId);

      if (!response.success) {
        throw new Error(response.error || "Failed to fetch waiver details");
      }

      setWaiver(response.waiverRequest);
    } catch (err: any) {
      const message = err?.message || "Failed to load waiver details";
      setError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!waiver) return;

    try {
      setSubmitting(true);
      const response = await waiversApi.approve(waiver.id);

      if (!response.success) {
        throw new Error(response.error || "Failed to approve waiver");
      }

      toast({
        title: "Waiver Approved",
        description: `Waiver request for ${waiver.learner.fullname} has been approved.`,
      });

      onAction();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to approve waiver request",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!waiver) return;

    if (!rejectionReason.trim()) {
      toast({
        title: "Rejection Reason Required",
        description: "Please provide a reason for rejecting this waiver request.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await waiversApi.reject(waiver.id, rejectionReason.trim());

      if (!response.success) {
        throw new Error(response.error || "Failed to reject waiver");
      }

      toast({
        title: "Waiver Rejected",
        description: `Waiver request for ${waiver.learner.fullname} has been rejected.`,
      });

      onAction();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to reject waiver request",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadDocument = () => {
    if (!waiver?.supportingDocument?.url) return;

    // Get the API base URL
    const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
    const baseUrl = apiBaseUrl.replace("/api", "");

    // Open document in new tab
    window.open(`${baseUrl}${waiver.supportingDocument.url}`, "_blank");
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "—";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
            Pending
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
            Approved
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const generateRequestId = (id: string) => {
    return `WR${id.slice(-4).toUpperCase()}`;
  };

  const isPending = waiver?.waiverStatus === "PENDING";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Waiver Request Details</DialogTitle>
          <DialogDescription>Review the waiver request and supporting documents</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
        ) : waiver ? (
          <div className="flex-1 overflow-y-auto space-y-6 py-4">
            {/* Request Info Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Request ID</p>
                <p className="font-semibold">{generateRequestId(waiver.id)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <div className="mt-1">{getStatusBadge(waiver.waiverStatus)}</div>
              </div>
            </div>

            {/* Learner Info Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground"> Participant Name</p>
                <p className="font-medium">{waiver.learner.fullname}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Organization</p>
                <p className="font-medium">{waiver.organization?.name || "—"}</p>
              </div>
            </div>

            {/* Course Info Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Course Name</p>
                <p className="font-medium">{waiver.courseRun.course.title}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Course Run Date</p>
                <p className="font-medium">{formatDate(waiver.courseRun.startDatetime)}</p>
              </div>
            </div>

            {/* Submitted By Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Submitted By</p>
                <p className="font-medium">
                  {waiver.submittedBy ? (
                    <>
                      {waiver.submittedBy.name}
                      {waiver.submittedBy.designation && <span className="text-muted-foreground"> ({waiver.submittedBy.designation})</span>}
                    </>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Submitted Date</p>
                <p className="font-medium">{formatDate(waiver.waiverSubmittedAt)}</p>
              </div>
            </div>

            {/* Reason for Absence */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Reason for Absence</p>
              <div className="bg-muted/50 rounded-md p-4">
                <p className="text-sm whitespace-pre-wrap">{waiver.waiverReason}</p>
              </div>
            </div>

            {/* Supporting Document */}
            {waiver.supportingDocument && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Supporting Document</p>
                <div className="flex items-center justify-between bg-muted/50 rounded-md p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{waiver.supportingDocument.filename}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(waiver.supportingDocument.size)}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleDownloadDocument}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            )}

            {/* Rejection Reason (for pending) */}
            {isPending && (
              <div>
                <Label htmlFor="rejection-reason" className="text-sm font-medium">
                  Rejection Reason (if rejecting)
                </Label>
                <Textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide a reason for rejection..."
                  className="mt-2"
                  rows={3}
                />
              </div>
            )}

            {/* Already reviewed info */}
            {!isPending && waiver.waiverReviewer && (
              <div className="bg-muted/50 rounded-md p-4">
                <p className="text-sm">
                  <span className="font-medium">Reviewed by:</span> {waiver.waiverReviewer.name} on {formatDate(waiver.waiverReviewedAt)}
                </p>
                {waiver.waiverRejectReason && (
                  <p className="text-sm mt-2">
                    <span className="font-medium">Reason:</span> {waiver.waiverRejectReason}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : null}

        {/* Footer Actions */}
        {waiver && (
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            {isPending && (
              <>
                <Button variant="destructive" onClick={handleReject} disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <X className="h-4 w-4 mr-2" />}
                  Reject
                </Button>
                <Button onClick={handleApprove} disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                  Approve
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WaiverDetailsDialog;
