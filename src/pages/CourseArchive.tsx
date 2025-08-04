import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Eye, Power } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Course {
  id: string;
  title: string;
  category: string;
  duration: string;
  durationType: string;
  trainer: string;
  venue: string;
  amountPerPax: number;
  minPax: number;
  certificates: string;
  status: "active" | "archived" | "draft";
}

const CourseArchive = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  const categoryGroups = [
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
  ];

  const getCategoryColor = (category: string) => {
    for (const group of categoryGroups) {
      if (group.subcategories.includes(category)) {
        return group.color;
      }
    }
    return "bg-gray-100 text-gray-800 border-gray-200";
  };
  
  const [courses, setCourses] = useState<Course[]>([
    {
      id: "1",
      title: "Leadership Excellence Program",
      category: "Mindful Leadership",
      duration: "3",
      durationType: "days",
      trainer: "John Smith",
      venue: "Main Training Room",
      amountPerPax: 850,
      minPax: 15,
      certificates: "polwel",
      status: "active"
    },
    {
      id: "2",
      title: "Emotional Intelligence Workshop",
      category: "Emotional Intelligence",
      duration: "8",
      durationType: "hours",
      trainer: "Sarah Johnson",
      venue: "Conference Hall A",
      amountPerPax: 420,
      minPax: 20,
      certificates: "partner",
      status: "active"
    },
    {
      id: "3",
      title: "Strategic Thinking Masterclass",
      category: "Strategic Planning",
      duration: "2",
      durationType: "days",
      trainer: "Michael Chen",
      venue: "Online Platform",
      amountPerPax: 680,
      minPax: 12,
      certificates: "polwel",
      status: "draft"
    }
  ]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Active</Badge>;
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "archived":
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCertificateBadge = (certificates: string) => {
    switch (certificates) {
      case "polwel":
        return <Badge variant="default">POLWEL</Badge>;
      case "partner":
        return <Badge variant="secondary">Partner</Badge>;
      case "no":
        return <Badge variant="outline">None</Badge>;
      default:
        return <Badge variant="outline">{certificates}</Badge>;
    }
  };

  const handleDeactivate = (courseId: string, courseTitle: string) => {
    setCourses(courses.map(course => 
      course.id === courseId 
        ? { ...course, status: course.status === "active" ? "archived" : "active" } 
        : course
    ));
    const newStatus = courses.find(c => c.id === courseId)?.status === "active" ? "deactivated" : "activated";
    toast({
      title: `Course ${newStatus}`,
      description: `${courseTitle} has been ${newStatus} successfully.`,
    });
  };

  const filteredCourses = selectedCategory === "all" 
    ? courses 
    : courses.filter(course => {
        if (selectedCategory === "Self-Mastery") return categoryGroups[0].subcategories.includes(course.category);
        if (selectedCategory === "Thinking Skills") return categoryGroups[1].subcategories.includes(course.category);
        if (selectedCategory === "People Skills") return categoryGroups[2].subcategories.includes(course.category);
        if (selectedCategory === "Leadership Skills") return categoryGroups[3].subcategories.includes(course.category);
        return false;
      });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Courses</h1>
        <Button onClick={() => navigate('/course-creation/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Course
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Courses</CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label htmlFor="category-filter" className="text-sm font-medium">Filter by Category:</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categoryGroups.map((group) => (
                      <SelectItem key={group.name} value={group.name}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Trainer</TableHead>
                <TableHead>Venue</TableHead>
                <TableHead>Amount/Pax</TableHead>
                <TableHead>Min Pax</TableHead>
                <TableHead>Certificates</TableHead>
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
                  <TableCell>{course.trainer}</TableCell>
                  <TableCell>{course.venue}</TableCell>
                  <TableCell>${course.amountPerPax}</TableCell>
                  <TableCell>{course.minPax}</TableCell>
                  <TableCell>{getCertificateBadge(course.certificates)}</TableCell>
                  <TableCell>{getStatusBadge(course.status)}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/course-detail/${course.id}`)}
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
                        onClick={() => handleDeactivate(course.id, course.title)}
                        className={course.status === "active" ? "hover:bg-destructive hover:text-destructive-foreground" : "hover:bg-green-50 hover:text-green-700"}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CourseArchive;