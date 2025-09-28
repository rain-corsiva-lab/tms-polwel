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
import { ArrowLeft, Calendar, Clock, MapPin, DollarSign, Users } from "lucide-react";
import { coursesApi, venuesApi, trainersApi, courseRunsApi } from "../lib/api";
import Swal from "sweetalert2";
import { toast } from "sonner";

interface Course {
  id: string;
  title: string;
  courseCode: string;
  category?: string;
}

interface Venue {
  id: string;
  name: string;
  address?: string;
  venueType?: string;
}

interface Trainer {
  id: string;
  name: string;
  email: string;
  specializations?: string[];
}

interface CourseRunFormData {
  // Basic Information
  serialNumber: string;
  courseRunType: string;
  courseId: string;
  courseCode: string;

  // Schedule
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;

  // Venue & Settings
  venueType: string;
  venueId?: string;
  specifiedLocation?: string;
  minClassSize?: number;
  maxClassSize?: number;
  individualRegistrationRequired: boolean;
  remarks?: string;

  // Trainer Assignment
  selectedTrainers: string[];
  baseAmount?: number;
  additionalCosts?: number;
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
  const [availableVenues, setAvailableVenues] = useState<Venue[]>([]);

  // Form state
  const [formData, setFormData] = useState<CourseRunFormData>({
    serialNumber: "",
    courseRunType: "",
    courseId: courseId || "",
    courseCode: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
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
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [coursesResponse, venuesResponse, trainersResponse] = await Promise.all([
          coursesApi.getAll({ limit: 1000 }),
          venuesApi.getAll(),
          trainersApi.getAll({ limit: 1000 }),
        ]);

        if (coursesResponse.success) {
          setCourses(coursesResponse.courses || []);
        }

        if (venuesResponse.success) {
          setVenues(venuesResponse.venues || []);
        }

        if (trainersResponse.trainers) {
          setTrainers(trainersResponse.trainers || []);
        }

        // Pre-select course if courseId is provided
        if (courseId && coursesResponse.success) {
          const selectedCourse = coursesResponse.courses?.find((c: Course) => c.id === courseId);
          if (selectedCourse) {
            handleCourseChange(courseId);
          }
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
        toast.error("Failed to load form data");
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
    const year = date.getFullYear();

    return `${courseCode}${day}${month}${year}`;
  };

  // Handle course selection
  const handleCourseChange = (selectedCourseId: string) => {
    const selectedCourse = courses.find((c) => c.id === selectedCourseId);
    if (selectedCourse) {
      const newFormData = {
        ...formData,
        courseId: selectedCourseId,
        courseCode: selectedCourse.courseCode || "",
      };

      // Regenerate serial number if start date exists
      if (newFormData.startDate) {
        newFormData.serialNumber = generateSerialNumber(selectedCourse.courseCode || "", newFormData.startDate);
      }

      setFormData(newFormData);

      // Filter trainers based on course category/specialization
      filterTrainersByCourse(selectedCourse);
    }
  };

  // Filter trainers based on course
  const filterTrainersByCourse = (course: Course) => {
    // This would filter trainers based on course category or specializations
    // For now, showing all trainers - implement filtering logic as needed
    // const filteredTrainers = trainers.filter(trainer =>
    //   trainer.specializations?.includes(course.category || "")
    // );
  };

  // Handle start date change to regenerate serial number
  const handleStartDateChange = (date: string) => {
    const newFormData = { ...formData, startDate: date };

    if (newFormData.courseCode) {
      newFormData.serialNumber = generateSerialNumber(newFormData.courseCode, date);
    }

    setFormData(newFormData);
  };

  // Handle venue type change
  const handleVenueTypeChange = (venueType: string) => {
    setFormData({ ...formData, venueType, venueId: "" });

    // For hotel type, filter and load venues from API
    if (venueType === "HOTEL") {
      loadVenuesByType("HOTEL");
    } else {
      setAvailableVenues([]);
    }
  };

  // Load venues by type
  const loadVenuesByType = async (venueType: string) => {
    try {
      const response = await venuesApi.getAll();
      if (response.success) {
        // Filter venues by type - assuming venues have a venueType field
        const filtered = (response.venues || []).filter((venue: Venue) => venue.venueType?.toUpperCase() === venueType.toUpperCase());
        setAvailableVenues(filtered);
      }
    } catch (error) {
      console.error("Error loading venues by type:", error);
      setAvailableVenues([]);
    }
  };

  // Handle form field changes
  const handleFieldChange = (field: keyof CourseRunFormData, value: any) => {
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
      if (!formData.serialNumber) newErrors.serialNumber = "Serial Number is required";
      if (!formData.courseRunType) newErrors.courseRunType = "Course Run Type is required";
      if (!formData.courseId) newErrors.courseId = "Course is required";
      if (!formData.startDate) newErrors.startDate = "Start Date is required";
      if (formData.startDate && !formData.startTime) newErrors.startTime = "Start Time is required";
      if (!formData.endDate) newErrors.endDate = "End Date is required";
      if (formData.endDate && !formData.endTime) newErrors.endTime = "End Time is required";
      if (!formData.venueType) newErrors.venueType = "Venue type is required";
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
    if (!validateForm(isDraft)) {
      toast.error("Please fix the validation errors");
      return;
    }

    const title = isDraft ? "Save as Draft" : "Create Course Run";
    const confirmText = isDraft ? "Are you sure you want to save this course run as draft?" : "Are you sure you want to create this course run?";

    const result = await Swal.fire({
      title,
      text: confirmText,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3b82f6",
      cancelButtonColor: "#6b7280",
      confirmButtonText: isDraft ? "Save Draft" : "Create Course Run",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    setSubmitting(true);

    try {
      // Prepare submission data
      const startDatetime = formData.startDate && formData.startTime ? new Date(`${formData.startDate}T${formData.startTime}`).toISOString() : null;
      const endDatetime = formData.endDate && formData.endTime ? new Date(`${formData.endDate}T${formData.endTime}`).toISOString() : null;

      const submissionData = {
        serialNumber: formData.serialNumber,
        courseRunType: formData.courseRunType,
        courseId: formData.courseId,
        startDatetime,
        endDatetime,
        venueId: formData.venueId || null,
        venueType: formData.venueType,
        specifiedLocation: formData.specifiedLocation,
        minClassSize: formData.minClassSize,
        maxClassSize: formData.maxClassSize,
        individualRegistrationRequired: formData.individualRegistrationRequired,
        remarks: formData.remarks,
        baseCourseFee: formData.baseAmount,
        otherFee: formData.additionalCosts,
        status: isDraft ? "DRAFT" : "PUBLISHED",
      };

      const response = await courseRunsApi.create(submissionData);

      if (response.success) {
        await Swal.fire({
          title: "Success!",
          text: `Course run ${isDraft ? "saved as draft" : "created"} successfully`,
          icon: "success",
          confirmButtonColor: "#3b82f6",
        });

        navigate("/course-runs");
      } else {
        throw new Error(response.error || "Failed to create course run");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      await Swal.fire({
        title: "Error",
        text: error instanceof Error ? error.message : "Failed to create course run",
        icon: "error",
        confirmButtonColor: "#ef4444",
      });
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
              <TabsTrigger value="learner-particulars">Learner Particulars</TabsTrigger>
              <TabsTrigger value="trainer-assignment">Trainer Assignment</TabsTrigger>
            </TabsList>

            {/* Course Run Information Tab */}
            <TabsContent value="course-info" className="space-y-6 mt-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Serial Number */}
                  <div>
                    <Label htmlFor="serialNumber">Serial Number *</Label>
                    <Input
                      id="serialNumber"
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Start Date */}
                  <div>
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      className={errors.startDate ? "border-red-500" : ""}
                    />
                    {errors.startDate && <p className="text-sm text-red-500 mt-1">{errors.startDate}</p>}
                  </div>

                  {/* Start Time */}
                  <div>
                    <Label htmlFor="startTime">Start Time *</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => handleFieldChange("startTime", e.target.value)}
                      className={errors.startTime ? "border-red-500" : ""}
                    />
                    {errors.startTime && <p className="text-sm text-red-500 mt-1">{errors.startTime}</p>}
                  </div>

                  {/* End Date */}
                  <div>
                    <Label htmlFor="endDate">End Date *</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleFieldChange("endDate", e.target.value)}
                      className={errors.endDate ? "border-red-500" : ""}
                    />
                    {errors.endDate && <p className="text-sm text-red-500 mt-1">{errors.endDate}</p>}
                  </div>

                  {/* End Time */}
                  <div>
                    <Label htmlFor="endTime">End Time *</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => handleFieldChange("endTime", e.target.value)}
                      className={errors.endTime ? "border-red-500" : ""}
                    />
                    {errors.endTime && <p className="text-sm text-red-500 mt-1">{errors.endTime}</p>}
                  </div>
                </div>
              </div>

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
                    {formData.venueType === "HOTEL" && (
                      <div>
                        <Label htmlFor="venue">Hotel</Label>
                        <Select value={formData.venueId || ""} onValueChange={(value) => handleFieldChange("venueId", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select hotel" />
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

            {/* Learner Particulars Tab */}
            <TabsContent value="learner-particulars" className="space-y-6 mt-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Learner Management</h3>
                <p className="text-gray-600 mb-6">Manage learner enrollment and registration for this course run.</p>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                  <div className="text-gray-400 mb-4">
                    <Users className="h-16 w-16 mx-auto mb-2" />
                  </div>
                  <p className="text-gray-700 font-medium mb-2">Learner particulars will be managed after the course run is created.</p>
                  <p className="text-gray-600 text-sm">You can add learners individually or import them via CSV once the course run is set up.</p>
                </div>
              </div>
            </TabsContent>

            {/* Trainer Assignment Tab */}
            <TabsContent value="trainer-assignment" className="space-y-6 mt-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Select Trainers</h3>
                <div className="space-y-3">
                  {trainers.map((trainer) => (
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
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">Trainer Fees</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="baseAmount">Base Amount *</Label>
                    <Input
                      id="baseAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.baseAmount || ""}
                      onChange={(e) => handleFieldChange("baseAmount", e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="0"
                      className={errors.baseAmount ? "border-red-500" : ""}
                    />
                    {errors.baseAmount && <p className="text-sm text-red-500 mt-1">{errors.baseAmount}</p>}
                  </div>

                  <div>
                    <Label htmlFor="additionalCosts">Additional Costs</Label>
                    <Input
                      id="additionalCosts"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.additionalCosts || ""}
                      onChange={(e) => handleFieldChange("additionalCosts", e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="0"
                    />
                  </div>
                </div>
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
