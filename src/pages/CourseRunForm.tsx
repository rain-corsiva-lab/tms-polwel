import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import DateInput from "../components/ui/date-input";
import SafeDropdownMenu from "../components/ui/safe-dropdown-menu";
import { ArrowLeft, Calendar, Clock, MapPin, DollarSign, Users } from "lucide-react";
import { coursesApi, venuesApi, trainersApi, courseRunsApi, organizationsApi } from "../lib/api";
import { getErrorMessage } from "../lib/errorHandler";
import Swal from "sweetalert2";
import { toast } from "sonner";

interface Course {
  id: string;
  title: string;
  courseCode: string;
  category?: string;
  status?: string;
}

interface Venue {
  id: string;
  name: string;
  address?: string;
  venueType?: string;
  fee?: number;
  feeType?: string;
  maxParticipants?: number;
  perHeadPriceIfMaxExceed?: number;
}

interface Trainer {
  id: string;
  name: string;
  email: string;
  specializations?: string[];
  partnerOrganization?: string | null;
}

interface CourseRunFormData {
  // Basic Information
  serialNumber: string;
  courseRunType: string;
  courseId: string;
  courseCode: string;
  clientOrganizationId?: string;

  // Schedule
  startDate: string;
  endDate: string;

  // Venue & Settings
  venueType: string;
  venueId?: string;
  specifiedLocation?: string;
  minClassSize?: number;
  maxClassSize?: number;
  individualRegistrationRequired: boolean;
  remarks?: string;

  // Venue Fee Calculation (for per_venue type)
  venueFinalFee?: number;
  venueMaxParticipants?: number;
  perHeadFeeIfMaxExceed?: number;

  // Trainer Assignment
  selectedTrainers: string[];
  baseAmount?: number;
  additionalCosts?: number;

  // New fields
  additionalCostExceedingCapacity?: number;
  courseRunFeeType?: string;
}

const CourseRunForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get("courseId");

  const [activeTab, setActiveTab] = useState("course-info");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Data states
  const [courses, setCourses] = useState<Course[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [availableTrainers, setAvailableTrainers] = useState<Trainer[]>([]); // Filtered trainers based on course
  const [availableVenues, setAvailableVenues] = useState<Venue[]>([]);
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string; buNumber?: string }>>([]);
  const [trainerRemarks, setTrainerRemarks] = useState<{ [trainerId: string]: string }>({});
  const [trainerFees, setTrainerFees] = useState<{ [trainerId: string]: number }>({});

  // Form state
  const [formData, setFormData] = useState<CourseRunFormData>({
    serialNumber: "",
    courseRunType: "OPEN", // Set default to OPEN
    courseId: courseId || "",
    courseCode: "",
    clientOrganizationId: "",
    startDate: "",
    endDate: "",
    venueType: "",
    venueId: "",
    specifiedLocation: "",
    minClassSize: undefined,
    maxClassSize: undefined,
    individualRegistrationRequired: false,
    remarks: "",
    selectedTrainers: [],
    baseAmount: undefined,
    additionalCosts: undefined,

    additionalCostExceedingCapacity: undefined,
    courseRunFeeType: "PER_HEAD", // Default to PER_HEAD
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [coursesResponse, venuesResponse, trainersResponse, organizationsResponse] = await Promise.all([
          coursesApi.getAll({ limit: 1000, status: "ACTIVE" }),
          venuesApi.getAll(),
          trainersApi.getAll({ limit: 1000 }),
          organizationsApi.list(),
        ]);

        if (coursesResponse.success) {
          // Filter to only show ACTIVE courses and sort alphabetically by title
          const activeCourses = (coursesResponse.courses || [])
            .filter((c: Course) => c.status === "ACTIVE")
            .sort((a: Course, b: Course) => a.title.localeCompare(b.title));
          setCourses(activeCourses);
        }

        if (venuesResponse.success) {
          setVenues(venuesResponse.venues || []);
        }

        if (trainersResponse.trainers) {
          setTrainers(trainersResponse.trainers || []);
        }

        if (organizationsResponse.success && organizationsResponse.organizations) {
          setOrganizations(organizationsResponse.organizations || []);
        }

        // Pre-select course if courseId is provided
        if (courseId && coursesResponse.success) {
          const selectedCourse = coursesResponse.courses?.find((c: Course) => c.id === courseId && c.status === "ACTIVE");
          if (selectedCourse) {
            handleCourseChange(courseId);
          }
        }
      } catch (error: any) {
        console.error("Error loading initial data:", error);
        toast.error(getErrorMessage(error, "Failed to load form data"));
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [courseId]);

  // Generate serial number based on course code and start date
  const generateSerialNumber = (courseCode: string, startDate: string) => {
    if (!courseCode || !startDate) return "";

    const date = new Date(startDate);
    if (isNaN(date.getTime())) return ""; // Invalid date

    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear().toString().slice(-2);

    return `${courseCode}-${day}${month}${year}`;
  };

  // Calculate venue final fee based on venue type, participants, and pricing
  const calculateVenueFinalFee = (selectedVenueId: string, participantCount: number = 0) => {
    const selectedVenue = venues.find((v) => v.id === selectedVenueId);
    if (!selectedVenue) return null;

    // If per_head, simple multiplication
    if (selectedVenue.feeType?.toLowerCase() === "per_head") {
      return {
        finalFee: selectedVenue.fee * participantCount,
        venueFee: selectedVenue.fee,
        feeType: "per_head" as const,
        participantCount,
      };
    }

    // If per_venue, apply max participant logic
    if (selectedVenue.feeType?.toLowerCase() === "per_venue") {
      const baseFee = selectedVenue.fee;
      const maxParticipants = selectedVenue.maxParticipants || 0;
      const perHeadExceed = selectedVenue.perHeadPriceIfMaxExceed || 0;

      let finalFee = baseFee;

      if (maxParticipants > 0 && participantCount > maxParticipants && perHeadExceed > 0) {
        const extraParticipants = participantCount - maxParticipants;
        finalFee = baseFee + extraParticipants * perHeadExceed;
      }

      return {
        finalFee,
        venueFee: baseFee,
        feeType: "per_venue" as const,
        participantCount,
        maxParticipants,
        perHeadExceed,
      };
    }

    return null;
  };

  // Handle course selection
  const handleCourseChange = async (selectedCourseId: string) => {
    const selectedCourse = courses.find((c) => c.id === selectedCourseId);
    if (selectedCourse) {
      // Get full course details including all fields
      try {
        const response = await coursesApi.getById(selectedCourseId);
        if (response?.success && response?.data?.course) {
          const course = response.data.course;
          console.log("Course details loaded:", { courseId: course.id, venueField: course.venue });

          // Auto-select venue and venueType from course
          let autoVenueId = "";
          let autoVenueType = "";

          // course.venueId is a foreign key to the Venue model
          if (course.venueId) {
            const courseVenueId = course.venueId; // This is the venue ID FK
            const courseVenue = venues.find((v) => v.id === courseVenueId);

            if (courseVenue) {
              autoVenueType = courseVenue.venueType || "";
              autoVenueId = courseVenue.id || "";

              console.log("Found course venue:", { venueId: autoVenueId, venueType: autoVenueType, venueName: courseVenue.name });

              // Load venues by type FIRST and wait for it
              if (autoVenueType) {
                try {
                  const venuesResponse = await venuesApi.getAll();
                  if (venuesResponse.success) {
                    const filteredList = (venuesResponse.venues || []).filter((v: any) => v.venueType?.toUpperCase() === autoVenueType.toUpperCase());
                    setAvailableVenues(filteredList);
                    console.log("Loaded venues for type", autoVenueType, ":", filteredList.length, "venues");
                  }
                } catch (err) {
                  console.error("Error loading venues by type:", err);
                }
              }
            } else {
              console.warn("Venue ID from course not found in venues list:", courseVenueId);
            }
          }

          // Create new form data with course details and reset trainers
          const newFormData = {
            ...formData,
            courseId: selectedCourseId,
            courseCode: course.courseCode || "",
            selectedTrainers: [], // Clear selected trainers when course changes
            // Auto-populate venue-related fields from course
            venueType: autoVenueType,
            venueId: autoVenueId,
            maxClassSize: course.venueMaxParticipants || course.maxParticipants || undefined,
            minClassSize: course.minParticipants || undefined,
            baseAmount: course.defaultCourseFee || undefined,
            venueFinalFee: course.venueFee || undefined,
            venueMaxParticipants: course.venueMaxParticipants || undefined,
            perHeadFeeIfMaxExceed: course.perHeadPriceIfMaxExceed ? parseFloat(String(course.perHeadPriceIfMaxExceed)) : undefined,

            additionalCostExceedingCapacity: undefined,
          };

          // Regenerate serial number if start date exists
          if (newFormData.startDate) {
            newFormData.serialNumber = generateSerialNumber(course.courseCode || "", newFormData.startDate);
          }

          console.log("Setting form data with venue:", { venueType: newFormData.venueType, venueId: newFormData.venueId });
          // Update form data after venues are loaded
          setFormData(newFormData);
        }
        // Fetch available trainers for this course
        await filterTrainersByCourse(selectedCourseId);
      } catch (error) {
        console.error("Error fetching course details:", error);
      }
    }
  }; // Check if trainer has schedule conflict
  const checkTrainerAvailability = async (trainerId: string, startDate: string, endDate: string): Promise<boolean> => {
    if (!startDate || !endDate) return true; // Can't check without dates

    try {
      // Fetch trainer's existing course runs
      const response = await courseRunsApi.getAll({ limit: 1000 });
      const allCourseRuns = response?.courseRuns || [];

      // Check for overlapping dates
      const start = new Date(startDate);
      const end = new Date(endDate);

      for (const run of allCourseRuns) {
        // Check if this course run has the trainer assigned
        if (run.courseRunTrainers && Array.isArray(run.courseRunTrainers)) {
          const hasTrainer = run.courseRunTrainers.some((crt: any) => crt.trainerId === trainerId);

          if (hasTrainer && run.startDate && run.endDate) {
            const runStart = new Date(run.startDate);
            const runEnd = new Date(run.endDate);

            // Check for date overlap
            if (start <= runEnd && end >= runStart) {
              return false; // Conflict found
            }
          }
        }
      }

      return true; // No conflict
    } catch (error) {
      console.error("Error checking trainer availability:", error);
      return true; // Allow on error to not block
    }
  };

  // Filter trainers based on course and availability
  const filterTrainersByCourse = async (courseId: string) => {
    try {
      // Fetch course details including courseTrainers
      const response = await coursesApi.getById(courseId);
      const course = response?.data?.course || response?.data || response;

      if (course && Array.isArray(course.courseTrainers)) {
        // Extract trainer IDs, remarks, and fees from courseTrainers pivot table
        const courseTrainerIds = course.courseTrainers.map((ct: any) => ct.trainerId);
        const remarksMap: { [key: string]: string } = {};
        const feesMap: { [key: string]: number } = {};

        course.courseTrainers.forEach((ct: any) => {
          if (ct.trainerId) {
            remarksMap[ct.trainerId] = ct.remarks || "";
            feesMap[ct.trainerId] = ct.feePerRun || 0;
          }
        });

        setTrainerRemarks(remarksMap);
        setTrainerFees(feesMap);

        // Filter trainers to only those connected to this course
        let filtered = trainers.filter((trainer) => courseTrainerIds.includes(trainer.id));

        // If dates are selected, filter out trainers with conflicts
        if (formData.startDate && formData.endDate) {
          const availabilityChecks = await Promise.all(
            filtered.map(async (trainer) => ({
              trainer,
              available: await checkTrainerAvailability(trainer.id, formData.startDate, formData.endDate),
            })),
          );

          filtered = availabilityChecks.filter((check) => check.available).map((check) => check.trainer);
        }

        setAvailableTrainers(filtered);
      } else {
        // If no courseTrainers found, show no trainers
        setAvailableTrainers([]);
        setTrainerRemarks({});
        setTrainerFees({});
      }
    } catch (error) {
      console.error("Error filtering trainers by course:", error);
      setAvailableTrainers([]);
      setTrainerRemarks({});
      setTrainerFees({});
    }
  };

  // Auto-calculate contract fees when trainers are selected
  useEffect(() => {
    if (formData.selectedTrainers.length > 0) {
      const totalFees = formData.selectedTrainers.reduce((sum, trainerId) => {
        return sum + (trainerFees[trainerId] || 0);
      }, 0);

      // Only update if different to avoid infinite loop
      if (formData.baseAmount !== totalFees) {
        setFormData((prev) => ({ ...prev, baseAmount: totalFees }));
      }
    }
  }, [formData.selectedTrainers, trainerFees]);

  // Handle start date change to regenerate serial number and re-filter trainers
  const handleStartDateChange = (date: string) => {
    const newFormData = { ...formData, startDate: date };

    if (newFormData.courseCode) {
      newFormData.serialNumber = generateSerialNumber(newFormData.courseCode, date);
    }

    setFormData(newFormData);

    // Re-filter trainers based on new date range if course is selected
    if (newFormData.courseId && newFormData.endDate) {
      filterTrainersByCourse(newFormData.courseId);
    }
  };

  // Handle end date change to re-filter trainers
  const handleEndDateChange = (date: string) => {
    setFormData({ ...formData, endDate: date });

    // Re-filter trainers based on new date range if course is selected
    if (formData.courseId && formData.startDate) {
      filterTrainersByCourse(formData.courseId);
    }
  };

  // Handle venue type change
  const handleVenueTypeChange = (venueType: string) => {
    setFormData({ ...formData, venueType, venueId: "" });
    loadVenuesByType(venueType);
  };

  // Load venues by type
  const loadVenuesByType = async (venueType: string) => {
    try {
      const response = await venuesApi.getAll();
      if (response.success) {
        const list = (response.venues || []).filter((v: Venue) => v.venueType?.toUpperCase() === venueType.toUpperCase());
        setAvailableVenues(list);
      }
    } catch (error) {
      console.error("Error loading venues by type:", error);
      setAvailableVenues([]);
    }
  };

  // Handle form field changes
  const handleFieldChange = (field: keyof CourseRunFormData, value: any) => {
    // If venue changed, pre-fill venue-related override fields from selected venue
    if (field === "venueId") {
      const selectedVenue = venues.find((v) => v.id === value);
      if (selectedVenue) {
        setFormData({
          ...formData,
          [field]: value,
          venueMaxParticipants: selectedVenue.maxParticipants || undefined,
          perHeadFeeIfMaxExceed: selectedVenue.perHeadPriceIfMaxExceed ? parseFloat(String(selectedVenue.perHeadPriceIfMaxExceed)) : undefined,
        });
        // Clear any previous error for venueId
        if (errors.venueId) setErrors({ ...errors, venueId: "" });
        return;
      }
    }

    // If courseRunType changed to OPEN, clear clientOrganizationId
    if (field === "courseRunType" && value === "OPEN") {
      setFormData({ ...formData, [field]: value, clientOrganizationId: "" });
      // Clear error for clientOrganizationId if exists
      if (errors.clientOrganizationId) {
        setErrors({ ...errors, clientOrganizationId: "" });
      }
      return;
    }

    setFormData({ ...formData, [field]: value });

    // Clear error for this field
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  // Validation
  const validateForm = (isDraft: boolean = false) => {
    const newErrors: Record<string, string> = {};

    if (!isDraft) {
      // Required field validations for full submission
      if (!formData.serialNumber) newErrors.serialNumber = "Course Run Code is required";
      if (!formData.courseRunType) newErrors.courseRunType = "Course Run Type is required";
      if (!formData.courseId) newErrors.courseId = "Course is required";
      if (!formData.startDate) newErrors.startDate = "Start Date is required";
      if (!formData.endDate) newErrors.endDate = "End Date is required";
      if (!formData.venueType) newErrors.venueType = "Venue type is required";
      // Require organiser for DEDICATED, TALKS, or CUSTOMIZED
      if (
        (formData.courseRunType === "DEDICATED" || formData.courseRunType === "TALKS" || formData.courseRunType === "CUSTOMIZED") &&
        !formData.clientOrganizationId
      ) {
        newErrors.clientOrganizationId = "Organiser is required";
      }
      if (formData.minClassSize !== undefined && formData.minClassSize < 0) {
        newErrors.minClassSize = "Min Class Size must be 0 or greater";
      }
      if (formData.baseAmount !== undefined && formData.baseAmount < 0) {
        newErrors.baseAmount = "Base Amount must be 0 or greater";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (isDraft: boolean = false) => {
    // For draft mode, only require course selection
    if (isDraft) {
      if (!formData.courseId) {
        toast.error("Please select a course before saving as draft");
        return;
      }
    } else {
      // For full submission, validate all fields
      if (!validateForm(isDraft)) {
        toast.error("Please fix the validation errors");
        return;
      }
    }

    setSubmitting(true);

    try {
      // Prepare submission data (dates only, time set to 00:00:00)
      const startDatetime = formData.startDate ? new Date(`${formData.startDate}T09:00:00`).toISOString() : null;
      const endDatetime = formData.endDate ? new Date(`${formData.endDate}T17:00:00`).toISOString() : null;

      // Get venue fee and fee type from selected venue
      const selectedVenue = venues.find((v) => v.id === formData.venueId);
      const venueFee = selectedVenue?.fee ?? null;
      // Use courseRunFeeType from form, fallback to venue fee type
      const courseRunFeeType = formData.courseRunFeeType
        ? String(formData.courseRunFeeType).toUpperCase()
        : selectedVenue?.feeType
          ? String(selectedVenue.feeType).toUpperCase()
          : "PER_HEAD";

      // Prepare trainer assignments
      const trainerAssignments = formData.selectedTrainers.map((trainerId) => ({
        trainerId,
        trainerBaseAmount: formData.baseAmount ?? null,
        additionalCost: formData.additionalCosts ?? null,
      }));

      const submissionData = {
        serialNumber: formData.serialNumber || null,
        courseRunType: formData.courseRunType || null,
        courseId: formData.courseId,
        startDatetime,
        endDatetime,
        venueId: formData.venueId || null,
        venueFee: venueFee,
        feeType: courseRunFeeType, // Use courseRunFeeType from form with fallback
        courseRunFeeType: courseRunFeeType, // Add explicit courseRunFeeType field
        venueMaxParticipant: formData.venueMaxParticipants ?? null,
        perHeadFeeIfMaxExceed: formData.perHeadFeeIfMaxExceed ?? null,
        venueType: formData.venueType || null, // Send null instead of empty string
        specifiedLocation: formData.specifiedLocation || null,
        minClassSize: formData.minClassSize ?? null,
        maxClassSize: formData.maxClassSize ?? null,
        individualRegistrationRequired: formData.individualRegistrationRequired,
        remarks: formData.remarks || null,
        baseCourseFee: formData.baseAmount ?? null,
        otherFee: formData.additionalCosts ?? null,
        status: isDraft ? "DRAFT" : "PENDING", // Set to PENDING when all validation passes
        trainers: trainerAssignments, // Include trainer assignments
        clientOrganizationId: formData.clientOrganizationId || null,
      };

      const response = await courseRunsApi.create(submissionData);

      if (response.success) {
        toast.success(`Course run ${isDraft ? "saved as draft" : "created"} successfully`);
        navigate("/course-runs");
      } else {
        throw new Error(getErrorMessage(response, "Failed to create course run"));
      }
    } catch (error: any) {
      console.error("Error submitting form:", error);
      toast.error(getErrorMessage(error, "Failed to create course run"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading form data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/course-runs")} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Course Runs
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Course Run</h1>
          <p className="text-gray-600">Set up a new course run with detailed information</p>
        </div>
      </div>

      {/* Form Tabs */}
      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="course-info">Course Run Information</TabsTrigger>
              <TabsTrigger value="learner-particulars">Participants</TabsTrigger>
              <TabsTrigger value="trainer-assignment">Trainer Assignment</TabsTrigger>
            </TabsList>

            {/* Course Run Information Tab */}
            <TabsContent value="course-info" className="space-y-6 mt-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Course */}
                  <div>
                    <Label htmlFor="course">Course *</Label>
                    <Select value={formData.courseId} onValueChange={handleCourseChange}>
                      <SelectTrigger className={errors.courseId ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select a course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.courseId && <p className="text-sm text-red-500 mt-1">{errors.courseId}</p>}
                  </div>

                  {/* Course Code - Disabled */}
                  <div>
                    <Label htmlFor="courseCode">Course Code</Label>
                    <Input id="courseCode" value={formData.courseCode} disabled className="bg-gray-50" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">Schedule</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                  {/* Start Date */}
                  <div>
                    <Label htmlFor="startDate">Start Date *</Label>
                    <DateInput
                      id="startDate"
                      value={formData.startDate}
                      onChange={(date) => handleStartDateChange(date || "")}
                      className={errors.startDate ? "border-red-500" : ""}
                    />
                    {errors.startDate && <p className="text-sm text-red-500 mt-1">{errors.startDate}</p>}
                  </div>

                  {/* End Date */}
                  <div>
                    <Label htmlFor="endDate">End Date *</Label>
                    <DateInput
                      id="endDate"
                      value={formData.endDate}
                      onChange={(date) => handleEndDateChange(date || "")}
                      className={errors.endDate ? "border-red-500" : ""}
                    />
                    {errors.endDate && <p className="text-sm text-red-500 mt-1">{errors.endDate}</p>}
                  </div>
                </div>
              </div>

              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                  {/* Course Run Code */}
                  <div>
                    <Label htmlFor="serialNumber">Course Run Code *</Label>
                    <Input
                      id="serialNumber"
                      disabled
                      value={formData.serialNumber}
                      onChange={(e) => handleFieldChange("serialNumber", e.target.value)}
                      placeholder="e.g., CR001/25"
                      className={errors.serialNumber ? "border-red-500" : ""}
                    />
                    {errors.serialNumber && <p className="text-sm text-red-500 mt-1">{errors.serialNumber}</p>}
                  </div>

                  {/* Course Run Type */}
                  <div>
                    <Label htmlFor="courseRunType">Course Run Type *</Label>
                    <Select value={formData.courseRunType} onValueChange={(value) => handleFieldChange("courseRunType", value)}>
                      <SelectTrigger className={errors.courseRunType ? "border-red-500" : ""}>
                        <SelectValue placeholder="Open" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPEN">Open</SelectItem>
                        <SelectItem value="DEDICATED">Dedicated</SelectItem>
                        <SelectItem value="TALKS">Talks</SelectItem>
                        <SelectItem value="CUSTOMIZED">Customized</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.courseRunType && <p className="text-sm text-red-500 mt-1">{errors.courseRunType}</p>}
                  </div>
                </div>
              </div>

              {/* Organiser Field - Only show for DEDICATED, TALKS, or CUSTOMIZED */}
              {(formData.courseRunType === "DEDICATED" || formData.courseRunType === "TALKS" || formData.courseRunType === "CUSTOMIZED") && (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="clientOrganizationId">Organisation *</Label>
                      <Select value={formData.clientOrganizationId || ""} onValueChange={(value) => handleFieldChange("clientOrganizationId", value)}>
                        <SelectTrigger className={errors.clientOrganizationId ? "border-red-500" : ""}>
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
                      {errors.clientOrganizationId && <p className="text-sm text-red-500 mt-1">{errors.clientOrganizationId}</p>}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-lg font-medium mb-4">Venue & Settings</h3>
                <div className="space-y-4">
                  {/* Venue Type and Venue Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="venueType">Venue</Label>
                      <Select value={formData.venueType} onValueChange={handleVenueTypeChange}>
                        <SelectTrigger className={errors.venueType ? "border-red-500" : ""}>
                          <SelectValue placeholder="Select venue type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HOTEL">Hotel</SelectItem>
                          <SelectItem value="ON_PREMISE">On Premise</SelectItem>
                          <SelectItem value="CLIENT_FACILITY">Client Facility</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.venueType && <p className="text-sm text-red-500 mt-1">{errors.venueType}</p>}
                    </div>

                    {/* Conditional Venue Selection */}
                    {formData.venueType && availableVenues.length > 0 && (
                      <div>
                        <Label htmlFor="venue">
                          {formData.venueType === "HOTEL" ? "Hotel" : formData.venueType === "ON_PREMISE" ? "On Premise Venue" : "Client Facility Venue"}
                        </Label>
                        <Select value={formData.venueId || ""} onValueChange={(value) => handleFieldChange("venueId", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder={`Select ${formData.venueType.toLowerCase().replace("_", " ")}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableVenues.map((venue) => (
                              <SelectItem key={venue.id} value={venue.id}>
                                {venue.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {/* If selected venue is per_venue, show override fields */}
                    {formData.venueId &&
                      (() => {
                        const sel = availableVenues.find((v) => v.id === formData.venueId);
                        if (sel && sel.feeType?.toLowerCase() === "per_venue") {
                          return (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="venueMaxParticipants">Max Participants (Venue)</Label>
                                <Input
                                  id="venueMaxParticipants"
                                  type="number"
                                  min={1}
                                  value={formData.venueMaxParticipants ?? ""}
                                  onChange={(e) => handleFieldChange("venueMaxParticipants", e.target.value ? parseInt(e.target.value, 10) : undefined)}
                                  placeholder="Maximum participants allowed for this venue"
                                />
                                <p className="text-xs text-gray-500">If participants exceed this, per-head overage pricing applies</p>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="perHeadFeeIfMaxExceed">Per Head Price if Max Exceeded ($)</Label>
                                <Input
                                  id="perHeadFeeIfMaxExceed"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={formData.perHeadFeeIfMaxExceed ?? ""}
                                  onChange={(e) => handleFieldChange("perHeadFeeIfMaxExceed", e.target.value ? parseFloat(e.target.value) : undefined)}
                                  placeholder="Price per extra participant"
                                />
                                <p className="text-xs text-gray-500">Charge per participant beyond the maximum limit</p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                  </div>

                  {/* Specified Location */}
                  <div>
                    <Label htmlFor="specifiedLocation">Specified Location</Label>
                    <Textarea
                      id="specifiedLocation"
                      value={formData.specifiedLocation || ""}
                      onChange={(e) => handleFieldChange("specifiedLocation", e.target.value)}
                      placeholder="Enter specific location details"
                      rows={3}
                    />
                  </div>

                  {/* Class Size */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="minClassSize">Min Class Size *</Label>
                      <Input
                        id="minClassSize"
                        type="number"
                        min="0"
                        value={formData.minClassSize || ""}
                        onChange={(e) => handleFieldChange("minClassSize", e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="0"
                        className={errors.minClassSize ? "border-red-500" : ""}
                      />
                      {errors.minClassSize && <p className="text-sm text-red-500 mt-1">{errors.minClassSize}</p>}
                    </div>

                    <div>
                      <Label htmlFor="maxClassSize">Max Class Size</Label>
                      <Input
                        id="maxClassSize"
                        type="number"
                        min="0"
                        value={formData.maxClassSize || ""}
                        onChange={(e) => handleFieldChange("maxClassSize", e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Individual Registration Required */}
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="individualRegistrationRequired"
                      checked={formData.individualRegistrationRequired}
                      onCheckedChange={(checked) => handleFieldChange("individualRegistrationRequired", checked)}
                    />
                    <Label htmlFor="individualRegistrationRequired">Individual Registration Required</Label>
                  </div>

                  {/* Remarks */}
                  <div>
                    <Label htmlFor="remarks">Remarks</Label>
                    <Textarea
                      id="remarks"
                      value={formData.remarks || ""}
                      onChange={(e) => handleFieldChange("remarks", e.target.value)}
                      placeholder="Enter any additional remarks..."
                      rows={4}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Participants Tab */}
            <TabsContent value="learner-particulars" className="space-y-6 mt-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Participant Management</h3>
                <p className="text-gray-600 mb-6">Manage participant enrollment and registration for this course run.</p>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                  <div className="text-gray-400 mb-4">
                    <Users className="h-16 w-16 mx-auto mb-2" />
                  </div>
                  <p className="text-gray-700 font-medium mb-2">Participant particulars will be managed after the course run is created.</p>
                  <p className="text-gray-600 text-sm">You can add participants individually or import them via CSV once the course run is set up.</p>
                </div>
              </div>
            </TabsContent>

            {/* Trainer Assignment Tab */}
            <TabsContent value="trainer-assignment" className="space-y-6 mt-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Select Trainers</h3>
                {!formData.courseId ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>Please select a course first to see available trainers.</p>
                  </div>
                ) : availableTrainers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No trainers are assigned to this course.</p>
                    <p className="text-sm mt-2">Please add trainers to the course first.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {availableTrainers.map((trainer) => (
                      <div key={trainer.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                        <input
                          type="checkbox"
                          id={`trainer-${trainer.id}`}
                          checked={formData.selectedTrainers.includes(trainer.id)}
                          onChange={(e) => {
                            const updatedTrainers = e.target.checked
                              ? [...formData.selectedTrainers, trainer.id]
                              : formData.selectedTrainers.filter((id) => id !== trainer.id);
                            handleFieldChange("selectedTrainers", updatedTrainers);
                          }}
                          className="rounded"
                        />
                        <label htmlFor={`trainer-${trainer.id}`} className="flex-1 cursor-pointer">
                          <div className="font-medium">{trainer.name}</div>
                          <div className="text-sm text-gray-500">{trainer.email}</div>
                          {trainer.partnerOrganization && <div className="text-sm text-gray-400">{trainer.partnerOrganization}</div>}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                {/* <h3 className="text-lg font-medium mb-4">Revenue & Expenses</h3> */}
                {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="courseFeeType">Course Fee Type</Label>
                    <Select
                      value={formData.courseFeeType || ""}
                      onValueChange={(value) => handleFieldChange("courseFeeType", value)}
                      disabled={!formData.courseId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select fee type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PER_HEAD">Per Head</SelectItem>
                        <SelectItem value="PER_RUN">Per Run</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">Synced from selected course</p>
                  </div>

                  <div>
                    <Label htmlFor="baseAmount">Base Course Fee</Label>
                    <Input
                      id="baseAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.baseAmount || ""}
                      onChange={(e) => handleFieldChange("baseAmount", e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="0"
                      disabled={!formData.courseId}
                    />
                    <p className="text-xs text-gray-500 mt-1">Synced from selected course</p>
                  </div>

                  <div>
                    <Label htmlFor="contractFees">Contract Fees (Auto-calculated from trainers)</Label>
                    <Input
                      id="contractFees"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.baseAmount || ""}
                      onChange={(e) => handleFieldChange("baseAmount", e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">Auto-calculated from selected trainers' fees, can be manually edited</p>
                  </div>

                  <div>
                    <Label htmlFor="additionalCostExceedingCapacity">Additional Cost Exceeding Capacity</Label>
                    <Input
                      id="additionalCostExceedingCapacity"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.additionalCostExceedingCapacity || ""}
                      onChange={(e) => handleFieldChange("additionalCostExceedingCapacity", e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="0"
                    />
                  </div>
                </div> */}

                {/* Trainer Remarks Section */}
                {formData.selectedTrainers.length > 0 && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-medium mb-2">Selected Trainers & Remarks:</h4>
                    <ul className="space-y-1 text-sm">
                      {formData.selectedTrainers.map((trainerId) => {
                        const trainer = availableTrainers.find((t) => t.id === trainerId);
                        const remarks = trainerRemarks[trainerId] || "No remarks";
                        const fee = trainerFees[trainerId] || 0;
                        return (
                          <li key={trainerId} className="text-gray-700">
                            - <span className="font-medium">{trainer?.name}</span> (${fee.toFixed(2)}) - {remarks}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={() => navigate("/course-runs")} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="outline" onClick={() => handleSubmit(true)} disabled={submitting}>
          {submitting ? "Saving..." : "Mark as Draft"}
        </Button>
        <Button onClick={() => handleSubmit(false)} disabled={submitting}>
          {submitting ? "Creating..." : "Create Course Run"}
        </Button>
      </div>
    </div>
  );
};

export default CourseRunForm;
