import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Building2, Users, UserCheck, Calendar, Clock, MapPin, Plus, Ban } from "lucide-react";
import TrainingCalendar from "@/components/TrainingCalendar";
import { useToast } from "@/hooks/use-toast";

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

interface Trainer {
  id: string;
  name: string;
  email: string;
  specializations: string[];
}

interface TrainerBlockout {
  id: string;
  trainerId: string;
  trainerName: string;
  date: string;
  reason: string;
  type: "maintenance" | "holiday" | "unavailable" | "personal" | "other";
  description?: string;
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

const mockTrainers: Trainer[] = [
  {
    id: "1",
    name: "Dr. Sarah Johnson",
    email: "sarah.johnson@techcorp.com",
    specializations: ["Leadership", "Communication", "Project Management"]
  },
  {
    id: "2",
    name: "Mike Chen",
    email: "mike.chen@techcorp.com",
    specializations: ["Technical Skills", "Software Development", "Data Analysis"]
  },
  {
    id: "3",
    name: "Emily Rodriguez",
    email: "emily.rodriguez@techcorp.com",
    specializations: ["Safety Training", "Compliance", "HR Policies"]
  }
];

// Mock trainer blockout dates data
const mockTrainerBlockouts: TrainerBlockout[] = [
  {
    id: "1",
    trainerId: "1",
    trainerName: "Dr. Sarah Johnson",
    date: "2024-01-15",
    reason: "Personal Leave",
    type: "personal",
    description: "Family commitment"
  },
  {
    id: "2",
    trainerId: "2", 
    trainerName: "Mike Chen",
    date: "2024-01-25",
    reason: "Conference Attendance",
    type: "unavailable",
    description: "Speaking at Tech Conference 2024"
  },
  {
    id: "3",
    trainerId: "3",
    trainerName: "Emily Rodriguez",
    date: "2024-01-30",
    reason: "Training Course",
    type: "personal",
    description: "Attending advanced safety certification"
  }
];

const ClientOrganisationDetail = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();
  const [trainerBlockouts, setTrainerBlockouts] = useState(mockTrainerBlockouts);

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

  const handleTrainerBlockoutAdd = (blockout: Omit<TrainerBlockout, 'id'>) => {
    const newBlockout = {
      ...blockout,
      id: Date.now().toString()
    };
    setTrainerBlockouts(prev => [...prev, newBlockout]);
    toast({
      title: "Trainer Blocked Out",
      description: `${blockout.trainerName} has been blocked out for ${blockout.date}`,
    });
  };

  const handleTrainerBlockoutRemove = (blockoutId: string) => {
    setTrainerBlockouts(prev => prev.filter(b => b.id !== blockoutId));
    toast({
      title: "Trainer Blockout Removed",
      description: "The trainer blockout has been removed",
    });
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
            <TabsTrigger value="schedules">Trainer Availability</TabsTrigger>
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
                <CardTitle className="text-sm font-medium">Available Trainers</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockTrainers.length}</div>
              </CardContent>
            </Card>
          </div>

            <Card>
              <CardHeader>
                <CardTitle>Available Trainers</CardTitle>
                <CardDescription>Overview of trainers available for this organization</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Specializations</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockTrainers.map((trainer) => (
                      <TableRow key={trainer.id}>
                        <TableCell className="font-medium">{trainer.name}</TableCell>
                        <TableCell>{trainer.email}</TableCell>
                        <TableCell>{trainer.specializations.join(", ")}</TableCell>
                        <TableCell>
                          <Badge variant="default">Available</Badge>
                        </TableCell>
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
              <h2 className="text-2xl font-bold">Trainer Availability</h2>
              <p className="text-muted-foreground">Block out dates when trainers are unavailable</p>
            </div>
          </div>

          <TrainingCalendar 
            trainers={mockTrainers}
            trainerBlockouts={trainerBlockouts}
            canManageBlockouts={true}
            onTrainerBlockoutAdd={handleTrainerBlockoutAdd}
            onTrainerBlockoutRemove={handleTrainerBlockoutRemove}
            onDateSelect={(date) => console.log("Selected date:", date)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientOrganisationDetail;