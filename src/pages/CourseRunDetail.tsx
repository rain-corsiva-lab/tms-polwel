import React, { useEffect, useState, useCallback } from "react";
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
import { courseRunsApi, coursesApi, venuesApi } from "../lib/api";
import { toast } from "sonner";
import SafeDropdownMenu from "../components/ui/safe-dropdown-menu";
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { AddLearnersDialog } from "../components/AddLearnersDialog";
import { ImportLearnersDialog } from "../components/ImportLearnersDialog";
import { EditLearnerDialog } from "../components/EditLearnerDialog";
import { SendTrainerEmailDialog } from "../components/SendTrainerEmailDialog";
import { AttendanceListDialog } from "../components/AttendanceListDialog";

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
  otherFee: number | null;
  adminFee: number | null;
  contingencyFee: number | null;
  feeType: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  courseRunTrainers: Array<{
    id: string;
    trainerBaseAmount: number;
    additionalCost: number;
    remarks: string;
    trainer: {
      id: string;
      name: string;
      email: string;
      partnerOrganization?: string;
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
  const [addLearnersDialogOpen, setAddLearnersDialogOpen] = useState(false);
  const [importLearnersDialogOpen, setImportLearnersDialogOpen] = useState(false);
  const [editLearnerDialogOpen, setEditLearnerDialogOpen] = useState(false);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<any>(null);

  // Trainer Assignment Edit Mode
  const [isEditingTrainers, setIsEditingTrainers] = useState(false);
  const [availableTrainers, setAvailableTrainers] = useState<any[]>([]);
  const [trainerAssignments, setTrainerAssignments] = useState<{
    [trainerId: string]: { selected: boolean; baseFee?: number | null; additionalCost?: number | null };
  }>({});
  const [sendEmailDialogOpen, setSendEmailDialogOpen] = useState(false);

  // Withdrawal Dialog State
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [withdrawalReason, setWithdrawalReason] = useState("");
  const [withdrawalDocument, setWithdrawalDocument] = useState<File | null>(null);
  const [withdrawalSubmitting, setWithdrawalSubmitting] = useState(false);
  const [selectedLearnerForWithdrawal, setSelectedLearnerForWithdrawal] = useState<any>(null);

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

  const initEditData = useCallback((cr: CourseRunDetailData) => {
    const start = cr.startDatetime ? new Date(cr.startDatetime) : null;
    const end = cr.endDatetime ? new Date(cr.endDatetime) : null;
    setEditData({
      serialNumber: cr.serialNumber || "",
      courseRunType: cr.courseRunType || "",
      courseId: cr.course?.id || "",
      courseCode: cr.course?.courseCode || "",
      startDate: start ? start.toISOString().substring(0, 10) : "",
      startTime: start ? start.toISOString().substring(11, 16) : "",
      endDate: end ? end.toISOString().substring(0, 10) : "",
      endTime: end ? end.toISOString().substring(11, 16) : "",
      venueType: cr.venueType || "",
      venueId: cr.venue?.id || "",
      specifiedLocation: cr.specifiedLocation || "",
      minClassSize: cr.minClassSize ?? "",
      maxClassSize: cr.maxClassSize ?? "",
      individualRegistrationRequired: !!cr.individualRegistrationRequired,
      remarks: cr.remarks || "",
      baseCourseFee: cr.baseCourseFee ?? "",
      venueFee: cr.venueFee ?? "",
      venueMaxParticipant: cr.venueMaxParticipant ?? "",
      perHeadFeeIfMaxExceed: cr.perHeadFeeIfMaxExceed ?? "",
      otherFee: cr.otherFee ?? "",
      adminFee: cr.adminFee ?? "",
      contingencyFee: cr.contingencyFee ?? "",
      feeType: cr.feeType || "",
    });
  }, []);

  useEffect(() => {
    if (id) {
      loadCourseRunDetail();
    }
  }, [id]);

  const loadCourseRunDetail = async () => {
    try {
      setLoading(true);
      const response = await courseRunsApi.getById(id!);

      if (response.success) {
        setCourseRun(response.courseRun);
        initEditData(response.courseRun);
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
    // Refresh the course run data to show newly enrolled learners
    loadCourseRunDetail();
    setAddLearnersDialogOpen(false);
    toast.success("Learners enrolled successfully!");
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

      toast.success(response?.message || "Learner marked as withdrawn successfully");
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

  // Trainer Assignment Functions
  const handleEditTrainers = async () => {
    if (!courseRun) return;

    try {
      // Fetch available trainers from the course
      const courseResponse = await coursesApi.getById(courseRun.course?.id || "");
      const course = courseResponse?.data?.course || courseResponse?.data || courseResponse;

      if (course && Array.isArray(course.courseTrainers)) {
        setAvailableTrainers(course.courseTrainers.map((ct: any) => ct.trainer));
      }

      // Initialize trainer assignments from current courseRunTrainers
      const assignments: { [key: string]: { selected: boolean; baseFee?: number | null; additionalCost?: number | null } } = {};
      courseRun.courseRunTrainers?.forEach((crt) => {
        assignments[crt.trainer.id] = {
          selected: true,
          baseFee: crt.trainerBaseAmount === null || crt.trainerBaseAmount === undefined ? null : Number(crt.trainerBaseAmount),
          additionalCost: crt.additionalCost === null || crt.additionalCost === undefined ? null : Number(crt.additionalCost),
        };
      });

      setTrainerAssignments(assignments);
      setIsEditingTrainers(true);
    } catch (error) {
      console.error("Error loading trainers:", error);
      toast.error("Failed to load trainers");
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
        }));

      // Call API to update trainer assignments
      await courseRunsApi.updateTrainerAssignments(courseRun.id, selectedTrainers);

      toast.success("Trainer assignments updated successfully!");
      setIsEditingTrainers(false);
      loadCourseRunDetail();
    } catch (error: any) {
      console.error("Error saving trainer assignments:", error);
      toast.error(error?.response?.data?.message || "Failed to update trainer assignments");
    }
  };

  const handleCancelTrainerEdit = () => {
    setIsEditingTrainers(false);
    setTrainerAssignments({});
  };

  const toggleTrainerSelection = (trainerId: string) => {
    setTrainerAssignments((prev) => ({
      ...prev,
      [trainerId]: {
        selected: !prev[trainerId]?.selected,
        baseFee: prev[trainerId]?.baseFee === undefined ? null : prev[trainerId]?.baseFee ?? null,
        additionalCost: prev[trainerId]?.additionalCost === undefined ? null : prev[trainerId]?.additionalCost ?? null,
      },
    }));
  };

  const updateTrainerFee = (trainerId: string, field: "baseFee" | "additionalCost", value: number | null) => {
    setTrainerAssignments((prev) => ({
      ...prev,
      [trainerId]: {
        ...(prev[trainerId] || { selected: false, baseFee: null, additionalCost: null }),
        [field]: value === null || value === undefined ? null : Number(value),
      },
    }));
  };

  const calculateTotalTrainerFees = () => {
    return Object.entries(trainerAssignments)
      .filter(([_, data]) => data.selected)
      .reduce((sum, [_, data]) => sum + safeNumber(data.baseFee, 0) + safeNumber(data.additionalCost, 0), 0);
  };

  const formatDateTime = (dateTime: string | null) => {
    if (!dateTime) return "—";
    const date = new Date(dateTime);
    return date.toLocaleString("en-SG", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
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

  const handleEditField = (field: string, value: any) => {
    setEditData((prev: any) => {
      const updated = { ...prev, [field]: value };
      // Auto update serialNumber when course or startDate changes
      if ((field === "courseId" || field === "startDate") && (updated.courseCode || updated.courseId)) {
        const theCourse = courses.find((c) => c.id === updated.courseId);
        if (theCourse) {
          updated.courseCode = theCourse.courseCode;
          updated.serialNumber = generateSerialNumber(theCourse.courseCode, updated.startDate);
        }
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
            updated.venueMaxParticipants = venue.maxParticipants;
          }
          if (venue.perHeadPriceIfMaxExceed !== undefined && venue.perHeadPriceIfMaxExceed !== null) {
            updated.perHeadFeeIfMaxExceed = venue.perHeadPriceIfMaxExceed;
          }
        }
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
        { key: "serialNumber", label: "Serial Number" },
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

      const missing = requiredFields.filter((f) => {
        const val = editData[f.key];
        return val === undefined || val === null || val === "";
      });
      if (missing.length > 0) {
        toast.error(`Missing required: ${missing.map((m) => m.label).join(", ")}`);
        setEditSubmitting(false);
        return;
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
        venueFee: editData.venueFee === "" ? null : Number(editData.venueFee),
        venueMaxParticipant: editData.venueMaxParticipants === "" ? null : Number(editData.venueMaxParticipants),
        perHeadFeeIfMaxExceed: editData.perHeadFeeIfMaxExceed === "" ? null : Number(editData.perHeadFeeIfMaxExceed),
        otherFee: editData.otherFee === "" ? null : Number(editData.otherFee),
        adminFee: editData.adminFee === "" ? null : Number(editData.adminFee),
        contingencyFee: editData.contingencyFee === "" ? null : Number(editData.contingencyFee),
        feeType: editData.feeType || null,
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
              <TabsTrigger value="learner-particulars">Learner Particulars ({courseRun.courseRunLearners?.length || 0})</TabsTrigger>
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
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Serial Number</Label>
                      <Input value={isEditing ? editData?.serialNumber : courseRun.serialNumber || ""} disabled className="bg-gray-50" />
                      <p className="text-xs text-gray-500">Auto-generated from Course Code + Start Date</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Course Code</Label>
                      <Input value={isEditing ? editData?.courseCode : courseRun.course?.courseCode || ""} disabled className="bg-gray-50" />
                    </div>
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

            {/* Learner Particulars Tab */}
            <TabsContent value="learner-particulars" className="space-y-6 mt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Learner Management</h3>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setImportLearnersDialogOpen(true)}>
                    <Download className="h-4 w-4 mr-2" />
                    Import CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setAttendanceDialogOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Attendance List
                  </Button>
                  <Button size="sm" onClick={() => setAddLearnersDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Learners
                  </Button>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Enrolled Learners ({courseRun.courseRunLearners?.length || 0})</CardTitle>
                  <Button variant="outline" size="sm" className="ml-auto" onClick={() => setAddLearnersDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Learners
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <input type="checkbox" className="rounded" />
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
                                  <input type="checkbox" className="rounded" />
                                </TableCell>
                                <TableCell className="font-medium">{learnerRecord.learner.fullname}</TableCell>
                                <TableCell>{learnerRecord.learner.email}</TableCell>
                                <TableCell>{learnerRecord.learner.contactNumber || "—"}</TableCell>
                                <TableCell>{learnerRecord.learner.designation || "—"}</TableCell>
                                <TableCell>{learnerRecord.paymentMode || "Online Payment"}</TableCell>
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
                                        !learnerRecord.confirmationEmailStatus) && (
                                        <DropdownMenuItem onClick={() => handleResendConfirmation(learnerRecord)}>Send Confirmation</DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedLearnerForWithdrawal(learnerRecord);
                                          setWithdrawalDialogOpen(true);
                                        }}
                                      >
                                        Mark as Withdrawn
                                      </DropdownMenuItem>
                                      <DropdownMenuItem>Remove</DropdownMenuItem>
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
                                <p className="text-lg font-medium mb-2">No learners enrolled</p>
                                <p className="text-sm">Add learners to get started.</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Withdrawn Learners Section */}
              {courseRun.courseRunLearners?.filter((l) => l.enrollmentStatus === "WITHDRAWN").length > 0 && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Withdrawn Learners ({courseRun.courseRunLearners?.filter((l) => l.enrollmentStatus === "WITHDRAWN").length || 0})</CardTitle>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSendEmailDialogOpen(true)}
                    disabled={!courseRun.courseRunTrainers || courseRun.courseRunTrainers.length === 0}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Send Trainer Assignment Email
                  </Button>
                  {!isEditingTrainers ? (
                    <Button size="sm" onClick={handleEditTrainers}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Trainer Assignment
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" onClick={handleCancelTrainerEdit}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveTrainerAssignments}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      {isEditingTrainers ? "Select & Configure Trainers" : "Trainer Assignment"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {isEditingTrainers
                        ? `${Object.values(trainerAssignments).filter((a) => a.selected).length} trainer(s) selected`
                        : `${courseRun.courseRunTrainers?.length || 0} trainer(s) selected`}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditingTrainers ? (
                    // EDIT MODE - Accordion style with checkboxes and fee inputs
                    <>
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
                    </>
                  ) : (
                    // READ-ONLY MODE
                    <>
                      {courseRun.courseRunTrainers?.length > 0 ? (
                        courseRun.courseRunTrainers.map((assignment) => (
                          <Card key={assignment.id} className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                  <Users className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <h4 className="font-medium">{assignment.trainer.name}</h4>
                                  <p className="text-sm text-gray-500">{assignment.trainer.partnerOrganization || "Internal Trainer"}</p>
                                </div>
                              </div>
                              <Badge variant="default">Selected</Badge>
                            </div>

                            <div className="mt-4 space-y-3">
                              <div>
                                <Label className="text-sm font-medium">Trainer Fees</Label>
                                <div className="mt-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm">Base Fee</span>
                                    <span className="text-sm font-medium">{currency(assignment.trainerBaseAmount || 0)}</span>
                                  </div>
                                  {assignment.additionalCost > 0 && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm">Additional Cost</span>
                                      <span className="text-sm font-medium">{currency(assignment.additionalCost || 0)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {assignment.remarks && (
                                <div>
                                  <Label className="text-sm font-medium">Remarks</Label>
                                  <p className="text-sm text-gray-600 mt-1">{assignment.remarks}</p>
                                  <p className="text-xs text-gray-500 mt-1">Remarks cannot be edited</p>
                                </div>
                              )}

                              <div className="border-t pt-3">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">Total for this trainer:</span>
                                  <span className="font-medium">
                                    {currency(safeNumber(assignment.trainerBaseAmount, 0) + safeNumber(assignment.additionalCost, 0))}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <Users className="h-12 w-12 mx-auto mb-4 opacity-50 text-gray-400" />
                          <p className="text-lg font-medium mb-2 text-gray-600">No trainers assigned</p>
                          <p className="text-sm text-gray-500">Assign trainers to this course run.</p>
                        </div>
                      )}

                      {courseRun.courseRunTrainers?.length > 0 && (
                        <Card className="bg-blue-50 border-blue-200">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-medium text-blue-800">Assignment Summary</span>
                              <div className="text-right">
                                <div className="text-sm text-blue-600">{courseRun.courseRunTrainers.length} trainer(s) assigned</div>
                                <div className="text-2xl font-bold text-blue-800">
                                  {currency(
                                    courseRun.courseRunTrainers.reduce(
                                      (sum, t) => sum + safeNumber(t.trainerBaseAmount, 0) + safeNumber(t.additionalCost, 0),
                                      0
                                    )
                                  )}
                                </div>
                                <div className="text-sm text-blue-600">Total Trainer Fees</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Fees & Expenses Tab */}
            <TabsContent value="fees-expenses" className="space-y-6 mt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Revenue & Expenses</h3>
              </div>

              <div className="space-y-6">
                {/* REVENUE SECTION */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-sm">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Revenue
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Default Course Fee ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={isEditing ? editData?.baseCourseFee : courseRun.baseCourseFee ?? ""}
                        disabled={!isEditing}
                        onChange={(e) => handleEditField("baseCourseFee", e.target.value)}
                        className={isEditing ? "" : "bg-gray-50"}
                      />
                      <p className="text-xs text-gray-500">Fee charged to learners/client per pax</p>
                    </div>
                  </CardContent>
                </Card>

                {/* EXPENSES SECTION */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Expenses</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Contract Fees */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Contract Fees ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={isEditing ? editData?.contractFees : courseRun.contractFees ?? ""}
                        disabled={!isEditing}
                        onChange={(e) => handleEditField("contractFees", e.target.value)}
                        className={isEditing ? "" : "bg-gray-50"}
                      />
                      <p className="text-xs text-gray-500">Contract/trainer fees paid out</p>
                    </div>

                    {/* Venue Fee Type */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Venue Fee Type</Label>
                      {isEditing ? (
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
                        value={isEditing ? editData?.venueFee : courseRun.venueFee ?? ""}
                        disabled={!isEditing}
                        onChange={(e) => handleEditField("venueFee", e.target.value)}
                        className={isEditing ? "" : "bg-gray-50"}
                      />
                      <p className="text-xs text-gray-500">Base venue rental fee</p>
                    </div>

                    {/* Show venue-specific fields if PER_VENUE fee type */}
                    {(isEditing ? editData?.feeType : courseRun.feeType) === "PER_VENUE" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Max Participants (Venue)</Label>
                          <Input
                            type="number"
                            min="1"
                            value={isEditing ? editData?.venueMaxParticipant : courseRun.venueMaxParticipant ?? ""}
                            disabled={!isEditing}
                            onChange={(e) => handleEditField("venueMaxParticipant", e.target.value)}
                            className={isEditing ? "" : "bg-gray-50"}
                          />
                          <p className="text-xs text-gray-500">Maximum participants before per-head charges apply</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Per Head Fee if Max Exceeded ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={isEditing ? editData?.perHeadFeeIfMaxExceed : courseRun.perHeadFeeIfMaxExceed ?? ""}
                            disabled={!isEditing}
                            onChange={(e) => handleEditField("perHeadFeeIfMaxExceed", e.target.value)}
                            className={isEditing ? "" : "bg-gray-50"}
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
                          value={isEditing ? editData?.otherFee : courseRun.otherFee ?? ""}
                          disabled={!isEditing}
                          onChange={(e) => handleEditField("otherFee", e.target.value)}
                          className={isEditing ? "" : "bg-gray-50"}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Admin Fees ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={isEditing ? editData?.adminFee : courseRun.adminFee ?? ""}
                          disabled={!isEditing}
                          onChange={(e) => handleEditField("adminFee", e.target.value)}
                          className={isEditing ? "" : "bg-gray-50"}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Contingency Fees ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={isEditing ? editData?.contingencyFee : courseRun.contingencyFee ?? ""}
                          disabled={!isEditing}
                          onChange={(e) => handleEditField("contingencyFee", e.target.value)}
                          className={isEditing ? "" : "bg-gray-50"}
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
                      const baseFee = safeNumber(courseRun.venueFee ?? courseRun.venue?.fee ?? 0);
                      const maxP = courseRun.venueMaxParticipant ?? courseRun.venue?.maxParticipants ?? 0;
                      const perHeadExceed = safeNumber(courseRun.perHeadFeeIfMaxExceed ?? courseRun.venue?.perHeadPriceIfMaxExceed ?? 0);
                      const finalFee = safeNumber(courseRun.venueFinalFee ?? 0);

                      if (courseRun.feeType === "PER_HEAD") {
                        return (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                              <div>
                                <p className="text-xs text-gray-600 mb-1">Participants (Enrolled)</p>
                                <p className="text-2xl font-bold text-blue-600">{participants}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600 mb-1">Per Head Rate</p>
                                <p className="text-2xl font-bold text-blue-600">{currency(baseFee)}</p>
                              </div>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-600 mb-2">Calculation Formula:</p>
                              <div className="font-mono text-sm bg-white p-3 rounded border">
                                <div className="flex items-center gap-2">
                                  <span className="text-blue-600 font-semibold">{participants}</span>
                                  <span className="text-gray-400">×</span>
                                  <span className="text-blue-600 font-semibold">{currency(baseFee)}</span>
                                  <span className="text-gray-400">=</span>
                                  <span className="text-green-600 font-bold text-lg">{currency(finalFee)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                              <span className="text-sm font-medium text-gray-700">Final Venue Fee:</span>
                              <span className="text-2xl font-bold text-green-700">{currency(finalFee)}</span>
                            </div>
                          </div>
                        );
                      }

                      if (courseRun.feeType === "PER_VENUE") {
                        const hasExcess = maxP > 0 && participants > maxP && perHeadExceed > 0;
                        const excess = hasExcess ? participants - maxP : 0;
                        const excessFee = hasExcess ? excess * perHeadExceed : 0;

                        return (
                          <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
                              <div>
                                <p className="text-xs text-gray-600 mb-1">Participants</p>
                                <p className="text-2xl font-bold text-blue-600">{participants}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600 mb-1">Base Venue Fee</p>
                                <p className="text-2xl font-bold text-blue-600">{currency(baseFee)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600 mb-1">Max Capacity</p>
                                <p className="text-2xl font-bold text-blue-600">{maxP || "∞"}</p>
                              </div>
                            </div>

                            {hasExcess && (
                              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                                <div className="flex items-center gap-2 mb-2">
                                  <AlertCircle className="h-4 w-4 text-orange-600" />
                                  <p className="text-sm font-medium text-orange-800">Capacity Exceeded</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-3">
                                  <div>
                                    <p className="text-xs text-gray-600">Extra Participants</p>
                                    <p className="text-lg font-bold text-orange-600">{excess}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600">Per Head Excess Fee</p>
                                    <p className="text-lg font-bold text-orange-600">{currency(perHeadExceed)}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="p-4 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-600 mb-2">Calculation Formula:</p>
                              <div className="font-mono text-sm bg-white p-3 rounded border space-y-1">
                                {hasExcess ? (
                                  <>
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-600">Base Fee:</span>
                                      <span className="text-blue-600 font-semibold">{currency(baseFee)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-600">Excess Fee:</span>
                                      <span className="text-blue-600 font-semibold">
                                        ({participants} - {maxP})
                                      </span>
                                      <span className="text-gray-400">×</span>
                                      <span className="text-blue-600 font-semibold">{currency(perHeadExceed)}</span>
                                      <span className="text-gray-400">=</span>
                                      <span className="text-orange-600 font-semibold">{currency(excessFee)}</span>
                                    </div>
                                    <div className="border-t pt-2 mt-2 flex items-center gap-2">
                                      <span className="text-gray-600">Total:</span>
                                      <span className="text-blue-600 font-semibold">{currency(baseFee)}</span>
                                      <span className="text-gray-400">+</span>
                                      <span className="text-orange-600 font-semibold">{currency(excessFee)}</span>
                                      <span className="text-gray-400">=</span>
                                      <span className="text-green-600 font-bold text-lg">{currency(finalFee)}</span>
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-600">Base Fee:</span>
                                    <span className="text-blue-600 font-semibold">{currency(baseFee)}</span>
                                    <span className="text-gray-400">=</span>
                                    <span className="text-green-600 font-bold text-lg">{currency(finalFee)}</span>
                                    <span className="text-xs text-gray-500">(within capacity)</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                              <span className="text-sm font-medium text-gray-700">Final Venue Fee:</span>
                              <span className="text-2xl font-bold text-green-700">{currency(finalFee)}</span>
                            </div>
                          </div>
                        );
                      }

                      // Default/FIXED or no fee type
                      return (
                        <div className="p-4 bg-gray-50 rounded-lg text-center">
                          <p className="text-sm text-gray-600 mb-2">No fee calculation formula available</p>
                          <p className="text-2xl font-bold text-gray-700">{currency(finalFee)}</p>
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
      <AttendanceListDialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen} courseRunId={id!} onSaved={loadCourseRunDetail} />
      <EditLearnerDialog
        open={editLearnerDialogOpen}
        onOpenChange={setEditLearnerDialogOpen}
        courseRunId={id!}
        enrollment={selectedEnrollment}
        baseCourseFee={courseRun?.baseCourseFee || 0}
        discounts={(courseRun?.course?.discounts || []).map((d: any) => ({ id: d.id, name: d.name || "", percentage: d.discountPercentage ?? 0 }))}
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
            <DialogDescription>Mark {selectedLearnerForWithdrawal?.learner?.fullname} as withdrawn from this course run.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
                    setWithdrawalDocument(file);
                  }
                }}
              />
              {withdrawalDocument && <p className="text-sm text-muted-foreground">Selected: {withdrawalDocument.name}</p>}
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
    </div>
  );
};

export default CourseRunDetail;
