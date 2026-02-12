import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import DateInput from "../components/ui/date-input";
import TimeInput from "../components/ui/time-input";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Mail,
  Phone,
  Building,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Download,
  Upload,
  Edit,
  MoreHorizontal,
} from "lucide-react";
import { courseRunsApi, coursesApi, venuesApi, organizationsApi } from "../lib/api";
import { toast } from "sonner";
import { formatDate, formatDateTime } from "../lib/date";
import SafeDropdownMenu from "../components/ui/safe-dropdown-menu";
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { AddLearnersDialog } from "../components/AddLearnersDialog";
import { ImportLearnersDialog } from "../components/ImportLearnersDialog";
import { EditLearnerDialog } from "../components/EditLearnerDialog";
import { SendTrainerEmailDialog } from "../components/SendTrainerEmailDialog";
import { SendCourseConfirmationEmailDialog } from "../components/SendCourseConfirmationEmailDialog";
import { AttendanceListDialog } from "../components/AttendanceListDialog";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";

interface CourseRunDetailData {
  id: string;
  serialNumber: string;
  courseRunType: string;
  course: {
    id: string | null;
    title: string | null;
    courseCode: string | null;
    category: string | null;
    discounts?: Array<{
      id: string;
      name?: string | null;
      discountPercentage?: number | null;
      discountAmount?: number | null;
    }> | null;
  } | null;
  startDatetime: string | null;
  endDatetime: string | null;
  venue: {
    id: string;
    name: string;
    address: string;
    feeType?: string;
    fee?: number;
    maxParticipants?: number;
    perHeadPriceIfMaxExceed?: number;
  } | null;
  venueType: string | null;
  specifiedLocation: string | null;
  minClassSize: number | null;
  maxClassSize: number | null;
  currentParticipants?: number | null;
  individualRegistrationRequired: boolean | null;
  remarks: string | null;
  status: string | null;
  baseCourseFee: number | null;
  venueFee: number | null;
  venueFinalFee: number | null;
  venueMaxParticipant: number | null;
  perHeadFeeIfMaxExceed: number | null;
  venuePerHeadIfExceed: number | null;
  contractFees: number | null;
  additionalCostExceedingCapacity: number | null;
  otherFee: number | null;
  adminFee: number | null;
  contingencyFee: number | null;
  feeType: string | null;
  courseRunFeeType?: string | null;
  clientOrganizationId?: string | null;
  clientOrganization?: {
    id: string;
    name: string;
    buNumber?: string | null;
  } | null;
  createdAt: string | null;
  updatedAt: string | null;
  courseRunTrainers: Array<{
    id: string;
    trainerBaseAmount: number;
    additionalCost: number;
    additionalCostUnit?: string;
    remarks: string;
    trainer: {
      id: string;
      name: string;
      email: string;
      partnerOrganization?: string;
    };
  }>;
  courseRunPartners?: Array<{
    id: string;
    partner: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  courseRunLearners: Array<{
    id: string;
    enrollmentStatus: string;
    attendanceStatus: string;
    confirmationEmailStatus?: string;
    withdrawnReason?: string;
    withdrawnAt?: string;
    withdrawnBy?: string;
    paymentMode?: string;
    clientOrganization?: {
      id: string;
      name: string;
      organizationType?: string;
    } | null;
    trainingCoordinator?: {
      id: string;
      name: string;
      email: string;
      contactNumber?: string;
    } | null;
    learner: {
      id: string;
      fullname: string;
      email: string;
      contactNumber?: string;
      designation?: string;
    };
  }>;
}

const CourseRunDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [courseRun, setCourseRun] = useState<CourseRunDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("course-info");
  const [isEditing, setIsEditing] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]); // all venues
  const [filteredVenues, setFilteredVenues] = useState<any[]>([]); // by venueType
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string; buNumber?: string }>>([]);
  const [addLearnersDialogOpen, setAddLearnersDialogOpen] = useState(false);
  const [importLearnersDialogOpen, setImportLearnersDialogOpen] = useState(false);
  const [editLearnerDialogOpen, setEditLearnerDialogOpen] = useState(false);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<any>(null);

  // Trainer Assignment State (always loaded, no edit mode)
  const [availableTrainers, setAvailableTrainers] = useState<any[]>([]);
  const [trainerAssignments, setTrainerAssignments] = useState<{
    [trainerId: string]: { selected: boolean; baseFee?: number | null; additionalCost?: number | null; additionalCostUnit?: string };
  }>({});
  const [initialTrainerAssignments, setInitialTrainerAssignments] = useState<{
    [trainerId: string]: { selected: boolean; baseFee?: number | null; additionalCost?: number | null; additionalCostUnit?: string };
  }>({});
  const [sendEmailDialogOpen, setSendEmailDialogOpen] = useState(false);

  // Partner Assignment State (always loaded, no edit mode)
  const [availablePartners, setAvailablePartners] = useState<any[]>([]);
  const [partnerAssignments, setPartnerAssignments] = useState<{
    [partnerId: string]: { selected: boolean; selectedTrainerIds?: string[] };
  }>({});
  const [initialPartnerAssignments, setInitialPartnerAssignments] = useState<{
    [partnerId: string]: { selected: boolean; selectedTrainerIds?: string[] };
  }>({});
  const [courseContractFees, setCourseContractFees] = useState<number>(0); // Store course contract fees for partner scenario
  const [courseVenueFee, setCourseVenueFee] = useState<number>(0); // Store course venue fee for trainer scenario
  const [courseVenueMaxParticipants, setCourseVenueMaxParticipants] = useState<number | null>(null); // Max participants from course
  const [coursePerHeadIfMaxExceed, setCoursePerHeadIfMaxExceed] = useState<number | null>(null); // Per head fee if max exceeded

  // Withdrawal Dialog State
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [withdrawalReason, setWithdrawalReason] = useState("");
  const [withdrawalDocument, setWithdrawalDocument] = useState<File | null>(null);
  const [withdrawalSubmitting, setWithdrawalSubmitting] = useState(false);
  const [selectedLearnerForWithdrawal, setSelectedLearnerForWithdrawal] = useState<any>(null);
  const [courseTrainersRemarks, setCourseTrainersRemarks] = useState<any[]>([]); // Store course trainer remarks

  // Participant Selection State for Bulk Actions
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
  const [exportingParticipants, setExportingParticipants] = useState(false);
  const [sendConfirmationEmailDialogOpen, setSendConfirmationEmailDialogOpen] = useState(false);

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === "string") {
          // Strip the data URL prefix if present
          const base64 = result.includes(",") ? result.split(",")[1] : result;
          resolve(base64);
        } else {
          reject(new Error("Failed to process supporting document"));
        }
      };
      reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

  const currency = (v: number | null | undefined) => {
    if (v === null || v === undefined || isNaN(Number(v))) return "$0.00";
    return new Intl.NumberFormat("en-SG", { style: "currency", currency: "SGD", minimumFractionDigits: 2 }).format(Number(v));
  };

  const safeNumber = (v: number | null | undefined, fallback = 0) => (v === null || v === undefined || isNaN(Number(v)) ? fallback : Number(v));

  const generateSerialNumber = (courseCode: string, startDate: string) => {
    if (!courseCode || !startDate) return "";
    const date = new Date(startDate);
    if (isNaN(date.getTime())) return "";
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${courseCode}${day}${month}${year}`;
  };

  // Check if course has started (on or after start date)
  // Withdrawal should be disabled from the course start date onwards
  const isCourseStarted = (): boolean => {
    if (!courseRun?.startDatetime) return false;
    const courseStartDate = new Date(courseRun.startDatetime);
    const today = new Date();
    // Reset to midnight for date-only comparison (ignore time)
    today.setHours(0, 0, 0, 0);
    courseStartDate.setHours(0, 0, 0, 0);
    return today >= courseStartDate;
  };

  const initEditData = useCallback((cr: CourseRunDetailData) => {
    const start = cr.startDatetime ? new Date(cr.startDatetime) : null;
    const end = cr.endDatetime ? new Date(cr.endDatetime) : null;
    // prefer courseRun-level overrides, then venue defaults
    const venueMax = cr.venueMaxParticipant ?? cr.venue?.maxParticipants ?? "";
    const perHeadFromCr = cr.perHeadFeeIfMaxExceed ?? cr.venuePerHeadIfExceed ?? cr.venue?.perHeadPriceIfMaxExceed ?? "";

    setEditData({
      serialNumber: cr.serialNumber || "",
      courseRunType: cr.courseRunType || "",
      courseId: cr.course?.id || "",
      courseCode: cr.course?.courseCode || "",
      clientOrganizationId: (cr as any).clientOrganizationId || "",
      startDate: start ? `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}` : "",
      startTime: start ? `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}` : "",
      endDate: end ? `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}` : "",
      endTime: end ? `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}` : "",
      venueType: cr.venueType || "",
      venueId: cr.venue?.id || "",
      specifiedLocation: cr.specifiedLocation || "",
      minClassSize: cr.minClassSize ?? "",
      maxClassSize: cr.maxClassSize ?? "",
      individualRegistrationRequired: !!cr.individualRegistrationRequired,
      remarks: cr.remarks || "",
      baseCourseFee: cr.baseCourseFee ?? "",
      contractFees: cr.contractFees ?? "",
      additionalCostExceedingCapacity: cr.additionalCostExceedingCapacity ?? "",
      venueFee: cr.venueFee ?? cr.venue?.fee ?? "",
      venueMaxParticipant: venueMax,
      perHeadFeeIfMaxExceed: perHeadFromCr,
      venuePerHeadIfExceed: perHeadFromCr,
      otherFee: cr.otherFee ?? "",
      adminFee: cr.adminFee ?? "",
      contingencyFee: cr.contingencyFee ?? "",
      feeType: cr.feeType || "",
      courseRunFeeType: cr.courseRunFeeType || cr.feeType || "",
    });
  }, []);

  useEffect(() => {
    if (id) {
      loadCourseRunDetail();
    }
    // Load organizations
    const loadOrganizations = async () => {
      try {
        const response = await organizationsApi.list();
        if (response.success && response.organizations) {
          setOrganizations(response.organizations || []);
        }
      } catch (error) {
        console.error("Error loading organizations:", error);
      }
    };
    loadOrganizations();
  }, [id]);

  // Load trainers and partners automatically when course run is loaded
  useEffect(() => {
    if (courseRun && courseRun.course?.id) {
      loadTrainersAndPartners();
    }
  }, [courseRun?.id]);

  const loadCourseRunDetail = async () => {
    try {
      setLoading(true);
      const response = await courseRunsApi.getById(id!);

      if (response.success) {
        setCourseRun(response.courseRun);
        initEditData(response.courseRun);

        // Fetch course trainer remarks from course_trainers table
        if (response.courseRun?.course?.id) {
          try {
            const courseResponse = await coursesApi.getById(response.courseRun.course.id);
            if (courseResponse?.data?.course?.courseTrainers) {
              setCourseTrainersRemarks(courseResponse.data.course.courseTrainers);
            }
          } catch (err) {
            console.warn("Error fetching course trainer remarks:", err);
          }
        }
      } else {
        toast.error("Failed to load course run details");
        navigate("/course-runs");
      }
    } catch (error) {
      console.error("Error loading course run:", error);
      toast.error("Failed to load course run details");
      navigate("/course-runs");
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollmentSuccess = () => {
    // Refresh the course run data to show newly enrolled participants
    loadCourseRunDetail();
    setAddLearnersDialogOpen(false);
    toast.success("Participants enrolled successfully!");
  };

  const handleImportSuccess = () => {
    loadCourseRunDetail();
  };

  // Learner Withdrawal & Confirmation Functions
  const handleResendConfirmation = async (learnerRecord: any) => {
    if (!courseRun || !id) return;

    try {
      const learnerIdentifier = learnerRecord?.learner?.id || learnerRecord?.learnerId || learnerRecord?.id;
      if (!learnerIdentifier) {
        toast.error("Unable to determine learner identifier for resend");
        return;
      }

      const response = await courseRunsApi.resendLearnerConfirmation(id, learnerIdentifier);
      toast.success(response?.message || "Confirmation email sent successfully");
      loadCourseRunDetail();
    } catch (error: any) {
      console.error("Error sending confirmation email:", error);
      toast.error(error?.message || "Failed to send confirmation email");
    }
  };

  const handleWithdrawLearner = async () => {
    if (!courseRun || !id || !selectedLearnerForWithdrawal) return;

    if (!withdrawalReason) {
      toast.error("Please select a withdrawal reason");
      return;
    }

    try {
      setWithdrawalSubmitting(true);

      let supportingDocumentPayload:
        | {
            filename: string;
            mimetype?: string;
            size?: number;
            base64?: string;
          }
        | undefined;

      if (withdrawalDocument) {
        try {
          const base64 = await fileToBase64(withdrawalDocument);
          supportingDocumentPayload = {
            filename: withdrawalDocument.name,
            mimetype: withdrawalDocument.type,
            size: withdrawalDocument.size,
            base64,
          };
        } catch (fileError) {
          console.error("Failed to process supporting document:", fileError);
          toast.error("Failed to process supporting document. Please try another file.");
          setWithdrawalSubmitting(false);
          return;
        }
      }

      const learnerIdentifier = selectedLearnerForWithdrawal?.learner?.id || selectedLearnerForWithdrawal?.learnerId || selectedLearnerForWithdrawal?.id;

      if (!learnerIdentifier) {
        toast.error("Unable to determine learner identifier for withdrawal");
        return;
      }

      const response = await courseRunsApi.withdrawLearner(id, learnerIdentifier, {
        reason: withdrawalReason,
        ...(supportingDocumentPayload ? { supportingDocument: supportingDocumentPayload } : {}),
      });

      toast.success(response?.message || "Participant marked as withdrawn successfully");
      setWithdrawalDialogOpen(false);
      setWithdrawalReason("");
      setWithdrawalDocument(null);
      setSelectedLearnerForWithdrawal(null);
      loadCourseRunDetail();
    } catch (error: any) {
      console.error("Error withdrawing learner:", error);
      toast.error(error?.message || "Failed to withdraw learner");
    } finally {
      setWithdrawalSubmitting(false);
    }
  };

  // Handle participant selection (checkbox toggle)
  const handleParticipantToggle = (participantId: string) => {
    setSelectedParticipants((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(participantId)) {
        newSet.delete(participantId);
      } else {
        newSet.add(participantId);
      }
      return newSet;
    });
  };

  // Handle select all participants
  const handleSelectAllParticipants = (checked: boolean) => {
    if (checked && courseRun?.courseRunLearners) {
      const activeParticipants = courseRun.courseRunLearners.filter((l) => l.enrollmentStatus !== "WITHDRAWN").map((l) => l.id);
      setSelectedParticipants(new Set(activeParticipants));
    } else {
      setSelectedParticipants(new Set());
    }
  };

  // Bulk action handlers
  const handleBulkSendConfirmationEmail = () => {
    if (selectedParticipants.size === 0 || !courseRun || !id) return;
    setSendConfirmationEmailDialogOpen(true);
  };

  const handleBulkChangeStatus = async () => {
    if (selectedParticipants.size === 0 || !courseRun || !id) return;

    const confirmed = window.confirm(`Mark ${selectedParticipants.size} learner${selectedParticipants.size !== 1 ? "s" : ""} as withdrawn?`);
    if (!confirmed) return;

    // For bulk status change, we'll mark all as withdrawn
    let successCount = 0;
    let failureCount = 0;

    for (const learnerId of selectedParticipants) {
      try {
        const learnerRecord = courseRun.courseRunLearners?.find((l) => l.id === learnerId);
        if (learnerRecord) {
          await courseRunsApi.withdrawLearner(id, learnerRecord.learner.id, {
            reason: "Bulk withdrawal",
          });
          successCount++;
        }
      } catch (error) {
        console.error(`Error changing status for learner ${learnerId}:`, error);
        failureCount++;
      }
    }

    toast.success(`Status updated: ${successCount} participants withdrawn${failureCount > 0 ? `, ${failureCount} failed` : ""}`);
    setSelectedParticipants(new Set());
    loadCourseRunDetail();
  };

  const handleBulkDeleteLearners = async () => {
    if (selectedParticipants.size === 0 || !courseRun || !id) return;

    const confirmed = window.confirm(
      `Delete ${selectedParticipants.size} participant${selectedParticipants.size !== 1 ? "s" : ""} from this course? This action cannot be undone.`,
    );
    if (!confirmed) return;

    let successCount = 0;
    let failureCount = 0;

    for (const learnerId of selectedParticipants) {
      try {
        const learnerRecord = courseRun.courseRunLearners?.find((l) => l.id === learnerId);
        if (learnerRecord) {
          await courseRunsApi.removeLearner(id, learnerRecord.learner.id);
          successCount++;
        }
      } catch (error) {
        console.error(`Error deleting participant ${learnerId}:`, error);
        failureCount++;
      }
    }

    toast.success(`Participants deleted: ${successCount} removed${failureCount > 0 ? `, ${failureCount} failed` : ""}`);
    setSelectedParticipants(new Set());
    loadCourseRunDetail();
  };

  // Handle remove participant from course run
  const handleRemoveLearner = async (learnerRecord: any) => {
    if (!courseRun || !id) return;

    const learnerIdentifier = learnerRecord?.learner?.id || learnerRecord?.learnerId || learnerRecord?.id;
    const learnerName = learnerRecord?.learner?.fullname || learnerRecord?.fullname || "this participant";

    if (!learnerIdentifier) {
      toast.error("Unable to determine participant identifier for removal");
      return;
    }

    // Simple confirmation using window.confirm
    const confirmed = window.confirm(`Are you sure you want to remove ${learnerName} from this course run? This action cannot be undone.`);

    if (!confirmed) return;

    try {
      const response = await courseRunsApi.removeLearner(id, learnerIdentifier);
      toast.success(response?.message || "Participant removed successfully");
      loadCourseRunDetail();
    } catch (error: any) {
      console.error("Error removing participant:", error);
      toast.error(error?.message || "Failed to remove participant");
    }
  };

  // Detect if trainer/partner assignments have changed
  const hasTrainerChanges = useMemo(() => {
    const currentState = JSON.stringify(trainerAssignments);
    const initialState = JSON.stringify(initialTrainerAssignments);
    const currentPartnerState = JSON.stringify(partnerAssignments);
    const initialPartnerState = JSON.stringify(initialPartnerAssignments);
    return currentState !== initialState || currentPartnerState !== initialPartnerState;
  }, [trainerAssignments, initialTrainerAssignments, partnerAssignments, initialPartnerAssignments]);

  type AttendanceDayRecord = {
    day: number;
    attendAM: boolean;
    attendPM: boolean;
  };

  type AttendanceLearnerRecord = {
    courseRunLearnerId: string;
    learnerId: string;
    fullName: string;
    email: string | null;
    contactNumber: string | null;
    departmentName: string | null;
    attendance: AttendanceDayRecord[];
  };

  type AttendanceSnapshot = {
    courseRunId: string;
    totalDays: number;
    days: Array<{ day: number; label: string }>;
    learners: AttendanceLearnerRecord[];
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined || Number.isNaN(value)) return "";
    return new Intl.NumberFormat("en-SG", { style: "currency", currency: "SGD", minimumFractionDigits: 2 }).format(Number(value));
  };

  const handleExportParticipantList = async () => {
    if (!courseRun) return;

    const toastId = toast.loading("Preparing participant list...");
    setExportingParticipants(true);

    try {
      // Create ExcelJS workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Participants");

      // Define all columns
      const participantHeaders = [
        "No",
        "Name",
        "Department",
        "Designation",
        "SPF Email Address",
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

      const enrolledLearners = (courseRun.courseRunLearners || []).filter((learnerRecord) => learnerRecord.enrollmentStatus === "ENROLLED");
      const withdrawnLearners = (courseRun.courseRunLearners || []).filter((learnerRecord) => learnerRecord.enrollmentStatus === "WITHDRAWN");

      let currentRow = 1;

      // Header section rows (metadata) - similar to attendance export
      const headerMetadata = [
        courseRun.course?.title || "Course",
        `Course Code: ${courseRun.course?.courseCode || "N/A"}`,
        `Duration: ${courseRun.startDatetime ? new Date(courseRun.startDatetime).toLocaleDateString("en-SG") : "N/A"} - ${
          courseRun.endDatetime ? new Date(courseRun.endDatetime).toLocaleDateString("en-SG") : "N/A"
        }`,
        `Venue: ${courseRun.venue?.name || courseRun.specifiedLocation || "TBD"}`,
      ];

      headerMetadata.forEach((text) => {
        const row = worksheet.getRow(currentRow);
        row.getCell(1).value = text;
        worksheet.mergeCells(currentRow, 1, currentRow, Math.ceil(participantHeaders.length / 2));
        row.height = 22;

        for (let c = 1; c <= participantHeaders.length; c++) {
          const cell = row.getCell(c);
          cell.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
          cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: currentRow === 1 ? "FF1F4E78" : currentRow === 2 ? "FF2F5496" : currentRow === 3 ? "FF3D6EB3" : "FF4472C4" },
          };
          cell.border = {
            top: { style: "thin", color: { argb: "FF1F4E78" } },
            bottom: { style: "thin", color: { argb: "FF1F4E78" } },
            left: { style: "thin", color: { argb: "FF1F4E78" } },
            right: { style: "thin", color: { argb: "FF1F4E78" } },
          };
        }
        currentRow++;
      });

      currentRow++; // Blank row

      // Add header row
      participantHeaders.forEach((header, idx) => {
        const cell = worksheet.getCell(currentRow, idx + 1);
        cell.value = header;
      });

      // Style header row
      const headerRow = worksheet.getRow(currentRow);
      headerRow.height = 22;
      for (let c = 1; c <= participantHeaders.length; c++) {
        const cell = worksheet.getCell(currentRow, c);
        cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4472C4" }, // Professional blue
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FF2E5090" } },
          bottom: { style: "thin", color: { argb: "FF2E5090" } },
          left: { style: "thin", color: { argb: "FF2E5090" } },
          right: { style: "thin", color: { argb: "FF2E5090" } },
        };
      }

      // Add enrolled participants
      currentRow++;
      enrolledLearners.forEach((learnerRecord, idx) => {
        const learner = learnerRecord.learner;
        const paymentModeLabel = getPaymentModeLabel(learnerRecord.paymentMode);
        const feeValue = formatCurrency(courseRun.baseCourseFee ?? courseRun.contractFees ?? null);

        const row = worksheet.getRow(currentRow);
        const bgColor = idx % 2 === 0 ? "FFE7EFF7" : "FFFFFFFF"; // Alternating blue and white

        row.getCell(1).value = idx + 1;
        row.getCell(2).value = learner.fullname || "";
        row.getCell(3).value = "";
        row.getCell(4).value = learner.designation || "";
        row.getCell(5).value = learner.email || "";
        row.getCell(6).value = learner.contactNumber || "";
        row.getCell(7).value = "";
        row.getCell(8).value = paymentModeLabel || "";
        row.getCell(9).value = feeValue || "";
        row.getCell(10).value = "";
        row.getCell(11).value = "";
        row.getCell(12).value = "";
        row.getCell(13).value = "";
        row.getCell(14).value = courseRun.clientOrganization?.buNumber || "";
        row.getCell(15).value = learnerRecord.trainingCoordinator?.name || "";
        row.getCell(16).value = learnerRecord.trainingCoordinator?.email || "";
        row.getCell(17).value = learnerRecord.trainingCoordinator?.contactNumber || "";
        row.getCell(18).value = "";

        // Style enrolled row
        row.height = 18;
        for (let c = 1; c <= participantHeaders.length; c++) {
          const cell = row.getCell(c);
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: bgColor },
          };
          cell.border = {
            top: { style: "thin", color: { argb: "FF7FA3D0" } },
            bottom: { style: "thin", color: { argb: "FF7FA3D0" } },
            left: { style: "thin", color: { argb: "FF7FA3D0" } },
            right: { style: "thin", color: { argb: "FF7FA3D0" } },
          };
          cell.font = { size: 10, color: { argb: "FF000000" } };
          cell.alignment = { horizontal: c === 1 ? "center" : "left", vertical: "middle", wrapText: true };
        }

        currentRow++;
      });

      // Add total row
      const totalRow = worksheet.getRow(currentRow);
      totalRow.height = 20;

      // Calculate total fees from all enrolled learners
      const totalFees = enrolledLearners.reduce((sum) => {
        const feeAmount = courseRun.baseCourseFee ?? courseRun.contractFees ?? 0;
        return sum + (typeof feeAmount === "number" ? feeAmount : 0);
      }, 0);
      const totalFeesFormatted = formatCurrency(totalFees);

      totalRow.getCell(1).value = "";
      totalRow.getCell(2).value = "Total";
      totalRow.getCell(3).value = enrolledLearners.length;
      totalRow.getCell(9).value = totalFeesFormatted; // Column 9 is "Fees before GST"

      for (let c = 1; c <= participantHeaders.length; c++) {
        const cell = totalRow.getCell(c);
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD9E2F3" }, // Darker blue
        };
        cell.border = {
          top: { style: "medium", color: { argb: "FF4472C4" } },
          bottom: { style: "medium", color: { argb: "FF4472C4" } },
          left: { style: "thin", color: { argb: "FF4472C4" } },
          right: { style: "thin", color: { argb: "FF4472C4" } },
        };
        cell.font = { bold: true, size: 11, color: { argb: "FF1F4E78" } };
        cell.alignment = { horizontal: "left", vertical: "middle" };
      }

      currentRow += 2;

      // Add withdrawn section if exists
      if (withdrawnLearners.length > 0) {
        // Withdrawn title row
        const withdrawnTitleRow = worksheet.getRow(currentRow);
        withdrawnTitleRow.height = 25;
        withdrawnTitleRow.getCell(1).value = "WITHDRAWN";
        worksheet.mergeCells(currentRow, 1, currentRow, participantHeaders.length);

        for (let c = 1; c <= participantHeaders.length; c++) {
          const cell = withdrawnTitleRow.getCell(c);
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFC000" }, // Bright yellow
          };
          cell.border = {
            top: { style: "medium", color: { argb: "FFFF9800" } },
            bottom: { style: "medium", color: { argb: "FFFF9800" } },
            left: { style: "medium", color: { argb: "FFFF9800" } },
            right: { style: "medium", color: { argb: "FFFF9800" } },
          };
          cell.font = { bold: true, size: 13, color: { argb: "FF000000" } };
          cell.alignment = { horizontal: "center", vertical: "middle" };
        }

        currentRow++;
        currentRow++;

        // Withdrawn header row
        const withdrawnHeaderRow = worksheet.getRow(currentRow);
        withdrawnHeaderRow.height = 22;
        participantHeaders.forEach((header, idx) => {
          const cell = withdrawnHeaderRow.getCell(idx + 1);
          cell.value = header;
        });

        for (let c = 1; c <= participantHeaders.length; c++) {
          const cell = withdrawnHeaderRow.getCell(c);
          cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF4472C4" }, // Professional blue
          };
          cell.border = {
            top: { style: "thin", color: { argb: "FF2E5090" } },
            bottom: { style: "thin", color: { argb: "FF2E5090" } },
            left: { style: "thin", color: { argb: "FF2E5090" } },
            right: { style: "thin", color: { argb: "FF2E5090" } },
          };
        }

        currentRow++;

        // Withdrawn data rows
        withdrawnLearners.forEach((learnerRecord, idx) => {
          const learner = learnerRecord.learner;
          const paymentModeLabel = getPaymentModeLabel(learnerRecord.paymentMode);
          const feeValue = formatCurrency(courseRun.baseCourseFee ?? courseRun.contractFees ?? null);

          const row = worksheet.getRow(currentRow);
          const bgColor = idx % 2 === 0 ? "FFFEF5E7" : "FFFFFFFF"; // Alternating orange/yellow and white

          row.getCell(1).value = idx + 1;
          row.getCell(2).value = learner.fullname || "";
          row.getCell(3).value = "";
          row.getCell(4).value = learner.designation || "";
          row.getCell(5).value = learner.email || "";
          row.getCell(6).value = learner.contactNumber || "";
          row.getCell(7).value = "";
          row.getCell(8).value = paymentModeLabel || "";
          row.getCell(9).value = feeValue || "";
          row.getCell(10).value = "";
          row.getCell(11).value = "";
          row.getCell(12).value = "";
          row.getCell(13).value = "";
          row.getCell(14).value = courseRun.clientOrganization?.buNumber || "";
          row.getCell(15).value = learnerRecord.trainingCoordinator?.name || "";
          row.getCell(16).value = learnerRecord.trainingCoordinator?.email || "";
          row.getCell(17).value = learnerRecord.trainingCoordinator?.contactNumber || "";
          row.getCell(18).value = "";

          // Style withdrawn row
          row.height = 18;
          for (let c = 1; c <= participantHeaders.length; c++) {
            const cell = row.getCell(c);
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: bgColor },
            };
            cell.border = {
              top: { style: "thin", color: { argb: "FFF0B455" } },
              bottom: { style: "thin", color: { argb: "FFF0B455" } },
              left: { style: "thin", color: { argb: "FFF0B455" } },
              right: { style: "thin", color: { argb: "FFF0B455" } },
            };
            cell.font = { size: 10, color: { argb: "FF000000" } };
            cell.alignment = { horizontal: c === 1 ? "center" : "left", vertical: "middle", wrapText: true };
          }

          currentRow++;
        });
      }

      // Set auto-fit column widths based on content
      // Calculate widths that accommodate both headers and typical data
      const columnDefinitions = [
        { header: "No", minWidth: 6 },
        { header: "Name", minWidth: 25 },
        { header: "Department", minWidth: 20 },
        { header: "Designation", minWidth: 22 },
        { header: "SPF Email Address", minWidth: 32 },
        { header: "Contact Number", minWidth: 18 },
        { header: "Retiring Officer?", minWidth: 16 },
        { header: "Payment Mode", minWidth: 20 },
        { header: "Fees before GST", minWidth: 18 },
        { header: "Fees Remarks", minWidth: 18 },
        { header: "PO No. / Payment Advice", minWidth: 26 },
        { header: "Invoice No.", minWidth: 18 },
        { header: "Receipt No.", minWidth: 18 },
        { header: "Business Unit Number", minWidth: 22 },
        { header: "Training Officer's Name", minWidth: 24 },
        { header: "Training Officer's Email", minWidth: 32 },
        { header: "Training Officer's Phone", minWidth: 36 },
        { header: "Remarks", minWidth: 28 },
      ];

      // Apply auto-fit widths to worksheet
      worksheet.columns = columnDefinitions.map((col) => ({
        width: col.minWidth,
        style: {
          alignment: { wrapText: true, vertical: "middle", horizontal: "left" },
        },
      }));

      // Generate file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `participant-list-${courseRun.serialNumber || courseRun.id}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      toast.dismiss(toastId);
      toast.success(
        `Exported ${enrolledLearners.length} participant${enrolledLearners.length === 1 ? "" : "s"}${
          withdrawnLearners.length > 0 ? ` and ${withdrawnLearners.length} withdrawn` : ""
        }`,
      );
    } catch (error: any) {
      console.error("Export participant list error", error);
      toast.dismiss(toastId);
      toast.error(error?.message || "Failed to export participant list");
    } finally {
      setExportingParticipants(false);
    }
  };

  // Trainer Assignment Functions - Load trainers automatically
  const loadTrainersAndPartners = async () => {
    if (!courseRun) return;

    try {
      // Fetch available trainers and partners from the course
      const courseResponse = await coursesApi.getById(courseRun.course?.id || "");
      const course = courseResponse?.data?.course || courseResponse?.data || courseResponse;

      // Store course contract fees for partner scenario
      if (course && course.contractFees !== undefined) {
        setCourseContractFees(Number(course.contractFees) || 0);
      }

      // Store course venue fee for trainer scenario
      if (course && course.venueFee !== undefined) {
        setCourseVenueFee(Number(course.venueFee) || 0);
      }

      // Store course venue capacity and per head fee for exceeding capacity
      if (course && course.venueMaxParticipants !== undefined) {
        setCourseVenueMaxParticipants(Number(course.venueMaxParticipants) || null);
      }
      if (course && course.perHeadPriceIfMaxExceed !== undefined) {
        setCoursePerHeadIfMaxExceed(Number(course.perHeadPriceIfMaxExceed) || null);
      }

      console.log("Course data loaded:", {
        contractFees: course.contractFees,
        venueFee: course.venueFee,
        venueMaxParticipants: course.venueMaxParticipants,
        perHeadPriceIfMaxExceed: course.perHeadPriceIfMaxExceed,
      });

      // Store course trainers with their default fees
      const courseTrainersMap: { [trainerId: string]: { feePerRun: number } } = {};
      if (course && Array.isArray(course.courseTrainers)) {
        course.courseTrainers.forEach((ct: any) => {
          if (ct.trainer) {
            courseTrainersMap[ct.trainer.id] = { feePerRun: ct.feePerRun || 0 };
          }
        });
        setAvailableTrainers(course.courseTrainers.map((ct: any) => ct.trainer));
      }

      if (course && Array.isArray(course.coursePartners)) {
        setAvailablePartners(course.coursePartners.map((cp: any) => cp.partner));
      }

      // Initialize trainer assignments from current courseRunTrainers
      const assignments: { [key: string]: { selected: boolean; baseFee?: number | null; additionalCost?: number | null; additionalCostUnit?: string } } = {};
      courseRun.courseRunTrainers?.forEach((crt) => {
        assignments[crt.trainer.id] = {
          selected: true,
          baseFee: crt.trainerBaseAmount === null || crt.trainerBaseAmount === undefined ? null : Number(crt.trainerBaseAmount),
          additionalCost: crt.additionalCost === null || crt.additionalCost === undefined ? null : Number(crt.additionalCost),
          additionalCostUnit: crt.additionalCostUnit || "PER_CLASS",
        };
      });

      // For trainers not yet in courseRunTrainers, pre-fill with course default fee
      if (course && Array.isArray(course.courseTrainers)) {
        course.courseTrainers.forEach((ct: any) => {
          if (ct.trainer && !assignments[ct.trainer.id]) {
            assignments[ct.trainer.id] = {
              selected: false,
              baseFee: ct.feePerRun || 0,
              additionalCost: null,
              additionalCostUnit: "PER_CLASS",
            };
          }
        });
      }

      // Initialize partner assignments from current courseRunPartners
      const partnerAssigns: { [key: string]: { selected: boolean; selectedTrainerIds?: string[] } } = {};
      if (courseRun.courseRunPartners) {
        courseRun.courseRunPartners.forEach((crp: any) => {
          partnerAssigns[crp.partner.id] = {
            selected: true,
            selectedTrainerIds: Array.isArray(crp.selectedTrainerIds) ? crp.selectedTrainerIds : [],
          };
        });
      }

      setTrainerAssignments(assignments);
      setInitialTrainerAssignments(JSON.parse(JSON.stringify(assignments))); // Deep copy for comparison
      setPartnerAssignments(partnerAssigns);
      setInitialPartnerAssignments(JSON.parse(JSON.stringify(partnerAssigns))); // Deep copy for comparison
    } catch (error) {
      console.error("Error loading trainers and partners:", error);
      toast.error("Failed to load trainers and partners");
    }
  };

  const handleSaveTrainerAssignments = async () => {
    if (!courseRun) return;

    try {
      // Prepare trainer assignments data
      const selectedTrainers = Object.entries(trainerAssignments)
        .filter(([_, data]) => data.selected)
        .map(([trainerId, data]) => ({
          trainerId,
          trainerBaseAmount: data.baseFee === null || data.baseFee === undefined ? null : Number(data.baseFee),
          additionalCost: data.additionalCost === null || data.additionalCost === undefined ? null : Number(data.additionalCost),
          additionalCostUnit: data.additionalCostUnit || "PER_CLASS",
        }));

      // Prepare partner assignments data
      const selectedPartners = Object.entries(partnerAssignments)
        .filter(([_, data]) => data.selected)
        .map(([partnerId, data]) => ({
          partnerId,
          selectedTrainerIds: Array.isArray(data.selectedTrainerIds) ? data.selectedTrainerIds : [],
        }));

      // Determine contract fees based on selected scenario:
      // - If partners are selected: use course contract fees (includes trainer + venue)
      // - If only trainers selected: use calculated trainer fees
      const hasSelectedPartners = selectedPartners.length > 0;
      const contractFeesToUse = hasSelectedPartners ? courseContractFees : calculateDynamicContractFees();

      // Calculate additional cost exceeding capacity
      const enrolledCount = courseRun.courseRunLearners?.filter((l) => l.enrollmentStatus === "ENROLLED").length || 0;
      let additionalCostExceedingCapacity = 0;

      console.log("Capacity calculation:", {
        enrolledCount,
        courseVenueMaxParticipants,
        coursePerHeadIfMaxExceed,
      });

      if (courseVenueMaxParticipants && coursePerHeadIfMaxExceed && enrolledCount > courseVenueMaxParticipants) {
        const exceededCount = enrolledCount - courseVenueMaxParticipants;
        additionalCostExceedingCapacity = exceededCount * coursePerHeadIfMaxExceed;
        console.log("Capacity exceeded:", {
          exceededCount,
          additionalCostExceedingCapacity,
        });
      }

      // Call API to update trainer assignments
      await courseRunsApi.updateTrainerAssignments(courseRun.id, selectedTrainers);

      // Call API to update partner assignments
      await courseRunsApi.updatePartnerAssignments(courseRun.id, selectedPartners);

      // Prepare fee updates based on scenario
      const feeUpdates: any = {
        contractFees: contractFeesToUse,
        additionalCostExceedingCapacity: additionalCostExceedingCapacity,
      };

      // Venue fee logic:
      // - If partners selected: set to 0 (included in contract fees)
      // - If trainers selected: restore from course data
      if (hasSelectedPartners) {
        feeUpdates.venueFee = 0;
      } else {
        // Restore venue fee from course for trainer scenario
        feeUpdates.venueFee = courseVenueFee;
      }

      // Always sync capacity fields from course data (unless locked status)
      const isLockedStatus = courseRun.status && ["CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "INCOMPLETED"].includes(courseRun.status);
      if (!isLockedStatus) {
        if (courseVenueMaxParticipants !== null) {
          feeUpdates.venueMaxParticipant = courseVenueMaxParticipants;
        }
        if (coursePerHeadIfMaxExceed !== null) {
          feeUpdates.perHeadFeeIfMaxExceed = coursePerHeadIfMaxExceed;
        }
      }

      console.log("Fee updates to be saved:", feeUpdates);

      // Update all fees in one call
      await courseRunsApi.update(courseRun.id, feeUpdates);

      const feeMessage = hasSelectedPartners
        ? "(Venue fee set to $0 - included in contract fees)"
        : courseVenueFee > 0
          ? `(Venue fee restored to $${courseVenueFee})`
          : "";
      toast.success(`Assignments and fees updated successfully! ${feeMessage}`);

      // Reset initial state to current state after successful save
      setInitialTrainerAssignments(JSON.parse(JSON.stringify(trainerAssignments)));
      setInitialPartnerAssignments(JSON.parse(JSON.stringify(partnerAssignments)));

      loadCourseRunDetail();
    } catch (error: any) {
      console.error("Error saving assignments:", error);
      console.error("Error details:", {
        data: error?.data,
        message: error?.message,
        status: error?.status,
      });

      // The error.data contains the response body with error, conflicts, etc.
      if (error?.data?.error || error?.data?.conflicts) {
        let errorMessage = error.data.error || "Failed to update assignments";

        // Add conflict details if available
        if (error.data.conflicts && Array.isArray(error.data.conflicts) && error.data.conflicts.length > 0) {
          const conflictDetails = error.data.conflicts
            .flatMap((conflict: any) => {
              // Each conflict can have multiple trainers that conflict
              if (conflict.trainers && Array.isArray(conflict.trainers)) {
                return conflict.trainers.map((trainer: any) => {
                  const trainerName = trainer.name || "Unknown Trainer";
                  const courseRunInfo = conflict.serialNumber || "Unknown Course Run";
                  return `• ${trainerName} - ${courseRunInfo}`;
                });
              }
              return [];
            })
            .join("\n");
          errorMessage = `${errorMessage}\n\n${conflictDetails}`;
        }

        toast.error(errorMessage);
      }
      // Handle error.message (from Error object)
      else if (error?.message) {
        toast.error(error.message);
      }
      // Default fallback
      else {
        toast.error("Failed to update assignments");
      }
    }
  };

  const handleCancelTrainerEdit = () => {
    // Reset to initial state
    setTrainerAssignments(JSON.parse(JSON.stringify(initialTrainerAssignments)));
    setPartnerAssignments(JSON.parse(JSON.stringify(initialPartnerAssignments)));
  };

  const toggleTrainerSelection = (trainerId: string) => {
    setTrainerAssignments((prev) => ({
      ...prev,
      [trainerId]: {
        selected: !prev[trainerId]?.selected,
        baseFee: prev[trainerId]?.baseFee === undefined ? null : (prev[trainerId]?.baseFee ?? null),
        additionalCost: prev[trainerId]?.additionalCost === undefined ? null : (prev[trainerId]?.additionalCost ?? null),
        additionalCostUnit: prev[trainerId]?.additionalCostUnit || "PER_CLASS",
      },
    }));
  };

  const togglePartnerSelection = (partnerId: string) => {
    setPartnerAssignments((prev) => {
      const current = prev[partnerId] || { selected: false };
      const newSelected = !current.selected;

      return {
        ...prev,
        [partnerId]: {
          selected: newSelected,
          // Reset selectedTrainerIds when unselecting partner
          selectedTrainerIds: newSelected ? current.selectedTrainerIds || [] : [],
        },
      };
    });
  };

  const togglePartnerTrainerSelection = (partnerId: string, trainerId: string) => {
    setPartnerAssignments((prev) => {
      const current = prev[partnerId] || { selected: false, selectedTrainerIds: [] };
      const currentTrainerIds = current.selectedTrainerIds || [];
      const isSelected = currentTrainerIds.includes(trainerId);

      return {
        ...prev,
        [partnerId]: {
          ...current,
          selectedTrainerIds: isSelected ? currentTrainerIds.filter((id) => id !== trainerId) : [...currentTrainerIds, trainerId],
        },
      };
    });
  };

  const updateTrainerFee = (trainerId: string, field: "baseFee" | "additionalCost" | "additionalCostUnit", value: number | null | string) => {
    setTrainerAssignments((prev) => ({
      ...prev,
      [trainerId]: {
        ...(prev[trainerId] || { selected: false, baseFee: null, additionalCost: null, additionalCostUnit: "PER_CLASS" }),
        [field]: field === "additionalCostUnit" ? value : value === null || value === undefined ? null : Number(value),
      },
    }));
  };

  const calculateTotalTrainerFees = () => {
    return Object.entries(trainerAssignments)
      .filter(([_, data]) => data.selected)
      .reduce((sum, [_, data]) => sum + safeNumber(data.baseFee, 0) + safeNumber(data.additionalCost, 0), 0);
  };

  // Calculate dynamic contract fees based on PER_PAX trainer costs
  const calculateDynamicContractFees = () => {
    const participantCount = courseRun?.courseRunLearners?.filter((l) => l.enrollmentStatus !== "WITHDRAWN").length || 0;

    const totalFees = Object.entries(trainerAssignments)
      .filter(([_, data]) => data.selected)
      .reduce((sum, [_, data]) => {
        const baseFee = safeNumber(data.baseFee, 0);
        const additionalCost = safeNumber(data.additionalCost, 0);
        const unit = data.additionalCostUnit || "PER_CLASS";

        // For PER_PAX, multiply additional cost by participant count
        const calculatedAdditional = unit === "PER_PAX" ? additionalCost * participantCount : additionalCost;

        return sum + baseFee + calculatedAdditional;
      }, 0);

    return totalFees;
  };

  // Calculate additional cost exceeding capacity in real-time
  const calculateAdditionalCostExceedingCapacity = () => {
    const enrolledCount = courseRun?.courseRunLearners?.filter((l) => l.enrollmentStatus === "ENROLLED").length || 0;

    if (courseVenueMaxParticipants && coursePerHeadIfMaxExceed && enrolledCount > courseVenueMaxParticipants) {
      const exceededCount = enrolledCount - courseVenueMaxParticipants;
      return exceededCount * coursePerHeadIfMaxExceed;
    }

    return 0;
  };

  const formatDateTimeOld = (dateTime: string | null) => {
    if (!dateTime) return "—";
    return formatDateTime(dateTime);
  };

  const getStatusBadge = (status: string | null) => {
    const statusConfig = {
      DRAFT: { variant: "secondary" as const, color: "text-gray-600" },
      PUBLISHED: { variant: "default" as const, color: "text-blue-600" },
      ONGOING: { variant: "default" as const, color: "text-green-600" },
      COMPLETED: { variant: "default" as const, color: "text-green-600" },
      CANCELLED: { variant: "destructive" as const, color: "text-red-600" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;
    return <Badge variant={config.variant}>{(status || "DRAFT").replace(/_/g, " ")}</Badge>;
  };

  const getEnrollmentStatusBadge = (status: string) => {
    const statusConfig = {
      ENROLLED: { variant: "default" as const, icon: CheckCircle },
      PENDING: { variant: "secondary" as const, icon: AlertCircle },
      CANCELLED: { variant: "destructive" as const, icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    const Icon = config.icon;

    return (
      <div className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        <Badge variant={config.variant}>{status}</Badge>
      </div>
    );
  };

  // Reverse mapping from enum values to display labels
  const getPaymentModeLabel = (paymentMode: string | null | undefined): string => {
    const modeMap: Record<string, string> = {
      SELF_SPONSORED: "Self-Payment",
      TRANSITION_DOLLARS: "Transition Dollar (TS)",
      ULTF: "Unit Local Training Fund (ULTF)",
      COMPANY_BILLING: "Company-Sponsored (Non-Home Team)",
      GOVERNMENT_FUNDING: "Polwel Training Subsidy",
      CREDIT_CARD: "Credit Card",
      BANK_TRANSFER: "Bank Transfer",
      NOT_APPLICABLE: "Not Applicable",
    };
    return modeMap[paymentMode as keyof typeof modeMap] || paymentMode || "-";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading course run details...</p>
        </div>
      </div>
    );
  }

  if (!courseRun) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Course run not found</p>
          <Button onClick={() => navigate("/course-runs")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Course Runs
          </Button>
        </div>
      </div>
    );
  }

  const handleToggleEdit = async () => {
    if (!courseRun) return;
    if (!isEditing) {
      // entering edit mode: load supporting data
      try {
        const [cRes, vRes] = await Promise.all([coursesApi.getAll({ limit: 1000 }), venuesApi.getAll()]);
        if (cRes.success) setCourses(cRes.courses || []);
        if (vRes.success) {
          setVenues(vRes.venues || []);
          // Prefilter for existing venueType
          if (courseRun.venueType) {
            const list = (vRes.venues || []).filter((v: any) => v.venueType?.toUpperCase() === courseRun.venueType?.toUpperCase());
            setFilteredVenues(list);
          }
        }
      } catch (e) {
        console.warn("Failed loading auxiliary data", e);
      }
      initEditData(courseRun);
      setIsEditing(true);
    } else {
      // cancel edit
      initEditData(courseRun);
      setIsEditing(false);
    }
  };

  const handleEditField = async (field: string, value: any) => {
    setEditData((prev: any) => {
      const updated = { ...prev, [field]: value };

      // If courseRunType changed to OPEN, clear clientOrganizationId
      if (field === "courseRunType" && value === "OPEN") {
        updated.clientOrganizationId = "";
      }

      // Auto update serialNumber when course or startDate changes
      if ((field === "courseId" || field === "startDate") && (updated.courseCode || updated.courseId)) {
        const theCourse = courses.find((c) => c.id === updated.courseId);
        if (theCourse) {
          updated.courseCode = theCourse.courseCode;
          updated.serialNumber = generateSerialNumber(theCourse.courseCode, updated.startDate);
        }
      }

      // Auto-select venue and venueType when course changes
      if (field === "courseId") {
        // Fetch full course details via AJAX to get all fee fields and venue info
        coursesApi
          .getById(value)
          .then((response) => {
            if (response?.success && response?.data?.course) {
              const course = response.data.course;
              console.log("Course details loaded for edit:", { courseId: course.id, venueField: course.venue });

              // Auto-fill all fee-related fields from course
              setEditData((prevData: any) => {
                const autoUpdated = { ...prevData };

                // course.venueId is a foreign key to the Venue model
                if (course.venueId) {
                  const courseVenueId = course.venueId; // This is the venue ID FK
                  const courseVenue = venues.find((v: any) => v.id === courseVenueId);

                  if (courseVenue) {
                    console.log("Found course venue for edit:", { venueId: courseVenue.id, venueType: courseVenue.venueType, venueName: courseVenue.name });

                    autoUpdated.venueType = courseVenue.venueType || "";
                    autoUpdated.venueId = courseVenueId;

                    // Filter venues by type
                    const list = venues.filter((v: any) => v.venueType?.toUpperCase() === courseVenue.venueType?.toUpperCase());
                    setFilteredVenues(list);
                    console.log("Filtered venues for type", courseVenue.venueType, ":", list.length, "venues");
                  } else {
                    console.warn("Venue ID from course not found in venues list:", courseVenueId);
                  }
                }

                // Auto-sync all fee fields from course
                if (course.defaultCourseFee !== undefined && course.defaultCourseFee !== null) {
                  autoUpdated.baseCourseFee = course.defaultCourseFee;
                }
                if (course.venueFee !== undefined && course.venueFee !== null) {
                  autoUpdated.venueFee = course.venueFee;
                }
                if (course.venueMaxParticipants !== undefined && course.venueMaxParticipants !== null) {
                  autoUpdated.venueMaxParticipant = course.venueMaxParticipants;
                  autoUpdated.maxClassSize = course.venueMaxParticipants;
                }
                if (course.maxParticipants !== undefined && course.maxParticipants !== null && !autoUpdated.maxClassSize) {
                  autoUpdated.maxClassSize = course.maxParticipants;
                }
                if (course.minParticipants !== undefined && course.minParticipants !== null) {
                  autoUpdated.minClassSize = course.minParticipants;
                }
                if (course.perHeadPriceIfMaxExceed !== undefined && course.perHeadPriceIfMaxExceed !== null) {
                  autoUpdated.perHeadFeeIfMaxExceed = course.perHeadPriceIfMaxExceed;
                  autoUpdated.venuePerHeadIfExceed = course.perHeadPriceIfMaxExceed;
                }

                console.log("Setting edit data with venue:", { venueType: autoUpdated.venueType, venueId: autoUpdated.venueId });
                return autoUpdated;
              });
            }
          })
          .catch((error) => {
            console.error("Error fetching course details:", error);
          });
      }

      if (field === "venueType") {
        const list = venues.filter((v: any) => v.venueType?.toUpperCase() === value.toUpperCase());
        setFilteredVenues(list);
        updated.venueId = ""; // reset
      }
      if (field === "venueId") {
        const venue = filteredVenues.find((v: any) => v.id === value);
        if (venue) {
          // Auto-fill venue-related fields from selected venue
          if (venue.feeType) {
            const raw = String(venue.feeType).toUpperCase();
            if (raw === "PER_HEAD" || raw === "PER_VENUE") {
              updated.feeType = raw;
            } else {
              // backend might send lowercase
              if (raw === "PER_HEAD".toLowerCase()) updated.feeType = "PER_HEAD";
              if (raw === "PER_VENUE".toLowerCase()) updated.feeType = "PER_VENUE";
            }
          }
          // Auto-fill venue fee
          if (venue.fee !== undefined && venue.fee !== null) {
            updated.venueFee = venue.fee;
          }
          // Auto-fill max participants and per-head exceed fee
          if (venue.maxParticipants !== undefined && venue.maxParticipants !== null) {
            updated.venueMaxParticipant = venue.maxParticipants;
          }
          if (venue.perHeadPriceIfMaxExceed !== undefined && venue.perHeadPriceIfMaxExceed !== null) {
            // populate both variants to be safe for backend naming
            updated.perHeadFeeIfMaxExceed = venue.perHeadPriceIfMaxExceed;
            updated.venuePerHeadIfExceed = venue.perHeadPriceIfMaxExceed;
          }
        }
      }

      // If individualRegistrationRequired is changed to false and we're on learner-particulars tab, switch to course-info
      if (field === "individualRegistrationRequired" && value === false && activeTab === "learner-particulars") {
        setActiveTab("course-info");
      }

      return updated;
    });
  };

  const handleSave = async () => {
    if (!courseRun) return;
    setEditSubmitting(true);
    try {
      // Simple validation
      if (editData.minClassSize && editData.maxClassSize && Number(editData.minClassSize) > Number(editData.maxClassSize)) {
        toast.error("Min class size cannot exceed max class size");
        setEditSubmitting(false);
        return;
      }

      // Required fields list (excluding optional ones specified by user)
      const requiredFields: { key: string; label: string }[] = [
        { key: "serialNumber", label: "Course Run Code" },
        { key: "courseRunType", label: "Course Run Type" },
        { key: "courseId", label: "Course" },
        { key: "startDate", label: "Start Date" },
        { key: "startTime", label: "Start Time" },
        { key: "endDate", label: "End Date" },
        { key: "endTime", label: "End Time" },
        { key: "venueType", label: "Venue Type" },
        { key: "minClassSize", label: "Min Class Size" },
        { key: "baseCourseFee", label: "Course Fee" },
        { key: "feeType", label: "Fee Type" },
      ];

      // Require organiser for DEDICATED, TALKS, or CUSTOMIZED
      if (editData.courseRunType === "DEDICATED" || editData.courseRunType === "TALKS" || editData.courseRunType === "CUSTOMIZED") {
        requiredFields.push({ key: "clientOrganizationId", label: "Organiser" });
      }

      const missing = requiredFields.filter((f) => {
        const val = editData[f.key];
        return val === undefined || val === null || val === "";
      });
      if (missing.length > 0) {
        toast.error(`Missing required: ${missing.map((m) => m.label).join(", ")}`);
        setEditSubmitting(false);
        return;
      }

      // Additional validation: when fee type is PER_VENUE and venue max is provided, it must be >= 1
      if (editData.feeType === "PER_VENUE") {
        if (editData.venueMaxParticipant !== "") {
          const maxVal = Number(editData.venueMaxParticipant);
          if (isNaN(maxVal) || maxVal < 1) {
            toast.error("Max Participants (Venue) must be at least 1 for PER_VENUE fee type");
            setEditSubmitting(false);
            return;
          }
        }
      }

      const startDatetime = editData.startDate && editData.startTime ? new Date(`${editData.startDate}T${editData.startTime}`).toISOString() : null;
      const endDatetime = editData.endDate && editData.endTime ? new Date(`${editData.endDate}T${editData.endTime}`).toISOString() : null;

      const payload: any = {
        serialNumber: editData.serialNumber || undefined,
        courseRunType: editData.courseRunType || undefined,
        courseId: editData.courseId || undefined,
        startDatetime,
        endDatetime,
        venueId: editData.venueId || null,
        venueType: editData.venueType || null,
        specifiedLocation: editData.specifiedLocation || null,
        minClassSize: editData.minClassSize === "" ? null : Number(editData.minClassSize),
        maxClassSize: editData.maxClassSize === "" ? null : Number(editData.maxClassSize),
        individualRegistrationRequired: !!editData.individualRegistrationRequired,
        remarks: editData.remarks || null,
        baseCourseFee: editData.baseCourseFee === "" ? null : Number(editData.baseCourseFee),
        contractFees: editData.contractFees === "" ? null : Number(editData.contractFees),
        additionalCostExceedingCapacity: editData.additionalCostExceedingCapacity === "" ? null : Number(editData.additionalCostExceedingCapacity),
        venueFee: editData.venueFee === "" ? null : Number(editData.venueFee),
        venueMaxParticipant: editData.venueMaxParticipant === "" ? null : Number(editData.venueMaxParticipant),
        perHeadFeeIfMaxExceed: editData.perHeadFeeIfMaxExceed === "" ? null : Number(editData.perHeadFeeIfMaxExceed),
        // some APIs/DB columns use venuePerHeadIfExceed naming - include both to be compatible
        venuePerHeadIfExceed:
          editData.venuePerHeadIfExceed === ""
            ? editData.perHeadFeeIfMaxExceed === ""
              ? null
              : Number(editData.perHeadFeeIfMaxExceed)
            : Number(editData.venuePerHeadIfExceed),
        otherFee: editData.otherFee === "" ? null : Number(editData.otherFee),
        adminFee: editData.adminFee === "" ? null : Number(editData.adminFee),
        contingencyFee: editData.contingencyFee === "" ? null : Number(editData.contingencyFee),
        feeType: editData.feeType || null,
        courseRunFeeType: editData.courseRunFeeType || null,
        clientOrganizationId: editData.clientOrganizationId || null,
      };
      const resp = await courseRunsApi.update(courseRun.id, payload);
      if (resp.success) {
        toast.success("Course run updated");
        await loadCourseRunDetail();
        setIsEditing(false);
      } else {
        toast.error(resp.error || "Update failed");
      }
    } catch (e: any) {
      toast.error(e?.message || "Update failed");
    } finally {
      setEditSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate("/course-runs")} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Course Run Management
          </Button>
          <div>
            <p className="text-sm text-gray-500">
              {courseRun.serialNumber || "-"} - {courseRun.course?.category || "Uncategorised"}
            </p>
            <h1 className="text-2xl font-bold text-gray-900">
              {courseRun.course?.title || "Untitled Course"} ({courseRun.course?.courseCode || "CODE"})
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(courseRun.status)}
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={handleToggleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Course Run
            </Button>
          )}
          {isEditing && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleToggleEdit} disabled={editSubmitting}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={editSubmitting}>
                {editSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="course-info">Course Run Information</TabsTrigger>
              <TabsTrigger
                value="learner-particulars"
                disabled={!courseRun.individualRegistrationRequired || courseRun.status === "DRAFT"}
                className={!courseRun.individualRegistrationRequired || courseRun.status === "DRAFT" ? "opacity-50 cursor-not-allowed" : ""}
              >
                Participants ({courseRun.courseRunLearners?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="trainer-assignment">Trainer Assignment ({courseRun.courseRunTrainers?.length || 0})</TabsTrigger>
              <TabsTrigger value="fees-expenses">Revenue & Expenses</TabsTrigger>
            </TabsList>

            {/* Course Run Information Tab */}
            <TabsContent value="course-info" className="space-y-6 mt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Course Run Details</h3>
                {/* {!isEditing && (
                  <Button variant="outline" size="sm" className="bg-blue-600 text-white hover:bg-blue-700" onClick={handleToggleEdit}>
                    Edit Course Run
                  </Button>
                )} */}
              </div>

              <div className="space-y-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-sm">
                      <Building className="h-4 w-4 mr-2" />
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-sm font-medium">Course</Label>
                      {isEditing ? (
                        <Select value={editData?.courseId} onValueChange={(v) => handleEditField("courseId", v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select course" />
                          </SelectTrigger>
                          <SelectContent>
                            {courses.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input value={courseRun.course?.title || "Untitled"} disabled className="bg-gray-50" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Course Code</Label>
                      <Input value={isEditing ? editData?.courseCode : courseRun.course?.courseCode || ""} disabled className="bg-gray-50" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Course Run Code</Label>
                      <Input value={isEditing ? editData?.serialNumber : courseRun.serialNumber || ""} disabled className="bg-gray-50" />
                      <p className="text-xs text-gray-500">Auto-generated from Course Code + Start Date</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Course Run Type</Label>
                      {isEditing ? (
                        <Select value={editData?.courseRunType} onValueChange={(v) => handleEditField("courseRunType", v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OPEN">Open</SelectItem>
                            <SelectItem value="DEDICATED">Dedicated</SelectItem>
                            <SelectItem value="TALKS">Talks</SelectItem>
                            <SelectItem value="CUSTOMIZED">Customized</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input value={courseRun.courseRunType || ""} disabled className="bg-gray-50" />
                      )}
                    </div>
                    {/* Organiser Field - Only show for DEDICATED, TALKS, or CUSTOMIZED */}
                    {(editData?.courseRunType === "DEDICATED" ||
                      editData?.courseRunType === "TALKS" ||
                      editData?.courseRunType === "CUSTOMIZED" ||
                      (!isEditing &&
                        (courseRun.courseRunType === "DEDICATED" || courseRun.courseRunType === "TALKS" || courseRun.courseRunType === "CUSTOMIZED"))) && (
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-sm font-medium">
                          Organisation{" "}
                          {isEditing &&
                          (editData?.courseRunType === "DEDICATED" || editData?.courseRunType === "TALKS" || editData?.courseRunType === "CUSTOMIZED")
                            ? "*"
                            : ""}
                        </Label>
                        {isEditing ? (
                          <Select value={editData?.clientOrganizationId || ""} onValueChange={(v) => handleEditField("clientOrganizationId", v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Organisation" />
                            </SelectTrigger>
                            <SelectContent>
                              {organizations.map((org) => (
                                <SelectItem key={org.id} value={org.id}>
                                  {org.name} {org.buNumber ? `- ${org.buNumber}` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={courseRun.clientOrganization?.name || organizations.find((org) => org.id === courseRun.clientOrganizationId)?.name || ""}
                            disabled
                            className="bg-gray-50"
                          />
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Schedule & Venue */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-sm">
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule & Venue
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Start Date</Label>
                      {isEditing ? (
                        <DateInput value={editData?.startDate} onChange={(d) => handleEditField("startDate", d || "")} />
                      ) : (
                        <Input
                          value={courseRun.startDatetime ? new Date(courseRun.startDatetime).toLocaleDateString("en-GB") : ""}
                          disabled
                          className="bg-gray-50"
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Start Time</Label>
                      {isEditing ? (
                        <TimeInput value={editData?.startTime} onChange={(t) => handleEditField("startTime", t || "")} />
                      ) : (
                        <Input
                          value={
                            courseRun.startDatetime ? new Date(courseRun.startDatetime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : ""
                          }
                          disabled
                          className="bg-gray-50"
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">End Date</Label>
                      {isEditing ? (
                        <DateInput value={editData?.endDate} onChange={(d) => handleEditField("endDate", d || "")} />
                      ) : (
                        <Input
                          value={courseRun.endDatetime ? new Date(courseRun.endDatetime).toLocaleDateString("en-GB") : ""}
                          disabled
                          className="bg-gray-50"
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">End Time</Label>
                      {isEditing ? (
                        <TimeInput value={editData?.endTime} onChange={(t) => handleEditField("endTime", t || "")} />
                      ) : (
                        <Input
                          value={
                            courseRun.endDatetime ? new Date(courseRun.endDatetime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : ""
                          }
                          disabled
                          className="bg-gray-50"
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Venue Type</Label>
                      {isEditing ? (
                        <Select value={editData?.venueType} onValueChange={(v) => handleEditField("venueType", v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select venue type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="HOTEL">Hotel</SelectItem>
                            <SelectItem value="ON_PREMISE">On Premise</SelectItem>
                            <SelectItem value="CLIENT_FACILITY">Client Facility</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input value={courseRun.venueType || ""} disabled className="bg-gray-50" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Venue</Label>
                      {isEditing ? (
                        filteredVenues.length > 0 ? (
                          <Select value={editData?.venueId} onValueChange={(v) => handleEditField("venueId", v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select venue" />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredVenues.map((v) => (
                                <SelectItem key={v.id} value={v.id}>
                                  {v.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input value="No venues" disabled className="bg-gray-50" />
                        )
                      ) : (
                        <Input value={courseRun.venue?.name || courseRun.specifiedLocation || ""} disabled className="bg-gray-50" />
                      )}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-sm font-medium">Specified Location</Label>
                      <Input
                        value={isEditing ? editData?.specifiedLocation : courseRun.specifiedLocation || ""}
                        disabled={!isEditing}
                        onChange={(e) => handleEditField("specifiedLocation", e.target.value)}
                        className={isEditing ? "" : "bg-gray-50"}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Class Size Configuration */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-sm">
                      <Users className="h-4 w-4 mr-2" />
                      Class Size Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Minimum Class Size</Label>
                      <Input
                        type="number"
                        min={0}
                        value={isEditing ? editData?.minClassSize : courseRun.minClassSize?.toString() || ""}
                        disabled={!isEditing}
                        onChange={(e) => handleEditField("minClassSize", e.target.value)}
                        className={isEditing ? "" : "bg-gray-50"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Maximum Class Size</Label>
                      <Input
                        type="number"
                        min={0}
                        value={isEditing ? editData?.maxClassSize : courseRun.maxClassSize?.toString() || ""}
                        disabled={!isEditing}
                        onChange={(e) => handleEditField("maxClassSize", e.target.value)}
                        className={isEditing ? "" : "bg-gray-50"}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-sm font-medium">Individual Registration Required</Label>
                      <div className="flex items-center gap-3 p-3 border rounded-md bg-gray-50">
                        <Switch
                          checked={!!(isEditing ? editData?.individualRegistrationRequired : courseRun.individualRegistrationRequired)}
                          disabled={!isEditing}
                          onCheckedChange={(v) => handleEditField("individualRegistrationRequired", v)}
                        />
                        <span className="text-sm text-blue-600">
                          {courseRun.individualRegistrationRequired ? "If disabled, Individual learner details are not required" : "Enabled"}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-sm font-medium">Current Participants</Label>
                      <div className="p-3 border rounded-md bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">
                            {courseRun.courseRunLearners?.length || 0} / {courseRun.minClassSize ?? 0}
                          </span>
                          <span className="text-sm text-gray-500">
                            {(courseRun.courseRunLearners?.length || 0) >= (courseRun.minClassSize ?? Infinity)
                              ? "Minimum requirement met"
                              : `${(courseRun.minClassSize ?? 0) - (courseRun.courseRunLearners?.length || 0)} more needed for minimum`}
                          </span>
                        </div>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              (courseRun.courseRunLearners?.length || 0) >= (courseRun.minClassSize ?? Number.MAX_SAFE_INTEGER)
                                ? "bg-green-500"
                                : "bg-yellow-400"
                            }`}
                            style={{
                              width: `${
                                courseRun.minClassSize ? Math.min(100, ((courseRun.courseRunLearners?.length || 0) / courseRun.minClassSize) * 100) : 0
                              }%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Remarks */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Remarks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={isEditing ? editData?.remarks : courseRun.remarks || "Add any additional remarks or notes..."}
                      disabled={!isEditing}
                      onChange={(e) => handleEditField("remarks", e.target.value)}
                      className={isEditing ? "min-h-[100px]" : "bg-gray-50 min-h-[100px]"}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Participants Tab */}
            <TabsContent value="learner-particulars" className="space-y-6 mt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Learner Management</h3>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportParticipantList} disabled={exportingParticipants}>
                    <Download className="h-4 w-4 mr-2" />
                    {exportingParticipants ? "Exporting participants..." : "Export participant list"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setImportLearnersDialogOpen(true)}>
                    <Download className="h-4 w-4 mr-2" />
                    Import CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAttendanceDialogOpen(true)}
                    disabled={!isCourseStarted()}
                    title={
                      !isCourseStarted()
                        ? "Attendance can only be marked from the course start date onwards. Use withdrawal if needed before the course starts."
                        : ""
                    }
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Attendance/Class List
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setAddLearnersDialogOpen(true)}
                    disabled={courseRun.status === "DRAFT"}
                    title={courseRun.status === "DRAFT" ? "Cannot add participants while course run is in DRAFT status" : ""}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Participants
                  </Button>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Enrolled Participants ({courseRun.courseRunLearners?.length || 0})</CardTitle>
                  {/* <Button variant="outline" size="sm" className="ml-auto" onClick={() => setAddLearnersDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Learners
                  </Button> */}
                </CardHeader>
                <CardContent>
                  {/* Bulk Actions Toolbar */}
                  {selectedParticipants.size > 0 && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-900">
                        {selectedParticipants.size} participant{selectedParticipants.size !== 1 ? "s" : ""} selected
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleBulkSendConfirmationEmail}
                          disabled={selectedParticipants.size === 0 || courseRun.status === "DRAFT"}
                          title={courseRun.status === "DRAFT" ? "Cannot send confirmation emails while course run is in DRAFT status" : ""}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Send Confirmation Email
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleBulkChangeStatus()}
                          disabled={selectedParticipants.size === 0 || isCourseStarted()}
                          title={
                            isCourseStarted()
                              ? "Withdrawal is not available on or after the course start date. Use attendance tracking to mark participants as Absent."
                              : ""
                          }
                        >
                          Change Status to Withdrawn
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleBulkDeleteLearners()} disabled={selectedParticipants.size === 0}>
                          Delete from Course
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <input
                              type="checkbox"
                              className="rounded"
                              onChange={(e) => handleSelectAllParticipants(e.target.checked)}
                              checked={
                                selectedParticipants.size > 0 &&
                                selectedParticipants.size === (courseRun?.courseRunLearners?.filter((l) => l.enrollmentStatus !== "WITHDRAWN").length || 0)
                              }
                            />
                          </TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Designation</TableHead>
                          <TableHead>Payment Mode</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Email Confirmation</TableHead>
                          <TableHead>Attendance</TableHead>
                          <TableHead className="w-12">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {courseRun.courseRunLearners?.filter((l) => l.enrollmentStatus !== "WITHDRAWN").length > 0 ? (
                          courseRun.courseRunLearners
                            .filter((l) => l.enrollmentStatus !== "WITHDRAWN")
                            .map((learnerRecord) => (
                              <TableRow key={learnerRecord.id}>
                                <TableCell>
                                  <input
                                    type="checkbox"
                                    className="rounded"
                                    checked={selectedParticipants.has(learnerRecord.id)}
                                    onChange={() => handleParticipantToggle(learnerRecord.id)}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">{learnerRecord.learner.fullname}</TableCell>
                                <TableCell>{learnerRecord.learner.email}</TableCell>
                                <TableCell>{learnerRecord.learner.contactNumber || "—"}</TableCell>
                                <TableCell>{learnerRecord.learner.designation || "—"}</TableCell>
                                <TableCell>{getPaymentModeLabel(learnerRecord.paymentMode)}</TableCell>
                                <TableCell>{getEnrollmentStatusBadge(learnerRecord.enrollmentStatus || "ENROLLED")}</TableCell>
                                <TableCell>
                                  {learnerRecord.confirmationEmailStatus && (
                                    <Badge
                                      variant={
                                        learnerRecord.confirmationEmailStatus === "SENT"
                                          ? "default"
                                          : learnerRecord.confirmationEmailStatus === "FAILED"
                                            ? "destructive"
                                            : learnerRecord.confirmationEmailStatus === "SENDING"
                                              ? "secondary"
                                              : "outline"
                                      }
                                    >
                                      {learnerRecord.confirmationEmailStatus}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={learnerRecord.attendanceStatus === "PRESENT" ? "default" : "secondary"}>
                                    {learnerRecord.attendanceStatus || "Pending"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <SafeDropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedEnrollment(learnerRecord);
                                          setEditLearnerDialogOpen(true);
                                        }}
                                      >
                                        Edit
                                      </DropdownMenuItem>
                                      {(learnerRecord.confirmationEmailStatus === "PENDING" ||
                                        learnerRecord.confirmationEmailStatus === "FAILED" ||
                                        !learnerRecord.confirmationEmailStatus) &&
                                        courseRun.status !== "DRAFT" && (
                                          <DropdownMenuItem onClick={() => handleResendConfirmation(learnerRecord)}>Send Confirmation</DropdownMenuItem>
                                        )}
                                      <DropdownMenuItem
                                        onClick={() => {
                                          if (!isCourseStarted()) {
                                            setSelectedLearnerForWithdrawal(learnerRecord);
                                            setWithdrawalDialogOpen(true);
                                          }
                                        }}
                                        disabled={isCourseStarted()}
                                        className={isCourseStarted() ? "opacity-50 cursor-not-allowed" : ""}
                                        title={
                                          isCourseStarted()
                                            ? "Withdrawal is not available on or after the course start date. Use attendance tracking to mark participants as Absent."
                                            : ""
                                        }
                                      >
                                        Mark as Withdrawn
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleRemoveLearner(learnerRecord)} className="text-red-600 focus:text-red-600">
                                        Remove
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </SafeDropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={10} className="text-center py-8">
                              <div className="text-gray-500">
                                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p className="text-lg font-medium mb-2">No participants enrolled</p>
                                <p className="text-sm">Add participants to get started.</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Withdrawn Participants Section */}
              {courseRun.courseRunLearners?.filter((l) => l.enrollmentStatus === "WITHDRAWN").length > 0 && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Withdrawn Participants ({courseRun.courseRunLearners?.filter((l) => l.enrollmentStatus === "WITHDRAWN").length || 0})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Designation</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Withdrawn Date</TableHead>
                            <TableHead>Reason</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {courseRun.courseRunLearners
                            ?.filter((l) => l.enrollmentStatus === "WITHDRAWN")
                            .map((learnerRecord) => (
                              <TableRow key={learnerRecord.id}>
                                <TableCell className="font-medium">{learnerRecord.learner.fullname}</TableCell>
                                <TableCell>{learnerRecord.learner.email}</TableCell>
                                <TableCell>{learnerRecord.learner.contactNumber || "—"}</TableCell>
                                <TableCell>{learnerRecord.learner.designation || "—"}</TableCell>
                                <TableCell>
                                  <Badge variant="destructive">WITHDRAWN</Badge>
                                </TableCell>
                                <TableCell>{learnerRecord.withdrawnAt ? new Date(learnerRecord.withdrawnAt).toLocaleDateString("en-SG") : "—"}</TableCell>
                                <TableCell>{learnerRecord.withdrawnReason || "—"}</TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Trainer Assignment Tab */}
            <TabsContent value="trainer-assignment" className="space-y-6 mt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Trainer Assignment</h3>
                <div className="flex items-center gap-2">
                  {/* <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSendEmailDialogOpen(true)}
                    disabled={!courseRun.courseRunTrainers || courseRun.courseRunTrainers.length === 0}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Send Trainer Assignment Email
                  </Button> */}
                  <Button variant="outline" size="sm" onClick={handleCancelTrainerEdit} disabled={!hasTrainerChanges}>
                    Reset
                  </Button>
                  <Button size="sm" onClick={handleSaveTrainerAssignments} disabled={!hasTrainerChanges}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Select & Configure Trainers
                    </div>
                    <div className="text-sm text-gray-500">
                      {Object.values(trainerAssignments).filter((a) => a.selected).length} trainer(s) selected
                      {hasTrainerChanges && <span className="ml-2 text-orange-500">(Unsaved changes)</span>}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Always show editable trainer selection */}
                  {availableTrainers.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50 text-gray-400" />
                      <p className="text-lg font-medium mb-2 text-gray-600">No trainers available</p>
                      <p className="text-sm text-gray-500">Please add trainers to the course first.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {availableTrainers.map((trainer) => {
                        const assignment = trainerAssignments[trainer.id] || { selected: false, baseFee: 0, additionalCost: 0 };
                        const isSelected = assignment.selected;

                        return (
                          <Card key={trainer.id} className={`p-4 ${isSelected ? "border-blue-500 border-2" : ""}`}>
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleTrainerSelection(trainer.id)}
                                  className="rounded h-5 w-5 mt-1"
                                />
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                  <Users className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <h4 className="font-medium">{trainer.name}</h4>
                                  <p className="text-sm text-gray-500">{trainer.partnerOrganization || "Internal Trainer"}</p>
                                </div>
                              </div>
                              <Badge variant={isSelected ? "default" : "secondary"}>{isSelected ? "Selected" : "Available"}</Badge>
                            </div>

                            {isSelected && (
                              <div className="mt-4 space-y-3 pl-14">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium">Base Fee ($)</Label>
                                    <Input
                                      id={`trainer-base-${trainer.id}`}
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={assignment.baseFee ?? ""}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        updateTrainerFee(trainer.id, "baseFee", val === "" ? null : parseFloat(val));
                                      }}
                                      placeholder="0.00"
                                      className="mt-1"
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <Label className="text-sm font-medium">Additional Cost ($)</Label>
                                      <Input
                                        id={`trainer-add-${trainer.id}`}
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={assignment.additionalCost ?? ""}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          updateTrainerFee(trainer.id, "additionalCost", val === "" ? null : parseFloat(val));
                                        }}
                                        placeholder="0.00"
                                        className="mt-1"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium">Cost Unit</Label>
                                      <Select
                                        value={assignment.additionalCostUnit || "PER_CLASS"}
                                        onValueChange={(value) => {
                                          updateTrainerFee(trainer.id, "additionalCostUnit", value);
                                        }}
                                      >
                                        <SelectTrigger className="mt-1">
                                          <SelectValue placeholder="Select unit" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="PER_CLASS">Per Class</SelectItem>
                                          <SelectItem value="PER_PAX">Per Pax</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                </div>

                                <div className="border-t pt-3">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">Total for this trainer:</span>
                                    <span className="font-medium text-lg text-blue-600">
                                      {currency(safeNumber(assignment.baseFee, 0) + safeNumber(assignment.additionalCost, 0))}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  )}

                  {Object.values(trainerAssignments).some((a) => a.selected) && (
                    <Card className="bg-blue-50 border-blue-200 mt-4">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-medium text-blue-800">Assignment Summary</span>
                          <div className="text-right">
                            <div className="text-sm text-blue-600">
                              {Object.values(trainerAssignments).filter((a) => a.selected).length} trainer(s) assigned
                            </div>
                            <div className="text-2xl font-bold text-blue-800">{currency(calculateTotalTrainerFees())}</div>
                            <div className="text-sm text-blue-600">Total Trainer Fees</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>

              {/* Partner Assignment Section */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Building className="h-5 w-5 mr-2" />
                      Select Partners
                    </div>
                    <div className="text-sm text-gray-500">{Object.values(partnerAssignments).filter((a) => a.selected).length} partner(s) selected</div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Always show editable partner selection */}
                  {availablePartners.length === 0 ? (
                    <div className="text-center py-8">
                      <Building className="h-12 w-12 mx-auto mb-4 opacity-50 text-gray-400" />
                      <p className="text-lg font-medium mb-2 text-gray-600">No partners available</p>
                      <p className="text-sm text-gray-500">Please add partners to the course first.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {availablePartners.map((partner) => {
                        const isSelected = partnerAssignments[partner.id]?.selected || false;
                        const partnerTrainers = (partner as any).partnerTrainers || [];

                        return (
                          <Card key={partner.id} className={`p-4 ${isSelected ? "border-green-500 border-2" : ""}`}>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => togglePartnerSelection(partner.id)}
                                  className="rounded h-5 w-5 mt-1"
                                />
                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <Building className="h-5 w-5 text-green-600" />
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-medium">{partner.name}</h4>
                                  <p className="text-sm text-gray-500">{partner.email}</p>

                                  {/* Show partner trainers when selected */}
                                  {isSelected && partnerTrainers.length > 0 && (
                                    <div className="mt-3 pl-4 border-l-2 border-green-200 space-y-2">
                                      <p className="text-xs font-semibold text-gray-600 uppercase">Associated Trainers:</p>
                                      {partnerTrainers.map((trainer: any) => {
                                        const isTrainerSelected = partnerAssignments[partner.id]?.selectedTrainerIds?.includes(trainer.id) || false;
                                        return (
                                          <div key={trainer.id} className="flex items-center gap-2 text-sm">
                                            <input
                                              type="checkbox"
                                              checked={isTrainerSelected}
                                              onChange={() => togglePartnerTrainerSelection(partner.id, trainer.id)}
                                              className="rounded h-4 w-4"
                                            />
                                            <div>
                                              <div className="font-medium text-gray-700">{trainer.trainerName}</div>
                                              <div className="text-xs text-gray-500">{trainer.trainerEmail}</div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <Badge variant={isSelected ? "default" : "secondary"} className="flex-shrink-0">
                                {isSelected ? "Selected" : "Available"}
                              </Badge>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}

                  {Object.values(partnerAssignments).some((a) => a.selected) && (
                    <Card className="bg-green-50 border-green-200 mt-4">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-medium text-green-800">Partner Assignment Summary</span>
                          <div className="text-right">
                            <div className="text-sm text-green-600">
                              {Object.values(partnerAssignments).filter((a) => a.selected).length} partner(s) assigned
                            </div>
                            <div className="text-2xl font-bold text-green-800">{currency(courseContractFees)}</div>
                            <div className="text-sm text-green-600">Contract Fees (includes trainer + venue)</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Fees & Expenses Tab */}
            <TabsContent value="fees-expenses" className="space-y-6 mt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Revenue & Expenses</h3>
              </div>

              {/* Lock message when course is IN_PROGRESS or later */}
              {courseRun.status && ["IN_PROGRESS", "COMPLETED", "CANCELLED", "INCOMPLETED"].includes(courseRun.status) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <p className="text-sm text-yellow-800 font-medium">Revenue & Expenses cannot be modified once the course is in progress or completed.</p>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {/* REVENUE SECTION */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-sm">Revenue</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Default Course Fee ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={isEditing ? editData?.baseCourseFee : (courseRun.baseCourseFee ?? "")}
                        disabled={!isEditing || (courseRun.status && ["IN_PROGRESS", "COMPLETED", "CANCELLED", "INCOMPLETED"].includes(courseRun.status))}
                        onChange={(e) => handleEditField("baseCourseFee", e.target.value)}
                        className={
                          isEditing && !(courseRun.status && ["IN_PROGRESS", "COMPLETED", "CANCELLED", "INCOMPLETED"].includes(courseRun.status))
                            ? ""
                            : "bg-gray-50"
                        }
                      />
                      <p className="text-xs text-gray-500">Fee charged to participants/client per pax or per run</p>
                    </div>

                    {/* Fee Type Radio Buttons */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Fee Type</Label>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            id="fee-per-run"
                            name="courseRunFeeType"
                            value="PER_RUN"
                            checked={
                              (isEditing ? editData?.courseRunFeeType : courseRun.courseRunFeeType) === "PER_RUN" || (!courseRun.courseRunFeeType && !isEditing)
                            }
                            onChange={(e) =>
                              isEditing &&
                              !(courseRun.status && ["IN_PROGRESS", "COMPLETED", "CANCELLED", "INCOMPLETED"].includes(courseRun.status)) &&
                              handleEditField("courseRunFeeType", e.target.value)
                            }
                            disabled={!isEditing || (courseRun.status && ["IN_PROGRESS", "COMPLETED", "CANCELLED", "INCOMPLETED"].includes(courseRun.status))}
                            className="cursor-pointer"
                          />
                          <Label htmlFor="fee-per-run" className="text-sm font-normal cursor-pointer">
                            Per Run
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            id="fee-per-head"
                            name="courseRunFeeType"
                            value="PER_HEAD"
                            checked={(isEditing ? editData?.courseRunFeeType : courseRun.courseRunFeeType) === "PER_HEAD"}
                            onChange={(e) =>
                              isEditing &&
                              !(courseRun.status && ["IN_PROGRESS", "COMPLETED", "CANCELLED", "INCOMPLETED"].includes(courseRun.status)) &&
                              handleEditField("courseRunFeeType", e.target.value)
                            }
                            disabled={!isEditing || (courseRun.status && ["IN_PROGRESS", "COMPLETED", "CANCELLED", "INCOMPLETED"].includes(courseRun.status))}
                            className="cursor-pointer"
                          />
                          <Label htmlFor="fee-per-head" className="text-sm font-normal cursor-pointer">
                            Per Head
                          </Label>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">Determines if the fee applies to the entire run or per participant</p>
                    </div>
                  </CardContent>
                </Card>

                {/* EXPENSES SECTION */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Expenses</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Contract Fees & Additional Cost - 2x2 Grid Row 1 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Contract Fees - Editable for training partners, auto-calculated for trainers */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Contract Fees ($)</Label>
                        {(() => {
                          const hasTrainingPartners = courseRun.courseRunPartners && courseRun.courseRunPartners.length > 0;
                          const isLocked = courseRun.status && ["IN_PROGRESS", "COMPLETED", "CANCELLED", "INCOMPLETED"].includes(courseRun.status);
                          const isContractFeesEditable = isEditing && hasTrainingPartners && !isLocked;

                          // Show dynamically calculated fees when not editing or when there are trainers
                          const dynamicFees = calculateDynamicContractFees();
                          const displayValue =
                            !hasTrainingPartners && dynamicFees > 0 ? dynamicFees : isEditing ? (editData?.contractFees ?? "") : (courseRun.contractFees ?? "");

                          return (
                            <>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={displayValue}
                                disabled={!isContractFeesEditable}
                                onChange={(e) => handleEditField("contractFees", e.target.value)}
                                className={isContractFeesEditable ? "" : "bg-gray-50"}
                              />
                              <p className="text-xs text-gray-500">
                                {hasTrainingPartners
                                  ? "Editable for training partners"
                                  : "Auto-calculated from trainer assignments (updates live based on PER_PAX costs)"}
                              </p>
                            </>
                          );
                        })()}
                      </div>

                      {/* Additional Cost Exceeding Capacity */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Additional Cost Exceeding Capacity ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={
                            isEditing
                              ? editData?.additionalCostExceedingCapacity
                              : calculateAdditionalCostExceedingCapacity() || courseRun.additionalCostExceedingCapacity || ""
                          }
                          disabled={!isEditing || (courseRun.status && ["IN_PROGRESS", "COMPLETED", "CANCELLED", "INCOMPLETED"].includes(courseRun.status))}
                          onChange={(e) => handleEditField("additionalCostExceedingCapacity", e.target.value)}
                          className={
                            isEditing && !(courseRun.status && ["IN_PROGRESS", "COMPLETED", "CANCELLED", "INCOMPLETED"].includes(courseRun.status))
                              ? ""
                              : "bg-gray-50"
                          }
                        />
                        {/* <p className="text-xs text-gray-500">
                          {calculateAdditionalCostExceedingCapacity() > 0
                            ? `Auto-calculated: ${courseRun?.courseRunLearners?.filter((l) => l.enrollmentStatus === "ENROLLED").length || 0} enrolled exceeds ${courseVenueMaxParticipants} max capacity × $${coursePerHeadIfMaxExceed} per head`
                            : "Calculated when enrolled participants exceed venue max capacity"}
                        </p> */}
                        {/* Display trainer remarks from course_trainers table */}
                        {/* {courseRun.courseRunTrainers && courseRun.courseRunTrainers.length > 0 && courseTrainersRemarks.length > 0 ? (
                          <div className="text-xs text-gray-600 space-y-1 pt-2 border-t">
                            <p className="font-medium">Trainer Remarks:</p>
                            <ul className="list-none space-y-1 ml-2">
                              {courseRun.courseRunTrainers.map((crt) => {
                                const courseTrainer = courseTrainersRemarks.find((ct: any) => ct.trainerId === crt.trainer.id);
                                const remarks = courseTrainer?.remarks;
                                return (
                                  <li key={crt.trainer.id}>
                                    - {crt.trainer.name} {remarks ? `- ${remarks}` : ""}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500 pt-2">No trainers assigned yet</p>
                        )} */}
                      </div>
                    </div>

                    {/* Venue Fee Type & Base Venue Fee - 2x2 Grid Row 2 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Venue Fee Type */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Venue Fee Type</Label>
                        {isEditing && !(courseRun.status && ["IN_PROGRESS", "COMPLETED", "CANCELLED", "INCOMPLETED"].includes(courseRun.status)) ? (
                          <Select value={editData?.feeType || ""} onValueChange={(v) => handleEditField("feeType", v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select fee type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PER_HEAD">PER_HEAD</SelectItem>
                              <SelectItem value="PER_VENUE">PER_VENUE</SelectItem>
                              <SelectItem value="FIXED">FIXED</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input value={courseRun.feeType || ""} disabled className="bg-gray-50" />
                        )}
                        <p className="text-xs text-gray-500">Pricing model for venue charges</p>
                      </div>

                      {/* Base Venue Fee */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Base Venue Fee ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={isEditing ? editData?.venueFee : (courseRun.venueFee ?? "")}
                          disabled={!isEditing || (courseRun.status && ["IN_PROGRESS", "COMPLETED", "CANCELLED", "INCOMPLETED"].includes(courseRun.status))}
                          onChange={(e) => handleEditField("venueFee", e.target.value)}
                          className={
                            isEditing && !(courseRun.status && ["IN_PROGRESS", "COMPLETED", "CANCELLED", "INCOMPLETED"].includes(courseRun.status))
                              ? ""
                              : "bg-gray-50"
                          }
                        />
                        <p className="text-xs text-gray-500">Base venue rental fee</p>
                      </div>
                    </div>

                    {/* Show venue-specific fields if PER_VENUE fee type */}
                    {(isEditing ? editData?.feeType : courseRun.feeType) === "PER_VENUE" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Max Participants (Venue)</Label>
                          <Input
                            type="number"
                            min="1"
                            value={isEditing ? editData?.venueMaxParticipant : (courseRun.venueMaxParticipant ?? "")}
                            disabled={!isEditing || (courseRun.status && ["IN_PROGRESS", "COMPLETED", "CANCELLED", "INCOMPLETED"].includes(courseRun.status))}
                            onChange={(e) => handleEditField("venueMaxParticipant", e.target.value)}
                            className={
                              isEditing && !(courseRun.status && ["IN_PROGRESS", "COMPLETED", "CANCELLED", "INCOMPLETED"].includes(courseRun.status))
                                ? ""
                                : "bg-gray-50"
                            }
                          />
                          <p className="text-xs text-gray-500">Maximum participants before per-head charges apply</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Per Head Fee if Max Exceeded ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={isEditing ? editData?.perHeadFeeIfMaxExceed : (courseRun.perHeadFeeIfMaxExceed ?? "")}
                            disabled={!isEditing || (courseRun.status && ["IN_PROGRESS", "COMPLETED", "CANCELLED", "INCOMPLETED"].includes(courseRun.status))}
                            onChange={(e) => handleEditField("perHeadFeeIfMaxExceed", e.target.value)}
                            className={
                              isEditing && !(courseRun.status && ["IN_PROGRESS", "COMPLETED", "CANCELLED", "INCOMPLETED"].includes(courseRun.status))
                                ? ""
                                : "bg-gray-50"
                            }
                          />
                          <p className="text-xs text-gray-500">Additional per-head fee beyond max participants</p>
                        </div>
                      </div>
                    )}

                    {/* Other fees */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Other Fees ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={isEditing ? editData?.otherFee : (courseRun.otherFee ?? "")}
                          disabled={!isEditing || (courseRun.status && ["IN_PROGRESS", "COMPLETED", "CANCELLED", "INCOMPLETED"].includes(courseRun.status))}
                          onChange={(e) => handleEditField("otherFee", e.target.value)}
                          className={
                            isEditing && !(courseRun.status && ["IN_PROGRESS", "COMPLETED", "CANCELLED", "INCOMPLETED"].includes(courseRun.status))
                              ? ""
                              : "bg-gray-50"
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Admin Fees ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={isEditing ? editData?.adminFee : (courseRun.adminFee ?? "")}
                          disabled={!isEditing || (courseRun.status && ["IN_PROGRESS", "COMPLETED", "CANCELLED", "INCOMPLETED"].includes(courseRun.status))}
                          onChange={(e) => handleEditField("adminFee", e.target.value)}
                          className={
                            isEditing && !(courseRun.status && ["IN_PROGRESS", "COMPLETED", "CANCELLED", "INCOMPLETED"].includes(courseRun.status))
                              ? ""
                              : "bg-gray-50"
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Contingency Fees ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={isEditing ? editData?.contingencyFee : (courseRun.contingencyFee ?? "")}
                          disabled={!isEditing || (courseRun.status && ["IN_PROGRESS", "COMPLETED", "CANCELLED", "INCOMPLETED"].includes(courseRun.status))}
                          onChange={(e) => handleEditField("contingencyFee", e.target.value)}
                          className={
                            isEditing && !(courseRun.status && ["IN_PROGRESS", "COMPLETED", "CANCELLED", "INCOMPLETED"].includes(courseRun.status))
                              ? ""
                              : "bg-gray-50"
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Venue Fee Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>Venue Fee Calculation</span>
                      <Badge variant="outline" className="text-xs">
                        {courseRun.feeType || "N/A"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const participants = courseRun.courseRunLearners?.filter((l) => l.enrollmentStatus === "ENROLLED").length ?? 0;

                      // Prefer editData values when in editing mode so the preview updates live
                      const feeTypeVal = isEditing ? editData?.feeType || courseRun.feeType : courseRun.feeType;

                      const baseFee = safeNumber(
                        isEditing ? (editData?.venueFee ?? courseRun.venueFee ?? courseRun.venue?.fee) : (courseRun.venueFee ?? courseRun.venue?.fee),
                        0,
                      );

                      const maxP = isEditing
                        ? editData?.venueMaxParticipant !== "" && editData?.venueMaxParticipant !== undefined
                          ? Number(editData.venueMaxParticipant)
                          : (courseRun.venueMaxParticipant ?? courseRun.venue?.maxParticipants ?? 0)
                        : (courseRun.venueMaxParticipant ?? courseRun.venue?.maxParticipants ?? 0);

                      const perHeadExceed = safeNumber(
                        isEditing
                          ? (editData?.perHeadFeeIfMaxExceed ?? editData?.venuePerHeadIfExceed)
                          : (courseRun.perHeadFeeIfMaxExceed ?? courseRun.venue?.perHeadPriceIfMaxExceed),
                        0,
                      );

                      // compute final fee locally for preview
                      let finalFeeCalc = 0;
                      if (feeTypeVal === "PER_HEAD") {
                        finalFeeCalc = baseFee * participants;
                      } else if (feeTypeVal === "PER_VENUE") {
                        if (maxP > 0 && participants > maxP && perHeadExceed > 0) {
                          finalFeeCalc = baseFee + (participants - maxP) * perHeadExceed;
                        } else {
                          finalFeeCalc = baseFee;
                        }
                      } else {
                        // fixed or unspecified - fall back to stored final fee
                        finalFeeCalc = safeNumber(courseRun.venueFinalFee ?? 0);
                      }

                      if (feeTypeVal === "PER_HEAD") {
                        return (
                          <div className="space-y-3">
                            <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Participants</span>
                                <span className="font-semibold text-blue-700">{participants}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Per Head Rate</span>
                                <span className="font-semibold text-blue-700">{currency(baseFee)}</span>
                              </div>
                              <div className="pt-2 border-t border-blue-200">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium text-gray-700">Formula</span>
                                  <span className="text-sm font-mono text-gray-600">
                                    {participants} × {currency(baseFee)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                              <span className="text-sm font-semibold text-gray-700">Final Fee</span>
                              <span className="text-xl font-bold text-green-700">{currency(finalFeeCalc)}</span>
                            </div>
                          </div>
                        );
                      }

                      if (feeTypeVal === "PER_VENUE") {
                        const hasExcess = maxP > 0 && participants > maxP && perHeadExceed > 0;
                        const excess = hasExcess ? participants - maxP : 0;
                        const excessFee = hasExcess ? excess * perHeadExceed : 0;

                        return (
                          <div className="space-y-3">
                            <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Participants</span>
                                <span className="font-semibold text-blue-700">{participants}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Venue Fee</span>
                                <span className="font-semibold text-blue-700">{currency(baseFee)} per venue</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Max Participant</span>
                                <span className="font-semibold text-blue-700">{maxP || "Not Set"}</span>
                              </div>
                              {maxP > 0 && (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">Per Head if Exceed Max</span>
                                  <span className="font-semibold text-blue-700">{currency(perHeadExceed)}</span>
                                </div>
                              )}
                              {hasExcess && (
                                <div className="pt-2 border-t border-orange-200 bg-orange-50 -mx-4 -mb-4 px-4 py-2 rounded-b-lg">
                                  <div className="flex justify-between items-center text-orange-700">
                                    <span className="text-sm font-medium">⚠ Exceeded by {excess} pax</span>
                                    <span className="font-semibold">{currency(excessFee)}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <div className="text-sm text-gray-600 mb-2">Formula:</div>
                              <div className="font-mono text-sm">
                                {hasExcess ? (
                                  <div className="space-y-1">
                                    <div>
                                      {currency(baseFee)} + (({participants} - {maxP}) × {currency(perHeadExceed)})
                                    </div>
                                    <div className="text-gray-500">
                                      = {currency(baseFee)} + {currency(excessFee)}
                                    </div>
                                  </div>
                                ) : (
                                  <div>{currency(baseFee)} (within capacity)</div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                              <span className="text-sm font-semibold text-gray-700">Final Fee</span>
                              <span className="text-xl font-bold text-green-700">{currency(finalFeeCalc)}</span>
                            </div>
                          </div>
                        );
                      }

                      // Default/FIXED or no fee type
                      return (
                        <div className="p-4 bg-gray-50 rounded-lg text-center">
                          <p className="text-sm text-gray-600 mb-2">No fee calculation formula available</p>
                          <p className="text-2xl font-bold text-gray-700">{currency(finalFeeCalc)}</p>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add Learners Dialog */}
      <AddLearnersDialog
        open={addLearnersDialogOpen}
        onOpenChange={setAddLearnersDialogOpen}
        courseRun={courseRun as any}
        courseRunId={id!}
        baseCourseFee={courseRun?.baseCourseFee || 0}
        onSuccess={handleEnrollmentSuccess}
      />
      <ImportLearnersDialog
        open={importLearnersDialogOpen}
        onOpenChange={setImportLearnersDialogOpen}
        courseRunId={id!}
        baseCourseFee={courseRun?.baseCourseFee || 0}
        onSuccess={handleImportSuccess}
      />
      <AttendanceListDialog
        open={attendanceDialogOpen}
        onOpenChange={setAttendanceDialogOpen}
        courseRunId={id!}
        onSaved={loadCourseRunDetail}
        courseRunDetails={courseRun}
      />
      <EditLearnerDialog
        open={editLearnerDialogOpen}
        onOpenChange={setEditLearnerDialogOpen}
        courseRunId={id!}
        enrollment={selectedEnrollment}
        baseCourseFee={courseRun?.baseCourseFee || 0}
        discounts={(courseRun?.course?.discounts || []).map((d: any) => ({ id: d.id, name: d.name || "", percentage: d.percentage ?? 0 }))}
        onSuccess={handleEnrollmentSuccess}
      />

      {/* Send Trainer Assignment Email Dialog */}
      <SendTrainerEmailDialog
        open={sendEmailDialogOpen}
        onOpenChange={setSendEmailDialogOpen}
        courseRunId={id!}
        trainers={
          courseRun.courseRunTrainers?.map((crt) => ({
            id: crt.trainer.id,
            name: crt.trainer.name,
            email: crt.trainer.email,
            baseFee: crt.trainerBaseAmount || 0,
            additionalCost: crt.additionalCost || 0,
          })) || []
        }
        partners={
          courseRun.courseRunPartners?.map((crp) => ({
            id: crp.partner.id,
            name: crp.partner.name,
            email: crp.partner.email || "",
            pointOfContactEmail: (crp.partner as any).pointOfContactEmail || crp.partner.email || "",
          })) || []
        }
        courseRunDetails={{
          serialNumber: courseRun.serialNumber || "",
          courseName: courseRun.course?.title || "",
          startDate: formatDateTime(courseRun.startDatetime),
          endDate: formatDateTime(courseRun.endDatetime),
          venue: courseRun.venue?.name || courseRun.specifiedLocation || "TBD",
        }}
        onSuccess={loadCourseRunDetail}
      />

      {/* Withdrawal Dialog */}
      <Dialog open={withdrawalDialogOpen} onOpenChange={setWithdrawalDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Withdraw Learner</DialogTitle>
            <DialogDescription>Mark learner as withdrawn from this course run.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2 p-3 bg-muted rounded-md">
              <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                <span className="font-medium text-muted-foreground">Name:</span>
                <span className="font-medium">{selectedLearnerForWithdrawal?.learner?.fullname || "N/A"}</span>
                <span className="font-medium text-muted-foreground">Email:</span>
                <span className="text-muted-foreground">{selectedLearnerForWithdrawal?.learner?.email || "N/A"}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="withdrawal-reason">Reason for Withdrawal *</Label>
              <Select value={withdrawalReason} onValueChange={setWithdrawalReason}>
                <SelectTrigger id="withdrawal-reason">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Personal Reasons">Personal Reasons</SelectItem>
                  <SelectItem value="Work Commitment">Work Commitment</SelectItem>
                  <SelectItem value="Health Issues">Health Issues</SelectItem>
                  <SelectItem value="Transfer/Relocation">Transfer/Relocation</SelectItem>
                  <SelectItem value="Financial Constraints">Financial Constraints</SelectItem>
                  <SelectItem value="Course Schedule Conflict">Course Schedule Conflict</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="withdrawal-document">Supporting Document (Optional)</Label>
              <Input
                id="withdrawal-document"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // Validate file size (max 10MB to account for base64 encoding overhead)
                    const maxSize = 10 * 1024 * 1024; // 10MB
                    if (file.size > maxSize) {
                      toast.error(`File size exceeds 10MB limit. Selected file: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
                      e.target.value = ""; // Reset input
                      return;
                    }
                    setWithdrawalDocument(file);
                  }
                }}
              />
              {withdrawalDocument && (
                <p className="text-sm text-muted-foreground">
                  Selected: {withdrawalDocument.name} ({(withdrawalDocument.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setWithdrawalDialogOpen(false);
                setWithdrawalReason("");
                setWithdrawalDocument(null);
                setSelectedLearnerForWithdrawal(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleWithdrawLearner} disabled={withdrawalSubmitting || !withdrawalReason}>
              {withdrawalSubmitting ? "Processing..." : "Confirm Withdrawal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Course Confirmation Email Dialog */}
      {courseRun && (
        <SendCourseConfirmationEmailDialog
          open={sendConfirmationEmailDialogOpen}
          onOpenChange={setSendConfirmationEmailDialogOpen}
          courseRunId={id!}
          learners={
            courseRun.courseRunLearners
              ?.filter((l) => selectedParticipants.has(l.id) && l.enrollmentStatus !== "WITHDRAWN")
              .map((l) => ({
                id: l.id,
                name: l.learner.fullname,
                email: l.learner.email,
                organizationName: l.clientOrganization?.name || "N/A",
              })) || []
          }
          courseRunDetails={{
            serialNumber: courseRun.serialNumber || "",
            courseName: courseRun.course?.title || "",
            startDate: courseRun.startDatetime ? new Date(courseRun.startDatetime).toLocaleDateString("en-GB") : "",
            endDate: courseRun.endDatetime ? new Date(courseRun.endDatetime).toLocaleDateString("en-GB") : "",
            venue: courseRun.venue?.name || courseRun.specifiedLocation || "TBA",
          }}
          onSuccess={() => {
            setSelectedParticipants(new Set());
            loadCourseRunDetail();
          }}
        />
      )}
    </div>
  );
};

export default CourseRunDetail;
