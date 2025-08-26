import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Search, Plus, Users, MapPin, Clock, Filter } from "lucide-react";
import type { CourseRun } from "@/types/courseRun";

const CourseRunsOverview = () => {
  const navigate = useNavigate();
  const [courseRuns, setCourseRuns] = useState<CourseRun[]>([]);
  const [filteredRuns, setFilteredRuns] = useState<CourseRun[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);

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
        status: 'Open',
        currentParticipants: 8,
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
        status: 'Pending',
        currentParticipants: 5,
        createdAt: '2025-08-15T10:00:00Z',
        updatedAt: '2025-08-26T09:00:00Z'
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
      case 'Open': return 'default';
      case 'Confirmed': return 'default';
      case 'Pending': return 'secondary';
      case 'Cancelled': return 'destructive';
      case 'In Progress': return 'default';
      case 'Completed': return 'secondary';
      default: return 'outline';
    }
  };

  const getParticipantsBadgeVariant = (current: number, min: number) => {
    if (current >= min) return 'default';
    return 'secondary';
  };

  const handleViewCourseRun = (courseRun: CourseRun) => {
    navigate(`/course-runs/${courseRun.courseId}/${courseRun.id}`);
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
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Open">Open</SelectItem>
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
                    <TableHead>Course Run</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead>Participants</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRuns.map((run) => (
                    <TableRow key={run.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <div>
                          <p className="font-medium">{run.courseTitle}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{run.serialNumber}</span>
                            <span>•</span>
                            <span>{run.courseCode}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="w-3 h-3" />
                            {new Date(run.startDate).toLocaleDateString()} - {new Date(run.endDate).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {run.startTime} - {run.endTime}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{run.venue?.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <Badge variant={getParticipantsBadgeVariant(run.currentParticipants, run.minClassSize)}>
                            {run.currentParticipants} / {run.maxClassSize || '∞'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Min: {run.minClassSize}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(run.status)}>
                          {run.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {run.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewCourseRun(run)}
                        >
                          Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CourseRunsOverview;