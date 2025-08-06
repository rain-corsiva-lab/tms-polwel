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
import { trainersApi } from "@/lib/api";

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
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
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

  // Fetch trainers from API
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
        availabilityStatus: 'Available' as const, // Default, should come from backend
        specializations: trainer.specializations || [],
      })) || [];

      setTrainers(mappedTrainers);
      setPagination(response.pagination || pagination);
    } catch (error) {
      console.error('Error fetching trainers:', error);
      toast({
        title: "Error",
        description: "Failed to load trainers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch trainers on component mount and when filters change
  useEffect(() => {
    fetchTrainers();
  }, [pagination.page, searchQuery, statusFilter]);

  // Calculate stats from real data
  const totalTrainers = trainers.length;
  const pendingTrainers = trainers.filter(trainer => trainer.status === 'PENDING');

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
          <AddPartnerDialog onPartnerCreated={fetchTrainers} />
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
          </Tabs>
        </>
      )}
    </div>
  );
};

export default TrainersAndPartners;