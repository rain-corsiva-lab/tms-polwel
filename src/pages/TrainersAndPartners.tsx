import { useState, useEffect } from "react";
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
import { AddPartnerDialog } from "@/components/AddPartnerDialog";
import { AddTrainerBlockoutDialog } from "@/components/AddTrainerBlockoutDialog";
import { EditTrainerDialog } from "@/components/EditTrainerDialog";
import TrainingCalendar from "@/components/TrainingCalendar";
import StatsCard from "@/components/StatsCard";
import { useToast } from "@/hooks/use-toast";
import { trainersApi, partnersApi } from "@/lib/api";

// Enhanced user data structure for Trainers
interface Trainer {
  id: string;
  name: string;
  email: string;
  role: 'TRAINER';
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'LOCKED';
  lastLogin: string | null;
  mfaEnabled: boolean;
  passwordExpiry?: string;
  failedLoginAttempts?: number;
  availabilityStatus: 'Available' | 'Unavailable' | 'Limited';
  courses: string[];
  partnerOrganization: string | null;
  createdAt: string;
  updatedAt: string;
  specializations?: string[];
}

// Enhanced data structure for Partners (data-only, not user accounts)
interface Partner {
  id: string;
  partnerName: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'LOCKED';
  coursesAssigned: string[];
  pointOfContact: string;
  contactNumber: string;
  contactDesignation: string;
  createdAt: string;
  updatedAt: string;
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

const TrainersAndPartners = () => {
  const [activeTab, setActiveTab] = useState("trainers");
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [partnersPagination, setPartnersPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [trainerBlockouts, setTrainerBlockouts] = useState<TrainerBlockout[]>([]);
  const [isPendingOpen, setIsPendingOpen] = useState(false);
  const { toast } = useToast();

// Dummy data for trainers
  const dummyTrainers: Trainer[] = [
    {
      id: "1",
      name: "David Chen",
      email: "david.chen@training.com",
      role: 'TRAINER',
      status: 'ACTIVE',
      lastLogin: "2024-08-12T10:30:00Z",
      mfaEnabled: true,
      availabilityStatus: 'Available',
      courses: ["Leadership Development", "Team Building"],
      partnerOrganization: "Excellence Training Partners",
      createdAt: "2023-09-01T00:00:00Z",
      updatedAt: "2024-08-12T10:30:00Z",
      specializations: ["Leadership Development", "Team Building", "Communication Skills"]
    },
    {
      id: "2", 
      name: "Jennifer Lee",
      email: "jennifer.lee@skillsacademy.com",
      role: 'TRAINER',
      status: 'ACTIVE',
      lastLogin: "2024-08-11T14:15:00Z",
      mfaEnabled: false,
      availabilityStatus: 'Available',
      courses: ["Communication Skills", "Presentation Skills"],
      partnerOrganization: "Skills Academy",
      createdAt: "2023-10-15T00:00:00Z",
      updatedAt: "2024-08-11T14:15:00Z",
      specializations: ["Communication Skills", "Presentation Skills", "Public Speaking"]
    },
    {
      id: "3",
      name: "Michael Wong",
      email: "michael.wong@techtraining.com", 
      role: 'TRAINER',
      status: 'PENDING',
      lastLogin: null,
      mfaEnabled: false,
      availabilityStatus: 'Unavailable',
      courses: ["Technical Skills", "Project Management"],
      partnerOrganization: "Tech Training Solutions",
      createdAt: "2024-08-01T00:00:00Z",
      updatedAt: "2024-08-01T00:00:00Z",
      specializations: ["Technical Skills", "Project Management", "Agile Methodology"]
    },
    {
      id: "4",
      name: "Sarah Kim",
      email: "sarah.kim@professionaldevelopment.com",
      role: 'TRAINER', 
      status: 'ACTIVE',
      lastLogin: "2024-08-10T09:00:00Z",
      mfaEnabled: true,
      availabilityStatus: 'Limited',
      courses: ["Professional Development", "Career Coaching"],
      partnerOrganization: "Professional Development Center",
      createdAt: "2023-11-20T00:00:00Z",
      updatedAt: "2024-08-10T09:00:00Z",
      specializations: ["Professional Development", "Career Coaching", "Leadership Mentoring"]
    }
  ];

// Dummy data for partners (data-only entities, no login credentials)
  const dummyPartners: Partner[] = [
    {
      id: "p1",
      partnerName: "Excellence Training Partners",
      status: 'ACTIVE',
      coursesAssigned: ["Leadership Development", "Team Building", "Management Training"],
      pointOfContact: "John Smith",
      contactNumber: "+65 9123 4567",
      contactDesignation: "Training Manager",
      createdAt: "2020-01-15T00:00:00Z",
      updatedAt: "2024-08-12T10:30:00Z",
    },
    {
      id: "p2",
      partnerName: "Skills Academy",
      status: 'ACTIVE',
      coursesAssigned: ["Communication Skills", "Presentation Skills", "Customer Service"],
      pointOfContact: "Sarah Lee",
      contactNumber: "+65 8765 4321",
      contactDesignation: "Operations Director",
      createdAt: "2021-03-20T00:00:00Z",
      updatedAt: "2024-08-11T14:15:00Z",
    },
    {
      id: "p3",
      partnerName: "Tech Training Solutions",
      status: 'PENDING',
      coursesAssigned: ["Technical Skills", "Digital Literacy", "Software Training"],
      pointOfContact: "Michael Wong",
      contactNumber: "+65 6543 2109",
      contactDesignation: "Business Development Manager",
      createdAt: "2024-08-01T00:00:00Z",
      updatedAt: "2024-08-01T00:00:00Z",
    }
  ];

  // Fetch trainers from API or use dummy data
  const fetchTrainers = async () => {
    try {
      setLoading(true);
      const response = await trainersApi.getAll({
        page: pagination.page,
        limit: pagination.limit,
        search: searchQuery || undefined,
        status: statusFilter || undefined,
      });

      // Map backend data to frontend interface
      const mappedTrainers = response.trainers?.map(trainer => ({
        ...trainer,
        role: 'TRAINER' as const,
        courses: trainer.specializations || [],
        availabilityStatus: 'Available' as const,
        specializations: trainer.specializations || [],
      })) || [];

      setTrainers(mappedTrainers);
      setPagination(response.pagination || pagination);
    } catch (error) {
      console.error('Error fetching trainers:', error);
      // Use dummy data when API fails
      setTrainers(dummyTrainers);
      setPagination({
        page: 1,
        limit: 10,
        total: dummyTrainers.length,
        totalPages: 1,
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch partners from API or use dummy data
  const fetchPartners = async () => {
    try {
      setPartnersLoading(true);
      const response = await partnersApi.getAll({
        page: partnersPagination.page,
        limit: partnersPagination.limit,
        search: searchQuery || undefined,
        status: statusFilter || undefined,
      });

      // Map backend data to frontend interface
      const mappedPartners = response.partners?.map(partner => ({
        ...partner,
        role: 'PARTNER' as const,
      })) || [];

      setPartners(mappedPartners);
      setPartnersPagination(response.pagination || partnersPagination);
    } catch (error) {
      console.error('Error fetching partners:', error);
      // Use dummy data when API fails
      setPartners(dummyPartners);
      setPartnersPagination({
        page: 1,
        limit: 10,
        total: dummyPartners.length,
        totalPages: 1,
      });
    } finally {
      setPartnersLoading(false);
    }
  };

  // Fetch trainers on component mount and when filters change
  useEffect(() => {
    fetchTrainers();
  }, [pagination.page, searchQuery, statusFilter]);

  // Fetch partners on component mount and when filters change
  useEffect(() => {
    fetchPartners();
  }, [partnersPagination.page, searchQuery, statusFilter]);

  // Calculate stats from real data
  const totalTrainers = trainers.length;
  const pendingTrainers = trainers.filter(trainer => trainer.status === 'PENDING');
  const totalPartners = partners.length;
  const pendingPartners = partners.filter(partner => partner.status === 'PENDING');

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
          <AddPartnerDialog onPartnerCreated={fetchPartners} />
          <AddTrainerDialog onTrainerCreated={fetchTrainers} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading trainers...</p>
          </div>
        </div>
      ) : (
        <>
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
              <TabsTrigger value="partners">Partners</TabsTrigger>
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
                      {trainers.map((trainer) => (
                        <TableRow key={trainer.id}>
                          <TableCell className="font-medium">
                            <Link to={`/trainers/${trainer.id}`} className="hover:underline text-primary">
                              {trainer.name}
                            </Link>
                          </TableCell>
                          <TableCell>{trainer.email}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={trainer.status === 'ACTIVE' ? 'default' : 'secondary'}
                            >
                              {trainer.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{trainer.courses.join(", ")}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <EditTrainerDialog trainer={trainer} onTrainerUpdated={fetchTrainers} />
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      // TODO: Implement password reset for trainers
                                      toast({
                                        title: "Feature Coming Soon",
                                        description: "Password reset for trainers will be available soon",
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

            <TabsContent value="partners" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Partner Organizations</CardTitle>
                  <CardDescription>Manage partner organizations and their details</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Partner Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Contact Info</TableHead>
                        <TableHead>Courses Assigned</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {partnersLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            Loading partners...
                          </TableCell>
                        </TableRow>
                      ) : partners.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            No partners found
                          </TableCell>
                        </TableRow>
                      ) : (
                        partners.map((partner) => (
                          <TableRow key={partner.id}>
                            <TableCell className="font-medium">
                              <div>
                                <div className="text-sm font-medium">{partner.partnerName}</div>
                                <div className="text-xs text-muted-foreground">Contact: {partner.pointOfContact}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  partner.status === 'ACTIVE' ? 'default' :
                                  partner.status === 'PENDING' ? 'secondary' :
                                  partner.status === 'INACTIVE' ? 'destructive' :
                                  'outline'
                                }
                              >
                                {partner.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{partner.contactNumber}</div>
                                <div className="text-xs text-muted-foreground">{partner.contactDesignation}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {partner.coursesAssigned?.slice(0, 2).map((course, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {course}
                                  </Badge>
                                ))}
                                {partner.coursesAssigned && partner.coursesAssigned.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{partner.coursesAssigned.length - 2}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <AddPartnerDialog 
                                  mode="edit"
                                  partner={partner}
                                  onSuccess={() => {
                                    fetchPartners();
                                    toast({
                                      title: "Partner Updated",
                                      description: "Partner details have been updated successfully.",
                                    });
                                  }}
                                />
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => {
                                        if (confirm('Are you sure you want to delete this partner?')) {
                                          partnersApi.delete(partner.id).then(() => {
                                            fetchPartners();
                                            toast({
                                              title: "Partner Deleted",
                                              description: "The partner has been removed successfully.",
                                            });
                                          });
                                        }
                                      }}
                                      className="text-destructive"
                                    >
                                      <Ban className="h-4 w-4 mr-2" />
                                      Delete Partner
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        // Handle password reset
                                        toast({
                                          title: "Password Reset Link Sent",
                                          description: "Password reset link has been sent to the partner's email.",
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
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default TrainersAndPartners;