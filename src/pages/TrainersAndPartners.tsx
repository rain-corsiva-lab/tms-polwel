import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, Filter, GraduationCap, Calendar, Ban, MoreHorizontal, Edit, Mail, Users, Clock, ChevronDown, ChevronRight } from "lucide-react";
import UserTable from "@/components/UserTable";
import { AddTrainerDialog } from "@/components/AddTrainerDialog";
import { AddTrainerBlockoutDialog } from "@/components/AddTrainerBlockoutDialog";
import TrainingCalendar from "@/components/TrainingCalendar";
import StatsCard from "@/components/StatsCard";
import { useToast } from "@/hooks/use-toast";

// Enhanced user data structure for Trainers
interface Trainer {
  id: string;
  name: string;
  email: string;
  role: 'Trainer';
  status: 'Active' | 'Inactive' | 'Pending' | 'Locked';
  lastLogin: string;
  mfaEnabled: boolean;
  passwordExpiry?: string;
  failedLoginAttempts?: number;
  availabilityStatus: 'Available' | 'Unavailable' | 'Limited';
  courses: string[];
  partnerOrganization: string;
  createdAt: string;
  createdBy: string;
  lastModified: string;
  modifiedBy: string;
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

const trainersData: Trainer[] = [
  {
    id: '3',
    name: 'David Chen',
    email: 'david.chen@training.com',
    role: 'Trainer',
    status: 'Active',
    lastLogin: '2024-01-13 14:20',
    mfaEnabled: true,
    passwordExpiry: '2024-04-13',
    failedLoginAttempts: 0,
    availabilityStatus: 'Available',
    courses: ['Leadership Development', 'Team Building'],
    partnerOrganization: 'Excellence Training Partners',
    createdAt: '2023-09-01',
    createdBy: 'john.tan@polwel.org',
    lastModified: '2024-01-13',
    modifiedBy: 'david.chen@training.com'
  },
  {
    id: '6',
    name: 'Jennifer Lee',
    email: 'jennifer.lee@partners.com',
    role: 'Trainer',
    status: 'Active',
    lastLogin: '2024-01-12 15:30',
    mfaEnabled: true,
    passwordExpiry: '2024-04-12',
    failedLoginAttempts: 0,
    availabilityStatus: 'Limited',
    courses: ['Communication Skills', 'Customer Service'],
    partnerOrganization: 'Professional Development Corp',
    createdAt: '2023-10-01',
    createdBy: 'john.tan@polwel.org',
    lastModified: '2024-01-12',
    modifiedBy: 'jennifer.lee@partners.com'
  },
  {
    id: '7',
    name: 'Michael Brown',
    email: 'michael.brown@partners.com',
    role: 'Trainer',
    status: 'Pending',
    lastLogin: 'Never',
    mfaEnabled: false,
    availabilityStatus: 'Available',
    courses: ['Project Management', 'Leadership'],
    partnerOrganization: 'Training Solutions Ltd',
    createdAt: '2024-01-10',
    createdBy: 'john.tan@polwel.org',
    lastModified: '2024-01-10',
    modifiedBy: 'john.tan@polwel.org'
  },
  {
    id: '8',
    name: 'Sarah Wilson',
    email: 'sarah.wilson@excellence.com',
    role: 'Trainer',
    status: 'Pending',
    lastLogin: 'Never',
    mfaEnabled: false,
    availabilityStatus: 'Available',
    courses: ['Sales Training', 'Customer Relations'],
    partnerOrganization: 'Excellence Training Partners',
    createdAt: '2024-01-08',
    createdBy: 'john.tan@polwel.org',
    lastModified: '2024-01-08',
    modifiedBy: 'john.tan@polwel.org'
  }
];

// Convert to format expected by TrainingCalendar
const trainersForCalendar = trainersData.map(trainer => ({
  ...trainer,
  specializations: trainer.courses // Map courses to specializations for calendar compatibility
}));

// Mock trainer blockout dates data
const mockTrainerBlockouts: TrainerBlockout[] = [
  {
    id: "1",
    trainerId: "3",
    trainerName: "David Chen",
    date: "2024-01-15",
    reason: "Personal Leave",
    type: "personal",
    description: "Family commitment"
  },
  {
    id: "2",
    trainerId: "6", 
    trainerName: "Jennifer Lee",
    date: "2024-01-25",
    reason: "Conference Attendance",
    type: "unavailable",
    description: "Speaking at Tech Conference 2024"
  }
];

const TrainersAndPartners = () => {
  const [activeTab, setActiveTab] = useState("trainers");
  const [trainerBlockouts, setTrainerBlockouts] = useState(mockTrainerBlockouts);
  const [isPendingOpen, setIsPendingOpen] = useState(false);
  const { toast } = useToast();

  // Calculate stats
  const totalTrainers = trainersData.length;
  const pendingTrainers = trainersData.filter(trainer => trainer.status === 'Pending');

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="h-6 w-6" />
            Trainers & Partners
          </h2>
          <p className="text-muted-foreground">Manage training partners and their availability</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <AddTrainerDialog />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Trainers</p>
                <p className="text-2xl font-bold text-foreground">{totalTrainers}</p>
              </div>
              <div className="p-2 bg-accent rounded-lg">
                <Users className="h-5 w-5 text-accent-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Dialog>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pending Onboarding</p>
                    <p className="text-2xl font-bold text-foreground">{pendingTrainers.length}</p>
                  </div>
                  <div className="p-2 bg-accent rounded-lg">
                    <Clock className="h-5 w-5 text-accent-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Pending Trainers</DialogTitle>
              <DialogDescription>
                Trainers who haven't clicked their secure onboarding link
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              {pendingTrainers.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {pendingTrainers.map((trainer) => (
                    <div key={trainer.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium text-foreground">{trainer.name}</p>
                        <p className="text-sm text-muted-foreground">{trainer.email}</p>
                        <p className="text-xs text-muted-foreground">Created: {new Date(trainer.createdAt).toLocaleDateString()}</p>
                      </div>
                      <Badge variant="outline" className="text-warning border-warning">
                        Pending
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No pending trainers</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="trainers">Trainers</TabsTrigger>
        </TabsList>


        <TabsContent value="trainers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Training Partners</CardTitle>
              <CardDescription>Manage individual trainers and their availability</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Courses</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainersData.map((trainer) => (
                    <TableRow key={trainer.id}>
                      <TableCell className="font-medium">
                        <Link to={`/trainers/${trainer.id}`} className="hover:underline text-primary">
                          {trainer.name}
                        </Link>
                      </TableCell>
                      <TableCell>{trainer.email}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={trainer.status === 'Active' ? 'default' : 'secondary'}
                        >
                          {trainer.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{trainer.courses.join(", ")}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  toast({
                                    title: "Password Reset Link Sent",
                                    description: `Password reset link has been sent to ${trainer.email}`,
                                  });
                                }}
                              >
                                <Mail className="h-4 w-4 mr-2" />
                                Send Password Reset Link
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default TrainersAndPartners;