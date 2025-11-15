import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import SafeDropdownMenu from "../components/ui/safe-dropdown-menu";
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import PaginationControls from "../components/ui/pagination";
import { courseRunsApi } from "../lib/api";
import { MoreHorizontal, Search, Plus, Calendar, MapPin, Users, BookOpen } from "lucide-react";
import { useToast } from "../hooks/use-toast";

// Raw shape from backend
interface BackendCourseRun {
  id: string;
  serialNumber?: string | null;
  courseRunType?: string | null;
  course: {
    id: string;
    title: string;
    courseCode: string | null;
    category?: string | null;
  };
  startDatetime: string | null;
  endDatetime: string | null;
  venue: {
    id: string;
    name: string;
    address: string | null;
  } | null;
  venueType?: string | null;
  specifiedLocation?: string | null;
  minClassSize?: number | null;
  maxClassSize?: number | null;
  currentParticipants?: number | null; // from _count
  status: string;
  learnerEmailStatus?: string;
  cancelReason?: string | null;
  cancelledAt?: string | null;
  statusLastEvaluatedAt?: string | null;
  workflow?: {
    availableActions?: WorkflowActionSummary[];
    learnerEmailStatus?: string;
    statusLastEvaluatedAt?: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

interface BackendPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface BackendCourseRunsResponse {
  success: boolean;
  courseRuns: BackendCourseRun[];
  pagination: BackendPagination;
  error?: string;
  message?: string;
}

// Normalized shape for UI
interface WorkflowActionSummary {
  key: string;
  label: string;
  targetStatus: string;
  description: string;
  requiresLearnerEmails: boolean;
}

interface CourseRunUI {
  id: string;
  title: string;
  code: string;
  courseType: string;
  venueName: string;
  venueLocation: string;
  start: Date | null;
  end: Date | null;
  status: string;
  learnerEmailStatus?: string;
  enrolled: number;
  minSize: number | null;
  maxSize: number | null;
  createdAt: Date;
  cancelReason?: string | null;
  cancelledAt?: Date | null;
  statusLastEvaluatedAt?: Date | null;
  workflow: {
    availableActions: WorkflowActionSummary[];
    learnerEmailStatus?: string;
    statusLastEvaluatedAt?: Date | null;
  };
}

interface PaginationState {
  page: number;
  total: number;
  totalPages: number;
  limit?: number;
}

interface CancelDialogState {
  open: boolean;
  courseRun: CourseRunUI | null;
  reason: string;
  submitting: boolean;
}

interface WorkflowDialogState {
  open: boolean;
  courseRun: CourseRunUI | null;
  action: WorkflowActionSummary | null;
  sendEmails: boolean;
  submitting: boolean;
  error?: string | null;
}

const CourseRuns: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [courseRuns, setCourseRuns] = useState<CourseRunUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");

  const [perPage, setPerPage] = useState(10);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    total: 0,
    totalPages: 1,
    limit: 10,
  });

  const initialCancelDialogState: CancelDialogState = {
    open: false,
    courseRun: null,
    reason: "",
    submitting: false,
  };

  const initialWorkflowDialogState: WorkflowDialogState = {
    open: false,
    courseRun: null,
    action: null,
    sendEmails: true,
    submitting: false,
    error: null,
  };

  const [cancelDialog, setCancelDialog] = useState<CancelDialogState>(initialCancelDialogState);

  const [workflowDialog, setWorkflowDialog] = useState<WorkflowDialogState>(initialWorkflowDialogState);

  // New dialog states for the enhanced workflow
  const [trainerApprovalDialog, setTrainerApprovalDialog] = useState<{
    open: boolean;
    courseRun: CourseRunUI | null;
    courseRunDetails: any | null;
    loading: boolean;
    submitting: boolean;
  }>({
    open: false,
    courseRun: null,
    courseRunDetails: null,
    loading: false,
    submitting: false,
  });

  const [emailDialog, setEmailDialog] = useState<{
    open: boolean;
    courseRun: CourseRunUI | null;
    type: "course_confirmation" | "training_assignment";
    cc: string;
    additionalBody: string;
    submitting: boolean;
  }>({
    open: false,
    courseRun: null,
    type: "course_confirmation",
    cc: "",
    additionalBody: "",
    submitting: false,
  });

  const totalCount = pagination.total || courseRuns.length;

  // Fetch course runs data mirroring client organisation list behaviour
  const fetchCourseRuns = async (pageArg?: number, limitArg?: number) => {
    try {
      setLoading(true);
      setError(null);

      const pageToUse = pageArg ?? pagination.page;
      const limitToUse = Math.max(1, Math.min(1000, limitArg ?? perPage));

      const response: BackendCourseRunsResponse = await courseRunsApi.getAll({
        page: pageToUse,
        limit: limitToUse,
        search: searchTerm.trim() || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        startDate: startDateFilter || undefined,
        endDate: endDateFilter || undefined,
      });

      if (!response.success) {
        throw new Error(response.error || response.message || "Failed to load course runs");
      }

      const transformed: CourseRunUI[] = (response.courseRuns || [])
        .map((run) => {
          const start = run.startDatetime ? new Date(run.startDatetime) : null;
          const end = run.endDatetime ? new Date(run.endDatetime) : null;
          const workflowAvailable = Array.isArray(run.workflow?.availableActions) ? (run.workflow?.availableActions as WorkflowActionSummary[]) : [];
          const statusEvaluatedAt = run.workflow?.statusLastEvaluatedAt || run.statusLastEvaluatedAt;

          return {
            id: run.id,
            title: run.course?.title || "Untitled Course",
            code: run.course?.courseCode || run.serialNumber || "-",
            courseType: run.courseRunType || run.course?.category || "-",
            venueName: run.venue?.name || "—",
            venueLocation: run.venue?.address || run.specifiedLocation || "—",
            start,
            end,
            status: run.status,
            learnerEmailStatus: run.learnerEmailStatus || run.workflow?.learnerEmailStatus,
            enrolled: run.currentParticipants ?? 0,
            minSize: run.minClassSize ?? null,
            maxSize: run.maxClassSize ?? null,
            createdAt: new Date(run.createdAt),
            cancelReason: run.cancelReason ?? null,
            cancelledAt: run.cancelledAt ? new Date(run.cancelledAt) : null,
            statusLastEvaluatedAt: statusEvaluatedAt ? new Date(statusEvaluatedAt) : null,
            workflow: {
              availableActions: workflowAvailable,
              learnerEmailStatus: run.workflow?.learnerEmailStatus || run.learnerEmailStatus,
              statusLastEvaluatedAt: statusEvaluatedAt ? new Date(statusEvaluatedAt) : null,
            },
          };
        })
        // Filter out PENDING_BILLING and COMPLETED from main list
        .filter((run) => run.status !== "PENDING_BILLING" && run.status !== "COMPLETED");

      setCourseRuns(transformed);

      if (response.pagination) {
        setPagination(response.pagination);
        if (typeof response.pagination.limit === "number") {
          setPerPage(Math.max(1, Math.min(1000, response.pagination.limit)));
        }
      } else {
        const total = transformed.length;
        setPagination({
          page: pageToUse,
          total,
          totalPages: Math.max(1, Math.ceil(total / limitToUse)),
        });
      }

      // Fetch status options once
      if (statusOptions.length === 0) {
        try {
          const statusResp = await courseRunsApi.getStatusOptions();
          if (Array.isArray(statusResp?.statusOptions)) {
            setStatusOptions(statusResp.statusOptions);
          }
        } catch (e) {
          // Ignore status option failures to avoid blocking list rendering
        }
      }
    } catch (err) {
      console.error("Error fetching course runs:", err);
      setCourseRuns([]);
      setError(err instanceof Error ? err.message : "Failed to load course runs");
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  // Effects
  useEffect(() => {
    fetchCourseRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, statusFilter, perPage, startDateFilter, endDateFilter]);

  // Debounced search mirroring client organisation page
  useEffect(() => {
    const t = setTimeout(() => {
      setPagination((p) => ({ ...p, page: 1 }));
      fetchCourseRuns(1);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // Handle search
  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handleStartDateFilter = (value: string) => {
    setStartDateFilter(value);
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handleEndDateFilter = (value: string) => {
    setEndDateFilter(value);
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handleExportCSV = async () => {
    try {
      toast({
        title: "Exporting...",
        description: "Preparing course runs data for export",
      });

      const response = await courseRunsApi.exportToCSV();

      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to export data");
      }

      // Convert data to CSV
      const csvContent = response.data;

      // Create download link
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      const today = new Date().toISOString().split("T")[0];
      link.setAttribute("href", url);
      link.setAttribute("download", `course-runs-export-${today}.csv`);
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export successful",
        description: "Course runs data has been exported to CSV",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to export data";
      toast({
        title: "Export failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handlePageChange = (page: number) => {
    setPagination((p) => ({ ...p, page }));
  };

  const handlePerPageChange = (value: number) => {
    setPerPage(value);
    setPagination((p) => ({ ...p, page: 1 }));
  };

  // Format date and time
  const formatRange = (start: Date | null, end: Date | null) => {
    if (!start) return "—";
    const opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" };
    const startStr = start.toLocaleString(undefined, opts);
    if (!end) return startStr;
    const endStr = end.toLocaleString(undefined, opts);
    return `${startStr} → ${endStr}`;
  };

  // Get status badge variant - matching exact colors from the images
  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "DRAFT":
        return "secondary";
      case "PENDING":
        return "outline";
      case "CONFIRMED_PENDING_TA_APPROVAL":
        return "outline"; // Will be styled as clickable button
      case "CONFIRMED":
        return "default";
      case "CONFIRMED_PENDING_CONFIRMATION_EMAILS":
        return "default";
      case "IN_PROGRESS":
        return "default";
      case "PENDING_BILLING":
        return "outline";
      case "COMPLETED":
        return "default";
      case "CANCELLED":
        return "destructive";
      case "PUBLISHED":
        return "default";
      case "ONGOING":
        return "default";
      case "ACTIVE":
        return "default";
      case "ARCHIVED":
        return "secondary";
      default:
        return "secondary";
    }
  };

  // Get status chip color class - exact colors from images
  const getStatusChipClass = (status: string): string => {
    const baseClass = "rounded-full px-3 py-1 text-xs font-medium";
    switch (status) {
      case "PENDING":
        return `${baseClass} bg-amber-100 text-amber-800`;
      case "CONFIRMED_PENDING_TA_APPROVAL":
        return `${baseClass} bg-yellow-100 text-yellow-800 cursor-pointer hover:scale-110 transition-transform`;
      case "CONFIRMED":
        return `${baseClass} bg-green-100 text-green-800`;
      case "CONFIRMED_PENDING_CONFIRMATION_EMAILS":
        return `${baseClass} bg-blue-100 text-blue-800`;
      case "IN_PROGRESS":
        return `${baseClass} bg-blue-600 text-white`;
      case "PENDING_BILLING":
        return `${baseClass} bg-amber-100 text-amber-800`;
      case "COMPLETED":
        return `${baseClass} bg-green-600 text-white`;
      case "CANCELLED":
        return `${baseClass} bg-red-100 text-red-800`;
      case "DRAFT":
        return `${baseClass} bg-gray-100 text-gray-600`;
      default:
        return `${baseClass} bg-gray-100 text-gray-600`;
    }
  };

  // Action handlers
  const handleView = (courseRun: CourseRunUI) => {
    // Navigate to course run detail page
    navigate(`/course-runs/${courseRun.id}`);
  };

  const handleEdit = (courseRun: CourseRunUI) => {
    // Navigate to course run edit page
    console.log("Edit course run:", courseRun.id);
  };

  const openCancelDialog = (courseRun: CourseRunUI) => {
    setCancelDialog({
      open: true,
      courseRun,
      reason: courseRun.cancelReason ?? "",
      submitting: false,
    });
  };

  const closeCancelDialog = () => {
    setCancelDialog(initialCancelDialogState);
  };

  const submitCancel = async () => {
    if (!cancelDialog.courseRun) return;
    const payload = cancelDialog.reason.trim() ? { reason: cancelDialog.reason.trim() } : undefined;

    setCancelDialog((prev) => ({ ...prev, submitting: true }));

    try {
      await courseRunsApi.cancel(cancelDialog.courseRun.id, payload);
      toast({
        title: "Course run cancelled",
        description: `${cancelDialog.courseRun.title} has been cancelled${payload?.reason ? " with a recorded reason." : "."}`,
      });
      closeCancelDialog();
      await fetchCourseRuns();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to cancel course run";
      toast({ title: "Cancellation failed", description: message, variant: "destructive" });
      setCancelDialog((prev) => ({ ...prev, submitting: false }));
    }
  };

  const handleDelete = async (courseRun: CourseRunUI) => {
    if (window.confirm("Are you sure you want to delete this course run? This action cannot be undone.")) {
      try {
        await courseRunsApi.delete(courseRun.id);
        fetchCourseRuns();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete course run");
      }
    }
  };

  const openWorkflowDialog = (courseRun: CourseRunUI, action: WorkflowActionSummary) => {
    setWorkflowDialog({
      open: true,
      courseRun,
      action,
      sendEmails: action.requiresLearnerEmails ? true : Boolean(courseRun.workflow.learnerEmailStatus !== "NOT_SENT"),
      submitting: false,
      error: null,
    });
  };

  const closeWorkflowDialog = () => {
    setWorkflowDialog(initialWorkflowDialogState);
  };

  const submitWorkflowAction = async () => {
    if (!workflowDialog.courseRun || !workflowDialog.action) return;

    // Validate required fields before transitioning from DRAFT to PENDING (Mark as Active)
    if (workflowDialog.action.key === "SUBMIT") {
      const run = workflowDialog.courseRun;
      const errors: string[] = [];

      if (!run.title) errors.push("Course is required");
      if (!run.start) errors.push("Start date and time are required");
      if (!run.end) errors.push("End date and time are required");
      if (!run.venueName && !run.venueLocation) errors.push("Venue or location is required");
      if (!run.minSize || run.minSize <= 0) errors.push("Minimum class size is required");
      if (!run.maxSize || run.maxSize <= 0) errors.push("Maximum class size is required");
      if (run.minSize && run.maxSize && run.minSize > run.maxSize) {
        errors.push("Minimum class size cannot be greater than maximum class size");
      }

      if (errors.length > 0) {
        toast({
          title: "Validation Error",
          description: (
            <div>
              <p>Please complete the following required fields:</p>
              <ul className="list-disc list-inside mt-2">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          ),
          variant: "destructive",
        });
        setWorkflowDialog((prev) => ({ ...prev, submitting: false }));
        return;
      }
    }

    setWorkflowDialog((prev) => ({ ...prev, submitting: true, error: null }));

    try {
      await courseRunsApi.performWorkflowAction(workflowDialog.courseRun.id, {
        action: workflowDialog.action.key,
        sendEmails: workflowDialog.sendEmails,
      });

      toast({
        title: "Workflow action submitted",
        description: `${workflowDialog.action.label} queued for ${workflowDialog.courseRun.title}.`,
      });

      closeWorkflowDialog();
      await fetchCourseRuns();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to perform workflow action";
      toast({ title: "Action failed", description: message, variant: "destructive" });
      setWorkflowDialog((prev) => ({ ...prev, submitting: false, error: message }));
    }
  };

  // ========== NEW WORKFLOW HANDLERS ==========

  // Handler for "Mark as Confirmed" button (PENDING → CONFIRMED_PENDING_TA_APPROVAL)
  const handleMarkAsConfirmed = async (courseRun: CourseRunUI) => {
    if (!window.confirm(`Mark "${courseRun.title}" as confirmed and pending trainer assignment approval?`)) {
      return;
    }

    try {
      await courseRunsApi.markAsConfirmed(courseRun.id);
      toast({
        title: "Course Run Confirmed",
        description: `${courseRun.title} is now pending trainer assignment approval.`,
      });
      await fetchCourseRuns();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to mark as confirmed";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  // Handler for opening trainer approval dialog
  const openTrainerApprovalDialog = async (courseRun: CourseRunUI) => {
    setTrainerApprovalDialog({
      open: true,
      courseRun,
      courseRunDetails: null,
      loading: true,
      submitting: false,
    });

    try {
      // Fetch full course run details with trainers
      const details = await courseRunsApi.getById(courseRun.id);
      setTrainerApprovalDialog((prev) => ({
        ...prev,
        courseRunDetails: details.courseRun,
        loading: false,
      }));
    } catch (err) {
      console.error("Failed to fetch course run details:", err);
      toast({
        title: "Error",
        description: "Failed to load trainer details",
        variant: "destructive",
      });
      setTrainerApprovalDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  const closeTrainerApprovalDialog = () => {
    setTrainerApprovalDialog({ open: false, courseRun: null, courseRunDetails: null, loading: false, submitting: false });
  };

  // Handler for approving trainer assignment
  const handleApproveTrainer = async () => {
    if (!trainerApprovalDialog.courseRun) return;

    setTrainerApprovalDialog((prev) => ({ ...prev, submitting: true }));

    try {
      await courseRunsApi.approveTrainerAssignment(trainerApprovalDialog.courseRun.id);
      toast({
        title: "Trainer Assignment Approved",
        description: `${trainerApprovalDialog.courseRun.title} is now ready for confirmation emails.`,
      });
      closeTrainerApprovalDialog();
      await fetchCourseRuns();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to approve trainer assignment";
      toast({ title: "Error", description: message, variant: "destructive" });
      setTrainerApprovalDialog((prev) => ({ ...prev, submitting: false }));
    }
  };

  // Handler for rejecting trainer assignment
  const handleRejectTrainer = async () => {
    if (!trainerApprovalDialog.courseRun) return;

    const rejectionReason = window.prompt("Please provide a reason for rejection:");

    if (!rejectionReason || rejectionReason.trim() === "") {
      toast({ title: "Rejection Cancelled", description: "No reason provided.", variant: "destructive" });
      return;
    }

    setTrainerApprovalDialog((prev) => ({ ...prev, submitting: true }));

    try {
      await courseRunsApi.rejectTrainerAssignment(trainerApprovalDialog.courseRun.id, { rejectionReason });
      toast({
        title: "Trainer Assignment Rejected",
        description: "The trainer assignment has been rejected.",
      });
      closeTrainerApprovalDialog();
      await fetchCourseRuns();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reject trainer assignment";
      toast({ title: "Error", description: message, variant: "destructive" });
      setTrainerApprovalDialog((prev) => ({ ...prev, submitting: false }));
    }
  };

  // Handler for opening email dialog
  const openEmailDialog = (courseRun: CourseRunUI, type: "course_confirmation" | "training_assignment") => {
    setEmailDialog({
      open: true,
      courseRun,
      type,
      cc: "",
      additionalBody: "",
      submitting: false,
    });
  };

  const closeEmailDialog = () => {
    setEmailDialog({
      open: false,
      courseRun: null,
      type: "course_confirmation",
      cc: "",
      additionalBody: "",
      submitting: false,
    });
  };

  // Handler for sending course confirmation email
  const handleSendCourseConfirmationEmail = async () => {
    if (!emailDialog.courseRun) return;

    setEmailDialog((prev) => ({ ...prev, submitting: true }));

    try {
      await courseRunsApi.sendCourseConfirmationEmail(emailDialog.courseRun.id, {
        cc: emailDialog.cc.trim() || undefined,
        additionalBodyContent: emailDialog.additionalBody.trim() || undefined,
      });
      toast({
        title: "Email Sent",
        description: "Course confirmation email has been sent to learners.",
      });
      closeEmailDialog();
      await fetchCourseRuns();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send confirmation email";
      toast({ title: "Error", description: message, variant: "destructive" });
      setEmailDialog((prev) => ({ ...prev, submitting: false }));
    }
  };

  // Handler for sending training assignment email
  const handleSendTrainingAssignmentEmail = async (courseRun: CourseRunUI) => {
    if (!window.confirm(`Send training assignment emails to both learners and trainers for "${courseRun.title}"?`)) {
      return;
    }

    try {
      await courseRunsApi.sendTrainingAssignmentEmailToLearners(courseRun.id);
      toast({
        title: "Emails Sent",
        description: "Training assignment emails have been sent and course is now confirmed.",
      });
      await fetchCourseRuns();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send training assignment emails";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const formatLearnerEmailStatus = (status?: string) => {
    if (!status) return null;
    return status.replace(/_/g, " ");
  };

  const getLearnerEmailBadgeVariant = (status?: string) => {
    if (!status) return "secondary" as const;
    switch (status) {
      case "READY":
      case "SENDING":
        return "default";
      case "SENT":
      case "COMPLETED":
        return "default";
      case "FAILED":
      case "ERROR":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const formatTimestamp = (date?: Date | null) => {
    if (!date) return null;
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isInitialLoad && loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading course runs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Course Run Management</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <BookOpen className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => navigate("/course-runs/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Create Course Run
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by course title, code, or venue..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Status Filter (native select to avoid popup/portal scroll-jump issues) */}
              <div className="w-full sm:w-48">
                <label className="sr-only" htmlFor="statusFilterSelect">
                  Status
                </label>
                <select
                  id="statusFilterSelect"
                  value={statusFilter}
                  onChange={(e) => handleStatusFilter(e.target.value)}
                  className="h-9 rounded-md border bg-background px-3 py-1 text-sm w-full"
                >
                  <option value="ALL">All Statuses</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date Range Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 sm:flex-none">
                <Label htmlFor="startDateFilter" className="text-sm mb-1 block">
                  Start Date From
                </Label>
                <Input
                  id="startDateFilter"
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => handleStartDateFilter(e.target.value)}
                  className="w-full sm:w-48"
                />
              </div>
              <div className="flex-1 sm:flex-none">
                <Label htmlFor="endDateFilter" className="text-sm mb-1 block">
                  End Date To
                </Label>
                <Input id="endDateFilter" type="date" value={endDateFilter} onChange={(e) => handleEndDateFilter(e.target.value)} className="w-full sm:w-48" />
              </div>
              {(startDateFilter || endDateFilter) && (
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStartDateFilter("");
                      setEndDateFilter("");
                    }}
                  >
                    Clear Dates
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-red-600">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Course Runs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Course Runs ({totalCount})</span>
            <span className="text-sm font-normal text-gray-500">
              Page {pagination.page} of {Math.max(1, pagination.totalPages || Math.ceil(Math.max(1, totalCount) / perPage))}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course Details</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Participants</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Course Type</TableHead>
                  <TableHead className="w-[50px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courseRuns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-gray-500">
                        <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">No course runs found</p>
                        <p className="text-sm">
                          {searchTerm || statusFilter !== "ALL"
                            ? "Try adjusting your search or filter criteria."
                            : "Create your first course run to get started."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  courseRuns.map((courseRun) => (
                    <TableRow key={courseRun.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900">{courseRun.title}</div>
                          <div className="text-sm text-gray-500">Code: {courseRun.code}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium">{formatRange(courseRun.start, courseRun.end)}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium">{courseRun.venueName}</div>
                            <div className="text-sm text-gray-500">{courseRun.venueLocation}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          {/* Color indicator circle */}
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                              courseRun.minSize && courseRun.enrolled >= courseRun.minSize ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                            }`}
                            title={courseRun.minSize && courseRun.enrolled >= courseRun.minSize ? "Minimum class size reached" : "Below minimum class size"}
                          >
                            {courseRun.enrolled}
                          </div>
                          <div className="text-xs text-gray-500">
                            <div>Min: {courseRun.minSize ?? "—"}</div>
                            <div>Max: {courseRun.maxSize ?? "—"}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          {/* Make status chip clickable for CONFIRMED_PENDING_TA_APPROVAL */}
                          {courseRun.status === "CONFIRMED_PENDING_TA_APPROVAL" ? (
                            <button
                              onClick={() => openTrainerApprovalDialog(courseRun)}
                              className={`${getStatusChipClass(
                                courseRun.status
                              )} inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold transition-all hover:scale-110 cursor-pointer self-center text-center`}
                            >
                              {/* {courseRun.status
                                .replace(/_/g, " ")
                                .toLowerCase()
                                .replace(/\b\w/g, (c) => c.toUpperCase())} */}
                              Confirmed Pending TA Approval
                            </button>
                          ) : (
                            <Badge className="self-center text-center" variant={getStatusBadgeVariant(courseRun.status)}>
                              {courseRun.status
                                .replace(/_/g, " ")
                                .toLowerCase()
                                .replace(/\b\w/g, (c) => c.toUpperCase())}
                            </Badge>
                          )}
                          {/* {courseRun.workflow?.learnerEmailStatus && (
                            <Badge variant={getLearnerEmailBadgeVariant(courseRun.workflow.learnerEmailStatus)} className="w-fit">
                              Learner emails: {formatLearnerEmailStatus(courseRun.workflow.learnerEmailStatus)}
                            </Badge>
                          )} */}
                          {courseRun.cancelReason && <p className="text-xs text-gray-500">Cancel reason: {courseRun.cancelReason}</p>}
                          {/* {courseRun.statusLastEvaluatedAt && (
                            <p className="text-xs text-gray-400">Workflow checked {formatTimestamp(courseRun.statusLastEvaluatedAt)}</p>
                          )} */}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{courseRun.courseType}</span>
                      </TableCell>
                      <TableCell>
                        <SafeDropdownMenu>
                          <DropdownMenuTrigger asChild>
                            {/* preventDefault on mouseDown to match PolwelUsers pattern and avoid focus/scroll issues */}
                            <Button variant="ghost" size="icon" className="h-8 w-8 p-0" onMouseDown={(e) => e.preventDefault()}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(courseRun)}>Manage</DropdownMenuItem>

                            {/* PENDING: Show "Mark as Confirmed" button */}
                            {courseRun.status === "PENDING" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleMarkAsConfirmed(courseRun)} className="text-green-600">
                                  Mark as Confirmed
                                </DropdownMenuItem>
                              </>
                            )}

                            {/* CONFIRMED_PENDING_CONFIRMATION_EMAILS: Show email action buttons */}
                            {courseRun.status === "CONFIRMED_PENDING_CONFIRMATION_EMAILS" && (
                              <>
                                {/* <DropdownMenuSeparator /> */}
                                {/* <DropdownMenuLabel>Email Actions</DropdownMenuLabel> */}
                                <DropdownMenuItem onClick={() => openEmailDialog(courseRun, "course_confirmation")}>
                                  Send Course Confirmation Email
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSendTrainingAssignmentEmail(courseRun)}>Send Training Assignment Email</DropdownMenuItem>
                              </>
                            )}

                            {(courseRun.workflow?.availableActions?.length ?? 0) > 0 && (
                              <>
                                <DropdownMenuSeparator />
                                {/* <DropdownMenuLabel>Workflow actions</DropdownMenuLabel> */}
                                {courseRun.workflow?.availableActions?.map((action) => (
                                  <DropdownMenuItem key={`${courseRun.id}-${action.key}`} onClick={() => openWorkflowDialog(courseRun, action)}>
                                    {action.label}
                                  </DropdownMenuItem>
                                ))}
                              </>
                            )}

                            {/* Hide Cancel button for IN_PROGRESS and beyond (including PENDING_BILLING, COMPLETED) */}
                            {courseRun.status !== "CANCELLED" &&
                              courseRun.status !== "IN_PROGRESS" &&
                              courseRun.status !== "PENDING_BILLING" &&
                              courseRun.status !== "COMPLETED" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => openCancelDialog(courseRun)} className="text-orange-600">
                                    Cancel run
                                  </DropdownMenuItem>
                                </>
                              )}
                          </DropdownMenuContent>
                        </SafeDropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {loading && !isInitialLoad && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                <p className="text-sm text-gray-600">Refreshing course runs&hellip;</p>
              </div>
            )}
          </div>

          <PaginationControls
            page={pagination.page}
            perPage={perPage}
            total={totalCount}
            onPageChange={handlePageChange}
            onPerPageChange={handlePerPageChange}
          />
        </CardContent>
      </Card>

      <Dialog open={cancelDialog.open} onOpenChange={(open) => (open ? null : closeCancelDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel course run</DialogTitle>
            <DialogDescription>
              {cancelDialog.courseRun
                ? `Provide an optional reason for cancelling ${cancelDialog.courseRun.title}. Learners will be notified based on backend workflow settings.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {cancelDialog.courseRun && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">
                  Course code: <span className="font-medium text-gray-900">{cancelDialog.courseRun.code}</span>
                </p>
                {cancelDialog.courseRun.start && (
                  <p className="text-sm text-gray-600">Scheduled: {formatRange(cancelDialog.courseRun.start, cancelDialog.courseRun.end)}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cancelReason">Cancellation reason</Label>
                <Textarea
                  id="cancelReason"
                  placeholder="Let learners and stakeholders know why this run is cancelled (optional)."
                  value={cancelDialog.reason}
                  onChange={(e) => setCancelDialog((prev) => ({ ...prev, reason: e.target.value.slice(0, 1000) }))}
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex flex-row-reverse gap-3 sm:flex-row">
            <Button variant="destructive" onClick={submitCancel} disabled={cancelDialog.submitting}>
              {cancelDialog.submitting ? "Cancelling…" : "Cancel run"}
            </Button>
            <Button variant="outline" onClick={closeCancelDialog} disabled={cancelDialog.submitting}>
              Keep run active
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={workflowDialog.open} onOpenChange={(open) => (open ? null : closeWorkflowDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{workflowDialog.action?.label ?? "Workflow action"}</DialogTitle>
            <DialogDescription>{workflowDialog.action?.description || "Confirm the workflow action to continue the course run lifecycle."}</DialogDescription>
          </DialogHeader>
          {workflowDialog.courseRun && workflowDialog.action && (
            <div className="space-y-4">
              <div className="rounded-md border p-3">
                <p className="text-sm text-gray-600">
                  Course run: <span className="font-medium text-gray-900">{workflowDialog.courseRun.title}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Current status: <span className="font-medium text-gray-900">{workflowDialog.courseRun.status}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Target status: <span className="font-medium text-gray-900">{workflowDialog.action.targetStatus}</span>
                </p>
              </div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <Label htmlFor="sendEmailsSwitch" className="text-sm">
                    Send learner emails
                  </Label>
                  <p className="text-xs text-gray-500">Notify enrolled learners about this transition.</p>
                  {workflowDialog.action.requiresLearnerEmails && (
                    <p className="text-xs text-orange-600 mt-1">This action typically requires learner notifications.</p>
                  )}
                </div>
                <Switch
                  id="sendEmailsSwitch"
                  checked={workflowDialog.sendEmails}
                  onCheckedChange={(checked) => setWorkflowDialog((prev) => ({ ...prev, sendEmails: checked }))}
                  disabled={workflowDialog.submitting}
                />
              </div>
              {workflowDialog.error && <p className="text-sm text-red-600">{workflowDialog.error}</p>}
            </div>
          )}
          <DialogFooter className="flex flex-row-reverse gap-3 sm:flex-row">
            <Button onClick={submitWorkflowAction} disabled={workflowDialog.submitting}>
              {workflowDialog.submitting ? "Processing…" : workflowDialog.action?.label || "Continue"}
            </Button>
            <Button variant="outline" onClick={closeWorkflowDialog} disabled={workflowDialog.submitting}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trainer Approval Dialog */}
      <Dialog open={trainerApprovalDialog.open} onOpenChange={(open) => !open && closeTrainerApprovalDialog()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Review Trainer Assignment
            </DialogTitle>
            <DialogDescription>Review the assigned trainers and their fees for this course run.</DialogDescription>
          </DialogHeader>

          {trainerApprovalDialog.courseRun && (
            <div className="space-y-4">
              {/* Course Information */}
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-gray-600">Course:</span> <span className="font-semibold text-gray-900">{trainerApprovalDialog.courseRun.title}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Course Serial Number:</span>{" "}
                  <span className="font-medium text-gray-700">{trainerApprovalDialog.courseRun.code}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Status:</span>{" "}
                  <Badge variant="outline" className="ml-2">
                    {trainerApprovalDialog.courseRun.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              </div>

              {/* Assigned Trainers Section */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-gray-900">Assigned Trainer(s)</h4>

                {trainerApprovalDialog.loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-gray-500">Loading trainer details...</div>
                  </div>
                ) : trainerApprovalDialog.courseRunDetails?.courseRunTrainers && trainerApprovalDialog.courseRunDetails.courseRunTrainers.length > 0 ? (
                  <div className="space-y-3">
                    {trainerApprovalDialog.courseRunDetails.courseRunTrainers.map((crt: any) => (
                      <div key={crt.id} className="flex items-start justify-between border-b pb-3 last:border-b-0">
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            <Users className="h-5 w-5 text-gray-400" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{crt.trainer?.name || "Unknown Trainer"}</div>
                            <div className="text-xs text-gray-500">Trainer ID: {crt.trainer?.id || crt.trainerId}</div>
                            {crt.isLead && (
                              <Badge variant="default" className="mt-1 text-xs">
                                Lead Trainer
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-green-600">
                            {"$" +
                              (Number(crt.trainerBaseAmount ?? 0) + Number(crt.additionalCost ?? 0)).toLocaleString("en-US", {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              })}
                          </div>
                          <div className="text-xs text-gray-500">Per Run</div>
                        </div>
                      </div>
                    ))}

                    {/* Total Trainer Fees */}
                    <div className="flex items-center justify-between pt-3 border-t-2">
                      <div className="font-semibold text-gray-900">Total Trainer Fees</div>
                      <div className="text-xl font-bold text-blue-600">
                        {"$" +
                          trainerApprovalDialog.courseRunDetails.courseRunTrainers
                            .reduce((sum: number, crt: any) => {
                              const base = Number(crt.trainerBaseAmount ?? 0);
                              const add = Number(crt.additionalCost ?? 0);
                              return sum + base + add;
                            }, 0)
                            .toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 text-center py-4">No trainers assigned yet</div>
                )}
              </div>

              {/* Date and Venue Info */}
              {trainerApprovalDialog.courseRunDetails && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {trainerApprovalDialog.courseRunDetails.startDatetime
                        ? new Date(trainerApprovalDialog.courseRunDetails.startDatetime).toLocaleDateString("en-GB")
                        : "TBD"}
                      {" - "}
                      {trainerApprovalDialog.courseRunDetails.endDatetime
                        ? new Date(trainerApprovalDialog.courseRunDetails.endDatetime).toLocaleDateString("en-GB")
                        : "TBD"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{trainerApprovalDialog.courseRunDetails.venue?.name || "Venue TBD"}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex flex-row gap-3">
            {/* <Button variant="outline" onClick={closeTrainerApprovalDialog} disabled={trainerApprovalDialog.submitting}>
              Close
            </Button> */}
            {/* <Button variant="destructive" onClick={handleRejectTrainer} disabled={trainerApprovalDialog.submitting || trainerApprovalDialog.loading}> */}
            <Button variant="destructive" onClick={closeTrainerApprovalDialog} disabled={trainerApprovalDialog.submitting || trainerApprovalDialog.loading}>
              <span className="mr-2">✕</span>
              {trainerApprovalDialog.submitting ? "Rejecting…" : "Reject Assignment"}
            </Button>
            <Button
              onClick={handleApproveTrainer}
              disabled={trainerApprovalDialog.submitting || trainerApprovalDialog.loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <span className="mr-2">✓</span>
              {trainerApprovalDialog.submitting ? "Approving…" : "Approve Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={emailDialog.open} onOpenChange={(open) => !open && closeEmailDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{emailDialog.type === "course_confirmation" ? "Send Course Confirmation Email" : "Send Training Assignment Email"}</DialogTitle>
            <DialogDescription>
              {emailDialog.type === "course_confirmation"
                ? "Send a confirmation email to all enrolled learners."
                : "Send training assignment emails to learners and trainers."}
            </DialogDescription>
          </DialogHeader>
          {emailDialog.courseRun && (
            <div className="space-y-4">
              <div className="rounded-md border p-3">
                <p className="text-sm text-gray-600">
                  Course: <span className="font-medium text-gray-900">{emailDialog.courseRun.title}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Enrolled: <span className="font-medium text-gray-900">{emailDialog.courseRun.enrolled} learners</span>
                </p>
              </div>

              {emailDialog.type === "course_confirmation" && (
                <>
                  <div>
                    <Label htmlFor="cc">CC (optional)</Label>
                    <Input
                      id="cc"
                      type="email"
                      placeholder="email@example.com"
                      value={emailDialog.cc}
                      onChange={(e) => setEmailDialog((prev) => ({ ...prev, cc: e.target.value }))}
                      disabled={emailDialog.submitting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="additionalBody">Additional Message (optional)</Label>
                    <textarea
                      id="additionalBody"
                      className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Add any additional message to include in the email..."
                      value={emailDialog.additionalBody}
                      onChange={(e) => setEmailDialog((prev) => ({ ...prev, additionalBody: e.target.value }))}
                      disabled={emailDialog.submitting}
                    />
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter className="flex flex-row-reverse gap-3">
            <Button onClick={handleSendCourseConfirmationEmail} disabled={emailDialog.submitting}>
              {emailDialog.submitting ? "Sending…" : "Send Email"}
            </Button>
            <Button variant="outline" onClick={closeEmailDialog} disabled={emailDialog.submitting}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CourseRuns;
