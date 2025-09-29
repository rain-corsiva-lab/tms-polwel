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
import { EditLearnerDialog } from "../components/EditLearnerDialog";

interface CourseRunDetailData {
  id: string;
  serialNumber: string;
  courseRunType: string;
  course: {
    id: string | null;
    title: string | null;
    courseCode: string | null;
    category: string | null;
  } | null;
  startDatetime: string | null;
  endDatetime: string | null;
  venue: {
    id: string;
    name: string;
    address: string;
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
  const [editLearnerDialogOpen, setEditLearnerDialogOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<any>(null);

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
        if (venue && venue.feeType) {
          const raw = String(venue.feeType).toUpperCase();
          if (raw === "PER_HEAD" || raw === "PER_VENUE") {
            updated.feeType = raw;
          } else {
            // backend might send lowercase
            if (raw === "PER_HEAD".toLowerCase()) updated.feeType = "PER_HEAD";
            if (raw === "PER_VENUE".toLowerCase()) updated.feeType = "PER_VENUE";
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
              <TabsTrigger value="fees-expenses">Fees & Expenses</TabsTrigger>
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
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Import CSV
                  </Button>
                  <Button variant="outline" size="sm">
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
                          <TableHead>Confirmation</TableHead>
                          <TableHead className="w-12">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {courseRun.courseRunLearners?.length > 0 ? (
                          courseRun.courseRunLearners.map((learnerRecord) => (
                            <TableRow key={learnerRecord.id}>
                              <TableCell>
                                <input type="checkbox" className="rounded" />
                              </TableCell>
                              <TableCell className="font-medium">{learnerRecord.learner.fullname}</TableCell>
                              <TableCell>{learnerRecord.learner.email}</TableCell>
                              <TableCell>{learnerRecord.learner.contactNumber || "—"}</TableCell>
                              <TableCell>{learnerRecord.learner.designation || "—"}</TableCell>
                              <TableCell>Online Payment</TableCell>
                              <TableCell>{getEnrollmentStatusBadge(learnerRecord.enrollmentStatus || "ENROLLED")}</TableCell>
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
                                    <DropdownMenuItem>Remove</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </SafeDropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8">
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
            </TabsContent>

            {/* Trainer Assignment Tab */}
            <TabsContent value="trainer-assignment" className="space-y-6 mt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Trainer Assignment</h3>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Mail className="h-4 w-4 mr-2" />
                    Send Trainer Assignment Email
                  </Button>
                  <Button size="sm">Edit Trainer Assignment</Button>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Trainer Assignment
                    </div>
                    <div className="text-sm text-gray-500">{courseRun.courseRunTrainers?.length || 0} trainer(s) selected</div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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

                          <div>
                            <Label className="text-sm font-medium">Remarks</Label>
                            <p className="text-sm text-gray-600 mt-1">{assignment.remarks || "Preferred for technical courses."}</p>
                            <p className="text-xs text-gray-500 mt-1">Remarks cannot be edited</p>
                          </div>

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
                                courseRun.courseRunTrainers.reduce((sum, t) => sum + safeNumber(t.trainerBaseAmount, 0) + safeNumber(t.additionalCost, 0), 0)
                              )}
                            </div>
                            <div className="text-sm text-blue-600">Total Trainer Fees</div>
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
                <h3 className="text-lg font-medium">Fees & Expenses</h3>
                {/* <Button variant="outline" size="sm" className="bg-blue-600 text-white hover:bg-blue-700">
                  Edit Fees & Expenses
                </Button> */}
              </div>

              <div className="space-y-6">
                {/* Course Fee Configuration */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-sm">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Course Fee Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Course Fee ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={isEditing ? editData?.baseCourseFee : courseRun.baseCourseFee ?? ""}
                        disabled={!isEditing}
                        onChange={(e) => handleEditField("baseCourseFee", e.target.value)}
                        className={isEditing ? "" : "bg-gray-50"}
                      />
                      <p className="text-xs text-gray-500">Base fee for this course run</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Fee Type</Label>
                      <Input value={isEditing ? editData?.feeType || courseRun.feeType || "" : courseRun.feeType || ""} disabled className="bg-gray-50" />
                      <p className="text-xs text-gray-500">Derived from selected venue (PER_HEAD / PER_VENUE)</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Additional Fees */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Additional Fees</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Venue Fee ($) — per venue</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={isEditing ? editData?.venueFee : courseRun.venueFee ?? ""}
                        disabled={!isEditing}
                        onChange={(e) => handleEditField("venueFee", e.target.value)}
                        className={isEditing ? "" : "bg-gray-50"}
                      />
                    </div>
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
      <EditLearnerDialog
        open={editLearnerDialogOpen}
        onOpenChange={setEditLearnerDialogOpen}
        courseRunId={id!}
        enrollment={selectedEnrollment}
        baseCourseFee={courseRun?.baseCourseFee || 0}
        discounts={courseRun?.course?.discounts || []}
        onSuccess={handleEnrollmentSuccess}
      />
    </div>
  );
};

export default CourseRunDetail;
