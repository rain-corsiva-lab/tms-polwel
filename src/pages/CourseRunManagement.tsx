import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CourseRunInformationTab from "@/components/CourseRunTabs/CourseRunInformationTab";
import LearnerParticularsTab from "@/components/CourseRunTabs/LearnerParticularsTab";
import TrainerAssignmentTab from "@/components/CourseRunTabs/TrainerAssignmentTab";
import CourseRunFeesExpensesTab from "@/components/CourseRunTabs/CourseRunFeesExpensesTab";
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
      venueType: 'Hotel',
      venueHotel: 'POLWEL Training Center - Main Hall',
      specifiedLocation: 'Level 3, Conference Room A',
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
      // Fees & Expenses
      courseFee: 850,
      feeType: 'per-head',
      venueFee: 1200,
      otherFees: 150,
      adminFees: 75,
      contingencyFees: 100,
      minParticipants: 12,
      feeRemarks: 'If minimum 12 participants not met, course may be cancelled or postponed. Participants will be notified 7 days in advance.',
      minClassSize: 10,
      maxClassSize: 25,
      recommendedClassSize: 20,
      individualRegistrationRequired: true,
      status: 'Active',
      currentParticipants: 8,
      createdAt: '2025-08-01T10:00:00Z',
      updatedAt: '2025-08-20T15:30:00Z'
    };

    const mockLearners: Learner[] = [
      {
        id: 'learner-1',
        courseRunId: 'CR001/25',
        name: 'Sarah Johnson',
        designation: 'Senior Manager',
        email: 'sarah.johnson@company.com',
        contactNumber: '+65 9123 4567',
        division: 'Human Resources',
        department: 'HR Operations',
        paymentMode: 'Company-Sponsored (Non-HomeTeam)',
        buNumber: 'BU2024001',
        feesBeforeGST: 850,
        discounts: [],
        feesRemarks: 'Corporate training package',
        poPaymentAdviceNumber: 'PO-2024-001',
        invoiceNumber: 'INV-2024-001',
        receiptNumber: 'RCP-2024-001',
        trainingOfficerName: 'Jennifer Lee',
        trainingOfficerEmail: 'jennifer.lee@company.com',
        trainingOfficerPhone: '+65 6123 4567',
        remarks: 'Team lead requiring advanced leadership skills',
        enrolmentStatus: 'Enrolled',
        attendance: 'Present',
        createdAt: '2024-01-15T09:00:00Z',
        updatedAt: '2024-01-15T09:00:00Z'
      },
      {
        id: 'learner-2',
        courseRunId: 'CR001/25',
        name: 'Michael Chen',
        designation: 'Project Manager',
        email: 'michael.chen@techcorp.sg',
        contactNumber: '+65 9234 5678',
        division: 'Information Technology',
        department: 'Software Development',
        paymentMode: 'Self-Payment',
        feesBeforeGST: 850,
        discounts: ['Early Bird Discount - $85'],
        trainingOfficerName: 'David Tan',
        trainingOfficerEmail: 'david.tan@techcorp.sg',
        trainingOfficerPhone: '+65 6234 5678',
        remarks: 'Recently promoted to leadership role',
        enrolmentStatus: 'Enrolled',
        attendance: 'Present',
        createdAt: '2024-01-16T10:30:00Z',
        updatedAt: '2024-01-16T10:30:00Z'
      },
      {
        id: 'learner-3',
        courseRunId: 'CR001/25',
        name: 'Emily Wong',
        designation: 'Department Head',
        email: 'emily.wong@ministry.gov.sg',
        contactNumber: '+65 9345 6789',
        division: 'Policy Development',
        department: 'Strategic Planning',
        paymentMode: 'ULTF',
        feesBeforeGST: 850,
        discounts: [],
        trainingOfficerName: 'Robert Lim',
        trainingOfficerEmail: 'robert.lim@ministry.gov.sg',
        trainingOfficerPhone: '+65 6345 6789',
        remarks: 'Government official development program',
        enrolmentStatus: 'Enrolled',
        attendance: 'Present',
        createdAt: '2024-01-17T14:15:00Z',
        updatedAt: '2024-01-17T14:15:00Z'
      },
      {
        id: 'learner-4',
        courseRunId: 'CR001/25',
        name: 'James Kumar',
        designation: 'Team Lead',
        email: 'james.kumar@startup.com',
        contactNumber: '+65 9456 7890',
        division: 'Operations',
        department: 'Business Operations',
        paymentMode: 'Transition Dollars (T$)',
        feesBeforeGST: 850,
        discounts: [],
        trainingOfficerName: 'Lisa Chang',
        trainingOfficerEmail: 'lisa.chang@startup.com',
        trainingOfficerPhone: '+65 6456 7890',
        remarks: 'Fast-track leadership development',
        enrolmentStatus: 'Enrolled',
        attendance: 'Present',
        createdAt: '2024-01-18T11:45:00Z',
        updatedAt: '2024-01-18T11:45:00Z'
      },
      {
        id: 'learner-5',
        courseRunId: 'CR001/25',
        name: 'Rachel Ng',
        designation: 'Assistant Manager',
        email: 'rachel.ng@bank.com.sg',
        contactNumber: '+65 9567 8901',
        division: 'Finance',
        department: 'Corporate Banking',
        paymentMode: 'Company-Sponsored (Non-HomeTeam)',
        feesBeforeGST: 850,
        discounts: [],
        poPaymentAdviceNumber: 'PO-2024-002',
        invoiceNumber: 'INV-2024-002',
        receiptNumber: 'RCP-2024-002',
        trainingOfficerName: 'Kevin Ong',
        trainingOfficerEmail: 'kevin.ong@bank.com.sg',
        trainingOfficerPhone: '+65 6567 8901',
        remarks: 'Banking sector leadership program',
        enrolmentStatus: 'Enrolled',
        attendance: 'Present',
        createdAt: '2024-01-19T16:20:00Z',
        updatedAt: '2024-01-19T16:20:00Z'
      },
      {
        id: 'learner-6',
        courseRunId: 'CR001/25',
        name: 'Daniel Tay',
        designation: 'Supervisor',
        email: 'daniel.tay@manufacturing.sg',
        contactNumber: '+65 9678 9012',
        division: 'Production',
        department: 'Quality Control',
        paymentMode: 'POLWEL Training Subsidy',
        feesBeforeGST: 850,
        discounts: ['POLWEL Training Subsidy - $425'],
        trainingOfficerName: 'Michelle Koh',
        trainingOfficerEmail: 'michelle.koh@manufacturing.sg',
        trainingOfficerPhone: '+65 6678 9012',
        remarks: 'Manufacturing leadership skills enhancement',
        enrolmentStatus: 'Enrolled',
        attendance: 'Present',
        createdAt: '2024-01-20T08:30:00Z',
        updatedAt: '2024-01-20T08:30:00Z'
      },
      {
        id: 'learner-7',
        courseRunId: 'CR001/25',
        name: 'Amanda Lim',
        designation: 'Senior Executive',
        email: 'amanda.lim@logistics.com',
        contactNumber: '+65 9789 0123',
        division: 'Supply Chain',
        department: 'Warehouse Operations',
        paymentMode: 'Self-Payment',
        feesBeforeGST: 850,
        discounts: [],
        trainingOfficerName: 'Steven Yeo',
        trainingOfficerEmail: 'steven.yeo@logistics.com',
        trainingOfficerPhone: '+65 6789 0123',
        remarks: 'Career advancement preparation',
        enrolmentStatus: 'Enrolled',
        attendance: 'Present',
        createdAt: '2024-01-21T13:10:00Z',
        updatedAt: '2024-01-21T13:10:00Z'
      },
      {
        id: 'learner-8',
        courseRunId: 'CR001/25',
        name: 'Benjamin Tan',
        designation: 'Manager',
        email: 'benjamin.tan@healthcare.sg',
        contactNumber: '+65 9890 1234',
        division: 'Clinical Operations',
        department: 'Patient Care',
        paymentMode: 'Company-Sponsored (Non-HomeTeam)',
        feesBeforeGST: 850,
        discounts: [],
        poPaymentAdviceNumber: 'PO-2024-003',
        invoiceNumber: 'INV-2024-003',
        receiptNumber: 'RCP-2024-003',
        trainingOfficerName: 'Grace Loh',
        trainingOfficerEmail: 'grace.loh@healthcare.sg',
        trainingOfficerPhone: '+65 6890 1234',
        remarks: 'Healthcare leadership development',
        enrolmentStatus: 'Enrolled',
        attendance: 'Absent',
        createdAt: '2024-01-22T15:45:00Z',
        updatedAt: '2024-01-22T15:45:00Z'
      }
    ];

    setCourseRun(mockCourseRun);
    setLearners(mockLearners);
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
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Course Run Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested course run could not be found.</p>
          <Button onClick={() => navigate('/course-runs')}>
            Back to Course Runs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/course-runs')}
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
            courseRun.status === 'Active' ? 'bg-blue-100 text-blue-700' :
            courseRun.status === 'Confirmed' ? 'bg-green-100 text-green-700' :
            courseRun.status === 'Draft' ? 'bg-yellow-100 text-yellow-700' :
            courseRun.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
            courseRun.status === 'In Progress' ? 'bg-purple-100 text-purple-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {courseRun.status}
          </span>
        </div>
      </div>

      {/* Course Title */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          {courseRun.courseTitle} ({courseRun.courseCode})
        </h2>
      </div>

      {/* Course Run Tabs */}
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="information">Course Run Information</TabsTrigger>
            <TabsTrigger value="learners">
              Learner Particulars ({learners.length})
            </TabsTrigger>
            <TabsTrigger value="trainers">
              Trainer Assignment ({trainerAssignments.length})
            </TabsTrigger>
            <TabsTrigger value="fees">Fees & Expenses</TabsTrigger>
          </TabsList>

          <TabsContent value="information" className="space-y-6 mt-6">
            <CourseRunInformationTab
              courseRun={courseRun}
              onUpdate={handleCourseRunUpdate}
            />
          </TabsContent>

          <TabsContent value="learners" className="space-y-6 mt-6">
            <LearnerParticularsTab
              courseRunId={courseRun.id}
              learners={learners}
              onAddLearner={handleAddLearner}
              onUpdateLearner={handleUpdateLearner}
            />
          </TabsContent>

          <TabsContent value="trainers" className="space-y-6 mt-6">
            <TrainerAssignmentTab
              courseRun={courseRun}
              onUpdate={handleCourseRunUpdate}
            />
          </TabsContent>

          <TabsContent value="fees" className="space-y-6 mt-6">
            <CourseRunFeesExpensesTab
              courseRun={courseRun}
              onUpdate={handleCourseRunUpdate}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CourseRunManagement;