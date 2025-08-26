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
    title: "",
    description: "",
    category: "",
    duration: "",
    durationType: "days",
    trainer: [] as string[],
    courseFee: 0,
    venueFee: 0,
    trainerFee: 0,
    adminFees: 0,
    contingencyFees: 0,
    serviceFees: 0,
    vitalFees: 0,
    discount: 0,
    minPax: 1,
    amountPerPax: 0,
    venue: "",
    specifiedLocation: "",
    certificates: "polwel",
    remarks: "",
    defaultCourseFee: 0,
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
        
        // Fallback to default categories if API fails
        setApiData(prev => ({
          ...prev,
          categories: [
            {
              name: "Self-Mastery",
              color: "bg-red-100 text-red-800 border-red-200",
              subcategories: ["Growth Mindset", "Personal Effectiveness", "Self-awareness"]
            },
            {
              name: "Thinking Skills", 
              color: "bg-blue-100 text-blue-800 border-blue-200",
              subcategories: ["Agile Mindset", "Strategic Planning", "Critical Thinking & Creative Problem-Solving"]
            },
            {
              name: "People Skills",
              color: "bg-green-100 text-green-800 border-green-200", 
              subcategories: ["Emotional Intelligence", "Collaboration", "Communication"]
            },
            {
              name: "Leadership Skills",
              color: "bg-yellow-100 text-yellow-800 border-yellow-200",
              subcategories: ["Mindful Leadership", "Empowerment", "Decision-making"]
            }
          ]
        }));
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

  // Load existing course data for edit mode - COMPREHENSIVE DEBUGGING + FALLBACK
  useEffect(() => {
    const loadCourseData = async () => {
      if (!isEditMode || !id) {
        console.log('Not in edit mode or no ID provided');
        console.log('isEditMode:', isEditMode, 'id:', id);
        return;
      }

      try {
        setLoading(prev => ({ ...prev, course: true }));
        console.log('=== COMPREHENSIVE COURSE LOADING DEBUG ===');
        console.log('1. Course ID:', id);
        console.log('2. ID type:', typeof id);
        console.log('3. ID length:', id?.length);
        console.log('4. Auth token present:', !!localStorage.getItem('polwel_access_token'));
        console.log('5. Current URL:', window.location.href);
        
        // Add test mode for debugging
        if (id === 'test' || id === 'debug') {
          console.log('🧪 TEST MODE ACTIVATED - Using sample data');
          const testData = {
            title: "Sample Course for Testing",
            description: "This is test data to verify the form works",
            category: "Mindful Leadership",
            duration: "3",
            durationType: "days",
            trainer: ["John Doe"],
            courseFee: 500,
            venueFee: 100,
            trainerFee: 200,
            adminFees: 50,
            contingencyFees: 25,
            serviceFees: 30,
            vitalFees: 20,
            discount: 0,
            minPax: 10,
            amountPerPax: 150,
            venue: "Conference Room A",
            certificates: "polwel",
            remarks: "Test course data loaded successfully"
          };
          
          setFormData({...testData, specifiedLocation: "", defaultCourseFee: 0, discounts: []});
          toast({
            title: "Test Mode",
            description: "Sample course data loaded for testing",
            variant: "default"
          });
          return;
        }
        
        console.log('7. Making API call to coursesApi.getById...');
        const response = await coursesApi.getById(id);
        
        console.log('8. === RAW API RESPONSE ANALYSIS ===');
        console.log('Response received:', !!response);
        console.log('Response type:', typeof response);
        console.log('Response is array:', Array.isArray(response));
        console.log('Response is null:', response === null);
        console.log('Response is undefined:', response === undefined);
        
        if (response) {
          console.log('9. Response keys:', Object.keys(response));
          console.log('10. Full response (first 500 chars):', JSON.stringify(response, null, 2).substring(0, 500));
        }

        // ENHANCED COURSE DATA EXTRACTION - FIXED FOR REAL API STRUCTURE
        let courseData = null;
        let extractionMethod = '';
        
        if (response?.success === true && response?.data?.course) {
          courseData = response.data.course;
          extractionMethod = 'response.data.course (success=true, correct structure)';
        } else if (response?.success === true && response?.data) {
          courseData = response.data;
          extractionMethod = 'response.data (success=true)';
        } else if (response?.data?.course) {
          courseData = response.data.course;
          extractionMethod = 'response.data.course (success undefined)';
        } else if (response?.data) {
          courseData = response.data;
          extractionMethod = 'response.data (success undefined)';
        } else if (response && typeof response === 'object') {
          // Check if response directly contains course fields
          if (response.title || response.id || response._id || response.name) {
            courseData = response;
            extractionMethod = 'response directly (has course fields)';
          } else if (Array.isArray(response) && response.length > 0) {
            courseData = response[0];
            extractionMethod = 'first item from array response';
          }
        }

        console.log('11. === COURSE DATA EXTRACTION ===');
        console.log('Extraction method:', extractionMethod);
        console.log('Course data extracted:', !!courseData);
        
        if (courseData) {
          console.log('12. Course data type:', typeof courseData);
          console.log('13. Course data keys:', Object.keys(courseData));
          console.log('14. Course data preview:', JSON.stringify(courseData, null, 2).substring(0, 300));
          console.log('15. Has ID:', !!(courseData.id || courseData._id));
          console.log('16. Has title:', !!courseData.title);
        }

        // FLEXIBLE DATA VALIDATION - Accept data even without strict ID check
        const isValidCourseData = courseData && (
          courseData.id || 
          courseData._id || 
          courseData.title || 
          courseData.name ||
          Object.keys(courseData).length > 3 // Has multiple fields
        );
        
        console.log('17. Is valid course data:', isValidCourseData);

        if (isValidCourseData) {
          console.log('18. === COMPREHENSIVE DATA MAPPING ===');
          
          // Log all available fields
          console.log('19. Available fields in course data:');
          Object.keys(courseData).forEach(key => {
            console.log(`    ${key}:`, courseData[key]);
          });

          // Create comprehensive mapped data - FIXED FOR REAL DATABASE SCHEMA
          const mappedData = {
            title: String(courseData.title || ""),
            description: String(courseData.description || ""),
            category: String(courseData.category || ""),
            duration: String(courseData.duration || ""),
            durationType: String(courseData.durationType || "days"),
            trainer: Array.isArray(courseData.trainers) 
              ? courseData.trainers.map(t => typeof t === 'string' ? t : String(t))
              : [],
            courseFee: Number(courseData.courseFee || 0),
            venueFee: Number(courseData.venueFee || 0),
            trainerFee: Number(courseData.trainerFee || 0),
            adminFees: Number(courseData.adminFees || 0),
            contingencyFees: Number(courseData.contingencyFees || 0),
            serviceFees: Number(courseData.serviceFees || 0),
            vitalFees: Number(courseData.vitalFees || 0),
            discount: Number(courseData.discount || 0),
            minPax: Number(courseData.minParticipants || 1),
            amountPerPax: Number(courseData.amountPerPax || 0),
            venue: String(courseData.venue || ""),
            certificates: String(courseData.certificates || "polwel"),
            remarks: String(courseData.remarks || "")
          };

          console.log('20. === FINAL MAPPED DATA ===');
          console.log('Mapped data structure:');
          Object.keys(mappedData).forEach(key => {
            console.log(`    ${key}:`, mappedData[key]);
          });
          
          console.log('21. Setting form data...');
          setFormData({...mappedData, specifiedLocation: "", defaultCourseFee: 0, discounts: []});
          
          // Verify form data was set
          setTimeout(() => {
            console.log('22. Form data verification (after setState):', {
              title: formData.title,
              description: formData.description,
              courseFee: formData.courseFee
            });
          }, 100);
          
          console.log('✅ Course data loaded successfully!');
        } else {
          console.log('❌ === NO VALID COURSE DATA FOUND ===');
          console.log('23. Raw response analysis:');
          console.log('    - Response exists:', !!response);
          console.log('    - Response type:', typeof response);
          console.log('    - Response keys:', response ? Object.keys(response) : 'none');
          
          console.log('24. Course data analysis:');
          console.log('    - Course data exists:', !!courseData);
          console.log('    - Course data type:', typeof courseData);
          console.log('    - Course data keys:', courseData ? Object.keys(courseData) : 'none');
          
          // Try one more approach - maybe it's an error response
          if (response?.error || response?.message) {
            console.log('25. Error response detected:');
            console.log('    - Error:', response.error);
            console.log('    - Message:', response.message);
            console.log('    - Status:', response.status);
            
            toast({
              title: "API Error",
              description: response.message || response.error || "Failed to load course data",
              variant: "destructive"
            });
          } else if (!courseData) {
            // Last resort - try to use any object as course data if it has reasonable fields
            if (response && typeof response === 'object' && Object.keys(response).length > 0) {
              console.log('26. Attempting last resort data usage...');
              const lastResortData = {
                title: String(response.title || response.name || `Course ${id}`),
                description: String(response.description || response.desc || ""),
                category: String(response.category || response.categoryName || ""),
                duration: String(response.duration || response.durationValue || ""),
                durationType: "days",
                trainer: [],
                courseFee: 0,
                venueFee: 0,
                trainerFee: 0,
                adminFees: 0,
                contingencyFees: 0,
                serviceFees: 0,
                vitalFees: 0,
                discount: 0,
                minPax: 1,
                amountPerPax: 0,
                venue: "",
                certificates: "polwel",
                remarks: ""
              };
              
              console.log('27. Last resort mapped data:', lastResortData);
              setFormData({...lastResortData, specifiedLocation: "", defaultCourseFee: 0, discounts: []});
              
              toast({
                title: "Partial Data Loaded",
                description: "Some course data may be missing. Please verify all fields.",
                variant: "default"
              });
            } else {
              console.log('28. Complete failure - no usable data found');
              toast({
                title: "Error",
                description: "No course data could be loaded. The course may not exist or there may be a connection issue.",
                variant: "destructive"
              });
            }
          }
        }
      } catch (error) {
        console.error('29. === CRITICAL ERROR LOADING COURSE DATA ===');
        console.error('Error type:', typeof error);
        console.error('Error message:', error.message);
        console.error('Full error:', error);
        
        // Check if it's a network error
        if (error.message?.includes('Failed to fetch') || 
            error.message?.includes('CONNECTION_REFUSED') ||
            error.message?.includes('ERR_CONNECTION_REFUSED')) {
          console.error('30. Network connection error detected');
          toast({
            title: "Connection Error",
            description: "Cannot connect to server. Please check if the backend is running.",
            variant: "destructive"
          });
        } else if (error.message?.includes('Session expired')) {
          console.error('31. Authentication error detected');
          // Don't show toast, user will be redirected to login
        } else {
          console.error('32. General error loading course data');
          toast({
            title: "Error",
            description: `Failed to load course data: ${error.message}`,
            variant: "destructive"
          });
        }
        
        // Don't navigate away on network errors, let user try again
        if (!error.message?.includes('Failed to fetch') && 
            !error.message?.includes('CONNECTION_REFUSED')) {
          navigate('/course-creation');
        }
      } finally {
        setLoading(prev => ({ ...prev, course: false }));
        console.log('33. Course loading process completed');
      }
    };

    console.log('34. Starting loadCourseData...');
    loadCourseData();
  }, [id, isEditMode, toast, navigate]);

  // Debug current form data state
  useEffect(() => {
    console.log('=== CURRENT FORM STATE DEBUG ===');
    console.log('formData state:', JSON.stringify(formData, null, 2));
    console.log('Form field values:');
    console.log('- title:', formData.title);
    console.log('- description:', formData.description);
    console.log('- category:', formData.category);
    console.log('- duration:', formData.duration);
    console.log('- courseFee:', formData.courseFee);
    console.log('- venueFee:', formData.venueFee);
    console.log('- venue:', formData.venue);
    console.log('- trainers:', formData.trainer);
    console.log('===========================');
  }, [formData]);

  // Prepare data for dropdowns
  const categoryGroups = Array.isArray(apiData.categories) ? apiData.categories : [];
  const allCategories = categoryGroups.flatMap(group => [group.name, ...(group.subcategories || [])]);

  // Calculate fees whenever relevant fields change
  useEffect(() => {
    const totalFee = formData.courseFee + formData.venueFee + formData.trainerFee;
    const minimumRevenue = formData.amountPerPax * formData.minPax;
    const discountExpense = minimumRevenue * (formData.discount / 100);
    const totalCost = formData.adminFees + formData.contingencyFees + formData.serviceFees + formData.vitalFees + discountExpense;
    const profit = minimumRevenue - totalCost;
    const profitMargin = minimumRevenue > 0 ? (profit / minimumRevenue) * 100 : 0;

    setCalculations({
      totalFee,
      minimumRevenue,
      totalCost,
      profit,
      profitMargin
    });
  }, [formData]);

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
        title: formData.title,
        description: formData.description,
        category: formData.category,
        duration: formData.duration,
        durationType: formData.durationType,
        trainers: formData.trainer,
        courseFee: formData.courseFee,
        venueFee: formData.venueFee,
        trainerFee: formData.trainerFee,
        adminFees: formData.adminFees,
        contingencyFees: formData.contingencyFees,
        serviceFees: formData.serviceFees,
        vitalFees: formData.vitalFees,
        discount: formData.discount,
        minParticipants: formData.minPax,
        amountPerPax: formData.amountPerPax,
        venue: formData.venue,
        certificates: formData.certificates,
        remarks: formData.remarks
      };

      if (isEditMode && id) {
        await coursesApi.update(id, courseData);
        toast({
          title: "Course Updated",
          description: "Course has been successfully updated"
        });
        // Redirect back to archive after edit
        navigate('/course-creation');
      } else {
        const response = await coursesApi.create(courseData);
        toast({
          title: "Course Created",
          description: "Course has been successfully created"
        });
        
        // Reset form only for create mode
        setFormData({
          title: "",
          description: "",
          category: "",
          duration: "",
          durationType: "days",
          trainer: [] as string[],
          courseFee: 0,
          venueFee: 0,
          trainerFee: 0,
          adminFees: 0,
          contingencyFees: 0,
          serviceFees: 0,
          vitalFees: 0,
          discount: 0,
          minPax: 1,
          amountPerPax: 0,
          venue: "",
          specifiedLocation: "",
          certificates: "polwel",
          remarks: "",
          defaultCourseFee: 0,
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
