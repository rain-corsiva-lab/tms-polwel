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

const CourseForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditMode = Boolean(id);
  
  console.log('=== COURSE FORM INITIALIZED ===');
  console.log('ID from params:', id);
  console.log('Is edit mode:', isEditMode);
  
  // Loading states
  const [loading, setLoading] = useState({
    categories: false,
    trainers: false,
    venues: false,
    submitting: false,
    course: false
  });

  // API data states
  const [apiData, setApiData] = useState({
    categories: [] as any[],
    trainers: [] as any[],
    partners: [] as any[],
    venues: [] as any[]
  });

  const [formData, setFormData] = useState({
    courseCode: "",
    title: "",
    description: "",
    category: "",
    duration: "",
    durationType: "days",
    trainer: [] as string[],
    venueFee: 0,
    adminFees: 0,
    contingencyFees: 0,
    otherFees: 0,
    minPax: 1,
    venue: "",
    specifiedLocation: "",
    certificates: "polwel",
    remarks: "",
    defaultCourseFee: 0,
    feeType: "per-run",
    discounts: [] as any[]
  });
  
  console.log('=== CURRENT FORM DATA ===');
  console.log('Form data state:', formData);
  console.log('Title value:', formData.title);
  console.log('Category value:', formData.category);

  const [calculations, setCalculations] = useState({
    totalFee: 0,
    minimumRevenue: 0,
    totalCost: 0,
    profit: 0,
    profitMargin: 0
  });

  // Load reference data from API
  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        // Load categories
        setLoading(prev => ({ ...prev, categories: true }));
        const categoriesResponse = await referencesApi.getCategories();
        setApiData(prev => ({ 
          ...prev, 
          categories: categoriesResponse.success && categoriesResponse.data && Array.isArray(categoriesResponse.data.categories) 
            ? categoriesResponse.data.categories 
            : []
        }));

        // Load trainers
        setLoading(prev => ({ ...prev, trainers: true }));
        const trainersResponse = await referencesApi.getTrainers();
        setApiData(prev => ({ 
          ...prev, 
          trainers: trainersResponse.success && trainersResponse.data && Array.isArray(trainersResponse.data.trainers) 
            ? trainersResponse.data.trainers 
            : []
        }));

        // Load partners
        const partnersResponse = await referencesApi.getPartners();
        setApiData(prev => ({ 
          ...prev, 
          partners: partnersResponse.success && partnersResponse.data && Array.isArray(partnersResponse.data.partners) 
            ? partnersResponse.data.partners 
            : []
        }));

        // Load venues
        setLoading(prev => ({ ...prev, venues: true }));
        const venuesResponse = await referencesApi.getVenues();
        setApiData(prev => ({ 
          ...prev, 
          venues: venuesResponse.success && venuesResponse.data && Array.isArray(venuesResponse.data.venues) 
            ? venuesResponse.data.venues 
            : []
        }));

      } catch (error) {
        console.error('Error loading reference data:', error);
        toast({
          title: "Error",
          description: "Failed to load reference data. Using default options.",
          variant: "destructive"
        });
      } finally {
        setLoading(prev => ({ 
          ...prev, 
          categories: false, 
          trainers: false, 
          venues: false 
        }));
      }
    };

    loadReferenceData();
  }, []);

  // Load existing course data for edit mode
  useEffect(() => {
    const loadCourseData = async () => {
      if (!isEditMode || !id) return;

      try {
        setLoading(prev => ({ ...prev, course: true }));
        const response = await coursesApi.getById(id);
        
        let courseData = null;
        
        if (response?.success === true && response?.data) {
          courseData = response.data;
        } else if (response?.data) {
          courseData = response.data;
        } else if (response && typeof response === 'object') {
          courseData = response;
        }

        if (courseData) {
          const mappedData = {
            courseCode: String(courseData.courseCode || ""),
            title: String(courseData.title || ""),
            description: String(courseData.description || ""),
            category: String(courseData.category || ""),
            duration: String(courseData.duration || ""),
            durationType: String(courseData.durationType || "days"),
            trainer: Array.isArray(courseData.trainers) 
              ? courseData.trainers.map(t => typeof t === 'string' ? t : String(t))
              : [],
            venueFee: Number(courseData.venueFee || 0),
            adminFees: Number(courseData.adminFees || 0),
            contingencyFees: Number(courseData.contingencyFees || 0),
            otherFees: Number(courseData.otherFees || 0),
            minPax: Number(courseData.minParticipants || 1),
            venue: String(courseData.venue || ""),
            specifiedLocation: String(courseData.specifiedLocation || ""),
            certificates: String(courseData.certificates || "polwel"),
            remarks: String(courseData.remarks || ""),
            defaultCourseFee: Number(courseData.defaultCourseFee || 0),
            feeType: String(courseData.feeType || "per-run"),
            discounts: Array.isArray(courseData.discounts) ? courseData.discounts : []
          };
          
          setFormData(mappedData);
        }
      } catch (error) {
        console.error('Error loading course data:', error);
        toast({
          title: "Error",
          description: `Failed to load course data: ${error.message}`,
          variant: "destructive"
        });
        navigate('/course-creation');
      } finally {
        setLoading(prev => ({ ...prev, course: false }));
      }
    };

    loadCourseData();
  }, [id, isEditMode, toast, navigate]);

  // Calculate totals whenever relevant fields change
  useEffect(() => {
    const totalFee = (formData.venueFee || 0) + (formData.adminFees || 0) + 
                     (formData.contingencyFees || 0) + (formData.otherFees || 0);
    
    const minimumRevenue = (formData.defaultCourseFee || 0) * (formData.minPax || 1);
    
    const totalCost = totalFee;
    const profit = minimumRevenue - totalCost;
    const profitMargin = minimumRevenue > 0 ? (profit / minimumRevenue) * 100 : 0;

    setCalculations({
      totalFee,
      minimumRevenue,
      totalCost,
      profit,
      profitMargin
    });
  }, [formData.venueFee, formData.adminFees, formData.contingencyFees, 
      formData.otherFees, formData.defaultCourseFee, formData.minPax]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.category || formData.trainer.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(prev => ({ ...prev, submitting: true }));

    try {
      // Prepare data for API
      const courseData = {
        courseCode: formData.courseCode,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        duration: formData.duration,
        durationType: formData.durationType,
        trainers: formData.trainer,
        venueFee: formData.venueFee,
        adminFees: formData.adminFees,
        contingencyFees: formData.contingencyFees,
        otherFees: formData.otherFees,
        minParticipants: formData.minPax,
        venue: formData.venue,
        specifiedLocation: formData.specifiedLocation,
        certificates: formData.certificates,
        remarks: formData.remarks,
        defaultCourseFee: formData.defaultCourseFee,
        feeType: formData.feeType,
        discounts: formData.discounts
      };

      if (isEditMode && id) {
        await coursesApi.update(id, courseData);
        toast({
          title: "Course Updated",
          description: "Course has been successfully updated"
        });
        navigate('/course-creation');
      } else {
        await coursesApi.create(courseData);
        toast({
          title: "Course Created",
          description: "Course has been successfully created"
        });
        
        // Reset form
        setFormData({
          courseCode: "",
          title: "",
          description: "",
          category: "",
          duration: "",
          durationType: "days",
          trainer: [] as string[],
          venueFee: 0,
          adminFees: 0,
          contingencyFees: 0,
          otherFees: 0,
          minPax: 1,
          venue: "",
          specifiedLocation: "",
          certificates: "polwel",
          remarks: "",
          defaultCourseFee: 0,
          feeType: "per-run",
          discounts: []
        });
        
        navigate('/course-creation');
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} course:`, error);
      toast({
        title: "Error",
        description: `Failed to ${isEditMode ? 'update' : 'create'} course. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setLoading(prev => ({ ...prev, submitting: false }));
    }
  };

  // Show loading state while loading course data for edit
  if (loading.course) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="mr-2 h-8 w-8 animate-spin" />
          <span>Loading course data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{isEditMode ? 'Edit Course' : 'Add New Course'}</h1>
        <p className="text-muted-foreground">
          {isEditMode ? 'Update course information and pricing.' : 'Create a new course with detailed information and pricing.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs defaultValue="information" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="information">Course Information</TabsTrigger>
            <TabsTrigger value="fees">Fees & Revenue</TabsTrigger>
            <TabsTrigger value="discounts">Discounts</TabsTrigger>
          </TabsList>

          <TabsContent value="information" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Information</CardTitle>
              </CardHeader>
              <CardContent>
                <CourseInformationTab 
                  formData={formData}
                  onInputChange={handleInputChange}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fees" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Fees & Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <FeesRevenueTab 
                  formData={formData}
                  calculations={calculations}
                  onInputChange={handleInputChange}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="discounts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Discounts</CardTitle>
              </CardHeader>
              <CardContent>
                <DiscountsTab 
                  formData={formData}
                  onInputChange={handleInputChange}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Submit Button */}
        <div className="flex justify-between">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate(isEditMode && id ? `/course-creation/detail/${id}` : '/course-creation')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading.submitting}>
            {loading.submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading.submitting 
              ? (isEditMode ? 'Updating...' : 'Creating...') 
              : (isEditMode ? 'Update Course' : 'Create Course')
            }
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CourseForm;