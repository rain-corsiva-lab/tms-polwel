import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Eye, Power, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { coursesApi, referencesApi } from "@/lib/api";

interface Course {
  id: string;
  title: string;
  category: string;
  duration: string;
  durationType: string;
  venue: string;
  amountPerPax: number;
  minParticipants?: number;
  certificates: string;
  status: "active" | "archived" | "draft";
  createdAt?: string;
  updatedAt?: string;
}

const CourseArchive = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedCertificate, setSelectedCertificate] = useState<string>("all");
  
  // Loading and data states
  const [loading, setLoading] = useState({
    courses: false,
    categories: false
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load categories
        setLoading(prev => ({ ...prev, categories: true }));
        const categoriesResponse = await referencesApi.getCategories();
        setCategories(categoriesResponse.success && categoriesResponse.data && Array.isArray(categoriesResponse.data.categories) 
          ? categoriesResponse.data.categories 
          : []);

        // Load courses
        setLoading(prev => ({ ...prev, courses: true }));
        const coursesResponse = await coursesApi.getAll();
        console.log('Courses API response:', coursesResponse);
        
        // Handle the correct API response structure: { success: true, data: { courses: [...] } }
        let coursesData = [];
        if (coursesResponse.success && coursesResponse.data && Array.isArray(coursesResponse.data.courses)) {
          coursesData = coursesResponse.data.courses;
        } else if (Array.isArray(coursesResponse.data)) {
          coursesData = coursesResponse.data;
        } else if (Array.isArray(coursesResponse)) {
          coursesData = coursesResponse;
        }
          
        setCourses(coursesData);

      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: "Error",
          description: "Failed to load courses data",
          variant: "destructive"
        });
        
        // Fallback to default categories and mock course data
        setCategories([
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
        ]);

        // Mock course data
        setCourses([
          {
            id: "1",
            title: "Effective Communication in the Workplace",
            category: "Communication",
            duration: "2",
            durationType: "days",
            venue: "POLWEL Training Center",
            amountPerPax: 450.00,
            minParticipants: 8,
            certificates: "polwel",
            status: "active",
            createdAt: "2024-01-15",
            updatedAt: "2024-01-20"
          },
          {
            id: "2", 
            title: "Leadership Excellence Program",
            category: "Mindful Leadership",
            duration: "3",
            durationType: "days",
            venue: "Marina Bay Conference Center",
            amountPerPax: 750.00,
            minParticipants: 12,
            certificates: "polwel",
            status: "active",
            createdAt: "2024-01-10",
            updatedAt: "2024-01-25"
          },
          {
            id: "3",
            title: "Emotional Intelligence Masterclass",
            category: "Emotional Intelligence",
            duration: "1",
            durationType: "day",
            venue: "Online Platform",
            amountPerPax: 250.00,
            minParticipants: 6,
            certificates: "partner",
            status: "active",
            createdAt: "2024-02-01",
            updatedAt: "2024-02-05"
          },
          {
            id: "4",
            title: "Strategic Planning Workshop",
            category: "Strategic Planning",
            duration: "4",
            durationType: "hours",
            venue: "Client Site",
            amountPerPax: 180.00,
            minParticipants: 10,
            certificates: "polwel",
            status: "draft",
            createdAt: "2024-02-10",
            updatedAt: "2024-02-12"
          },
          {
            id: "5",
            title: "Growth Mindset Development",
            category: "Growth Mindset",
            duration: "1.5",
            durationType: "days",
            venue: "POLWEL Training Center",
            amountPerPax: 320.00,
            minParticipants: 8,
            certificates: "polwel",
            status: "active",
            createdAt: "2024-01-25",
            updatedAt: "2024-02-01"
          },
          {
            id: "6",
            title: "Team Collaboration Excellence",
            category: "Collaboration", 
            duration: "2",
            durationType: "days",
            venue: "Corporate Training Room",
            amountPerPax: 380.00,
            minParticipants: 15,
            certificates: "partner",
            status: "archived",
            createdAt: "2023-12-15",
            updatedAt: "2024-01-05"
          },
          {
            id: "7",
            title: "Critical Thinking & Problem Solving",
            category: "Critical Thinking & Creative Problem-Solving",
            duration: "3",
            durationType: "days",
            venue: "Innovation Hub",
            amountPerPax: 550.00,
            minParticipants: 12,
            certificates: "polwel",
            status: "active",
            createdAt: "2024-02-05",
            updatedAt: "2024-02-08"
          },
          {
            id: "8",
            title: "Personal Effectiveness Bootcamp",
            category: "Personal Effectiveness",
            duration: "1",
            durationType: "day",
            venue: "POLWEL Training Center",
            amountPerPax: 280.00,
            minParticipants: 10,
            certificates: "polwel",
            status: "active",
            createdAt: "2024-01-30",
            updatedAt: "2024-02-03"
          },
          {
            id: "9",
            title: "Agile Mindset Transformation",
            category: "Agile Mindset",
            duration: "2.5",
            durationType: "days",
            venue: "Tech Park Conference Hall",
            amountPerPax: 480.00,
            minParticipants: 14,
            certificates: "partner",
            status: "draft",
            createdAt: "2024-02-12",
            updatedAt: "2024-02-15"
          },
          {
            id: "10",
            title: "Executive Decision Making",
            category: "Decision-making",
            duration: "1",
            durationType: "day",
            venue: "Executive Center",
            amountPerPax: 650.00,
            minParticipants: 6,
            certificates: "polwel",
            status: "active",
            createdAt: "2024-02-01",
            updatedAt: "2024-02-10"
          },
          {
            id: "11",
            title: "Self-Awareness Journey",
            category: "Self-awareness",
            duration: "6",
            durationType: "hours",
            venue: "Mindfulness Center",
            amountPerPax: 150.00,
            minParticipants: 8,
            certificates: "partner",
            status: "active",
            createdAt: "2024-01-20",
            updatedAt: "2024-01-28"
          },
          {
            id: "12",
            title: "Empowerment Leadership Program",
            category: "Empowerment",
            duration: "2",
            durationType: "days", 
            venue: "Leadership Institute",
            amountPerPax: 520.00,
            minParticipants: 10,
            certificates: "polwel",
            status: "archived",
            createdAt: "2023-11-15",
            updatedAt: "2024-01-10"
          }
        ]);
      } finally {
        setLoading(prev => ({ ...prev, courses: false, categories: false }));
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

  const handleStatusToggle = async (courseId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "active" ? "archived" : "active";
      await coursesApi.updateStatus(courseId, newStatus);
      
      setCourses(prev =>
        prev.map(course =>
          course.id === courseId ? { ...course, status: newStatus } : course
        )
      );
      
      toast({
        title: "Status Updated",
        description: `Course ${newStatus === "active" ? "activated" : "archived"} successfully`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update course status",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (courseId: string) => {
    if (window.confirm("Are you sure you want to delete this course? This action cannot be undone.")) {
      try {
        await coursesApi.delete(courseId);
        setCourses(prev => prev.filter(course => course.id !== courseId));
        toast({
          title: "Course Deleted",
          description: "Course has been successfully deleted"
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete course",
          variant: "destructive"
        });
      }
    }
  };

  // Filter courses based on selected filters
  const filteredCourses = Array.isArray(courses) ? courses.filter(course => {
    const categoryMatch = selectedCategory === "all" || (() => {
      if (selectedCategory === course.category) return true;
      
      // Check if category is a subcategory of selected main category
      for (const group of categories) {
        if (group.name === selectedCategory && group.subcategories) {
          return group.subcategories.includes(course.category);
        }
      }
      return false;
    })();

    const statusMatch = selectedStatus === "all" || course.status === selectedStatus;
    const certificateMatch = selectedCertificate === "all" || course.certificates === selectedCertificate;

    return categoryMatch && statusMatch && certificateMatch;
  }) : [];

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
          <h1 className="text-3xl font-bold">Course Archive</h1>
          <p className="text-muted-foreground">Manage and view all courses in the system.</p>
        </div>
        <Button onClick={() => navigate('/course-creation/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Course
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <label className="text-sm font-medium">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
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
      </Card>

      {/* Course Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Courses ({filteredCourses.length})
            {courses.length > 0 && filteredCourses.length !== courses.length && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                of {courses.length} total
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCourses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No courses found matching the selected filters.</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedCategory("all");
                  setSelectedStatus("all");
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
                  <TableHead>Course Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Price/Pax</TableHead>
                  <TableHead>Min Pax</TableHead>
                  <TableHead>Certificate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="font-medium">{course.title}</TableCell>
                    <TableCell>
                      <Badge className={getCategoryColor(course.category)}>
                        {course.category}
                      </Badge>
                    </TableCell>
                    <TableCell>{course.duration} {course.durationType}</TableCell>
                    <TableCell>{course.venue || 'TBD'}</TableCell>
                    <TableCell>${course.amountPerPax?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell>{course.minParticipants || 1}</TableCell>
                    <TableCell>
                      <Badge variant={course.certificates === "polwel" ? "default" : "secondary"}>
                        {course.certificates?.toUpperCase() || 'POLWEL'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          course.status === "active" ? "default" : 
                          course.status === "archived" ? "secondary" : "outline"
                        }
                      >
                        {course.status?.toUpperCase() || 'DRAFT'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/course-creation/detail/${course.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/course-creation/edit/${course.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusToggle(course.id, course.status)}
                          className={course.status === "active" ? "text-orange-600" : "text-green-600"}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(course.id)}
                          className="text-red-600 hover:bg-red-50"
                        >
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
