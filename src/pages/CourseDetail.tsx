import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Clock, Users, MapPin, Award, Percent, GraduationCap, ClipboardCheck, User as UserIcon, Layers } from "lucide-react";
import { coursesApi } from "@/lib/api";
import { formatDate } from "../lib/date";
import DOMPurify from "dompurify";
import { useToast } from "@/hooks/use-toast";

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!id) return;

      try {
        setLoading(true);
        console.log("Fetching course with ID:", id);
        const response = await coursesApi.getById(id);
        console.log("Course API response:", response);

        // FIXED DATA EXTRACTION - Handle real API structure
        let courseData = null;
        if (response?.success && response?.data?.course) {
          courseData = response.data.course;
          console.log("Using response.data.course (correct API structure)");
        } else if (response?.success && response?.data) {
          courseData = response.data;
          console.log("Using response.data");
        } else if (response?.data?.course) {
          courseData = response.data.course;
          console.log("Using response.data.course");
        } else if (response?.data) {
          courseData = response.data;
          console.log("Using response.data");
        } else if (response && response.title) {
          courseData = response;
          console.log("Using response directly");
        }

        console.log("Extracted course data:", courseData);
        setCourse(courseData);
      } catch (error) {
        console.error("Error fetching course:", error);
        toast({
          title: "Error",
          description: "Failed to load course details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [id, toast]);

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading course details...</span>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Course Not Found</h1>
          <Button onClick={() => navigate("/courses")}>Back to Courses</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate("/courses")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Courses
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              {course.title}
              {course.courseCode && (
                <Badge variant="secondary" className="text-xs font-mono tracking-wide">
                  {course.courseCode}
                </Badge>
              )}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              {course.category && <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">{course.category}</Badge>}
              {course.level && <Badge className="bg-purple-100 text-purple-800 border-purple-200">Lvl: {course.level}</Badge>}
              {/* status removed from Course model */}
              <Badge className="bg-blue-600 text-white">{course.certificates === "polwel" ? "POLWEL" : "PARTNER"}</Badge>
            </div>
          </div>
        </div>
        <Button onClick={() => navigate(`/courses/edit/${course.id}`)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Course
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Course Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Course Synopsis */}
          <Card>
            <CardHeader>
              <CardTitle>Course Synopsis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Course Overview */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Course Overview</h3>
                {course.description ? (
                  <div className="prose prose-sm max-w-none text-gray-600" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(course.description) }} />
                ) : (
                  <p className="text-gray-500 italic">No description available.</p>
                )}
              </div>

              {/* Learning Objectives */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Learning Objectives</h3>
                {course.learningObjectives ? (
                  <div
                    className="prose prose-sm max-w-none text-gray-600"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(course.learningObjectives) }}
                  />
                ) : course.objectives && Array.isArray(course.objectives) && course.objectives.length > 0 ? (
                  <ul className="space-y-2 text-gray-600">
                    {course.objectives.map((objective, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                        {objective}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic">No learning objectives specified for this course.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Discounts & Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Discounts & Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {course.discounts && Array.isArray(course.discounts) && course.discounts.length > 0 ? (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {course.discounts.map((d: any, idx: number) => (
                      <div key={d.id || idx} className="flex items-center justify-between rounded border p-2 bg-slate-50">
                        <span className="text-sm font-medium flex items-center gap-2">
                          <Percent className="h-3 w-3 text-slate-500" /> {d.name || `Discount ${idx + 1}`}
                        </span>
                        <span className="text-sm font-semibold">{d.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No structured discounts configured.</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="text-gray-500">Default Course Fee</div>
                  <div className="font-semibold">${(course.defaultCourseFee || 0).toFixed(2)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-500">Billing Rate</div>
                  <div className="font-semibold">${(course.billingRate || 0).toFixed(2)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-500">Venue Expenses</div>
                  <div className="font-semibold">${(course.venueFee || 0).toFixed(2)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-500">Contracts Fees</div>
                  <div className="font-semibold">${(course.contractsFeePayout || 0).toFixed(2)}</div>
                </div>
              </div>
              {course.remarks && (
                <div className="pt-2 border-t text-sm">
                  <div className="text-gray-500 mb-1">Remarks</div>
                  <p className="text-gray-700 whitespace-pre-wrap">{course.remarks}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-sm mb-1">Prerequisites</h4>
                  {course.prerequisites && Array.isArray(course.prerequisites) && course.prerequisites.length > 0 ? (
                    <ul className="text-sm text-gray-600 space-y-1">
                      {course.prerequisites.map((prereq, index) => (
                        <li key={index}>• {prereq}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No specific prerequisites for this course.</p>
                  )}
                </div>

                {course.materials && Array.isArray(course.materials) && course.materials.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Materials</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {course.materials.map((material, index) => (
                        <li key={index}>• {material}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {course.targetAudience && (
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Target Audience</h4>
                    <p className="text-sm text-gray-600">{course.targetAudience}</p>
                  </div>
                )}
                {course.assessmentMethod && (
                  <div>
                    <h4 className="font-semibold text-sm mb-1 flex items-center gap-1">
                      <ClipboardCheck className="h-3 w-3" /> Assessment Method
                    </h4>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{course.assessmentMethod}</p>
                  </div>
                )}
                {course.certificationType && (
                  <div>
                    <h4 className="font-semibold text-sm mb-1 flex items-center gap-1">
                      <GraduationCap className="h-3 w-3" /> Certification Type
                    </h4>
                    <p className="text-sm text-gray-600">{course.certificationType}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Course Details */}
        <div className="space-y-6">
          {/* Course Details */}
          <Card>
            <CardHeader>
              <CardTitle>Course Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-gray-500" />
                <div>
                  <div className="text-sm text-gray-500">Duration</div>
                  <div className="font-semibold">
                    {course.duration || "3"} {course.durationType || "days"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-gray-500" />
                <div>
                  <div className="text-sm text-gray-500">Capacity</div>
                  <div className="font-semibold">
                    {course.minParticipants ?? "-"} – {course.maxParticipants ?? "-"} pax
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-gray-500" />
                <div>
                  <div className="text-sm text-gray-500">Venue / Location</div>
                  <div className="font-semibold">
                    {course.venue || "Main Training Room"}
                    {course.specifiedLocation && <span className="text-xs text-gray-500 ml-1">({course.specifiedLocation})</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Award className="h-4 w-4 text-gray-500" />
                <div>
                  <div className="text-sm text-gray-500">Certificate</div>
                  <Badge className="bg-blue-600 text-white text-xs">{course.certificates === "polwel" ? "POLWEL" : "PARTNER"}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assigned Trainers */}
          <Card>
            <CardHeader>
              <CardTitle>Assigned Trainers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {course.courseTrainers && course.courseTrainers.length > 0 ? (
                course.courseTrainers.map((ct, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold">
                      {ct.trainer?.name ? ct.trainer.name.charAt(0) : "T"}
                    </div>
                    <div>
                      <div className="font-medium">{ct.trainer?.name || "Unknown Trainer"}</div>
                      {ct.trainer?.partnerOrganization && <div className="text-xs text-gray-500">{ct.trainer.partnerOrganization}</div>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">No trainers assigned</div>
              )}
            </CardContent>
          </Card>

          {/* Course Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Course Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Created:</span>
                <span className="text-sm font-medium">{course.createdAt ? formatDate(course.createdAt) : "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Last Updated:</span>
                <span className="text-sm font-medium">{course.updatedAt ? formatDate(course.updatedAt) : "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Course ID:</span>
                <span className="text-sm font-medium">{course.id?.slice(-8) || "-"}</span>
              </div>
              {course.creator && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <UserIcon className="h-3 w-3" /> Creator
                  </span>
                  <span className="text-sm font-medium">{course.creator.name || course.creator.email || "—"}</span>
                </div>
              )}
            </CardContent>
          </Card>
          {(course.level || course.certificationType) && (
            <Card>
              <CardHeader>
                <CardTitle>Classification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {course.level && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <Layers className="h-3 w-3" /> Level
                    </span>
                    <span className="text-sm font-medium">{course.level}</span>
                  </div>
                )}
                {course.certificationType && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Certification</span>
                    <span className="text-sm font-medium">{course.certificationType}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
