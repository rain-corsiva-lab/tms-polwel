import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Eye, Loader2, Filter, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { coursesApi, referencesApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Course {
  id: string;
  title: string;
  category: string;
  duration: string;
  durationType: string;
  venue: string;
  defaultCourseFee: number;
  minParticipants?: number;
  certificates: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

const CourseArchive = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCertificate, setSelectedCertificate] = useState<string>("all");

  // Sorting state
  const [sortField, setSortField] = useState<keyof Course | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Filter state - stores selected values for each column
  const [filters, setFilters] = useState<Record<string, string[]>>({
    category: [],
    durationType: [],
    venue: [],
    minParticipants: [],
    certificates: [],
    status: [],
  });
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  // Loading and data states
  const [loading, setLoading] = useState({
    courses: false,
    categories: false,
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [venuesMap, setVenuesMap] = useState<Record<string, string>>({});

  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load categories
        setLoading((prev) => ({ ...prev, categories: true }));
        const categoriesResponse = await referencesApi.getCategories();
        setCategories(
          categoriesResponse.success && categoriesResponse.data && Array.isArray(categoriesResponse.data.categories) ? categoriesResponse.data.categories : []
        );

        // Load courses and venues
        setLoading((prev) => ({ ...prev, courses: true }));
        const [coursesResponse, venuesResponse] = await Promise.all([coursesApi.getAll(), referencesApi.getVenues().catch(() => null)]);
        console.log("Courses API response:", coursesResponse);

        // Handle the correct API response structure: { success: true, courses: [...] }
        let coursesData = [];
        if (coursesResponse.success && Array.isArray(coursesResponse.courses)) {
          coursesData = coursesResponse.courses;
        } else if (coursesResponse.data && Array.isArray(coursesResponse.data.courses)) {
          coursesData = coursesResponse.data.courses;
        } else if (Array.isArray(coursesResponse.data)) {
          coursesData = coursesResponse.data;
        } else if (Array.isArray(coursesResponse)) {
          coursesData = coursesResponse;
        }

        setCourses(coursesData);

        // Build venues map (id -> name) if venues were returned
        const vData = Array.isArray(venuesResponse?.data?.venues)
          ? venuesResponse.data.venues
          : Array.isArray(venuesResponse?.data)
          ? venuesResponse.data
          : Array.isArray(venuesResponse?.venues)
          ? venuesResponse.venues
          : Array.isArray(venuesResponse)
          ? venuesResponse
          : [];

        const map: Record<string, string> = {};
        for (const v of vData) {
          if (v && v.id) map[v.id] = v.name || v.title || v.address || String(v.id);
        }
        setVenuesMap(map);
      } catch (error) {
        console.error("Error loading data:", error);
        toast({
          title: "Error",
          description: "Failed to load courses data",
          variant: "destructive",
        });

        // Fallback to default categories
        setCategories([
          {
            name: "Self-Mastery",
            color: "bg-red-100 text-red-800 border-red-200",
            subcategories: ["Growth Mindset", "Personal Effectiveness", "Self-awareness"],
          },
          {
            name: "Thinking Skills",
            color: "bg-blue-100 text-blue-800 border-blue-200",
            subcategories: ["Agile Mindset", "Strategic Planning", "Critical Thinking & Creative Problem-Solving"],
          },
          {
            name: "People Skills",
            color: "bg-green-100 text-green-800 border-green-200",
            subcategories: ["Emotional Intelligence", "Collaboration", "Communication"],
          },
          {
            name: "Leadership Skills",
            color: "bg-yellow-100 text-yellow-800 border-yellow-200",
            subcategories: ["Mindful Leadership", "Empowerment", "Decision-making"],
          },
        ]);
      } finally {
        setLoading((prev) => ({ ...prev, courses: false, categories: false }));
      }
    };

    loadData();
  }, []);

  const allCategories = () => {
    const cats: string[] = [];
    for (const group of categories) {
      cats.push(group.name);
      if (group.subcategories) {
        cats.push(...group.subcategories);
      }
    }
    return cats;
  };

  const getCategoryColor = (category: string) => {
    for (const group of categories) {
      if (group.name === category || (group.subcategories && group.subcategories.includes(category))) {
        return group.color || "bg-gray-100 text-gray-800 border-gray-200";
      }
    }
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  // Status handling removed as courses no longer have a status field

  const handleDelete = async (courseId: string) => {
    if (window.confirm("Are you sure you want to delete this course? This action cannot be undone.")) {
      try {
        await coursesApi.delete(courseId);
        setCourses((prev) => prev.filter((course) => course.id !== courseId));
        toast({
          title: "Course Deleted",
          description: "Course has been successfully deleted",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete course",
          variant: "destructive",
        });
      }
    }
  };

  const handleToggleStatus = async (courseId: string) => {
    try {
      await coursesApi.toggleStatus(courseId);
      // Reload courses to reflect status change
      const coursesResponse = await coursesApi.getAll();
      let coursesData = [];
      if (coursesResponse.success && Array.isArray(coursesResponse.courses)) {
        coursesData = coursesResponse.courses;
      } else if (coursesResponse.data && Array.isArray(coursesResponse.data.courses)) {
        coursesData = coursesResponse.data.courses;
      } else if (Array.isArray(coursesResponse.data)) {
        coursesData = coursesResponse.data;
      } else if (Array.isArray(coursesResponse)) {
        coursesData = coursesResponse;
      }
      setCourses(coursesData);

      toast({
        title: "Status Updated",
        description: "Course status has been successfully updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update course status",
        variant: "destructive",
      });
    }
  };

  // Filter courses based on selected filters
  const filteredCourses = Array.isArray(courses)
    ? courses.filter((course) => {
        const categoryMatch =
          selectedCategory === "all" ||
          (() => {
            if (selectedCategory === course.category) return true;

            // Check if category is a subcategory of selected main category
            for (const group of categories) {
              if (group.name === selectedCategory && group.subcategories) {
                return group.subcategories.includes(course.category);
              }
            }
            return false;
          })();

        const certificateMatch = selectedCertificate === "all" || course.certificates === selectedCertificate;

        // Apply column filters
        const categoryFilterMatch = filters.category.length === 0 || filters.category.includes(course.category || "");
        const durationTypeFilterMatch = filters.durationType.length === 0 || filters.durationType.includes(course.durationType || "");
        const venueFilterMatch = filters.venue.length === 0 || filters.venue.includes(course.venue || "");
        const minParticipantsFilterMatch = filters.minParticipants.length === 0 || filters.minParticipants.includes(String(course.minParticipants || 1));
        const certificatesFilterMatch = filters.certificates.length === 0 || filters.certificates.includes(course.certificates || "");
        const statusFilterMatch = filters.status.length === 0 || filters.status.includes(course.status || "ACTIVE");

        return (
          categoryMatch &&
          certificateMatch &&
          categoryFilterMatch &&
          durationTypeFilterMatch &&
          venueFilterMatch &&
          minParticipantsFilterMatch &&
          certificatesFilterMatch &&
          statusFilterMatch
        );
      })
    : [];

  // Get unique values for each filterable column
  const getUniqueValues = (field: keyof Course) => {
    const values = Array.from(
      new Set(
        courses
          .map((c) => {
            let val = c[field];
            if (field === "venue" && val && venuesMap[val]) {
              return venuesMap[val];
            }
            return val ? String(val) : "";
          })
          .filter(Boolean)
      )
    );
    return values.sort();
  };

  // Handle filter toggle
  const handleFilterToggle = (field: string, value: string) => {
    setFilters((prev) => {
      const current = prev[field] || [];
      const newValues = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [field]: newValues };
    });
  };

  // Clear all filters for a column
  const clearColumnFilter = (field: string) => {
    setFilters((prev) => ({ ...prev, [field]: [] }));
  };

  // Check if a column has active filters
  const hasActiveFilter = (field: string) => {
    return filters[field] && filters[field].length > 0;
  };

  // Sort courses based on selected field and direction
  const sortedCourses = [...filteredCourses].sort((a, b) => {
    if (!sortField) return 0;

    const aValue = a[sortField];
    const bValue = b[sortField];

    // Handle null/undefined
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return sortDirection === "asc" ? 1 : -1;
    if (bValue == null) return sortDirection === "asc" ? -1 : 1;

    // Compare based on type
    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }

    // String comparison
    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();

    if (aStr < bStr) return sortDirection === "asc" ? -1 : 1;
    if (aStr > bStr) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // Handle column header click for sorting
  const handleSort = (field: keyof Course) => {
    if (sortField === field) {
      // Toggle direction
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Render sort icon
  const renderSortIcon = (field: keyof Course) => {
    if (sortField !== field) {
      return <span className="ml-1 text-muted-foreground opacity-50">⇅</span>;
    }
    return sortDirection === "asc" ? <span className="ml-1">↑</span> : <span className="ml-1">↓</span>;
  };

  if (loading.courses) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="mr-2 h-8 w-8 animate-spin" />
          <span>Loading courses...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">List of Courses</h1>
          <p className="text-muted-foreground">Manage and view all courses in the system.</p>
        </div>
        <Button onClick={() => navigate("/courses/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Course
        </Button>
      </div>

      {/* Filters */}
      {/* <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((group) => (
                    <div key={group.name}>
                      <SelectItem value={group.name}>{group.name}</SelectItem>
                      {(group.subcategories || []).map((subcategory) => (
                        <SelectItem key={subcategory} value={subcategory} className="ml-4">
                          {subcategory}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Certificate Type</label>
              <Select value={selectedCertificate} onValueChange={setSelectedCertificate}>
                <SelectTrigger>
                  <SelectValue placeholder="All certificates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Certificates</SelectItem>
                  <SelectItem value="polwel">POLWEL</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card> */}

      {/* Course Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Courses ({sortedCourses.length})
              {courses.length > 0 && sortedCourses.length !== courses.length && (
                <span className="text-sm font-normal text-muted-foreground ml-2">of {courses.length} total</span>
              )}
            </CardTitle>
            {Object.values(filters).some((arr) => arr.length > 0) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setFilters({
                    category: [],
                    durationType: [],
                    venue: [],
                    minParticipants: [],
                    certificates: [],
                    status: [],
                  })
                }
              >
                <X className="h-4 w-4 mr-2" />
                Clear All Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {sortedCourses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No courses found matching the selected filters.</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedCategory("all");
                  setSelectedCertificate("all");
                }}
                className="mt-4"
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("title")}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        Course Title
                        {renderSortIcon("title")}
                      </div>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center cursor-pointer hover:text-primary" onClick={() => handleSort("category")}>
                        Category
                        {renderSortIcon("category")}
                      </div>
                      <Popover open={openFilter === "category"} onOpenChange={(open) => setOpenFilter(open ? "category" : null)}>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className={cn("h-7 w-7 p-0", hasActiveFilter("category") && "text-primary")}>
                            <Filter className="h-3.5 w-3.5" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-0" align="start">
                          <div className="p-3 border-b">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Filter by Category</span>
                              {hasActiveFilter("category") && (
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => clearColumnFilter("category")}>
                                  Clear
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="max-h-64 overflow-y-auto p-2">
                            {getUniqueValues("category").map((value) => (
                              <div
                                key={value}
                                className="flex items-center space-x-2 py-1.5 px-2 hover:bg-muted rounded-sm cursor-pointer"
                                onClick={() => handleFilterToggle("category", value)}
                              >
                                <Checkbox checked={filters.category?.includes(value)} />
                                <span className="text-sm">{value}</span>
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center cursor-pointer hover:text-primary" onClick={() => handleSort("durationType")}>
                        Duration
                        {renderSortIcon("durationType")}
                      </div>
                      <Popover open={openFilter === "durationType"} onOpenChange={(open) => setOpenFilter(open ? "durationType" : null)}>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className={cn("h-7 w-7 p-0", hasActiveFilter("durationType") && "text-primary")}>
                            <Filter className="h-3.5 w-3.5" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-0" align="start">
                          <div className="p-3 border-b">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Filter by Duration Type</span>
                              {hasActiveFilter("durationType") && (
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => clearColumnFilter("durationType")}>
                                  Clear
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="max-h-64 overflow-y-auto p-2">
                            {getUniqueValues("durationType").map((value) => (
                              <div
                                key={value}
                                className="flex items-center space-x-2 py-1.5 px-2 hover:bg-muted rounded-sm cursor-pointer"
                                onClick={() => handleFilterToggle("durationType", value)}
                              >
                                <Checkbox checked={filters.durationType?.includes(value)} />
                                <span className="text-sm">{value}</span>
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center cursor-pointer hover:text-primary" onClick={() => handleSort("venue")}>
                        Venue
                        {renderSortIcon("venue")}
                      </div>
                      <Popover open={openFilter === "venue"} onOpenChange={(open) => setOpenFilter(open ? "venue" : null)}>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className={cn("h-7 w-7 p-0", hasActiveFilter("venue") && "text-primary")}>
                            <Filter className="h-3.5 w-3.5" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-0" align="start">
                          <div className="p-3 border-b">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Filter by Venue</span>
                              {hasActiveFilter("venue") && (
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => clearColumnFilter("venue")}>
                                  Clear
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="max-h-64 overflow-y-auto p-2">
                            {getUniqueValues("venue").map((value) => (
                              <div
                                key={value}
                                className="flex items-center space-x-2 py-1.5 px-2 hover:bg-muted rounded-sm cursor-pointer"
                                onClick={() => handleFilterToggle("venue", value)}
                              >
                                <Checkbox checked={filters.venue?.includes(value)} />
                                <span className="text-sm">{value}</span>
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("defaultCourseFee")}>
                    <div className="flex items-center">
                      Price/Pax
                      {renderSortIcon("defaultCourseFee")}
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center cursor-pointer hover:text-primary" onClick={() => handleSort("minParticipants")}>
                        Min Pax
                        {renderSortIcon("minParticipants")}
                      </div>
                      <Popover open={openFilter === "minParticipants"} onOpenChange={(open) => setOpenFilter(open ? "minParticipants" : null)}>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className={cn("h-7 w-7 p-0", hasActiveFilter("minParticipants") && "text-primary")}>
                            <Filter className="h-3.5 w-3.5" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-0" align="start">
                          <div className="p-3 border-b">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Filter by Min Pax</span>
                              {hasActiveFilter("minParticipants") && (
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => clearColumnFilter("minParticipants")}>
                                  Clear
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="max-h-64 overflow-y-auto p-2">
                            {getUniqueValues("minParticipants").map((value) => (
                              <div
                                key={value}
                                className="flex items-center space-x-2 py-1.5 px-2 hover:bg-muted rounded-sm cursor-pointer"
                                onClick={() => handleFilterToggle("minParticipants", value)}
                              >
                                <Checkbox checked={filters.minParticipants?.includes(value)} />
                                <span className="text-sm">{value}</span>
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center cursor-pointer hover:text-primary" onClick={() => handleSort("certificates")}>
                        Certificate
                        {renderSortIcon("certificates")}
                      </div>
                      <Popover open={openFilter === "certificates"} onOpenChange={(open) => setOpenFilter(open ? "certificates" : null)}>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className={cn("h-7 w-7 p-0", hasActiveFilter("certificates") && "text-primary")}>
                            <Filter className="h-3.5 w-3.5" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-0" align="start">
                          <div className="p-3 border-b">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Filter by Certificate</span>
                              {hasActiveFilter("certificates") && (
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => clearColumnFilter("certificates")}>
                                  Clear
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="max-h-64 overflow-y-auto p-2">
                            {getUniqueValues("certificates").map((value) => (
                              <div
                                key={value}
                                className="flex items-center space-x-2 py-1.5 px-2 hover:bg-muted rounded-sm cursor-pointer"
                                onClick={() => handleFilterToggle("certificates", value)}
                              >
                                <Checkbox checked={filters.certificates?.includes(value)} />
                                <span className="text-sm">{value}</span>
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center cursor-pointer hover:text-primary" onClick={() => handleSort("status")}>
                        Status
                        {renderSortIcon("status")}
                      </div>
                      <Popover open={openFilter === "status"} onOpenChange={(open) => setOpenFilter(open ? "status" : null)}>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className={cn("h-7 w-7 p-0", hasActiveFilter("status") && "text-primary")}>
                            <Filter className="h-3.5 w-3.5" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-0" align="start">
                          <div className="p-3 border-b">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Filter by Status</span>
                              {hasActiveFilter("status") && (
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => clearColumnFilter("status")}>
                                  Clear
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="max-h-64 overflow-y-auto p-2">
                            {getUniqueValues("status").map((value) => (
                              <div
                                key={value}
                                className="flex items-center space-x-2 py-1.5 px-2 hover:bg-muted rounded-sm cursor-pointer"
                                onClick={() => handleFilterToggle("status", value)}
                              >
                                <Checkbox checked={filters.status?.includes(value)} />
                                <span className="text-sm">{value}</span>
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCourses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="font-medium">{course.title}</TableCell>
                    <TableCell>
                      <Badge className={getCategoryColor(course.category)}>{course.category}</Badge>
                    </TableCell>
                    <TableCell>
                      {course.duration} {course.durationType}
                    </TableCell>
                    <TableCell>{(course.venue && venuesMap[course.venue]) || course.venue || "TBD"}</TableCell>
                    <TableCell>${course.defaultCourseFee?.toFixed(2) || "0.00"}</TableCell>
                    <TableCell>{course.minParticipants || 1}</TableCell>
                    <TableCell>
                      <Badge variant={course.certificates === "polwel" ? "default" : "secondary"}>{course.certificates?.toUpperCase() || "POLWEL"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant={course.status === "ACTIVE" ? "default" : "secondary"}
                        size="sm"
                        onClick={() => handleToggleStatus(course.id)}
                        className={course.status === "ACTIVE" ? "bg-green-600 hover:bg-green-700" : ""}
                      >
                        {course.status || "ACTIVE"}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/courses/detail/${course.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/courses/edit/${course.id}`)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(course.id)} className="text-red-600 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CourseArchive;
