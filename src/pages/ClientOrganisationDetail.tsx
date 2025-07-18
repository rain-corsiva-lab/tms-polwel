import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Building2, Users, UserCheck, Calendar, Clock, MapPin, Plus } from "lucide-react";

interface TrainingCoordinator {
  id: string;
  name: string;
  email: string;
  department: string;
  schedulesCount: number;
  lastActive: string;
}

interface Learner {
  id: string;
  name: string;
  email: string;
  department: string;
  enrolledCourses: number;
  completedCourses: number;
  status: "active" | "inactive";
}

interface TrainingSchedule {
  id: string;
  title: string;
  coordinator: string;
  startDate: string;
  endDate: string;
  location: string;
  participants: number;
  status: "upcoming" | "ongoing" | "completed";
}

const mockCoordinators: TrainingCoordinator[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    email: "sarah.johnson@techcorp.com",
    department: "HR Development",
    schedulesCount: 3,
    lastActive: "2 hours ago"
  },
  {
    id: "2",
    name: "Mike Chen",
    email: "mike.chen@techcorp.com", 
    department: "Technical Training",
    schedulesCount: 5,
    lastActive: "1 day ago"
  }
];

const mockLearners: Learner[] = [
  {
    id: "1",
    name: "John Smith",
    email: "john.smith@techcorp.com",
    department: "Engineering",
    enrolledCourses: 3,
    completedCourses: 8,
    status: "active"
  },
  {
    id: "2",
    name: "Emily Davis",
    email: "emily.davis@techcorp.com",
    department: "Marketing", 
    enrolledCourses: 2,
    completedCourses: 5,
    status: "active"
  }
];

const mockSchedules: TrainingSchedule[] = [
  {
    id: "1",
    title: "Leadership Development Program",
    coordinator: "Sarah Johnson",
    startDate: "2024-01-15",
    endDate: "2024-01-19",
    location: "Conference Room A",
    participants: 15,
    status: "upcoming"
  },
  {
    id: "2",
    title: "Technical Skills Workshop",
    coordinator: "Mike Chen",
    startDate: "2024-01-08",
    endDate: "2024-01-12",
    location: "Training Lab 1",
    participants: 20,
    status: "ongoing"
  }
];

const ClientOrganisationDetail = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("overview");

  // Mock organization data
  const organization = {
    id: id || "1",
    name: "TechCorp Solutions",
    industry: "Technology",
    address: "123 Tech Street, Innovation City",
    contact: "contact@techcorp.com",
    status: "active"
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "default",
      inactive: "secondary",
      upcoming: "outline",
      ongoing: "default",
      completed: "secondary"
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || "secondary"}>{status}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Link to="/client-organisations">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Organisations
          </Button>
        </Link>
      </div>

      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <Building2 className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">{organization.name}</h1>
            {getStatusBadge(organization.status)}
          </div>
          <p className="text-muted-foreground">{organization.industry}</p>
          <p className="text-sm text-muted-foreground">{organization.address}</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Schedule
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="coordinators">Training Coordinators</TabsTrigger>
          <TabsTrigger value="learners">Learners</TabsTrigger>
          <TabsTrigger value="schedules">Training Schedules</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Training Coordinators</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockCoordinators.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Learners</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockLearners.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Schedules</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockSchedules.filter(s => s.status === "ongoing").length}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Training Schedules</CardTitle>
              <CardDescription>Overview of all training schedules in this organization</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Coordinator</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Participants</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockSchedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">{schedule.title}</TableCell>
                      <TableCell>{schedule.coordinator}</TableCell>
                      <TableCell>
                        {new Date(schedule.startDate).toLocaleDateString()} - {new Date(schedule.endDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{schedule.location}</TableCell>
                      <TableCell>{schedule.participants}</TableCell>
                      <TableCell>{getStatusBadge(schedule.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coordinators" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Training Coordinators</h2>
              <p className="text-muted-foreground">Manage training coordinators for this organization</p>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Coordinator
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Schedules</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockCoordinators.map((coordinator) => (
                    <TableRow key={coordinator.id}>
                      <TableCell className="font-medium">{coordinator.name}</TableCell>
                      <TableCell>{coordinator.email}</TableCell>
                      <TableCell>{coordinator.department}</TableCell>
                      <TableCell>{coordinator.schedulesCount}</TableCell>
                      <TableCell>{coordinator.lastActive}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="learners" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Learners</h2>
              <p className="text-muted-foreground">Manage learners for this organization</p>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Learner
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Enrolled</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockLearners.map((learner) => (
                    <TableRow key={learner.id}>
                      <TableCell className="font-medium">{learner.name}</TableCell>
                      <TableCell>{learner.email}</TableCell>
                      <TableCell>{learner.department}</TableCell>
                      <TableCell>{learner.enrolledCourses}</TableCell>
                      <TableCell>{learner.completedCourses}</TableCell>
                      <TableCell>{getStatusBadge(learner.status)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedules" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Training Schedules</h2>
              <p className="text-muted-foreground">All training schedules for this organization</p>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Schedule
            </Button>
          </div>

          <div className="grid gap-4">
            {mockSchedules.map((schedule) => (
              <Card key={schedule.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <span>{schedule.title}</span>
                        {getStatusBadge(schedule.status)}
                      </CardTitle>
                      <CardDescription>Coordinated by {schedule.coordinator}</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{new Date(schedule.startDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{new Date(schedule.endDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{schedule.location}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{schedule.participants} participants</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientOrganisationDetail;