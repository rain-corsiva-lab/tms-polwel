import { useState, useEffect } from "react";
import PaginationControls from "@/components/ui/pagination";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "../lib/date";
import SafeDropdownMenu from "@/components/ui/safe-dropdown-menu";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Swal from "sweetalert2";
import {
  Download,
  Filter,
  GraduationCap,
  Calendar,
  Ban,
  MoreHorizontal,
  Edit,
  Mail,
  Users,
  Clock,
  ChevronDown,
  ChevronRight,
  X,
  Loader2,
  CheckCircle,
  Trash2,
  RotateCcw,
} from "lucide-react";
import * as XLSX from "xlsx";
import UserTable from "@/components/UserTable";
import { AddTrainerDialog } from "@/components/AddTrainerDialog";
import { AddPartnerDialog } from "@/components/AddPartnerDialog";
import { EditTrainerDialog } from "@/components/EditTrainerDialog";
import TrainingCalendar from "@/components/TrainingCalendar";
import StatsCard from "@/components/StatsCard";
import { useToast } from "@/hooks/use-toast";
import { trainersApi, partnersApi, polwelUsersApi } from "@/lib/api";

// Enhanced user data structure for Trainers
interface Trainer {
  id: string;
  name: string;
  email: string;
  role: "TRAINER";
  status: "ACTIVE" | "INACTIVE" | "PENDING" | "LOCKED";
  lastLogin: string | null;
  passwordExpiry?: string;
  failedLoginAttempts?: number;
  contactNumber?: string;
  courses: string[];
  partnerOrganization: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  specializations?: string[];
}

// Enhanced data structure for Partners (data-only, not user accounts)
interface Partner {
  id: string;
  partnerName: string;
  status: "ACTIVE" | "INACTIVE" | "PENDING" | "LOCKED";
  coursesAssigned: string[];
  pointOfContact: string;
  contactNumber: string;
  contactDesignation: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  onboardingDate?: string;
  notes?: string;
}

interface TrainerBlockout {
  id: string;
  trainerId: string;
  trainerName: string;
  date: string;
  reason: string;
  // legacy 'type' removed; use optional 'remarks' instead
  remarks?: string;
  description?: string;
}

const TrainersAndPartners = () => {
  const [activeTab, setActiveTab] = useState("trainers");
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const [deletedTrainers, setDeletedTrainers] = useState<Trainer[]>([]);
  const [deletedPartners, setDeletedPartners] = useState<Partner[]>([]);
  const [exporting, setExporting] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [perPage, setPerPage] = useState(10);
  const [partnersPagination, setPartnersPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [partnersPerPage, setPartnersPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [trainerBlockouts, setTrainerBlockouts] = useState<TrainerBlockout[]>([]);
  const [isPendingOpen, setIsPendingOpen] = useState(false);

  // Sorting state for trainers
  const [trainerSortField, setTrainerSortField] = useState<keyof Trainer | null>(null);
  const [trainerSortDirection, setTrainerSortDirection] = useState<"asc" | "desc">("asc");

  // Sorting state for partners
  const [partnerSortField, setPartnerSortField] = useState<keyof Partner | null>(null);
  const [partnerSortDirection, setPartnerSortDirection] = useState<"asc" | "desc">("asc");

  const { toast } = useToast();

  // Dummy data for trainers
  const dummyTrainers: Trainer[] = [
    {
      id: "1",
      name: "David Chen",
      email: "david.chen@training.com",
      role: "TRAINER",
      status: "ACTIVE",
      lastLogin: "2024-08-12T10:30:00Z",
      // mfaRemoved
      contactNumber: "+65 9123 4567",
      courses: ["Leadership Development", "Team Building"],
      partnerOrganization: "Excellence Training Partners",
      createdAt: "2023-09-01T00:00:00Z",
      updatedAt: "2024-08-12T10:30:00Z",
      specializations: ["Leadership Development", "Team Building", "Communication Skills"],
    },
    {
      id: "2",
      name: "Jennifer Lee",
      email: "jennifer.lee@skillsacademy.com",
      role: "TRAINER",
      status: "ACTIVE",
      lastLogin: "2024-08-11T14:15:00Z",
      // mfaRemoved
      contactNumber: "+65 8765 4321",
      courses: ["Communication Skills", "Presentation Skills"],
      partnerOrganization: "Skills Academy",
      createdAt: "2023-10-15T00:00:00Z",
      updatedAt: "2024-08-11T14:15:00Z",
      specializations: ["Communication Skills", "Presentation Skills", "Public Speaking"],
    },
    {
      id: "3",
      name: "Michael Wong",
      email: "michael.wong@techtraining.com",
      role: "TRAINER",
      status: "PENDING",
      lastLogin: null,
      // mfaRemoved
      contactNumber: "+65 6543 2109",
      courses: ["Technical Skills", "Project Management"],
      partnerOrganization: "Tech Training Solutions",
      createdAt: "2024-08-01T00:00:00Z",
      updatedAt: "2024-08-01T00:00:00Z",
      specializations: ["Technical Skills", "Project Management", "Agile Methodology"],
    },
    {
      id: "4",
      name: "Sarah Kim",
      email: "sarah.kim@professionaldevelopment.com",
      role: "TRAINER",
      status: "ACTIVE",
      lastLogin: "2024-08-10T09:00:00Z",
      // mfaRemoved
      contactNumber: "+65 6555 1234",
      courses: ["Professional Development", "Career Coaching"],
      partnerOrganization: "Professional Development Center",
      createdAt: "2023-11-20T00:00:00Z",
      updatedAt: "2024-08-10T09:00:00Z",
      specializations: ["Professional Development", "Career Coaching", "Leadership Mentoring"],
    },
  ];

  // Dummy data for partners (data-only entities, no login credentials)
  const dummyPartners: Partner[] = [
    {
      id: "p1",
      partnerName: "Excellence Training Partners",
      status: "ACTIVE",
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
      status: "ACTIVE",
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
      status: "PENDING",
      coursesAssigned: ["Technical Skills", "Digital Literacy", "Software Training"],
      pointOfContact: "Michael Wong",
      contactNumber: "+65 6543 2109",
      contactDesignation: "Business Development Manager",
      createdAt: "2024-08-01T00:00:00Z",
      updatedAt: "2024-08-01T00:00:00Z",
    },
  ];

  // Fetch trainers from API or use dummy data
  const fetchTrainers = async (pageArg?: number, limitArg?: number) => {
    try {
      setLoading(true);
      const pageToUse = pageArg ?? pagination.page;
      const limitToUse = limitArg ?? perPage;
      const response = await trainersApi.getAll({
        page: pageToUse,
        limit: limitToUse,
        search: searchQuery || undefined,
        status: statusFilter || undefined,
      });

      // Map backend data to frontend interface
      const mappedTrainers =
        response.trainers?.map((trainer) => ({
          ...trainer,
          role: "TRAINER" as const,
          courses: trainer.specializations || [],
          contactNumber: trainer.contactNumber || undefined,
          specializations: trainer.specializations || [],
        })) || [];

      // Default sort by updatedAt desc
      mappedTrainers.sort((a: any, b: any) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());

      setTrainers(mappedTrainers);
      setPagination(response.pagination || { ...pagination, limit: limitToUse, page: pageToUse });
    } catch (error) {
      console.error("Error fetching trainers:", error);
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
  const fetchPartners = async (pageArg?: number, limitArg?: number) => {
    try {
      setPartnersLoading(true);
      const pageToUse = pageArg ?? partnersPagination.page;
      const limitToUse = limitArg ?? partnersPerPage;
      const response = await partnersApi.getAll({
        page: pageToUse,
        limit: limitToUse,
        search: searchQuery || undefined,
        status: statusFilter || "all",
      });

      // Map backend data to frontend interface
      const mappedPartners = response.partners?.map((partner) => ({ ...partner, role: "PARTNER" as const })) || [];

      // Default sort by updatedAt desc
      mappedPartners.sort((a: any, b: any) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());

      setPartners(mappedPartners);
      setPartnersPagination(response.pagination || { ...partnersPagination, limit: limitToUse, page: pageToUse });
    } catch (error) {
      console.error("Error fetching partners:", error);
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

  // When perPage changes, reset to page 1 so the new limit is applied immediately
  useEffect(() => {
    // reset to page 1 and immediately fetch with new limit
    setPagination((p) => ({ ...p, page: 1 }));
    fetchTrainers(1, perPage);
  }, [perPage]);

  // Fetch partners on component mount and when filters change
  useEffect(() => {
    fetchPartners();
  }, [partnersPagination.page, searchQuery, statusFilter]);

  // When partnersPerPage changes, reset partners page to 1 so the new limit is applied immediately
  useEffect(() => {
    // reset to page 1 and immediately fetch with new limit
    setPartnersPagination((p) => ({ ...p, page: 1 }));
    fetchPartners(1, partnersPerPage);
  }, [partnersPerPage]);

  // Calculate stats from pagination totals (reflects database totals, not just current page)
  const totalTrainers = pagination.total || 0;
  const totalPartners = partnersPagination.total || 0;
  // Keep pending trainers as array filter for the dialog display
  const pendingTrainers = trainers.filter((trainer) => trainer.status === "PENDING");

  const handleTrainerBlockoutAdd = (blockout: Omit<TrainerBlockout, "id">) => {
    const newBlockout = {
      ...blockout,
      id: Date.now().toString(),
    };
    setTrainerBlockouts((prev) => [...prev, newBlockout]);
    toast({
      title: "Trainer Blocked Out",
      description: `${blockout.trainerName} has been blocked out for ${blockout.date}`,
    });
  };

  const handleTrainerBlockoutRemove = (blockoutId: string) => {
    setTrainerBlockouts((prev) => prev.filter((b) => b.id !== blockoutId));
    toast({
      title: "Trainer Blockout Removed",
      description: "The trainer blockout has been removed",
    });
  };

  // Delete trainer handler
  const handleDeleteTrainer = async (trainerId: string, trainerName: string) => {
    const result = await Swal.fire({
      title: "Delete Trainer?",
      text: `Are you sure you want to delete "${trainerName}"? This action can be undone from the Deleted tab.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        await trainersApi.delete(trainerId);
        toast({
          title: "Trainer Deleted",
          description: `${trainerName} has been deleted successfully`,
        });
        fetchTrainers(); // Refresh list
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete trainer",
          variant: "destructive",
        });
      }
    }
  };

  // Delete partner handler
  const handleDeletePartner = async (partnerId: string, partnerName: string) => {
    const result = await Swal.fire({
      title: "Delete Partner?",
      text: `Are you sure you want to delete "${partnerName}"? This action can be undone from the Deleted tab.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        await partnersApi.delete(partnerId);
        toast({
          title: "Partner Deleted",
          description: `${partnerName} has been deleted successfully`,
        });
        fetchPartners(); // Refresh list
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete partner",
          variant: "destructive",
        });
      }
    }
  };

  // Fetch deleted trainers and partners
  const fetchDeleted = async () => {
    try {
      const [deletedTrainersResponse, deletedPartnersResponse] = await Promise.all([trainersApi.getDeleted(), partnersApi.getDeleted()]);

      const mappedDeletedTrainers =
        deletedTrainersResponse.trainers?.map((trainer: any) => ({
          ...trainer,
          role: "TRAINER" as const,
          courses: trainer.specializations || [],
        })) || [];

      const mappedDeletedPartners =
        deletedPartnersResponse.partners?.map((partner: any) => ({
          ...partner,
          role: "PARTNER" as const,
        })) || [];

      setDeletedTrainers(mappedDeletedTrainers);
      setDeletedPartners(mappedDeletedPartners);
    } catch (error) {
      console.error("Error fetching deleted items:", error);
    }
  };

  // Restore trainer handler
  const handleRestoreTrainer = async (trainerId: string, trainerName: string) => {
    try {
      await trainersApi.restore(trainerId);
      toast({
        title: "Trainer Restored",
        description: `${trainerName} has been restored successfully`,
      });
      fetchDeleted();
      fetchTrainers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to restore trainer",
        variant: "destructive",
      });
    }
  };

  // Restore partner handler
  const handleRestorePartner = async (partnerId: string, partnerName: string) => {
    try {
      await partnersApi.restore(partnerId);
      toast({
        title: "Partner Restored",
        description: `${partnerName} has been restored successfully`,
      });
      fetchDeleted();
      fetchPartners();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to restore partner",
        variant: "destructive",
      });
    }
  };

  // Fetch deleted data when Deleted tab is active
  useEffect(() => {
    if (activeTab === "deleted") {
      fetchDeleted();
    }
  }, [activeTab]);

  // Sorting handlers for trainers
  const handleTrainerSort = (field: keyof Trainer) => {
    if (trainerSortField === field) {
      setTrainerSortDirection(trainerSortDirection === "asc" ? "desc" : "asc");
    } else {
      setTrainerSortField(field);
      setTrainerSortDirection("asc");
    }
  };

  const renderTrainerSortIcon = (field: keyof Trainer) => {
    if (trainerSortField !== field) {
      return <span className="ml-1 text-muted-foreground opacity-50">⇅</span>;
    }
    return trainerSortDirection === "asc" ? <span className="ml-1">↑</span> : <span className="ml-1">↓</span>;
  };

  // Sorting handlers for partners
  const handlePartnerSort = (field: keyof Partner) => {
    if (partnerSortField === field) {
      setPartnerSortDirection(partnerSortDirection === "asc" ? "desc" : "asc");
    } else {
      setPartnerSortField(field);
      setPartnerSortDirection("asc");
    }
  };

  const renderPartnerSortIcon = (field: keyof Partner) => {
    if (partnerSortField !== field) {
      return <span className="ml-1 text-muted-foreground opacity-50">⇅</span>;
    }
    return partnerSortDirection === "asc" ? <span className="ml-1">↑</span> : <span className="ml-1">↓</span>;
  };

  // Apply sorting to trainers
  const sortedTrainers = [...trainers].sort((a, b) => {
    if (!trainerSortField) return 0;

    const aValue = a[trainerSortField];
    const bValue = b[trainerSortField];

    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return trainerSortDirection === "asc" ? 1 : -1;
    if (bValue == null) return trainerSortDirection === "asc" ? -1 : 1;

    if (typeof aValue === "number" && typeof bValue === "number") {
      return trainerSortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }

    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();

    if (aStr < bStr) return trainerSortDirection === "asc" ? -1 : 1;
    if (aStr > bStr) return trainerSortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // Apply sorting to partners
  const sortedPartners = [...partners].sort((a, b) => {
    if (!partnerSortField) return 0;

    const aValue = a[partnerSortField];
    const bValue = b[partnerSortField];

    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return partnerSortDirection === "asc" ? 1 : -1;
    if (bValue == null) return partnerSortDirection === "asc" ? -1 : 1;

    if (typeof aValue === "number" && typeof bValue === "number") {
      return partnerSortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }

    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();

    if (aStr < bStr) return partnerSortDirection === "asc" ? -1 : 1;
    if (aStr > bStr) return partnerSortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const handleExport = async () => {
    try {
      setExporting(true);
      const [trainerResponse, partnerResponse] = await Promise.all([
        trainersApi.getAll({
          search: searchQuery || undefined,
          status: statusFilter || undefined,
          all: true,
        }),
        partnersApi.getAll({
          search: searchQuery || undefined,
          status: statusFilter || "all",
          all: true,
        }),
      ]);

      const trainerRows = (trainerResponse.trainers || []).map((t: any) => ({
        Name: t.name,
        Email: t.email,
        Status: t.status,
        Courses: Array.isArray(t.specializations) ? t.specializations.join("; ") : Array.isArray(t.courses) ? t.courses.join("; ") : "",
        PartnerOrganization: t.partnerOrganization || "",
        CreatedAt: formatDate(t.createdAt),
        UpdatedAt: formatDate(t.updatedAt),
      }));

      const partnerRows = (partnerResponse.partners || []).map((p: any) => ({
        PartnerName: p.partnerName,
        Status: p.status,
        PointOfContact: p.pointOfContact || "",
        ContactNumber: p.contactNumber || "",
        ContactDesignation: p.contactDesignation || "",
        CoursesAssigned: Array.isArray(p.coursesAssigned) ? p.coursesAssigned.join("; ") : "",
        CreatedAt: formatDate(p.createdAt),
        UpdatedAt: formatDate(p.updatedAt),
      }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(trainerRows), "Associate Trainers");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(partnerRows), "Training Partners");
      XLSX.writeFile(wb, "associate_trainers_training_partners.xlsx");
      toast({
        title: "Exported",
        description: `Exported ${trainerRows.length} trainer${trainerRows.length === 1 ? "" : "s"} and ${partnerRows.length} partner${
          partnerRows.length === 1 ? "" : "s"
        }.`,
      });
    } catch (error) {
      console.error("Error exporting trainers/partners:", error);
      toast({
        title: "Export failed",
        description: "We couldn't export the trainers and partners. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="h-6 w-6" />
            Associate Trainers & Training Partners
          </h2>
          <p className="text-muted-foreground">Manage associate trainers and training partners and their availability</p>
        </div>
        <div className="flex space-x-3">
          {/* <Button variant="outline" onClick={() => setFilterOpen((o) => !o)}>
            <Filter className="h-4 w-4 mr-2" />
            {filterOpen ? "Hide Filters" : "Filter"}
          </Button> */}
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            {exporting ? "Exporting..." : "Export"}
          </Button>
          <AddPartnerDialog onPartnerCreated={fetchPartners} />
          <AddTrainerDialog onTrainerCreated={fetchTrainers} />
        </div>
      </div>
      {filterOpen && (
        <Card className="border-dashed mb-4">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPagination((p) => ({ ...p, page: 1 }));
                    setPartnersPagination((p) => ({ ...p, page: 1 }));
                  }}
                  className="h-9 rounded-md border bg-background px-3 py-1 text-sm"
                >
                  <option value="">All</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PENDING">Pending</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="LOCKED">Locked</option>
                </select>
              </div>
              {statusFilter && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setStatusFilter("")} className="text-xs">
                  <X className="h-3 w-3 mr-1" /> Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
                    <p className="text-sm font-medium text-muted-foreground">Total Associate Trainers</p>
                    <p className="text-2xl font-bold text-foreground">{totalTrainers}</p>
                  </div>
                  <div className="p-2 bg-accent rounded-lg">
                    <Users className="h-5 w-5 text-accent-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Training Partners</p>
                    <p className="text-2xl font-bold text-foreground">{totalPartners}</p>
                  </div>
                  <div className="p-2 bg-accent rounded-lg">
                    <Users className="h-5 w-5 text-accent-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pending trainers dialog */}
          {pendingTrainers.length > 0 && (
            <Dialog>
              <DialogTrigger asChild>
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors mt-4">
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
                  <DialogDescription>Trainers who haven't clicked their secure onboarding link</DialogDescription>
                </DialogHeader>
                <div className="mt-4">
                  {pendingTrainers.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {pendingTrainers.map((trainer) => (
                        <div key={trainer.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div>
                            <p className="font-medium text-foreground">{trainer.name}</p>
                            <p className="text-sm text-muted-foreground">{trainer.email}</p>
                            <p className="text-xs text-muted-foreground">Created: {formatDate(trainer.createdAt)}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-warning border-warning">
                              Pending
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await trainersApi.resendSetup(trainer.id);
                                  toast({
                                    title: "Setup Email Sent",
                                    description: `Onboarding email has been resent to ${trainer.name}`,
                                  });
                                } catch (error: any) {
                                  toast({
                                    title: "Failed to Send Email",
                                    description: error.message || "Could not resend setup email. Please try again.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              <Mail className="h-4 w-4 mr-1" />
                              Resend
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No pending trainers</p>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList>
              <TabsTrigger value="trainers">Associate Trainers ({totalTrainers})</TabsTrigger>
              <TabsTrigger value="partners">Training Partners ({totalPartners})</TabsTrigger>
              <TabsTrigger value="deleted">Deleted ({deletedTrainers.length + deletedPartners.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="trainers" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Associate Trainers</CardTitle>
                  <CardDescription>Manage individual trainers and their availability</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead onClick={() => handleTrainerSort("name")} className="cursor-pointer hover:bg-muted transition-colors">
                          Name {renderTrainerSortIcon("name")}
                        </TableHead>
                        <TableHead onClick={() => handleTrainerSort("email")} className="cursor-pointer hover:bg-muted transition-colors">
                          Email {renderTrainerSortIcon("email")}
                        </TableHead>
                        <TableHead onClick={() => handleTrainerSort("status")} className="cursor-pointer hover:bg-muted transition-colors">
                          Status {renderTrainerSortIcon("status")}
                        </TableHead>
                        <TableHead onClick={() => handleTrainerSort("partnerOrganization")} className="cursor-pointer hover:bg-muted transition-colors">
                          Partner Organization {renderTrainerSortIcon("partnerOrganization")}
                        </TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedTrainers.map((trainer) => (
                        <TableRow key={trainer.id}>
                          <TableCell className="font-medium">
                            <Link to={`/trainers/${trainer.id}`} className="hover:underline text-primary">
                              {trainer.name}
                            </Link>
                          </TableCell>
                          <TableCell>{trainer.email}</TableCell>
                          <TableCell>
                            <Badge variant={trainer.status === "ACTIVE" ? "default" : "secondary"}>{trainer.status}</Badge>
                          </TableCell>
                          <TableCell>{trainer.partnerOrganization || "-"}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <EditTrainerDialog trainer={trainer} onTrainerUpdated={fetchTrainers} />
                              <SafeDropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()}>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {trainer.status === "PENDING" && (
                                    <DropdownMenuItem
                                      onClick={async () => {
                                        try {
                                          await trainersApi.resendSetup(trainer.id);
                                          toast({
                                            title: "Setup Email Sent",
                                            description: `Onboarding email has been resent to ${trainer.name}`,
                                          });
                                        } catch (error: any) {
                                          toast({
                                            title: "Failed to Send Email",
                                            description: error.message || "Could not resend setup email. Please try again.",
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
                                        if (!trainer.email) {
                                          throw new Error("Trainer has no email address");
                                        }
                                        await polwelUsersApi.sendPasswordResetLink(trainer.id);
                                        toast({
                                          title: "Password Reset Link Sent",
                                          description: `Password reset link has been sent to ${trainer.email}`,
                                        });
                                      } catch (error: any) {
                                        toast({
                                          title: "Failed to Send Reset",
                                          description: error?.message || "Could not send password reset link. Please try again.",
                                          variant: "destructive",
                                        });
                                      }
                                    }}
                                  >
                                    <Mail className="h-4 w-4 mr-2" />
                                    Send Password Reset Link
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDeleteTrainer(trainer.id, trainer.name)} className="text-red-600">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Trainer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </SafeDropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
                <div className="px-4">
                  <PaginationControls
                    page={pagination.page}
                    perPage={perPage}
                    total={pagination.total}
                    onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
                    onPerPageChange={(pp) => setPerPage(pp)}
                  />
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="partners" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Training Partners</CardTitle>
                  <CardDescription>Manage Training Partners and their details</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead onClick={() => handlePartnerSort("partnerName")} className="cursor-pointer hover:bg-muted transition-colors">
                          Partner Name {renderPartnerSortIcon("partnerName")}
                        </TableHead>
                        <TableHead onClick={() => handlePartnerSort("status")} className="cursor-pointer hover:bg-muted transition-colors">
                          Status {renderPartnerSortIcon("status")}
                        </TableHead>
                        <TableHead onClick={() => handlePartnerSort("contactNumber")} className="cursor-pointer hover:bg-muted transition-colors">
                          Contact Info {renderPartnerSortIcon("contactNumber")}
                        </TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {partnersLoading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8">
                            Loading partners...
                          </TableCell>
                        </TableRow>
                      ) : partners.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8">
                            No partners found
                          </TableCell>
                        </TableRow>
                      ) : (
                        sortedPartners.map((partner) => (
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
                                  partner.status === "ACTIVE"
                                    ? "default"
                                    : partner.status === "PENDING"
                                    ? "secondary"
                                    : partner.status === "INACTIVE"
                                    ? "destructive"
                                    : "outline"
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
                                      onClick={async () => {
                                        const nextStatus = partner.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
                                        try {
                                          await partnersApi.update(partner.id, { status: nextStatus });
                                          await fetchPartners();
                                          toast({
                                            title: `Partner ${nextStatus === "ACTIVE" ? "Activated" : "Deactivated"}`,
                                            description: `${partner.partnerName} is now ${nextStatus.toLowerCase()}.`,
                                          });
                                        } catch (error) {
                                          console.error("Failed to update partner status", error);
                                          toast({ title: "Update failed", description: "Could not change partner status.", variant: "destructive" });
                                        }
                                      }}
                                    >
                                      {partner.status === "ACTIVE" ? (
                                        <>
                                          <Ban className="h-4 w-4 mr-2" />
                                          Mark Inactive
                                        </>
                                      ) : (
                                        <>
                                          <CheckCircle className="h-4 w-4 mr-2" />
                                          Mark Active
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDeletePartner(partner.id, partner.partnerName)} className="text-red-600">
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete Partner
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
                <div className="px-4">
                  <PaginationControls
                    page={partnersPagination.page}
                    perPage={partnersPerPage}
                    total={partnersPagination.total}
                    onPageChange={(p) => setPartnersPagination((prev) => ({ ...prev, page: p }))}
                    onPerPageChange={(pp) => setPartnersPerPage(pp)}
                  />
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="deleted" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Deleted Partners and Trainers</CardTitle>
                  <CardDescription>View and restore deleted trainers and partners</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email / Contact</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Deleted At</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deletedTrainers.length === 0 && deletedPartners.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            No deleted trainers or partners found
                          </TableCell>
                        </TableRow>
                      ) : (
                        <>
                          {deletedTrainers.map((trainer) => (
                            <TableRow key={`trainer-${trainer.id}`}>
                              <TableCell>
                                <Badge variant="outline">Trainer</Badge>
                              </TableCell>
                              <TableCell className="font-medium">{trainer.name}</TableCell>
                              <TableCell>{trainer.email}</TableCell>
                              <TableCell>
                                <Badge variant={trainer.status === "ACTIVE" ? "default" : "secondary"}>{trainer.status}</Badge>
                              </TableCell>
                              <TableCell>{trainer.deletedAt ? formatDate(trainer.deletedAt) : "-"}</TableCell>
                              <TableCell>
                                <Button variant="outline" size="sm" onClick={() => handleRestoreTrainer(trainer.id, trainer.name)}>
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Restore
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {deletedPartners.map((partner) => (
                            <TableRow key={`partner-${partner.id}`}>
                              <TableCell>
                                <Badge variant="outline">Partner</Badge>
                              </TableCell>
                              <TableCell className="font-medium">{partner.partnerName}</TableCell>
                              <TableCell>{partner.contactNumber}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    partner.status === "ACTIVE"
                                      ? "default"
                                      : partner.status === "PENDING"
                                      ? "secondary"
                                      : partner.status === "INACTIVE"
                                      ? "destructive"
                                      : "outline"
                                  }
                                >
                                  {partner.status}
                                </Badge>
                              </TableCell>
                              <TableCell>{partner.deletedAt ? formatDate(partner.deletedAt) : "-"}</TableCell>
                              <TableCell>
                                <Button variant="outline" size="sm" onClick={() => handleRestorePartner(partner.id, partner.partnerName)}>
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Restore
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
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
