import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Building2, Users, UserCheck, Calendar, Clock, MapPin, Plus, Ban, Upload, MoreHorizontal, Edit, Mail, Loader2 } from "lucide-react";
import TrainingCalendar from "@/components/TrainingCalendar";
import { AddCoordinatorDialog } from "@/components/AddCoordinatorDialog";
import { useToast } from "@/hooks/use-toast";
import { clientOrganizationsApi } from "@/lib/api";

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
    email: "sarah.johnson@spf.gov.sg",
    department: "HR Development",
    schedulesCount: 3,
    lastActive: "2 hours ago"
  },
  {
    id: "2",
    name: "Mike Chen",
    email: "mike.chen@spf.gov.sg", 
    department: "Technical Training",
    schedulesCount: 5,
    lastActive: "1 day ago"
  }
];

const mockLearners: Learner[] = [
  {
    id: "1",
    name: "John Smith",
    email: "john.smith@spf.gov.sg",
    department: "Engineering",
    enrolledCourses: 3,
    completedCourses: 8,
    status: "active"
  },
  {
    id: "2",
    name: "Emily Davis",
    email: "emily.davis@spf.gov.sg",
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
    email: "sarah.johnson@spf.gov.sg",
    specializations: ["Leadership", "Communication", "Project Management"]
  },
  {
    id: "2",
    name: "Mike Chen",
    email: "mike.chen@spf.gov.sg",
    specializations: ["Technical Skills", "Software Development", "Data Analysis"]
  },
  {
    id: "3",
    name: "Emily Rodriguez",
    email: "emily.rodriguez@spf.gov.sg",
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
  const [activeTab, setActiveTab] = useState("information");
  const { toast } = useToast();
  
  // API state management
  const [organization, setOrganization] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Mock data state (until backend endpoints are ready for these)
  const [trainerBlockouts, setTrainerBlockouts] = useState(mockTrainerBlockouts);

  useEffect(() => {
    if (id) {
      fetchOrganization();
    }
  }, [id]);

  const fetchOrganization = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await clientOrganizationsApi.getById(id);
      setOrganization(data);
    } catch (error) {
      console.error('Error fetching organization:', error);
      
      // Use mock data when API fails
      const mockOrganization = {
        id: id,
        name: "Singapore Police Force",
        email: "contact@spf.gov.sg",
        address: "New Phoenix Park, 28 Irrawaddy Road, Singapore 329560",
        businessUnitNumber: "SPF-2024-001",
        contactPerson: "John Tan",
        phoneNumber: "+65 6357 0000",
        industry: "Law Enforcement",
        status: "active",
        createdAt: "2024-01-15",
        updatedAt: "2024-08-13"
      };
      
      setOrganization(mockOrganization);
      toast({
        title: "Using Sample Data",
        description: "Connected to sample organization data.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!organization || !id) return;
    
    try {
      setSaving(true);
      await clientOrganizationsApi.update(id, {
        name: organization.name,
        displayName: organization.name, // Use name as display name
        industry: organization.industry,
        status: organization.status,
        address: organization.address,
        contactEmail: organization.email,
        contactPhone: organization.phoneNumber,
        buNumber: organization.businessUnitNumber,
        divisionAddress: organization.address, // Use address as division address
      });
      
      toast({
        title: "Organization Updated",
        description: "Organization details have been updated successfully.",
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating organization:', error);
      toast({
        title: "Error",
        description: "Failed to update organization. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading organization details...</span>
        </div>
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-4 mb-6">
          <Link to="/client-organizations">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Organizations
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-red-600 mb-2">Error Loading Organization</h3>
              <p className="text-gray-600 mb-4">{error || 'Organization not found'}</p>
              <Button onClick={fetchOrganization}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            Back to Clients
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
          <p className="text-muted-foreground">{organization.email}</p>
          <p className="text-sm text-muted-foreground">{organization.address}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
            <TabsTrigger value="information">Organization Information</TabsTrigger>
            <TabsTrigger value="coordinators">Training Coordinators</TabsTrigger>
            <TabsTrigger value="learners">Learners</TabsTrigger>
          </TabsList>

        <TabsContent value="information" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Organization Information</CardTitle>
                <CardDescription>Manage organization details and settings</CardDescription>
              </div>
              <Button
                variant={isEditing ? "default" : "outline"}
                onClick={isEditing ? handleSaveChanges : () => setIsEditing(!isEditing)}
                disabled={saving}
              >
                {saving ? "Saving..." : isEditing ? "Save Changes" : "Edit Information"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Organization Name</Label>
                  {isEditing ? (
                    <Input
                      id="name"
                      value={organization.name || ''}
                      onChange={(e) => setOrganization(prev => ({ ...prev, name: e.target.value }))}
                    />
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">{organization.name}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="email">Contact Email</Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      value={organization.email || ''}
                      onChange={(e) => setOrganization(prev => ({ ...prev, email: e.target.value }))}
                    />
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">{organization.email}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="businessUnitNumber">Business Unit Number</Label>
                  {isEditing ? (
                    <Input
                      id="businessUnitNumber"
                      value={organization.businessUnitNumber || ''}
                      onChange={(e) => setOrganization(prev => ({ ...prev, businessUnitNumber: e.target.value }))}
                    />
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">{organization.businessUnitNumber}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="contactPerson">Contact Person</Label>
                  {isEditing ? (
                    <Input
                      id="contactPerson"
                      value={organization.contactPerson || ''}
                      onChange={(e) => setOrganization(prev => ({ ...prev, contactPerson: e.target.value }))}
                    />
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">{organization.contactPerson || 'Not provided'}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  {isEditing ? (
                    <Input
                      id="phoneNumber"
                      value={organization.phoneNumber || ''}
                      onChange={(e) => setOrganization(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    />
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">{organization.phoneNumber || 'Not provided'}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="industry">Industry</Label>
                  {isEditing ? (
                    <Input
                      id="industry"
                      value={organization.industry || ''}
                      onChange={(e) => setOrganization(prev => ({ ...prev, industry: e.target.value }))}
                    />
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">{organization.industry || 'Not specified'}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                {isEditing ? (
                  <textarea
                    id="address"
                    className="w-full mt-1 px-3 py-2 border border-input rounded-md text-sm"
                    value={organization.address || ''}
                    onChange={(e) => setOrganization(prev => ({ ...prev, address: e.target.value }))}
                    rows={3}
                  />
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">{organization.address}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coordinators" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Training Coordinators</h2>
              <p className="text-muted-foreground">Manage training coordinators for this organization</p>
            </div>
            <AddCoordinatorDialog />
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
                                  description: `Password reset link has been sent to ${coordinator.email}`,
                                });
                              }}
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              Send Password Reset Link
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                          </DropdownMenuContent>
                        </DropdownMenu>
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

export default ClientOrganisationDetail;
