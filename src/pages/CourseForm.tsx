import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { referencesApi, coursesApi, venuesApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/errorHandler";
import CourseInformationTab from "@/components/CourseFormTabs/CourseInformationTab";
import FeesRevenueTab from "@/components/CourseFormTabs/FeesRevenueTab";
import DiscountsTab from "@/components/CourseFormTabs/DiscountsTab";

interface LoadingState {
  categories: boolean;
  trainers: boolean;
  venues: boolean;
  course: boolean;
  submitting: boolean;
}
interface RefsState {
  categories: any[];
  trainers: any[];
  partners: any[];
  venues: any[];
}
interface FormState {
  courseCode: string;
  title: string;
  description: string;
  learningObjectives: string;
  category: string;
  duration: string;
  durationType: string;
  trainer: string[];
  contractFees: number;
  venueFee: number;
  venueFeeType: string;
  venueId: string;
  venueType: string;
  specifiedLocation: string;
  certificates: string;
  remarks: string;
  defaultCourseFee: number;
  discounts: any[];
  minParticipants: number | string;
  maxParticipants: number | string;
  venueMaxParticipants: number | string;
  perHeadPriceIfMaxExceed: number | string;
}

const initialForm: FormState = {
  courseCode: "",
  title: "",
  description: "",
  learningObjectives: "",
  category: "",
  duration: "",
  durationType: "days",
  trainer: [],
  contractFees: 0,
  venueFee: 0,
  venueFeeType: "PER_HEAD",
  venueId: "",
  venueType: "",
  specifiedLocation: "",
  certificates: "polwel",
  remarks: "",
  defaultCourseFee: 0,
  discounts: [],
  minParticipants: 1,
  maxParticipants: "",
  venueMaxParticipants: "",
  perHeadPriceIfMaxExceed: "",
};

const CourseForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEdit = !!id;

  const [loading, setLoading] = useState<LoadingState>({ categories: false, trainers: false, venues: false, course: false, submitting: false });
  const [refs, setRefs] = useState<RefsState>({ categories: [], trainers: [], partners: [], venues: [] });
  const [formData, setFormData] = useState<FormState>(initialForm);
  const [courseCodeManuallyEdited, setCourseCodeManuallyEdited] = useState(false);
  const [lastAutoCourseCode, setLastAutoCourseCode] = useState("");
  const [activeTab, setActiveTab] = useState<string>("information");
  // Removed financial calculations per new simplified requirements

  const sanitizeCourseCode = (value: string) =>
    value
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, "")
      .slice(0, 5);

  const generateCourseCodeFromTitle = (title: string) => {
    if (!title) return "";
    const words = title.trim().split(/\s+/).filter(Boolean);
    const initials = words.map((word) => word[0] || "").join("");
    const fallback = title.replace(/[^A-Za-z0-9]/g, "");
    const raw = initials || fallback;
    return sanitizeCourseCode(raw);
  };

  // Load reference data
  useEffect(() => {
    (async () => {
      try {
        setLoading((l) => ({ ...l, categories: true, trainers: true, venues: true }));
        const [cat, tr, pa, ve] = await Promise.all([
          referencesApi.getCategories().catch(() => null),
          referencesApi.getTrainers().catch(() => null),
          referencesApi.getPartners().catch(() => null),
          venuesApi.getAll().catch(() => null),
        ]);

        // Extract venues from response and filter ACTIVE only
        let venuesList = [];
        if (ve?.success && Array.isArray(ve?.venues)) {
          venuesList = ve.venues;
        } else if (Array.isArray(ve?.data?.venues)) {
          venuesList = ve.data.venues;
        } else if (Array.isArray(ve?.data)) {
          venuesList = ve.data;
        }

        // Filter to only show ACTIVE venues
        const activeVenues = venuesList.filter((v: any) => v.status === "ACTIVE");

        const rawPartners = pa?.data?.partners || [];
        const partnersList = Array.isArray(rawPartners)
          ? rawPartners
              .map((partner: any) => {
                if (!partner) return null;
                if (typeof partner === "string") {
                  const value = partner.trim();
                  return value
                    ? {
                        id: value,
                        partnerName: value,
                      }
                    : null;
                }
                const partnerId = partner.id || partner.partnerId || partner.value || partner.partnerName;
                const partnerName = partner.partnerName || partner.name || partner.label || partnerId;
                if (!partnerId || !partnerName) {
                  return null;
                }
                return {
                  id: String(partnerId),
                  partnerName: String(partnerName),
                  email: partner.email || null,
                  pointOfContact: partner.pointOfContact || null,
                  contactNumber: partner.contactNumber || null,
                  contactDesignation: partner.contactDesignation || null,
                };
              })
              .filter((partner: any) => Boolean(partner && partner.id))
          : [];

        setRefs({
          categories: cat?.data?.categories || [],
          trainers: tr?.data?.trainers || [],
          partners: partnersList,
          venues: activeVenues,
        });
      } finally {
        setLoading((l) => ({ ...l, categories: false, trainers: false, venues: false }));
      }
    })();
  }, []);

  // Load existing course for edit
  useEffect(() => {
    if (!isEdit || !id) return;
    (async () => {
      try {
        setLoading((l) => ({ ...l, course: true }));
        const resp = await coursesApi.getById(id);
        const c: any = resp?.data?.course || resp?.data || resp;
        if (c) {
          const generatedCode = generateCourseCodeFromTitle(c.title || "");

          // Extract trainer and partner IDs from pivot tables
          const trainerIds = Array.isArray(c.courseTrainers) ? c.courseTrainers.map((ct: any) => ct.trainerId || ct.trainer?.id).filter(Boolean) : [];
          const partnerIds = Array.isArray(c.coursePartners) ? c.coursePartners.map((cp: any) => cp.partnerId || cp.partner?.id).filter(Boolean) : [];
          const combinedAssignmentIds = Array.from(new Set([...trainerIds, ...partnerIds].map(String)));

          setFormData((prev) => ({
            ...prev,
            courseCode: c.courseCode || "",
            title: c.title || "",
            description: c.description || "",
            learningObjectives: c.learningObjectives || "",
            category: c.category || "",
            duration: c.duration || "",
            durationType: c.durationType || "days",
            trainer: combinedAssignmentIds,
            contractFees: c.contractFees || 0,
            venueFee: c.venueFee || 0,
            venueFeeType: c.venueFeeType || "",
            venueId: c.venueId || "",
            venueType: c.venueType || "",
            specifiedLocation: c.specifiedLocation || "",
            certificates: c.certificates || "polwel",
            remarks: c.remarks || "",
            defaultCourseFee: c.defaultCourseFee || 0,
            discounts: Array.isArray(c.discounts) ? c.discounts : [],
            minParticipants: c.minParticipants || 1,
            maxParticipants: c.maxParticipants || "",
            venueMaxParticipants: c.venueMaxParticipants || "",
            perHeadPriceIfMaxExceed: c.perHeadPriceIfMaxExceed || "",
          }));
          setLastAutoCourseCode(generatedCode);
          if (c.courseCode) {
            setCourseCodeManuallyEdited(c.courseCode !== generatedCode);
          }
        }
      } catch {
        toast({ title: "Error", description: "Failed to load course", variant: "destructive" });
      } finally {
        setLoading((l) => ({ ...l, course: false }));
      }
    })();
  }, [id, isEdit, toast]);

  // Removed calculations effect

  const handleInputChange = (field: keyof FormState, value: any) => {
    if (field === "courseCode" && typeof value === "string") {
      const sanitized = sanitizeCourseCode(value);
      setFormData((prev) => ({ ...prev, courseCode: sanitized }));
      const manuallyEdited = sanitized.length > 0 && sanitized !== lastAutoCourseCode;
      setCourseCodeManuallyEdited(manuallyEdited);
      if (!sanitized) {
        setCourseCodeManuallyEdited(false);
      }
      return;
    }

    if (field === "title" && typeof value === "string") {
      const generated = generateCourseCodeFromTitle(value);
      let shouldAutoApply = false;
      setFormData((prev) => {
        shouldAutoApply = !courseCodeManuallyEdited || !prev.courseCode || prev.courseCode === lastAutoCourseCode;
        return {
          ...prev,
          title: value,
          courseCode: shouldAutoApply ? generated : prev.courseCode,
        };
      });
      setLastAutoCourseCode(generated);
      if (shouldAutoApply) {
        setCourseCodeManuallyEdited(false);
      }
      return;
    }

    // Handle numeric fields for venue pricing
    if (field === "venueMaxParticipants" && typeof value === "string") {
      const numValue = value ? parseInt(value, 10) : "";
      setFormData((prev) => ({ ...prev, [field]: numValue }));
      return;
    }

    if (field === "perHeadPriceIfMaxExceed" && typeof value === "string") {
      const numValue = value ? parseFloat(value) : "";
      setFormData((prev) => ({ ...prev, [field]: numValue }));
      return;
    }

    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleVenueSelect = (venue: any) => {
    if (venue?.fee !== undefined && venue?.feeType) {
      const vType = String(venue.feeType).toUpperCase();
      setFormData((prev) => ({
        ...prev,
        venueFee: venue.fee,
        venueFeeType: vType,
        venueMaxParticipants: venue.maxParticipants || "",
        perHeadPriceIfMaxExceed: venue.perHeadPriceIfMaxExceed || "",
      }));

      toast({
        title: "Venue Fee Updated",
        description: `Venue expenses auto-filled to $${venue.fee} ${vType === "PER_HEAD" ? "per head" : vType === "PER_VENUE" ? "per venue" : "fixed"}`,
      });
    }
  };

  const validateForm = () => {
    const errors: string[] = [];

    if (!formData.title?.trim()) {
      errors.push("Course title is required");
    }

    if (!formData.category?.trim()) {
      errors.push("Course category is required");
    }

    if (!formData.duration?.trim()) {
      errors.push("Duration is required");
    } else {
      const durationNum = parseFloat(formData.duration);
      if (isNaN(durationNum) || durationNum < 1) {
        errors.push("Duration must be at least 1");
      }
    }

    if (!formData.courseCode?.trim()) {
      errors.push("Course code is required");
    } else if (formData.courseCode.trim().length > 5) {
      errors.push("Course code must be at most 5 characters");
    }

    // Validate trainer requirement
    if (!formData.trainer || formData.trainer.length === 0) {
      errors.push("At least one trainer is required");
    }

    // Note: venueMaxParticipants and perHeadPriceIfMaxExceed are now optional
    // If provided, they must be valid positive numbers (for venueMaxParticipants)
    // or non-negative numbers (for perHeadPriceIfMaxExceed)

    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: errors.join(". "),
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading((l) => ({ ...l, submitting: true }));

    // Debug: log the form data before submission
    console.log("Form data before submission:", {
      venueMaxParticipants: formData.venueMaxParticipants,
      perHeadPriceIfMaxExceed: formData.perHeadPriceIfMaxExceed,
      venueFeeType: formData.venueFeeType,
    });

    const payload: any = {
      courseCode: formData.courseCode,
      title: formData.title,
      description: formData.description,
      learningObjectives: formData.learningObjectives,
      category: formData.category,
      duration: formData.duration,
      durationType: formData.durationType,
      trainers: formData.trainer,
      contractFees: formData.contractFees,
      venueFee: formData.venueFee,
      venueFeeType: formData.venueFeeType,
      // Only send venueId if it's a valid non-empty string
      venueId: formData.venueId && formData.venueId !== "" ? formData.venueId : undefined,
      venueType: formData.venueType && formData.venueType !== "" ? formData.venueType : null,
      specifiedLocation: formData.specifiedLocation,
      certificates: formData.certificates,
      remarks: formData.remarks,
      defaultCourseFee: formData.defaultCourseFee,
      discounts: formData.discounts,
      // Convert minParticipants to number, default to 1 if empty (backend will validate)
      minParticipants: formData.minParticipants !== "" && formData.minParticipants !== null ? parseInt(String(formData.minParticipants)) || 1 : 1,
      maxParticipants: formData.maxParticipants && formData.maxParticipants !== "" ? parseInt(formData.maxParticipants.toString()) : null,
      venueMaxParticipants: formData.venueMaxParticipants && formData.venueMaxParticipants !== "" ? parseInt(formData.venueMaxParticipants.toString()) : null,
      perHeadPriceIfMaxExceed:
        formData.perHeadPriceIfMaxExceed && formData.perHeadPriceIfMaxExceed !== "" ? parseFloat(formData.perHeadPriceIfMaxExceed.toString()) : null,
      syncRemarksToTrainers: true, // Flag to sync remarks to course_trainers table
    };

    console.log("Payload being sent:", payload);
    try {
      if (isEdit && id) {
        await coursesApi.update(id, payload);
        toast({ title: "Updated", description: "Course updated" });
      } else {
        await coursesApi.create(payload);
        toast({ title: "Created", description: "Course created" });
      }
      navigate("/courses");
    } catch (err: any) {
      console.error("Course save error:", err);

      // Check for validation errors with detailed messages
      let errorMessage = getErrorMessage(err, "Failed to save course");

      // If there are specific field errors in the errors array, show them
      if (err?.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const fieldErrors = err.response.data.errors.map((error: any) => error.message || error.msg).filter(Boolean);
        if (fieldErrors.length > 0) {
          errorMessage = fieldErrors.join(". ");
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading((l) => ({ ...l, submitting: false }));
    }
  };

  if (loading.course) {
    return (
      <div className="container mx-auto py-10 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading course...
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{isEdit ? "Edit Course" : "Add New Course"}</h1>
        {/* <p className="text-muted-foreground">{isEdit ? "Update course information and pricing." : "Create a new course."}</p> */}
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="information">Information</TabsTrigger>
            <TabsTrigger value="fees">Fees</TabsTrigger>
            <TabsTrigger value="discounts">Discounts</TabsTrigger>
          </TabsList>
          <TabsContent value="information" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Information</CardTitle>
              </CardHeader>
              <CardContent>
                <CourseInformationTab
                  formData={formData}
                  onInputChange={handleInputChange as any}
                  onVenueSelect={handleVenueSelect}
                  categories={refs.categories}
                  trainers={refs.trainers}
                  partners={refs.partners}
                  venues={refs.venues}
                  loading={{ categories: loading.categories, trainers: loading.trainers, venues: loading.venues }}
                />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="fees" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Fees</CardTitle>
              </CardHeader>
              <CardContent>
                <FeesRevenueTab formData={formData as any} onInputChange={handleInputChange as any} venues={refs.venues} selectedVenueId={formData.venueId} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="discounts" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Discounts</CardTitle>
              </CardHeader>
              <CardContent>
                <DiscountsTab formData={formData as any} onInputChange={handleInputChange as any} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        <div className="flex justify-between">
          {activeTab === "information" ? (
            <Button type="button" variant="outline" onClick={() => navigate(isEdit && id ? `/courses/detail/${id}` : "/courses")}>
              Cancel
            </Button>
          ) : activeTab === "fees" ? (
            <Button type="button" variant="outline" onClick={() => setActiveTab("information")}>
              Previous: Information
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => setActiveTab("fees")}>
              Previous: Fees
            </Button>
          )}

          {activeTab === "information" ? (
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab("fees");
              }}
            >
              Next: Fees
            </Button>
          ) : activeTab === "fees" ? (
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab("discounts");
              }}
            >
              Next: Discounts
            </Button>
          ) : (
            <Button type="submit" disabled={loading.submitting}>
              {loading.submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading.submitting ? (isEdit ? "Updating..." : "Creating...") : isEdit ? "Update Course" : "Create Course"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};

export default CourseForm;
