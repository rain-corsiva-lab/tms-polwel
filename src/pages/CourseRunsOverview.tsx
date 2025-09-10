import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Search, Plus, Users, MapPin, Filter, MoreVertical, Mail, CheckCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import SendCourseCompletionDialog from "@/components/SendCourseCompletionDialog";
import { SendCourseConfirmationDialog } from "@/components/SendCourseConfirmationDialog";
import CancelCourseRunDialog from "@/components/CancelCourseRunDialog";
import CancellationApprovalDialog from "@/components/CancellationApprovalDialog";
import TrainerApprovalDialog from "@/components/TrainerApprovalDialog";
import type { CourseRun } from "@/types/courseRun";

const CourseRunsOverview = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasRole } = useAuth();
  const [courseRuns, setCourseRuns] = useState<CourseRun[]>([]);
  const [filteredRuns, setFilteredRuns] = useState<CourseRun[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [trainerApprovalDialogOpen, setTrainerApprovalDialogOpen] = useState(false);
  const [selectedCourseRun, setSelectedCourseRun] = useState<CourseRun | null>(null);

  // Check if user is management (for testing, we'll allow all users to click cancelled badges)
  const isManagement = true; // Temporarily set to true for testing - in production use: hasRole(['admin', 'management', 'supervisor']);

  // Mock data - replace with API call
  useEffect(() => {
    const mockCourseRuns: CourseRun[] = [
      {
        id: 'run-1',
        serialNumber: 'CR001/25',
        courseId: 'course-1',
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
          address: '123 Training Street, Singapore'
        },
        trainerIds: ['trainer-1'],
        trainers: [{ id: 'trainer-1', name: 'Mr. John Trainer' }],
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
        status: 'Active',
        currentParticipants: 8,
        trainerAssignmentApproved: false,
        createdAt: '2025-08-01T10:00:00Z',
        updatedAt: '2025-08-20T15:30:00Z'
      },
      {
        id: 'run-2',
        serialNumber: 'CR002/25',
        courseId: 'course-2',
        courseTitle: 'Digital Marketing Fundamentals',
        courseCode: 'DMF01',
        type: 'Dedicated',
        startDate: '2025-10-01',
        endDate: '2025-10-03',
        startTime: '09:00',
        endTime: '17:00',
        venueId: 'venue-2',
        venue: {
          id: 'venue-2',
          name: 'Corporate Training Suite B',
          address: '456 Business Ave, Singapore'
        },
        trainerIds: ['trainer-2'],
        trainers: [{ id: 'trainer-2', name: 'Ms. Sarah Smith' }],
        contractFees: {
          baseAmount: 7500,
          perRun: true,
          perHead: false,
          additionalCosts: 500
        },
        minClassSize: 15,
        maxClassSize: 30,
        recommendedClassSize: 25,
        individualRegistrationRequired: true,
        status: 'Confirmed',
        currentParticipants: 22,
        createdAt: '2025-08-10T10:00:00Z',
        updatedAt: '2025-08-25T12:00:00Z'
      },
      {
        id: 'run-3',
        serialNumber: 'CR003/25',
        courseId: 'course-3',
        courseTitle: 'Project Management Essentials',
        courseCode: 'PME01',
        type: 'Open',
        startDate: '2025-11-10',
        endDate: '2025-11-12',
        startTime: '09:00',
        endTime: '17:00',
        venueId: 'venue-1',
        venue: {
          id: 'venue-1',
          name: 'POLWEL Training Center',
          address: '123 Training Street, Singapore'
        },
        trainerIds: ['trainer-3'],
        trainers: [{ id: 'trainer-3', name: 'Dr. Michael Chen' }],
        contractFees: {
          baseAmount: 6000,
          perRun: true,
          perHead: false,
          additionalCosts: 0
        },
        minClassSize: 12,
        maxClassSize: 20,
        recommendedClassSize: 18,
        individualRegistrationRequired: true,
        status: 'Active',
        currentParticipants: 5,
        trainerAssignmentApproved: false,
        createdAt: '2025-08-15T10:00:00Z',
        updatedAt: '2025-08-26T09:00:00Z'
      },
      {
        id: 'run-4',
        serialNumber: 'CR004/25',
        courseId: 'course-4',
        courseTitle: 'Workplace Safety & Health Management',
        courseCode: 'WSH01',
        type: 'Open',
        startDate: '2025-08-20',
        endDate: '2025-08-22',
        startTime: '09:00',
        endTime: '17:00',
        venueId: 'venue-3',
        venue: {
          id: 'venue-3',
          name: 'Safety Training Hub',
          address: '789 Safety Blvd, Singapore'
        },
        trainerIds: ['trainer-4'],
        trainers: [{ id: 'trainer-4', name: 'Ms. Lisa Wong' }],
        contractFees: {
          baseAmount: 4500,
          perRun: true,
          perHead: false,
          additionalCosts: 200
        },
        minClassSize: 8,
        maxClassSize: 16,
        recommendedClassSize: 12,
        individualRegistrationRequired: true,
        status: 'Completed',
        currentParticipants: 14,
        createdAt: '2025-07-20T10:00:00Z',
        updatedAt: '2025-08-25T16:00:00Z'
      },
      {
        id: 'run-5',
        serialNumber: 'CR005/25',
        courseId: 'course-5',
        courseTitle: 'Data Analytics for Business',
        courseCode: 'DAB01',
        type: 'Open',
        startDate: '2025-09-25',
        endDate: '2025-09-27',
        startTime: '09:00',
        endTime: '17:00',
        venueId: 'venue-1',
        venue: {
          id: 'venue-1',
          name: 'POLWEL Training Center',
          address: '123 Training Street, Singapore'
        },
        trainerIds: ['trainer-5'],
        trainers: [{ id: 'trainer-5', name: 'Dr. Anna Tech' }],
        contractFees: {
          baseAmount: 6500,
          perRun: true,
          perHead: false,
          additionalCosts: 300
        },
        minClassSize: 10,
        maxClassSize: 20,
        recommendedClassSize: 15,
        individualRegistrationRequired: true,
        status: 'Cancelled',
        currentParticipants: 12,
        cancellationReason: 'Trainer unavailable due to emergency. Alternative venue not available for the scheduled dates.',
        cancellationApproved: false,
        createdAt: '2025-08-05T10:00:00Z',
        updatedAt: '2025-09-01T14:30:00Z'
      },
      {
        id: 'run-6',
        serialNumber: 'CR006/25',
        courseId: 'course-6',
        courseTitle: 'Cybersecurity Awareness Training',
        courseCode: 'CAT01',
        type: 'Open',
        startDate: '2025-09-08',
        endDate: '2025-09-12',
        startTime: '09:00',
        endTime: '17:00',
        venueId: 'venue-4',
        venue: {
          id: 'venue-4',
          name: 'IT Security Training Lab',
          address: '321 Cyber Street, Singapore'
        },
        trainerIds: ['trainer-6'],
        trainers: [{ id: 'trainer-6', name: 'Mr. David Security' }],
        contractFees: {
          baseAmount: 5500,
          perRun: true,
          perHead: false,
          additionalCosts: 300
        },
        courseFee: 850,
        feeType: 'per-head' as const,
        venueFee: 200,
        otherFees: 50,
        adminFees: 100,
        minClassSize: 10,
        maxClassSize: 24,
        recommendedClassSize: 18,
        individualRegistrationRequired: true,
        status: 'In Progress',
        currentParticipants: 19,
        trainerAssignmentApproved: true,
        remarks: 'Course is running smoothly with high engagement',
        createdAt: '2025-08-05T10:00:00Z',
        updatedAt: '2025-09-08T09:00:00Z'
      }
    ];

    setCourseRuns(mockCourseRuns);
    setFilteredRuns(mockCourseRuns);
    setLoading(false);
  }, []);

  // Filter course runs based on search term and status
  useEffect(() => {
    let filtered = courseRuns;

    if (searchTerm) {
      filtered = filtered.filter(run =>
        run.courseTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        run.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        run.courseCode.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'All') {
      filtered = filtered.filter(run => run.status === statusFilter);
    }

    setFilteredRuns(filtered);
  }, [searchTerm, statusFilter, courseRuns]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Active': return 'outline';
      case 'Confirmed': return 'default';
      case 'Draft': return 'secondary';
      case 'Cancelled': return 'outline';
      case 'In Progress': return 'default';
      case 'Completed': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusBadgeClass = (status: string, cancellationApproved?: boolean, trainerAssignmentApproved?: boolean) => {
    if (status === 'Cancelled') {
      return cancellationApproved 
        ? 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200' 
        : 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200';
    }
    if (status === 'Active') {
      return trainerAssignmentApproved 
        ? 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200' 
        : 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200';
    }
    if (status === 'In Progress') {
      return 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200';
    }
    if (status === 'Completed') {
      return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
    }
    if (status === 'Confirmed') {
      return 'bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200';
    }
    return '';
  };

  const getParticipantsBadgeVariant = (current: number, min: number) => {
    if (current >= min) return 'default';
    return 'secondary';
  };

  const handleViewCourseRun = (courseRun: CourseRun) => {
    navigate(`/course-runs/${courseRun.courseId}/${courseRun.id}`);
  };

  const handleSendCourseCompletionEmail = (courseRun: CourseRun) => {
    setSelectedCourseRun(courseRun);
    setEmailDialogOpen(true);
  };

  const handleCancelCourseRun = (courseRun: CourseRun) => {
    setSelectedCourseRun(courseRun);
    setCancelDialogOpen(true);
  };

  const handleMarkAsCompleted = (courseRun: CourseRun) => {
    const updatedRuns = courseRuns.map(run => 
      run.id === courseRun.id 
        ? { ...run, status: 'Completed' as const, updatedAt: new Date().toISOString() }
        : run
    );
    setCourseRuns(updatedRuns);
    
    toast({
      title: "Course Run Completed",
      description: `${courseRun.serialNumber} - ${courseRun.courseTitle} has been marked as completed`,
    });
  };

  const handleMarkAsConfirmed = (courseRun: CourseRun) => {
    setSelectedCourseRun(courseRun);
    setConfirmationDialogOpen(true);
  };

  const handleConfirmCourseRun = (courseRun: CourseRun) => {
    const updatedRuns = courseRuns.map(run => 
      run.id === courseRun.id 
        ? { ...run, status: 'Confirmed' as const, updatedAt: new Date().toISOString() }
        : run
    );
    setCourseRuns(updatedRuns);
    
    toast({
      title: "Course Confirmation Sent",
      description: `Confirmation emails sent to all learners for ${courseRun.serialNumber}`,
    });
  };

  const handleCancelledCourseRun = (courseRunId: string, reason: string) => {
    const updatedRuns = courseRuns.map(run => 
      run.id === courseRunId 
        ? { ...run, status: 'Cancelled' as const, cancellationReason: reason, updatedAt: new Date().toISOString() }
        : run
    );
    setCourseRuns(updatedRuns);
  };

  const handleCancellationApproval = (courseRun: CourseRun) => {
    if (isManagement) {
      setSelectedCourseRun(courseRun);
      setApprovalDialogOpen(true);
    }
  };

  const handleTrainerApproval = (courseRun: CourseRun) => {
    if (isManagement) {
      setSelectedCourseRun(courseRun);
      setTrainerApprovalDialogOpen(true);
    }
  };

  const handleApproveCancellation = (courseRunId: string) => {
    // Update the course run to mark as approved
    const updatedRuns = courseRuns.map(run => 
      run.id === courseRunId 
        ? { ...run, cancellationApproved: true, updatedAt: new Date().toISOString() }
        : run
    );
    setCourseRuns(updatedRuns);
    
    toast({
      title: "Cancellation Approved",
      description: "Cancellation emails have been sent to learners",
    });
  };

  const handleRejectCancellation = (courseRunId: string) => {
    // Revert the status back to Active or previous status
    const updatedRuns = courseRuns.map(run => 
      run.id === courseRunId 
        ? { ...run, status: 'Active' as const, cancellationReason: undefined }
        : run
    );
    setCourseRuns(updatedRuns);
  };

  const handleApproveTrainerAssignment = (courseRunId: string) => {
    // Update the course run to mark trainer assignment as approved
    const updatedRuns = courseRuns.map(run => 
      run.id === courseRunId 
        ? { ...run, trainerAssignmentApproved: true, updatedAt: new Date().toISOString() }
        : run
    );
    setCourseRuns(updatedRuns);
  };

  const handleRejectTrainerAssignment = (courseRunId: string) => {
    // For rejection, we could change status back to Draft or keep as Active but reset approval
    const updatedRuns = courseRuns.map(run => 
      run.id === courseRunId 
        ? { ...run, trainerAssignmentApproved: false, status: 'Draft' as const }
        : run
    );
    setCourseRuns(updatedRuns);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Course Run Management</h1>
          <p className="text-muted-foreground">
            Manage and monitor all course runs across the system
          </p>
        </div>
        <Button onClick={() => navigate('/course-runs/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Create New Course Run
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by course title, serial number, or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Status</SelectItem>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Confirmed">Confirmed</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Course Runs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Course Runs ({filteredRuns.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRuns.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'All' 
                  ? 'No course runs match your filters' 
                  : 'No course runs found'}
              </p>
              <Button onClick={() => navigate('/course-creation')}>
                Create First Course Run
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Course Details</TableHead>
                    <TableHead className="w-[150px]">Schedule</TableHead>
                    <TableHead className="w-[200px]">Venue</TableHead>
                    <TableHead className="w-[120px]">Participants</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[80px]">Type</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRuns.map((run) => (
                    <TableRow key={run.id} className="hover:bg-muted/50">
                      <TableCell className="py-4">
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{run.courseTitle}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-mono">{run.serialNumber}</span>
                            <span>•</span>
                            <span>{run.courseCode}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <span>{new Date(run.startDate).toLocaleDateString()} - {new Date(run.endDate).toLocaleDateString()}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm">{run.venue?.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <Users className="w-3 h-3 text-muted-foreground" />
                          <Badge variant={getParticipantsBadgeVariant(run.currentParticipants, run.minClassSize)} className="text-xs">
                            {run.currentParticipants}/{run.maxClassSize || '∞'}
                          </Badge>
                        </div>
                      </TableCell>
                       <TableCell className="py-4">
                          <Badge 
                            variant={getStatusBadgeVariant(run.status)} 
                            className={`text-xs text-center ${getStatusBadgeClass(run.status, run.cancellationApproved, run.trainerAssignmentApproved)} ${
                              (run.status === 'Cancelled' && !run.cancellationApproved) || (run.status === 'Active' && !run.trainerAssignmentApproved) 
                                ? 'cursor-pointer hover:opacity-80 hover:scale-105 transition-all duration-200 border-2' 
                                : ''
                            } ${
                              run.status === 'Cancelled' && !run.cancellationApproved ? 'border-amber-300' : ''
                            } ${
                              run.status === 'Active' && !run.trainerAssignmentApproved ? 'border-amber-300' : ''
                            }`}
                           onClick={
                             run.status === 'Cancelled' && !run.cancellationApproved 
                               ? () => handleCancellationApproval(run)
                               : run.status === 'Active' && !run.trainerAssignmentApproved
                               ? () => handleTrainerApproval(run)
                               : undefined
                           }
                           style={
                             (run.status === 'Cancelled' && !run.cancellationApproved) || (run.status === 'Active' && !run.trainerAssignmentApproved)
                               ? { pointerEvents: 'auto' } 
                               : undefined
                           }
                         >
                           {run.status}
                         </Badge>
                       </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="outline" className="text-xs">
                          {run.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-background border">
                            <DropdownMenuItem onClick={() => handleViewCourseRun(run)}>
                              <Users className="w-4 h-4 mr-2" />
                              Manage
                            </DropdownMenuItem>
                            {(run.status === 'Active' || run.status === 'Confirmed') && (
                              <DropdownMenuItem 
                                onClick={() => handleCancelCourseRun(run)}
                                className="text-destructive focus:text-destructive"
                              >
                                <X className="w-4 h-4 mr-2" />
                                Cancel Run
                              </DropdownMenuItem>
                            )}
                             {run.status === 'Active' && run.trainerAssignmentApproved && (
                               <DropdownMenuItem onClick={() => handleMarkAsConfirmed(run)}>
                                 <Mail className="w-4 h-4 mr-2" />
                                 Mark as Confirmed
                               </DropdownMenuItem>
                             )}
                             {run.status === 'Completed' && (
                               <DropdownMenuItem onClick={() => handleSendCourseCompletionEmail(run)}>
                                 <Mail className="w-4 h-4 mr-2" />
                                 Send Course Completion Email
                               </DropdownMenuItem>
                             )}
                            {run.status !== 'Completed' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleMarkAsCompleted(run)}>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Mark as Completed
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <SendCourseCompletionDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        courseRun={selectedCourseRun}
      />

      <CancelCourseRunDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        courseRun={selectedCourseRun}
        onCancel={handleCancelledCourseRun}
      />

      <CancellationApprovalDialog
        open={approvalDialogOpen}
        onOpenChange={setApprovalDialogOpen}
        courseRun={selectedCourseRun}
        onApprove={handleApproveCancellation}
        onReject={handleRejectCancellation}
      />

      <TrainerApprovalDialog
        open={trainerApprovalDialogOpen}
        onOpenChange={setTrainerApprovalDialogOpen}
        courseRun={selectedCourseRun}
        onApprove={handleApproveTrainerAssignment}
        onReject={handleRejectTrainerAssignment}
      />

      <SendCourseConfirmationDialog
        open={confirmationDialogOpen}
        onOpenChange={setConfirmationDialogOpen}
        courseRun={selectedCourseRun}
        onConfirm={handleConfirmCourseRun}
      />
    </div>
  );
};

export default CourseRunsOverview;