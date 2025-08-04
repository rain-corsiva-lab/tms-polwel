import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Eye } from "lucide-react";

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
  
  const [courses] = useState<Course[]>([
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
          <CardTitle>All Courses</CardTitle>
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
              {courses.map((course) => (
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
                        onClick={() => navigate(`/course-creation/view/${course.id}`)}
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