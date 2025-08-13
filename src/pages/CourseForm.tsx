import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Check, ChevronsUpDown, X, Loader2 } from "lucide-react";
import { referencesApi, coursesApi } from "@/lib/api";

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
    certificates: "polwel",
    remarks: ""
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
          
          setFormData(testData);
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
          setFormData(mappedData);
          
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
              setFormData(lastResortData);
              
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
          certificates: "polwel",
          remarks: ""
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
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Course Title *</Label>
              <Input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="Enter course title"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Course Category *</Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={loading.categories ? "Loading..." : "Select category"} />
                  </SelectTrigger>
                  <SelectContent>
                    {loading.categories ? (
                      <SelectItem value="__loading__" disabled>Loading categories...</SelectItem>
                    ) : categoryGroups.length > 0 ? (
                      categoryGroups.map((group) => [
                        <div 
                          key={`header-${group.name}`}
                          className={`px-2 py-1 text-xs font-semibold ${group.color || 'bg-gray-100 text-gray-800'} rounded mx-1 my-1 pointer-events-none`}
                        >
                          {group.name}
                        </div>,
                        ...(group.subcategories || []).map((subcategory) => (
                          <SelectItem 
                            key={subcategory} 
                            value={subcategory}
                            className="ml-2 text-sm"
                          >
                            {subcategory}
                          </SelectItem>
                        ))
                      ]).flat()
                    ) : (
                      <SelectItem value="__no_categories__" disabled>No categories available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trainer">Trainer/Partner *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between h-10"
                    >
                      {formData.trainer.length > 0 ? (
                        <div className="flex gap-1">
                          {formData.trainer.slice(0, 2).map((t) => (
                            <Badge key={t} variant="secondary" className="text-xs">
                              {t}
                              <X
                                className="ml-1 h-3 w-3 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInputChange("trainer", formData.trainer.filter(trainer => trainer !== t));
                                }}
                              />
                            </Badge>
                          ))}
                          {formData.trainer.length > 2 && (
                            <span className="text-xs text-muted-foreground">+{formData.trainer.length - 2} more</span>
                          )}
                        </div>
                      ) : (
                        "Select trainers..."
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search trainers..." />
                      <CommandList>
                        <CommandEmpty>No trainer found.</CommandEmpty>
                        {loading.trainers ? (
                          <CommandItem disabled>Loading trainers...</CommandItem>
                        ) : (
                          <>
                            <CommandGroup heading="Trainers">
          {apiData.trainers.map((trainer, index) => {
                                const displayName = trainer.name; // Use the 'name' field from the API
                                return (
                                  <CommandItem
            key={trainer.id || trainer.name || `trainer-${index}`}
                                    value={displayName}
                                    onSelect={() => {
                                      if (!formData.trainer.includes(displayName)) {
                                        handleInputChange("trainer", [...formData.trainer, displayName]);
                                      }
                                    }}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${
                                        formData.trainer.includes(displayName) ? "opacity-100" : "opacity-0"
                                      }`}
                                    />
                                    {displayName} 
                                    {trainer.organization && <span className="text-xs text-muted-foreground ml-2">({trainer.organization})</span>}
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                            <CommandGroup heading="Partners">
                              {apiData.partners.map((partner, index) => (
                                <CommandItem
                                  key={partner.id || partner.name || `partner-${index}`}
                                  value={partner.name}
                                  onSelect={() => {
                                    if (!formData.trainer.includes(partner.name)) {
                                      handleInputChange("trainer", [...formData.trainer, partner.name]);
                                    }
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      formData.trainer.includes(partner.name) ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  {partner.name}
                                  {partner.organization && <span className="text-xs text-muted-foreground ml-2">({partner.organization})</span>}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Course Description / Learning Objectives</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Enter course description and learning objectives"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Course Duration</Label>
                <Input
                  id="duration"
                  type="text"
                  value={formData.duration}
                  onChange={(e) => handleInputChange("duration", e.target.value)}
                  placeholder="e.g., 2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="durationType">Duration Type</Label>
                <Select value={formData.durationType} onValueChange={(value) => handleInputChange("durationType", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="weeks">Weeks</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue">Venue</Label>
                <Select value={formData.venue} onValueChange={(value) => handleInputChange("venue", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={loading.venues ? "Loading venues..." : "Select venue"} />
                  </SelectTrigger>
                  <SelectContent>
                    {loading.venues ? (
                      <SelectItem value="__loading__" disabled>Loading...</SelectItem>
                    ) : apiData.venues.length > 0 ? (
                      apiData.venues.map((venue) => (
                        <SelectItem key={venue.id || venue.name} value={venue.name}>
                          {venue.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="__no_venues__" disabled>No venues available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fees and Revenue */}
        <Card>
          <CardHeader>
            <CardTitle>Fees and Revenue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="courseFee">Course Fee ($)</Label>
                <Input
                  id="courseFee"
                  type="number"
                  value={formData.courseFee}
                  onChange={(e) => handleInputChange("courseFee", parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="venueFee">Venue Fee ($)</Label>
                <Input
                  id="venueFee"
                  type="number"
                  value={formData.venueFee}
                  onChange={(e) => handleInputChange("venueFee", parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trainerFee">Trainer Fee ($)</Label>
                <Input
                  id="trainerFee"
                  type="number"
                  value={formData.trainerFee}
                  onChange={(e) => handleInputChange("trainerFee", parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="adminFees">Admin Fees ($)</Label>
                <Input
                  id="adminFees"
                  type="number"
                  value={formData.adminFees}
                  onChange={(e) => handleInputChange("adminFees", parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contingencyFees">Contingency Fees ($)</Label>
                <Input
                  id="contingencyFees"
                  type="number"
                  value={formData.contingencyFees}
                  onChange={(e) => handleInputChange("contingencyFees", parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serviceFees">Service Fees ($)</Label>
                <Input
                  id="serviceFees"
                  type="number"
                  value={formData.serviceFees}
                  onChange={(e) => handleInputChange("serviceFees", parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vitalFees">Vital Fees ($)</Label>
                <Input
                  id="vitalFees"
                  type="number"
                  value={formData.vitalFees}
                  onChange={(e) => handleInputChange("vitalFees", parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discount">Discount (%)</Label>
                <Input
                  id="discount"
                  type="number"
                  value={formData.discount}
                  onChange={(e) => handleInputChange("discount", parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  max="100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minPax">Minimum Pax</Label>
                <Input
                  id="minPax"
                  type="number"
                  value={formData.minPax}
                  onChange={(e) => handleInputChange("minPax", parseInt(e.target.value) || 1)}
                  placeholder="1"
                  min="1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amountPerPax">Amount Per Pax ($)</Label>
                <Input
                  id="amountPerPax"
                  type="number"
                  value={formData.amountPerPax}
                  onChange={(e) => handleInputChange("amountPerPax", parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="certificates">Certificates</Label>
              <RadioGroup
                value={formData.certificates}
                onValueChange={(value) => handleInputChange("certificates", value)}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="polwel" id="polwel" />
                  <Label htmlFor="polwel">POLWEL</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="partner" id="partner" />
                  <Label htmlFor="partner">Partner</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={formData.remarks}
                onChange={(e) => handleInputChange("remarks", e.target.value)}
                placeholder="Additional notes or remarks"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <Label className="text-sm text-gray-600">Total Fee</Label>
                <p className="text-2xl font-bold text-blue-600">${calculations.totalFee.toFixed(2)}</p>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <Label className="text-sm text-gray-600">Minimum Revenue</Label>
                <p className="text-2xl font-bold text-green-600">${calculations.minimumRevenue.toFixed(2)}</p>
              </div>
              
              <div className="p-4 bg-red-50 rounded-lg">
                <Label className="text-sm text-gray-600">Total Cost</Label>
                <p className="text-2xl font-bold text-red-600">${calculations.totalCost.toFixed(2)}</p>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg">
                <Label className="text-sm text-gray-600">Profit</Label>
                <p className={`text-2xl font-bold ${calculations.profit >= 0 ? 'text-purple-600' : 'text-red-500'}`}>
                  ${calculations.profit.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">
                  Margin: {calculations.profitMargin.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

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
