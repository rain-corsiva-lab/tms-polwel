import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CourseRunInformationTab from "@/components/CourseRunTabs/CourseRunInformationTab";
import LearnerParticularsTab from "@/components/CourseRunTabs/LearnerParticularsTab";
import TrainerAssignmentTab from "@/components/CourseRunTabs/TrainerAssignmentTab";
import type { CourseRun, Learner, TrainerAssignment } from "@/types/courseRun";

const CourseRunManagement = () => {
  const { courseId, runId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [courseRun, setCourseRun] = useState<CourseRun | null>(null);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [trainerAssignments, setTrainerAssignments] = useState<TrainerAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("information");

  // Mock data for now - replace with API calls
  useEffect(() => {
    const mockCourseRun: CourseRun = {
      id: runId || 'run-1',
      serialNumber: 'CR001/25',
      courseId: courseId || 'course-1',
      courseTitle: 'Advanced Leadership Skills',
      courseCode: 'ALS01',
      type: 'Open',
      startDate: '2025-09-15',
      endDate: '2025-09-17',
      startTime: '09:00',
      endTime: '17:00',
      venueId: 'venue-1',
      venue: {
        id: 'venue-1',
        name: 'POLWEL Training Center',
        address: '123 Training Street, Singapore 123456'
      },
      trainerIds: ['trainer-1'],
      trainers: [
        { id: 'trainer-1', name: 'Mr. John Trainer' }
      ],
      contractFees: {
        baseAmount: 5000,
        perRun: true,
        perHead: false,
        additionalCosts: 0
      },
      minClassSize: 10,
      maxClassSize: 25,
      recommendedClassSize: 20,
      individualRegistrationRequired: true,
      status: 'Open',
      currentParticipants: 8,
      createdAt: '2025-08-01T10:00:00Z',
      updatedAt: '2025-08-20T15:30:00Z'
    };

    setCourseRun(mockCourseRun);
    setLoading(false);
  }, [courseId, runId]);

  const handleCourseRunUpdate = (updatedData: Partial<CourseRun>) => {
    if (courseRun) {
      setCourseRun({ ...courseRun, ...updatedData });
    }
  };

  const handleAddLearner = (learner: Learner) => {
    setLearners([...learners, learner]);
    toast({
      title: "Success",
      description: "Learner added successfully",
    });
  };

  const handleUpdateLearner = (learnerId: string, updatedData: Partial<Learner>) => {
    setLearners(learners.map(learner => 
      learner.id === learnerId ? { ...learner, ...updatedData } : learner
    ));
  };

  const handleTrainerAssignment = (assignment: TrainerAssignment) => {
    setTrainerAssignments([...trainerAssignments, assignment]);
    toast({
      title: "Success",
      description: "Trainer assigned successfully",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!courseRun) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h2 className="text-xl font-semibold mb-2">Course Run Not Found</h2>
            <p className="text-muted-foreground mb-4">The requested course run could not be found.</p>
            <Button onClick={() => navigate('/courses')}>
              Back to Courses
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/courses')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Course Run Management</h1>
            <p className="text-muted-foreground">
              {courseRun.serialNumber} - {courseRun.courseTitle}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            courseRun.status === 'Open' ? 'bg-blue-100 text-blue-700' :
            courseRun.status === 'Confirmed' ? 'bg-green-100 text-green-700' :
            courseRun.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
            courseRun.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
            courseRun.status === 'In Progress' ? 'bg-purple-100 text-purple-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {courseRun.status}
          </span>
        </div>
      </div>

      {/* Course Run Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>
            {courseRun.courseTitle} ({courseRun.courseCode})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="information">Course Run Information</TabsTrigger>
              <TabsTrigger value="learners">
                Learner Particulars ({learners.length})
              </TabsTrigger>
              <TabsTrigger value="trainers">
                Trainer Assignment ({trainerAssignments.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="information" className="space-y-6">
              <CourseRunInformationTab
                courseRun={courseRun}
                onUpdate={handleCourseRunUpdate}
              />
            </TabsContent>

            <TabsContent value="learners" className="space-y-6">
              <LearnerParticularsTab
                courseRunId={courseRun.id}
                learners={learners}
                onAddLearner={handleAddLearner}
                onUpdateLearner={handleUpdateLearner}
              />
            </TabsContent>

            <TabsContent value="trainers" className="space-y-6">
              <TrainerAssignmentTab
                courseRunId={courseRun.id}
                assignments={trainerAssignments}
                onAssignTrainer={handleTrainerAssignment}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default CourseRunManagement;