import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Clock, Users, MapPin, DollarSign, Award, Calendar } from "lucide-react";
import { coursesApi } from "@/lib/api";
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
        console.log('Fetching course with ID:', id);
        const response = await coursesApi.getById(id);
        console.log('Course API response:', response);
        
        // FIXED DATA EXTRACTION - Handle real API structure
        let courseData = null;
        if (response?.success && response?.data?.course) {
          courseData = response.data.course;
          console.log('Using response.data.course (correct API structure)');
        } else if (response?.success && response?.data) {
          courseData = response.data;
          console.log('Using response.data');
        } else if (response?.data?.course) {
          courseData = response.data.course;
          console.log('Using response.data.course');
        } else if (response?.data) {
          courseData = response.data;
          console.log('Using response.data');
        } else if (response && response.title) {
          courseData = response;
          console.log('Using response directly');
        }
        
        console.log('Extracted course data:', courseData);
        setCourse(courseData);
      } catch (error) {
        console.error('Error fetching course:', error);
        toast({
          title: "Error",
          description: "Failed to load course details",
          variant: "destructive"
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
          <Button onClick={() => navigate('/course-creation')}>
            Back to Courses
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/course-creation')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Courses
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{course.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                {course.category || 'Mindful Leadership'}
              </Badge>
              <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                Active
              </Badge>
              <Badge className="bg-blue-600 text-white">
                {course.certificates === 'polwel' ? 'POLWEL' : 'PARTNER'}
              </Badge>
            </div>
          </div>
        </div>
        <Button onClick={() => navigate(`/course-creation/edit/${course.id}`)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Course
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Course Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Course Overview */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Course Overview</h2>
            <p className="text-muted-foreground leading-relaxed">
              {course.description || "No description available."}
            </p>
          </div>

          {/* Learning Objectives */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Learning Objectives</h2>
            {course.objectives && Array.isArray(course.objectives) && course.objectives.length > 0 ? (
              <ul className="space-y-3 text-muted-foreground">
                {course.objectives.map((objective, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                    {objective}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground italic">No learning objectives specified for this course.</p>
            )}
          </div>

          {/* Course Outline */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Course Outline</h2>
            <div className="space-y-4">
              {course.courseOutline && typeof course.courseOutline === 'object' && Object.keys(course.courseOutline).length > 0 ? (
                // Display real course outline from database
                (() => {
                  const outline = course.courseOutline;
                  if (Array.isArray(outline)) {
                    return outline.map((module, index) => (
                      <div key={index} className="border-l-4 border-primary pl-4 py-2">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-semibold">{module.title || `Module ${index + 1}`}</h4>
                          <span className="text-sm text-muted-foreground">{module.day || `Day ${index + 1}`}</span>
                        </div>
                        {module.topics && Array.isArray(module.topics) && (
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {module.topics.map((topic, topicIndex) => (
                              <li key={topicIndex}>• {topic}</li>
                            ))}
                          </ul>
                        )}
                        {module.description && (
                          <p className="text-sm text-muted-foreground mt-2">{module.description}</p>
                        )}
                      </div>
                    ));
                  } else {
                    // Handle object format
                    return Object.entries(outline).map(([key, value], index) => (
                      <div key={key} className="border-l-4 border-primary pl-4 py-2">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-semibold">{(value as any)?.title || key}</h4>
                          <span className="text-sm text-muted-foreground">{(value as any)?.day || `Day ${index + 1}`}</span>
                        </div>
                        {(value as any)?.description && (
                          <p className="text-sm text-muted-foreground">{(value as any).description}</p>
                        )}
                      </div>
                    ));
                  }
                })()
              ) : course.syllabus ? (
                // Fallback to syllabus if available
                <div className="text-sm text-muted-foreground">
                  <pre className="whitespace-pre-wrap">{course.syllabus}</pre>
                </div>
              ) : (
                <p className="text-muted-foreground italic">No course outline available for this course.</p>
              )}
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Additional Information</h2>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-2">Prerequisites</h4>
                {course.prerequisites && Array.isArray(course.prerequisites) && course.prerequisites.length > 0 ? (
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {course.prerequisites.map((prereq, index) => (
                      <li key={index}>• {prereq}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No specific prerequisites for this course.</p>
                )}
              </div>
              
              {course.materials && Array.isArray(course.materials) && course.materials.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Materials</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {course.materials.map((material, index) => (
                      <li key={index}>• {material}</li>
                    ))}
                  </ul>
                </div>
              )}

              {course.targetAudience && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Target Audience</h4>
                  <p className="text-sm text-muted-foreground">{course.targetAudience}</p>
                </div>
              )}
              
              {course.remarks && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Remarks</h4>
                  <p className="text-sm text-muted-foreground">{course.remarks}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Course Details */}
        <div className="space-y-8">
          {/* Course Details */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Course Details</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Duration</div>
                  <div className="font-semibold">{course.duration || '3'} {course.durationType || 'days'}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Capacity</div>
                  <div className="font-semibold">{course.minParticipants || course.minPax || '15'} - {course.maxParticipants || '25'} pax</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Price per Pax</div>
                  <div className="font-semibold">${(course.amountPerPax || 0).toFixed(2)}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Venue</div>
                  <div className="font-semibold">{course.venue || 'Main Training Room'}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Award className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Certificate</div>
                  <Badge className="bg-blue-600 text-white text-xs mt-1">
                    {course.certificates === 'polwel' ? 'POLWEL' : 'PARTNER'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Trainers */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Assigned Trainers</h2>
            <div className="space-y-3">
              {course.trainers && course.trainers.length > 0 ? (
                course.trainers.map((trainer, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                      {typeof trainer === 'string' ? trainer.charAt(0) : (trainer.name || 'T').charAt(0)}
                    </div>
                    <div className="font-medium">
                      {typeof trainer === 'string' ? trainer : trainer.name || 'Unknown Trainer'}
                    </div>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                      JS
                    </div>
                    <div className="font-medium">John Smith</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-sm font-semibold">
                      SJ
                    </div>
                    <div className="font-medium">Sarah Johnson</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Course Metadata */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Course Metadata</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Created:</span>
                <span className="text-sm font-medium">{course.createdAt ? new Date(course.createdAt).toLocaleDateString() : '2024-01-15'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Last Updated:</span>
                <span className="text-sm font-medium">{course.updatedAt ? new Date(course.updatedAt).toLocaleDateString() : '2024-03-10'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Course ID:</span>
                <span className="text-sm font-medium">{course.id?.slice(-8) || '1'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
