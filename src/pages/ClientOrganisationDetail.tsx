import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Building2, Users, UserCheck, Calendar, Clock, MapPin, Plus, Ban, Upload, MoreHorizontal, Edit, Mail, Loader2, Trash2 } from "lucide-react";
import TrainingCalendar from "@/components/TrainingCalendar";
import { AddCoordinatorDialog } from "@/components/AddCoordinatorDialog";
import { EditCoordinatorDialog } from "@/components/EditCoordinatorDialog";
import { useToast } from "@/hooks/use-toast";
import { clientOrganizationsApi } from "@/lib/api";
import Swal from 'sweetalert2';

interface TrainingCoordinator {
  id: string;
  name: string;
  email: string;
  department: string;
  status: string;
  organizationId: string;
  createdAt: string;
}

interface Learner {
  id: string;
  name: string;
  email: string;
  department?: string;
  status?: string;
  enrolledCourses?: number;
  completedCourses?: number;
  organizationId?: string;
  createdAt: string;
  updatedAt?: string;
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
  const [coordinators, setCoordinators] = useState<TrainingCoordinator[]>([]);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [loading, setLoading] = useState(true);
  const [coordinatorsLoading, setCoordinatorsLoading] = useState(false);
  const [learnersLoading, setLearnersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form data for organization editing
  const [formData, setFormData] = useState({
    name: '',
    contactEmail: '',
    contactPhone: '',
    contactPerson: '',
    address: '',
    industry: '',
    buNumber: ''
  });

  // Edit coordinator dialog state
  const [editCoordinatorDialog, setEditCoordinatorDialog] = useState({
    open: false,
    coordinator: null as TrainingCoordinator | null
  });

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
      
      // Set form data
      setFormData({
        name: data.name || '',
        contactEmail: data.contactEmail || '',
        contactPhone: data.contactPhone || '',
        contactPerson: data.contactPerson || '',
        address: data.address || '',
        industry: data.industry || '',
        buNumber: data.buNumber || ''
      });
    } catch (error: any) {
      console.error('Error fetching organization:', error);
      setError(error.message || 'Failed to fetch organization');
      toast({
        title: "Error",
        description: "Failed to load organization data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCoordinators = async () => {
    if (!id) return;
    
    try {
      setCoordinatorsLoading(true);
      const response = await clientOrganizationsApi.getCoordinators(id);
      setCoordinators(response.coordinators || []);
    } catch (error: any) {
      console.error('Error fetching coordinators:', error);
      toast({
        title: "Error",
        description: "Failed to load coordinators. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCoordinatorsLoading(false);
    }
  };

  const fetchLearners = async () => {
    if (!id) return;
    
    try {
      setLearnersLoading(true);
      const response = await clientOrganizationsApi.getLearners(id);
      setLearners(response.learners || []);
    } catch (error: any) {
      console.error('Error fetching learners:', error);
      toast({
        title: "Error",
        description: "Failed to load learners. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLearnersLoading(false);
    }
  };

  // Load coordinators when coordinators tab is activated
  useEffect(() => {
    if (activeTab === "coordinators" && coordinators.length === 0) {
      fetchCoordinators();
    }
  }, [activeTab, id]);

  // Load learners when learners tab is activated
  useEffect(() => {
    if (activeTab === "learners" && learners.length === 0) {
      fetchLearners();
    }
  }, [activeTab, id]);

  const handleSaveChanges = async () => {
    if (!organization || !id) return;
    
    try {
      setSaving(true);
      await clientOrganizationsApi.update(id, {
        name: formData.name,
        displayName: formData.name,
        industry: formData.industry,
        address: formData.address,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        contactPerson: formData.contactPerson,
        buNumber: formData.buNumber,
        divisionAddress: formData.address,
      });
      
      // Update local state
      setOrganization({
        ...organization,
        name: formData.name,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        contactPerson: formData.contactPerson,
        address: formData.address,
        industry: formData.industry,
        buNumber: formData.buNumber
      });
      
      toast({
        title: "Success",
        description: "Organization details have been updated successfully.",
      });
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error updating organization:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update organization. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCoordinatorAdd = async (coordinatorData: { name: string; email: string; department: string; password: string }) => {
    if (!id) return;

    try {
      const newCoordinator = await clientOrganizationsApi.createCoordinator(id, coordinatorData);
      setCoordinators(prev => [newCoordinator, ...prev]);
      // Success toast will be handled by AddCoordinatorDialog
    } catch (error: any) {
      console.error('Error creating coordinator:', error);
      // Re-throw the error so the AddCoordinatorDialog can handle it properly
      throw error;
    }
  };

  const handleCoordinatorEdit = async (coordinatorId: string, coordinatorData: { name?: string; email?: string; department?: string; status?: string }) => {
    if (!id) return;

    try {
      const updatedCoordinator = await clientOrganizationsApi.updateCoordinator(id, coordinatorId, coordinatorData);
      setCoordinators(prev => prev.map(coord => 
        coord.id === coordinatorId ? updatedCoordinator : coord
      ));
      // Success toast will be handled by EditCoordinatorDialog
    } catch (error: any) {
      console.error('Error updating coordinator:', error);
      // Re-throw the error so the EditCoordinatorDialog can handle it properly
      throw error;
    }
  };

  const handleCoordinatorDelete = async (coordinatorId: string) => {
    if (!id) return;

    // Find the coordinator to get their name
    const coordinator = coordinators.find(coord => coord.id === coordinatorId);
    const coordinatorName = coordinator?.name || 'this coordinator';

    // Show SweetAlert2 confirmation dialog
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete ${coordinatorName}? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) {
      return; // User cancelled
    }

    try {
      await clientOrganizationsApi.deleteCoordinator(id, coordinatorId);
      setCoordinators(prev => prev.filter(coord => coord.id !== coordinatorId));
      
      // Success message with SweetAlert2
      await Swal.fire({
        title: 'Deleted!',
        text: `${coordinatorName} has been deleted successfully.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error: any) {
      console.error('Error deleting coordinator:', error);
      
      // Error message with SweetAlert2
      await Swal.fire({
        title: 'Error!',
        text: error.message || "Failed to delete coordinator. Please try again.",
        icon: 'error',
        confirmButtonColor: '#dc2626'
      });
    }
  };

  const handleEditCoordinatorClick = (coordinator: TrainingCoordinator) => {
    setEditCoordinatorDialog({
      open: true,
      coordinator
    });
  };

  const handleEditCoordinatorClose = () => {
    setEditCoordinatorDialog({
      open: false,
      coordinator: null
    });
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
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">{organization?.name || 'N/A'}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="email">Contact Email</Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                    />
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">{organization?.contactEmail || 'N/A'}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="businessUnitNumber">Business Unit Number</Label>
                  {isEditing ? (
                    <Input
                      id="businessUnitNumber"
                      value={formData.buNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, buNumber: e.target.value }))}
                    />
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">{organization?.buNumber || 'N/A'}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="contactPerson">Contact Person</Label>
                  {isEditing ? (
                    <Input
                      id="contactPerson"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                    />
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">{organization?.contactPerson || 'N/A'}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  {isEditing ? (
                    <Input
                      id="phoneNumber"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                    />
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">{organization?.contactPhone || 'N/A'}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="industry">Industry</Label>
                  {isEditing ? (
                    <Input
                      id="industry"
                      value={formData.industry}
                      onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
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
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    rows={3}
                  />
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">{organization?.address || 'N/A'}</p>
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
            <AddCoordinatorDialog onCoordinatorAdd={handleCoordinatorAdd} />
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
                  {coordinatorsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex items-center justify-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Loading coordinators...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : coordinators.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No coordinators found. Add a new coordinator to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    coordinators.map((coordinator) => (
                      <TableRow key={coordinator.id}>
                        <TableCell className="font-medium">{coordinator.name}</TableCell>
                        <TableCell>{coordinator.email}</TableCell>
                        <TableCell>{coordinator.department}</TableCell>
                        <TableCell>0</TableCell>
                        <TableCell>{new Date(coordinator.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditCoordinatorClick(coordinator)}>
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
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleCoordinatorDelete(coordinator.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
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
                  {learnersLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex items-center justify-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Loading learners...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : learners.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No learners found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    learners.map((learner) => (
                      <TableRow key={learner.id}>
                        <TableCell className="font-medium">{learner.name}</TableCell>
                        <TableCell>{learner.email}</TableCell>
                        <TableCell>{learner.department || 'N/A'}</TableCell>
                        <TableCell>{learner.enrolledCourses || 0}</TableCell>
                        <TableCell>{learner.completedCourses || 0}</TableCell>
                        <TableCell>{getStatusBadge(learner.status || 'active')}</TableCell>
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
                                View Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Edit Coordinator Dialog */}
      <EditCoordinatorDialog
        coordinator={editCoordinatorDialog.coordinator}
        open={editCoordinatorDialog.open}
        onOpenChange={(open) => setEditCoordinatorDialog(prev => ({ ...prev, open }))}
        onCoordinatorUpdate={handleCoordinatorEdit}
      />
    </div>
  );
};

export default ClientOrganisationDetail;
