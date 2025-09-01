import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { referencesApi, coursesApi } from "@/lib/api";
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
  category: string;
  duration: string;
  durationType: string;
  trainer: string[];
  venueFee: number;
  venue: string;
  specifiedLocation: string;
  certificates: string;
  remarks: string;
  defaultCourseFee: number;
  discounts: any[];
  billingRate: number;
  contractsFeePayout: number;
}

const initialForm: FormState = {
  courseCode: "",
  title: "",
  description: "",
  category: "",
  duration: "",
  durationType: "days",
  trainer: [],
  venueFee: 0,
  venue: "",
  specifiedLocation: "",
  certificates: "polwel",
  remarks: "",
  defaultCourseFee: 0,
  discounts: [],
  billingRate: 0,
  contractsFeePayout: 0,
};

const CourseForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEdit = !!id;

  const [loading, setLoading] = useState<LoadingState>({ categories: false, trainers: false, venues: false, course: false, submitting: false });
  const [refs, setRefs] = useState<RefsState>({ categories: [], trainers: [], partners: [], venues: [] });
  const [formData, setFormData] = useState<FormState>(initialForm);
  // Removed financial calculations per new simplified requirements

  // Load reference data
  useEffect(() => {
    (async () => {
      try {
        setLoading((l) => ({ ...l, categories: true, trainers: true, venues: true }));
        const [cat, tr, pa, ve] = await Promise.all([
          referencesApi.getCategories().catch(() => null),
          referencesApi.getTrainers().catch(() => null),
          referencesApi.getPartners().catch(() => null),
          referencesApi.getVenues().catch(() => null),
        ]);
        setRefs({
          categories: cat?.data?.categories || [],
          trainers: tr?.data?.trainers || [],
          partners: pa?.data?.partners || [],
          venues: ve?.data?.venues || [],
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
          setFormData((prev) => ({
            ...prev,
            courseCode: c.courseCode || "",
            title: c.title || "",
            description: c.description || "",
            category: c.category || "",
            duration: c.duration || "",
            durationType: c.durationType || "days",
            trainer: Array.isArray(c.trainers) ? c.trainers.map((t: any) => (typeof t === "string" ? t : t.name || String(t))) : [],
            venueFee: c.venueFee || 0,
            venue: c.venue || "",
            specifiedLocation: c.specifiedLocation || "",
            certificates: c.certificates || "polwel",
            remarks: c.remarks || "",
            defaultCourseFee: c.defaultCourseFee || 0,
            discounts: Array.isArray(c.discounts) ? c.discounts : [],
            billingRate: c.billingRate || 0,
            contractsFeePayout: c.contractsFeePayout || 0,
          }));
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
      value = value
        .toUpperCase()
        .replace(/[^A-Z0-9_-]/g, "")
        .slice(0, 20);
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.category) {
      toast({ title: "Error", description: "Title & category required", variant: "destructive" });
      return;
    }
    setLoading((l) => ({ ...l, submitting: true }));
    const payload: any = {
      courseCode: formData.courseCode,
      title: formData.title,
      description: formData.description,
      category: formData.category,
      duration: formData.duration,
      durationType: formData.durationType,
      trainers: formData.trainer,
      venueFee: formData.venueFee,
      venue: formData.venue,
      specifiedLocation: formData.specifiedLocation,
      certificates: formData.certificates,
      remarks: formData.remarks,
      defaultCourseFee: formData.defaultCourseFee,
      discounts: formData.discounts,
      billingRate: formData.billingRate,
      contractsFeePayout: formData.contractsFeePayout,
    };
    try {
      if (isEdit && id) {
        await coursesApi.update(id, payload);
        toast({ title: "Updated", description: "Course updated" });
      } else {
        await coursesApi.create(payload);
        toast({ title: "Created", description: "Course created" });
      }
      navigate("/course-creation");
    } catch (err: any) {
      let msg = "Save failed";
      if (err?.response?.data?.message?.toLowerCase?.().includes("unique") || err?.response?.data?.error?.includes?.("courseCode")) {
        msg = "Course code already exists";
      }
      toast({ title: "Error", description: msg, variant: "destructive" });
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
        <p className="text-muted-foreground">{isEdit ? "Update course information and pricing." : "Create a new course."}</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs defaultValue="information" className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="information">Information</TabsTrigger>
            <TabsTrigger value="fees">Fees & Revenue</TabsTrigger>
            <TabsTrigger value="discounts">Discounts</TabsTrigger>
          </TabsList>
          <TabsContent value="information" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Course Information</CardTitle>
              </CardHeader>
              <CardContent>
                <CourseInformationTab
                  formData={formData}
                  onInputChange={handleInputChange as any}
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
                <CardTitle>Fees & Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <FeesRevenueTab formData={formData as any} onInputChange={handleInputChange as any} />
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
          <Button type="button" variant="outline" onClick={() => navigate(isEdit && id ? `/course-creation/detail/${id}` : "/course-creation")}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading.submitting}>
            {loading.submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading.submitting ? (isEdit ? "Updating..." : "Creating...") : isEdit ? "Update Course" : "Create Course"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CourseForm;
