import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Edit, Calendar, Users, MapPin, DollarSign, Award, Clock } from "lucide-react";

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Mock data - in real app, this would fetch based on ID
  const course = {
    id: "1",
    title: "Leadership Excellence Program",
    category: "Mindful Leadership",
    duration: "3",
    durationType: "days",
    trainer: ["John Smith", "Sarah Johnson"],
    venue: "Main Training Room",
    amountPerPax: 850,
    minPax: 15,
    maxPax: 25,
    certificates: "polwel",
    status: "active",
    description: "A comprehensive leadership development program designed to enhance your management capabilities and inspire effective team leadership. This program covers essential leadership principles, communication strategies, and practical tools for managing diverse teams.",
    learningObjectives: [
      "Develop authentic leadership presence and communication skills",
      "Master techniques for motivating and engaging team members",
      "Learn conflict resolution and decision-making frameworks",
      "Build emotional intelligence and self-awareness",
      "Create actionable leadership development plans"
    ],
    courseOutline: [
      {
        module: "Module 1: Leadership Foundations",
        duration: "Day 1",
        topics: ["Leadership styles and approaches", "Self-assessment and awareness", "Building trust and credibility"]
      },
      {
        module: "Module 2: Communication & Influence",
        duration: "Day 2", 
        topics: ["Effective communication strategies", "Influencing without authority", "Active listening and feedback"]
      },
      {
        module: "Module 3: Team Leadership",
        duration: "Day 3",
        topics: ["Team building and motivation", "Performance management", "Action planning and implementation"]
      }
    ],
    prerequisites: "2+ years management experience recommended",
    targetAudience: "Middle managers, team leaders, and aspiring executives",
    createdDate: "2024-01-15",
    lastUpdated: "2024-03-10"
  };

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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/courses')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Courses
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">{course.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge className={getCategoryColor(course.category)}>
              {course.category}
            </Badge>
            {getStatusBadge(course.status)}
            {getCertificateBadge(course.certificates)}
          </div>
        </div>
        <Button onClick={() => navigate(`/course-creation/edit/${course.id}`)} className="gap-2">
          <Edit className="h-4 w-4" />
          Edit Course
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Course Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Course Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{course.description}</p>
              
              <Separator />
              
              <div>
                <h4 className="font-semibold mb-2">Learning Objectives</h4>
                <ul className="space-y-1">
                  {course.learningObjectives.map((objective, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span className="text-sm">{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Course Outline */}
          <Card>
            <CardHeader>
              <CardTitle>Course Outline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {course.courseOutline.map((module, index) => (
                <div key={index} className="border-l-4 border-primary pl-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{module.module}</h4>
                    <Badge variant="outline">{module.duration}</Badge>
                  </div>
                  <ul className="space-y-1">
                    {module.topics.map((topic, topicIndex) => (
                      <li key={topicIndex} className="text-sm text-muted-foreground">
                        {topic}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-1">Prerequisites</h4>
                <p className="text-sm text-muted-foreground">{course.prerequisites}</p>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-semibold mb-1">Target Audience</h4>
                <p className="text-sm text-muted-foreground">{course.targetAudience}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Course Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Course Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Duration</span>
                </div>
                <span className="font-medium">{course.duration} {course.durationType}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Capacity</span>
                </div>
                <span className="font-medium">{course.minPax} - {course.maxPax} pax</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Price per Pax</span>
                </div>
                <span className="font-medium">${course.amountPerPax}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Venue</span>
                </div>
                <span className="font-medium">{course.venue}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Certificate</span>
                </div>
                {getCertificateBadge(course.certificates)}
              </div>
            </CardContent>
          </Card>

          {/* Trainers */}
          <Card>
            <CardHeader>
              <CardTitle>Assigned Trainers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {course.trainer.map((trainer, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {trainer.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <span className="font-medium">{trainer}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Course Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Course Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span>{course.createdDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated:</span>
                <span>{course.lastUpdated}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Course ID:</span>
                <span className="font-mono">{course.id}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;