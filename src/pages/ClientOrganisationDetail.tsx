import { useState, useEffect, useRef } from "react";
import { formatDate } from "../lib/date";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import PaginationControls from "@/components/ui/pagination";
import { ArrowLeft, Building2, Users, UserCheck, Calendar, Clock, MapPin, Plus, Ban, Upload, MoreHorizontal, Edit, Mail, Loader2, Trash2, Eye } from "lucide-react";
import TrainingCalendar from "@/components/TrainingCalendar";
import { AddCoordinatorDialog } from "@/components/AddCoordinatorDialog";
import { EditCoordinatorDialog } from "@/components/EditCoordinatorDialog";
import { LearnerDetailsDialog } from "@/components/LearnerDetailsDialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { clientOrganizationsApi } from "@/lib/api";
import { digitsOnly } from "@/lib/utils";
import { errorHandlers, getErrorMessage } from "@/lib/errorHandler";
import Swal from "sweetalert2";

interface TrainingCoordinator {
  id: string;
  name: string;
  email: string;
  designation: string;
  status: string;
  organizationId: string;
  createdAt: string;
  isPrimaryCoordinator?: boolean;
  contactNumber?: string | null;
}

interface Learner {
  id: string;
  name: string;
  email: string;
  designation?: string;
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
  // 'type' removed for trainer blockouts; use optional 'remarks' instead
  remarks?: string;
  description?: string;
}

const mockTrainers: Trainer[] = [
  {
    id: "1",
    name: "Dr. Sarah Johnson",
    email: "sarah.johnson@spf.gov.sg",
    specializations: ["Leadership", "Communication", "Project Management"],
  },
  {
    id: "2",
    name: "Mike Chen",
    email: "mike.chen@spf.gov.sg",
    specializations: ["Technical Skills", "Software Development", "Data Analysis"],
  },
  {
    id: "3",
    name: "Emily Rodriguez",
    email: "emily.rodriguez@spf.gov.sg",
    specializations: ["Safety Training", "Compliance", "HR Policies"],
  },
];

// Mock trainer blockout dates data
const mockTrainerBlockouts: TrainerBlockout[] = [
  // {
  //   id: "1",
  //   trainerId: "1",
  //   trainerName: "Dr. Sarah Johnson",
  //   date: "2024-01-15",
  //   remarks: "Personal Leave",
  //   type: "personal",
  //   description: "Family commitment",
  // },
  // {
  //   id: "2",
  //   trainerId: "2",
  //   trainerName: "Mike Chen",
  //   date: "2024-01-25",
  //   remarks: "Conference Attendance",
  //   type: "unavailable",
  //   description: "Speaking at Tech Conference 2024",
  // },
  // {
  //   id: "3",
  //   trainerId: "3",
  //   trainerName: "Emily Rodriguez",
  //   date: "2024-01-30",
  //   remarks: "Training Course",
  //   type: "personal",
  //   description: "Attending advanced safety certification",
  // },
];

const ClientOrganisationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasRole, loading: authLoading } = useAuth();
  const isTCUser = hasRole("TRAINING_COORDINATOR");
  const userOrgId = user?.organizationId;
  const [activeTab, setActiveTab] = useState("information");
  // Controlled dropdown menu state to avoid accidental opens during scroll
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const lastScrollRef = useRef<number>(0);

  // ...existing imports...
  // update last scroll time to detect recent scrolls
  useEffect(() => {
    const onScroll = () => {
      lastScrollRef.current = Date.now();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleMenuOpenChange = (nextOpen: boolean, id: string | null) => {
    if (nextOpen) {
      const now = Date.now();
      if (now - lastScrollRef.current < 250) {
        // ignore open triggered immediately after scroll
        return;
      }
      setOpenMenuId(id);
    } else {
      setOpenMenuId(null);
    }
  };
  const { toast } = useToast();

  // API state management
  const [organization, setOrganization] = useState<any>(null);
  const [coordinators, setCoordinators] = useState<TrainingCoordinator[]>([]);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [coordinatorsPagination, setCoordinatorsPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [coordinatorsPerPage, setCoordinatorsPerPage] = useState(10);
  const [learnersPagination, setLearnersPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [learnersPerPage, setLearnersPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [coordinatorsLoading, setCoordinatorsLoading] = useState(false);
  const [learnersLoading, setLearnersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form data for organization editing
  const [formData, setFormData] = useState({
    name: "",
    contactEmail: "",
    contactPhone: "",
    contactPerson: "",
    address: "",
    buNumber: "",
  });

  // Edit coordinator dialog state
  const [editCoordinatorDialog, setEditCoordinatorDialog] = useState({
    open: false,
    coordinator: null as TrainingCoordinator | null,
  });

  useEffect(() => {
    if (id) {
      fetchOrganization();
    }
  }, [id]);

  // Enforce TC access: if user is a training coordinator, prevent viewing other orgs
  // Wait until auth state is loaded before enforcing TC access rules
  useEffect(() => {
    if (authLoading) return;

    // If no id parameter present, show error and navigate back
    if (!id) {
      toast({ title: "Missing organisation", description: "No organisation selected.", variant: "destructive" });
      navigate("/client-organisations", { replace: true });
      return;
    }

    if (isTCUser && userOrgId && id !== userOrgId) {
      toast({ title: "Access denied", description: "You can only view your own organisation.", variant: "destructive" });
      navigate("/client-organisations", { replace: true });
    }
  }, [isTCUser, id, userOrgId, navigate, toast, authLoading]);

  const fetchOrganization = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await clientOrganizationsApi.getById(id);
      setOrganization(data);

      // Set form data
      setFormData({
        name: data.name || "",
        contactEmail: data.contactEmail || "",
        contactPhone: digitsOnly(data.contactPhone || ""),
        contactPerson: data.contactPerson || "",
        address: data.address || "",
        buNumber: data.buNumber || "",
      });
    } catch (error: any) {
      console.error("Error fetching organization:", error);
      const errorMessage = getErrorMessage(error, "Failed to fetch organization");
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
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
      console.log("Fetching coordinators for organization:", id);
      const response = await clientOrganizationsApi.getCoordinators(id, { page: coordinatorsPagination.page, limit: coordinatorsPerPage, status: "all" });
      console.log("Coordinators API response:", response);
      setCoordinators(response.coordinators || []);
      setCoordinatorsPagination(response.pagination || { ...coordinatorsPagination, limit: coordinatorsPerPage });
    } catch (error: any) {
      console.error("Error fetching coordinators:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to load coordinators. Please try again."),
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
      const response = await clientOrganizationsApi.getLearners(id, { page: learnersPagination.page, limit: learnersPerPage });
      setLearners(response.learners || []);
      setLearnersPagination(response.pagination || { ...learnersPagination, limit: learnersPerPage });
    } catch (error: any) {
      console.error("Error fetching learners:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to load participants. Please try again."),
        variant: "destructive",
      });
    } finally {
      setLearnersLoading(false);
    }
  };

  // Load coordinators when coordinators tab is activated
  useEffect(() => {
    if ((hasRole("POLWEL") || !isTCUser) && activeTab === "coordinators" && coordinators.length === 0) {
      fetchCoordinators();
    }
  }, [activeTab, id]);

  useEffect(() => {
    if ((hasRole("POLWEL") || !isTCUser) && activeTab === "coordinators") {
      fetchCoordinators();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordinatorsPagination.page, coordinatorsPerPage]);

  // Load learners when learners tab is activated
  useEffect(() => {
    if (activeTab === "learners" && learners.length === 0) {
      fetchLearners();
    }
  }, [activeTab, id]);

  useEffect(() => {
    if (activeTab === "learners") {
      fetchLearners();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [learnersPagination.page, learnersPerPage]);

  const handleSaveChanges = async () => {
    if (!organization || !id) return;

    try {
      setSaving(true);
      const sanitizedPhone = digitsOnly(formData.contactPhone);
      await clientOrganizationsApi.update(id, {
        name: formData.name,
        address: formData.address,
        contactEmail: formData.contactEmail,
        contactPhone: sanitizedPhone,
        contactPerson: formData.contactPerson,
        buNumber: formData.buNumber,
      });

      // Update local state
      setOrganization({
        ...organization,
        name: formData.name,
        contactEmail: formData.contactEmail,
        contactPhone: sanitizedPhone,
        contactPerson: formData.contactPerson,
        address: formData.address,
        buNumber: formData.buNumber,
      });

      toast({
        title: "Success",
        description: "Organisation details have been updated successfully.",
      });
      setIsEditing(false);
    } catch (error: any) {
      console.error("Error updating organization:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to update organisation. Please try again."),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCoordinatorAdd = async (coordinatorData: {
    name: string;
    email: string;
    contactNumber: string;
    designation: string;
    password: string;
    isPrimary?: boolean;
  }) => {
    if (!id) return;

    try {
      await clientOrganizationsApi.createCoordinator(id, coordinatorData);
      await fetchCoordinators();
      // Success toast will be handled by AddCoordinatorDialog
    } catch (error: any) {
      console.error("Error creating coordinator:", error);
      // Re-throw the error so the AddCoordinatorDialog can handle it properly
      throw error;
    }
  };

  const handleCoordinatorEdit = async (
    coordinatorId: string,
    coordinatorData: { name?: string; email?: string; contactNumber?: string | null; designation?: string; status?: string; isPrimary?: boolean }
  ) => {
    if (!id) return;

    try {
      const updatedCoordinator = await clientOrganizationsApi.updateCoordinator(id, coordinatorId, coordinatorData);

      // Immediately update the local state with the returned data
      setCoordinators((prev) =>
        prev.map((coord) =>
          coord.id === coordinatorId
            ? {
                ...coord,
                name: updatedCoordinator.name ?? coord.name,
                email: updatedCoordinator.email ?? coord.email,
                contactNumber: updatedCoordinator.contactNumber ?? coord.contactNumber,
                designation: updatedCoordinator.designation ?? coord.designation,
                status: updatedCoordinator.status ?? coord.status,
                isPrimaryCoordinator: updatedCoordinator.isPrimaryCoordinator ?? coord.isPrimaryCoordinator,
              }
            : coord
        )
      );

      // Also refresh from server for consistency
      await fetchCoordinators();
      // Success toast will be handled by EditCoordinatorDialog
    } catch (error: any) {
      console.error("Error updating coordinator:", error);
      // Re-throw the error so the EditCoordinatorDialog can handle it properly
      throw error;
    }
  };

  const handleCoordinatorDelete = async (coordinatorId: string) => {
    if (!id) return;

    // Find the coordinator to get their name
    const coordinator = coordinators.find((coord) => coord.id === coordinatorId);
    const coordinatorName = coordinator?.name || "this coordinator";

    // Show SweetAlert2 confirmation dialog
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Do you want to delete ${coordinatorName}? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) {
      return; // User cancelled
    }

    try {
      await clientOrganizationsApi.deleteCoordinator(id, coordinatorId);
      setCoordinators((prev) => prev.filter((coord) => coord.id !== coordinatorId));

      // Success message with toast
      toast({
        title: "Deleted!",
        description: `${coordinatorName} has been deleted successfully.`,
      });
    } catch (error: any) {
      console.error("Error deleting coordinator:", error);

      // Error message with toast
      toast({
        title: "Error!",
        description: getErrorMessage(error, "Failed to delete coordinator. Please try again."),
        variant: "destructive",
      });
    }
  };

  const handleEditCoordinatorClick = (coordinator: TrainingCoordinator) => {
    setEditCoordinatorDialog({
      open: true,
      coordinator,
    });
  };

  const handleEditCoordinatorClose = () => {
    setEditCoordinatorDialog({
      open: false,
      coordinator: null,
    });
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading organisation details...</span>
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
              Back to Organisations
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-red-600 mb-2">Error Loading Organisation</h3>
              <p className="text-gray-600 mb-4">{error || "Organisation not found"}</p>
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
      completed: "secondary",
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
          <TabsTrigger value="information">Organisation Information</TabsTrigger>
          {(hasRole("POLWEL") || !isTCUser) && <TabsTrigger value="coordinators">Training Coordinators</TabsTrigger>}
          <TabsTrigger value="learners">Participants</TabsTrigger>
        </TabsList>

        <TabsContent value="information" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Organisation Information</CardTitle>
                {/* <CardDescription>Manage organization details and settings</CardDescription> */}
              </div>
              <Button variant={isEditing ? "default" : "outline"} onClick={isEditing ? handleSaveChanges : () => setIsEditing(!isEditing)} disabled={saving}>
                {saving ? "Saving..." : isEditing ? "Save Changes" : "Edit Information"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Organization Name</Label>
                  {isEditing ? (
                    <Input id="name" value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} />
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">{organization?.name || "N/A"}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">Contact Email</Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData((prev) => ({ ...prev, contactEmail: e.target.value }))}
                    />
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">{organization?.contactEmail || "N/A"}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="businessUnitNumber">Business Unit Number</Label>
                  {isEditing ? (
                    <Input id="businessUnitNumber" value={formData.buNumber} onChange={(e) => setFormData((prev) => ({ ...prev, buNumber: e.target.value }))} />
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">{organization?.buNumber || "N/A"}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="contactPerson">Contact Person</Label>
                  {isEditing ? (
                    <Input
                      id="contactPerson"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData((prev) => ({ ...prev, contactPerson: e.target.value }))}
                    />
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">{organization?.contactPerson || "N/A"}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  {isEditing ? (
                    <Input
                      id="phoneNumber"
                      value={formData.contactPhone}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          contactPhone: digitsOnly(e.target.value),
                        }))
                      }
                    />
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">{organization?.contactPhone || "N/A"}</p>
                  )}
                </div>

                {/* industry field removed */}
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                {isEditing ? (
                  <textarea
                    id="address"
                    className="w-full mt-1 px-3 py-2 border border-input rounded-md text-sm"
                    value={formData.address}
                    onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                    rows={3}
                  />
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">{organization?.address || "N/A"}</p>
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
                    <TableHead>Contact</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead>Status</TableHead>
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
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span>{coordinator.name}</span>
                            {coordinator.isPrimaryCoordinator && <Badge variant="secondary">Primary</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>{coordinator.email}</TableCell>
                        <TableCell>{coordinator.contactNumber || "N/A"}</TableCell>
                        <TableCell>{coordinator.designation}</TableCell>
                        <TableCell>{formatDate(coordinator.createdAt)}</TableCell>
                        <TableCell>{getStatusBadge((coordinator.status || "ACTIVE").toLowerCase())}</TableCell>
                        <TableCell>
                          <DropdownMenu open={openMenuId === coordinator.id} onOpenChange={(next) => handleMenuOpenChange(next, next ? coordinator.id : null)}>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditCoordinatorClick(coordinator)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit User
                              </DropdownMenuItem>
                              {coordinator.status === "PENDING" && (
                                <DropdownMenuItem
                                  onClick={async () => {
                                    try {
                                      await clientOrganizationsApi.resendCoordinatorSetup(id, coordinator.id);
                                      toast({
                                        title: "Setup Email Sent",
                                        description: `Onboarding email has been resent to ${coordinator.name}`,
                                      });
                                    } catch (error: any) {
                                      toast({
                                        title: "Failed to Send Email",
                                        description: getErrorMessage(error, "Could not resend setup email. Please try again."),
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                >
                                  <Mail className="h-4 w-4 mr-2" />
                                  Resend Onboarding Email
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={async () => {
                                  try {
                                    if (!coordinator.email) throw new Error("Coordinator has no email address");
                                    // Use polwel users API which supports sending reset links for any role
                                    await (await import("@/lib/api")).polwelUsersApi.sendPasswordResetLink(coordinator.id);
                                    toast({
                                      title: "Password Reset Link Sent",
                                      description: `Password reset link has been sent to ${coordinator.email}`,
                                    });
                                  } catch (error: any) {
                                    toast({
                                      title: "Failed to Send Reset",
                                      description: getErrorMessage(error, "Could not send password reset link. Please try again."),
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                <Mail className="h-4 w-4 mr-2" />
                                Send Password Reset Link
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={async () => {
                                  try {
                                    const nextStatus = coordinator.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
                                    await clientOrganizationsApi.updateCoordinator(id!, coordinator.id, { status: nextStatus });
                                    await fetchCoordinators();
                                    toast({ title: `Coordinator ${nextStatus === "ACTIVE" ? "Activated" : "Deactivated"}` });
                                  } catch (error: any) {
                                    toast({
                                      title: "Failed to update status",
                                      description: getErrorMessage(error, "Please try again."),
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                {coordinator.status === "ACTIVE" ? "Mark Inactive" : "Mark Active"}
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
            <div className="px-4 border-t mt-4">
              <PaginationControls
                page={coordinatorsPagination.page}
                perPage={coordinatorsPerPage}
                total={coordinatorsPagination.total}
                onPageChange={(p) => setCoordinatorsPagination((prev) => ({ ...prev, page: p }))}
                onPerPageChange={(pp) => setCoordinatorsPerPage(pp)}
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="learners" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Participants</h2>
              <p className="text-muted-foreground">Manage participants for this organization</p>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Designation</TableHead>
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
                          <span>Loading participants...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : learners.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No participants found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    learners.map((learner) => (
                      <TableRow key={learner.id}>
                        <TableCell className="font-medium">{learner.name}</TableCell>
                        <TableCell>{learner.email}</TableCell>
                        <TableCell>{learner.designation || "N/A"}</TableCell>
                        <TableCell>{learner.enrolledCourses || 0}</TableCell>
                        <TableCell>{learner.completedCourses || 0}</TableCell>
                        <TableCell>{getStatusBadge(learner.status || "active")}</TableCell>
                        <TableCell>
                          <DropdownMenu open={openMenuId === learner.id} onOpenChange={(next) => handleMenuOpenChange(next, next ? learner.id : null)}>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <LearnerDetailsDialog
                                learner={learner}
                                trigger={
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                }
                              />
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <div className="px-4 border-t mt-4">
              <PaginationControls
                page={learnersPagination.page}
                perPage={learnersPerPage}
                total={learnersPagination.total}
                onPageChange={(p) => setLearnersPagination((prev) => ({ ...prev, page: p }))}
                onPerPageChange={(pp) => setLearnersPerPage(pp)}
              />
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Coordinator Dialog */}
      <EditCoordinatorDialog
        coordinator={editCoordinatorDialog.coordinator}
        open={editCoordinatorDialog.open}
        onOpenChange={(open) => setEditCoordinatorDialog((prev) => ({ ...prev, open }))}
        onCoordinatorUpdate={handleCoordinatorEdit}
      />
    </div>
  );
};

export default ClientOrganisationDetail;
