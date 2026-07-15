import { useState, useEffect, useMemo } from "react";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, BookOpen, Eye, Loader2, CalendarIcon, Download, FileText, Bell, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { clientOrganizationsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/date";
import { getErrorMessage } from "@/lib/errorHandler";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Autoplay from "embla-carousel-autoplay";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import PaginationControls from "@/components/ui/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import ViewLearnersDialog from "@/components/ViewLearnersDialog";

interface OrganizationData {
  id: string;
  name: string;
  status: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactPerson?: string;
  buNumber?: string;
  organizationType?: string;
}

interface CourseRun {
  id: string;
  courseName: string;
  courseCode?: string;
  startDate: Date | string;
  endDate: Date | string;
  participants: number;
  status: string;
}

interface Learner {
  id: string;
  name: string;
  email: string;
  designation: string;
  status: string;
  enrolledCourses: number;
  completedCourses: number;
  courseName?: string;
  courseStartDate?: string | Date;
  courseEndDate?: string | Date;
}

function getResourceCoverUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http")) return imageUrl;
  const base = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:3001";
  return `${base}${imageUrl}`;
}

const OrganizationDashboard = () => {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [allCourseRuns, setAllCourseRuns] = useState<CourseRun[]>([]);
  const [inProgressRuns, setInProgressRuns] = useState<CourseRun[]>([]);
  const [completedRuns, setCompletedRuns] = useState<CourseRun[]>([]);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [courseRankings, setCourseRankings] = useState<any[]>([]);
  const [divisionRankings, setDivisionRankings] = useState<any[]>([]);
  const [learnersPagination, setLearnersPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [learnersPerPage, setLearnersPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState("details");
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [rankingsLoading, setRankingsLoading] = useState(false);
  const [previewResource, setPreviewResource] = useState<any | null>(null);

  // Pagination for course runs
  const [inProgressPage, setInProgressPage] = useState(1);
  const [inProgressPerPage, setInProgressPerPage] = useState(10);
  const [completedPage, setCompletedPage] = useState(1);
  const [completedPerPage, setCompletedPerPage] = useState(10);

  // Date range filter for completed runs
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  // View learners dialog state
  const [viewLearnersOpen, setViewLearnersOpen] = useState(false);
  const [selectedCourseRun, setSelectedCourseRun] = useState<any>(null);

  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [userOrgs, setUserOrgs] = useState<any[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(false);

  const orgIds = useMemo(() => {
    if (user?.organizationIds && user.organizationIds.length > 0) {
      return user.organizationIds;
    }
    return user?.organizationId ? [user.organizationId] : [];
  }, [user]);

  useEffect(() => {
    const fetchOrgs = async () => {
      if (orgIds.length === 0) return;
      try {
        setOrgsLoading(true);
        const details = await Promise.all(
          orgIds.map(async (id) => {
            try {
              return await clientOrganizationsApi.getById(id);
            } catch (err) {
              console.error(`Failed to fetch org details for ${id}`, err);
              return null;
            }
          })
        );
        const validOrgs = details.filter(Boolean);
        setUserOrgs(validOrgs);
        if (validOrgs.length > 0 && !selectedOrgId) {
          setSelectedOrgId(validOrgs[0].id);
        }
      } catch (err) {
        console.error("Failed to load organizations details", err);
      } finally {
        setOrgsLoading(false);
      }
    };
    fetchOrgs();
  }, [orgIds.join(",")]);

  useEffect(() => {
    if (!hasRole("TRAINING_COORDINATOR") || (!selectedOrgId && orgIds.length === 0)) {
      navigate("/", { replace: true });
      return;
    }
    if (selectedOrgId) {
      fetchOrganizationData(selectedOrgId);
      fetchResources(selectedOrgId);
      fetchRankings(selectedOrgId);
    }
  }, [selectedOrgId]);

  useEffect(() => {
    if (activeTab === "learners" && selectedOrgId) {
      fetchLearners(selectedOrgId);
    }
  }, [activeTab, selectedOrgId, learnersPagination.page, learnersPerPage]);

  const fetchOrganizationData = async (orgId: string) => {
    try {
      setLoading(true);
      const [orgData, courseRunsData] = await Promise.all([
        clientOrganizationsApi.getById(orgId),
        clientOrganizationsApi.getCoordinatorCourseRuns(orgId),
      ]);
      setOrganization(orgData);

      // Combine all course runs and filter by status
      const allRuns = [...(courseRunsData.inProgress || []), ...(courseRunsData.completed || [])];

      // Only "COMPLETED" status goes to completed table
      const completed = allRuns.filter((run) => {
        const statusLower = run.status.toLowerCase();
        return statusLower === "completed" || statusLower === "pending_billing";
      });

      // Everything else (except completed, pending_billing, and cancelled) goes to in-progress table
      const inProgress = allRuns.filter((run) => {
        const statusLower = run.status.toLowerCase();
        return statusLower !== "completed" && statusLower !== "pending_billing" && statusLower !== "cancelled";
      });

      setAllCourseRuns(allRuns);
      setInProgressRuns(inProgress);
      setCompletedRuns(completed);
    } catch (error: any) {
      toast({
        title: "Error loading dashboard",
        description: getErrorMessage(error, "Failed to load organization data"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLearners = async (orgId: string) => {
    try {
      const response = await clientOrganizationsApi.getCoordinatorLearners(orgId, {
        page: learnersPagination.page,
        limit: learnersPerPage,
      });
      setLearners(response.learners || []);
      setLearnersPagination(response.pagination || learnersPagination);
    } catch (error: any) {
      toast({
        title: "Error loading learners",
        description: getErrorMessage(error, "Failed to load learners"),
        variant: "destructive",
      });
    }
  };

  const fetchResources = async (orgId: string) => {
    try {
      setResourcesLoading(true);
      const response = await clientOrganizationsApi.getResources(orgId);
      setResources(response.resources || []);
    } catch (error: any) {
      console.error("Error fetching resources:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to load resources."),
        variant: "destructive",
      });
    } finally {
      setResourcesLoading(false);
    }
  };

  const fetchRankings = async (orgId: string) => {
    try {
      setRankingsLoading(true);
      const [coursesResponse, divisionsResponse] = await Promise.all([
        clientOrganizationsApi.getCoursesByLearnersRanking(orgId),
        clientOrganizationsApi.getDivisionsByLearnersRanking(orgId),
      ]);
      setCourseRankings(coursesResponse.rankings || []);
      setDivisionRankings(divisionsResponse.rankings || []);
    } catch (error: any) {
      console.error("Error fetching rankings:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to load analytics."),
        variant: "destructive",
      });
    } finally {
      setRankingsLoading(false);
    }
  };

  const downloadResourceFile = async (resource: any) => {
    try {
      const url = resource.fileUrl.startsWith("http")
        ? resource.fileUrl
        : `${import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:3001"}${resource.fileUrl}`;

      const token = localStorage.getItem("polwel_access_token");
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = resource.fileName || "resource.pdf";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error("Download error:", error);
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  /** Strip HTML tags from rich-text descriptions */
  const stripHtmlTags = (html: string | null | undefined): string => {
    if (!html) return "";
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  // Helper to check if resource is new (published within last 7 days)
  const isNewResource = (publishedAt: string | Date): boolean => {
    const published = new Date(publishedAt);
    const now = new Date();
    const daysDiff = (now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
  };

  // Count new resources
  const newResourcesCount = resources.filter((r) => r.publishedAt && isNewResource(r.publishedAt)).length;

  const resourceCarouselPlugins = useMemo(() => {
    if (resources.length <= 1) return [];
    return [
      Autoplay({
        delay: 5_000,
        // stopOnInteraction true + stopOnMouseEnter true omits mouseleave in embla-autoplay, so hover never resumes
        stopOnInteraction: false,
        stopOnMouseEnter: true,
      }),
    ];
  }, [resources.length]);

  // Format status label to user-friendly text
  const formatStatusLabel = (status: string): string => {
    const statusMap: Record<string, string> = {
      CONFIRMED_PENDING_CONFIRMATION_EMAILS: "Pending Confirmation emails sent",
      CONFIRMED_PENDING_TA_APPROVAL: "Pending TA",
      IN_PROGRESS: "In Progress",
      PENDING: "Pending",
      CONFIRMED: "Confirmed",
      ACTIVE: "Active",
      PENDING_BILLING: "Pending Billing",
      COMPLETED: "Completed",
      CANCELLED: "Cancelled",
      DRAFT: "Draft",
      INCOMPLETED: "Incomplete",
    };
    return (
      statusMap[status] ||
      status
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase())
    );
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    const statusLabel = formatStatusLabel(status);

    if (statusLower.includes("progress") || statusLower === "ongoing" || statusLower === "in_progress") {
      return <Badge className="bg-blue-100 text-blue-800">{statusLabel}</Badge>;
    }
    if (statusLower === "completed" || statusLower === "pending_billing") {
      return <Badge className="bg-green-100 text-green-800">{statusLabel}</Badge>;
    }
    if (statusLower === "active") {
      return <Badge className="bg-green-100 text-green-800">{statusLabel}</Badge>;
    }
    if (statusLower === "confirmed_pending_ta_approval") {
      return <Badge className="bg-yellow-100 text-yellow-800">{statusLabel}</Badge>;
    }
    if (statusLower === "confirmed_pending_confirmation_emails") {
      return <Badge className="bg-blue-100 text-blue-800">{statusLabel}</Badge>;
    }
    return <Badge variant="secondary">{statusLabel}</Badge>;
  };

  // Filter completed runs by date range
  const filteredCompletedRuns = completedRuns.filter((run) => {
    if (!dateFrom && !dateTo) return true;

    const runStartDate = new Date(run.startDate);
    const runEndDate = new Date(run.endDate);

    if (dateFrom && dateTo) {
      // Check if course run overlaps with the date range
      return (
        (runStartDate >= dateFrom && runStartDate <= dateTo) ||
        (runEndDate >= dateFrom && runEndDate <= dateTo) ||
        (runStartDate <= dateFrom && runEndDate >= dateTo)
      );
    }

    if (dateFrom) {
      return runStartDate >= dateFrom || runEndDate >= dateFrom;
    }

    if (dateTo) {
      return runStartDate <= dateTo || runEndDate <= dateTo;
    }

    return true;
  });

  // Paginate in-progress runs
  const totalInProgressPages = Math.ceil(inProgressRuns.length / inProgressPerPage);
  const paginatedInProgressRuns = inProgressRuns.slice((inProgressPage - 1) * inProgressPerPage, inProgressPage * inProgressPerPage);

  // Paginate completed runs (after filtering)
  const totalCompletedPages = Math.ceil(filteredCompletedRuns.length / completedPerPage);
  const paginatedCompletedRuns = filteredCompletedRuns.slice((completedPage - 1) * completedPerPage, completedPage * completedPerPage);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Organisation not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalLearners = (organization as any).stats?.totalLearners ?? 0;
  const activeLearners = (organization as any).stats?.activeLearners ?? 0;
  const completedCourses = completedRuns.length;
  const ongoingCourses = inProgressRuns.length;

  return (
    <div className="p-6 flex flex-col gap-6">
      <Header />
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{organization.name}</h1>
        </div>
        {getStatusBadge(organization.status)}
      </div>

      {/* Organisation Tabs Selector */}
      {userOrgs.length > 1 && (
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto pb-1">
          {userOrgs.map((org) => (
            <button
              key={org.id}
              onClick={() => setSelectedOrgId(org.id)}
              className={cn(
                "py-2.5 px-4 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap",
                selectedOrgId === org.id
                  ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-slate-200"
              )}
            >
              {org.name}
            </button>
          ))}
        </div>
      )}

      {/* Organisation information */}
      {/* <Card className="bg-white shadow-sm">
        <CardContent className="p-6">
          <h2 className="text-xl font-bold text-foreground mb-6">Organisation Information</h2>
          <div className="space-y-6">
            <div>
              <p className="text-sm font-semibold text-foreground">Organisation Name</p>
              <p className="text-base text-slate-600 mt-1.5">{organization.name}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Business Unit Number</p>
              <p className="text-base text-slate-600 mt-1.5">{organization.buNumber?.trim() || "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card> */}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Learners</p>
                <p className="text-3xl font-bold">{totalLearners}</p>
              </div>
              <div className="p-3 bg-accent rounded-lg">
                <Users className="h-6 w-6 text-accent-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed Courses</p>
                <p className="text-3xl font-bold">{completedCourses}</p>
                <p className="text-xs text-muted-foreground mt-1">{ongoingCourses} ongoing</p>
              </div>
              <div className="p-3 bg-accent rounded-lg">
                <BookOpen className="h-6 w-6 text-accent-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resource Library Section */}
      <Card className="bg-white shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-gray-900">Important Announcements & Resources</CardTitle>
                <CardDescription className="text-sm text-gray-600 mt-0.5">Latest updates and resources from POLWEL Training Management</CardDescription>
              </div>
            </div>
            {newResourcesCount > 0 && <Badge className="bg-blue-600 text-white px-3 py-1 text-sm font-semibold">{newResourcesCount} New</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          {resourcesLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : resources.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-gray-500">No resources available at this time</p>
            </div>
          ) : (
            <div className="relative w-full px-10 sm:px-12">
              <Carousel
                opts={{ align: "start", loop: resources.length > 1 }}
                plugins={resourceCarouselPlugins}
                className="w-full"
              >
                <CarouselContent className="-ml-2 md:-ml-4">
                  {resources.map((resource) => {
                    const isNew = resource.publishedAt && isNewResource(resource.publishedAt);
                    const coverSrc = getResourceCoverUrl(resource.imageUrl);
                    const postedLabel = resource.publishedAt
                      ? `Posted ${new Date(resource.publishedAt).toLocaleDateString("en-SG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}`
                      : "Posted —";
                    const descPlain = resource.description ? stripHtmlTags(resource.description) : "";

                    return (
                      <CarouselItem key={resource.id} className="pl-2 md:pl-4 basis-full">
                        <div className="flex w-full justify-center">
                          {/* Fixed height 500px; max width 1200px (2.5:1) when viewport allows */}
                          <div className="relative h-[500px] w-full max-w-[1400px] rounded-xl overflow-hidden border border-gray-200 shadow-md hover:shadow-lg transition-shadow group">
                            {coverSrc ? (
                              <>
                                <div
                                  className="absolute inset-0 bg-cover bg-center scale-105 group-hover:scale-100 transition-transform duration-500"
                                  style={{ backgroundImage: `url(${coverSrc})` }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/10" />
                              </>
                            ) : (
                              <div className="absolute inset-0 bg-gradient-to-br from-slate-300 via-slate-200 to-slate-400 flex items-center justify-center">
                                <ImageIcon className="h-20 w-20 text-white/70" aria-hidden />
                              </div>
                            )}

                            {isNew && (
                              <Badge className="absolute top-4 right-4 z-20 bg-green-600 text-white px-2 py-0.5 text-xs font-semibold shadow">
                                New
                              </Badge>
                            )}

                            <div className="absolute inset-0 z-10 flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-3 p-4 sm:p-5">
                              <div className="mt-auto w-full max-w-[20rem] sm:w-80 rounded-lg bg-white/80 backdrop-blur-sm border border-white/60 shadow-sm p-3 text-left">
                                <h3 className="text-base sm:text-lg font-bold text-gray-900 uppercase tracking-tight leading-snug">
                                  {resource.title}
                                </h3>
                                <p className="text-sm text-gray-600 mt-1.5">{postedLabel}</p>
                                {descPlain ? (
                                  <p className="text-sm text-gray-700 mt-2 line-clamp-3 leading-relaxed">{descPlain}</p>
                                ) : (
                                  <p className="text-sm text-gray-400 mt-2 italic">No description</p>
                                )}
                              </div>

                              <div className="mt-auto sm:mt-0 flex gap-2 shrink-0 self-end sm:self-end rounded-lg bg-white/80 backdrop-blur-sm border border-white/60 shadow-sm p-1">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="secondary"
                                  className="h-10 w-10 bg-white/80 hover:bg-gray-100 text-gray-900 border border-gray-200"
                                  title="Download PDF"
                                  onClick={() => downloadResourceFile(resource)}
                                >
                                  <Download className="h-5 w-5" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="secondary"
                                  className="h-10 w-10 bg-white/80 hover:bg-gray-100 text-gray-900 border border-gray-200"
                                  title="Preview PDF"
                                  onClick={() => setPreviewResource(resource)}
                                >
                                  <Eye className="h-5 w-5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CarouselItem>
                    );
                  })}
                </CarouselContent>
                <CarouselPrevious className="left-0 border-gray-300" />
                <CarouselNext className="right-0 border-gray-300" />
              </Carousel>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Organisation Analytics</TabsTrigger>
          <TabsTrigger value="courses">List of Course Runs</TabsTrigger>
          <TabsTrigger value="learners">All Learners</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          {/* <Card>
            <CardHeader>
              <CardTitle>Organisation Information</CardTitle>
             
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Organisation Name</p>
                  <p className="mt-1">{organization.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Address</p>
                  <p className="mt-1">{organization.address || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Industry</p>
                  <p className="mt-1">{organization.organizationType || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">ULTF Number</p>
                  <p className="mt-1">{organization.buNumber || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Website</p>
                  <p className="mt-1 text-muted-foreground">—</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">GST Number</p>
                  <p className="mt-1 text-muted-foreground">—</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="mt-1">{organization.contactEmail || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Account Manager</p>
                  <p className="mt-1">{organization.contactPerson || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p className="mt-1">{organization.contactPhone || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Payment Terms</p>
                  <p className="mt-1 text-muted-foreground">—</p>
                </div>
              </div>
            </CardContent>
          </Card> */}

          {/* Analytics Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Courses Ranked by Number of Learners */}
            <Card className="border-orange-200">
              <CardHeader className="bg-orange-50 border-b border-orange-200">
                <CardTitle className="text-orange-900 flex items-center space-x-2">
                  <span>📚</span>
                  <span>Courses Ranked by Number of Learners</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {rankingsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                  </div>
                ) : courseRankings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No course enrollment data available</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-orange-50/50">
                        <TableHead className="w-16 text-center">Rank</TableHead>
                        <TableHead>Course Name</TableHead>
                        <TableHead className="w-32 text-center">Number of Learners</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {courseRankings.map((item) => (
                        <TableRow key={item.rank} className="hover:bg-orange-50/30">
                          <TableCell className="text-center font-semibold text-orange-700">{item.rank}</TableCell>
                          <TableCell className="font-medium">{item.courseName}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="bg-orange-100 text-orange-900">
                              {item.numberOfLearners}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Divisions Ranked by Number of Learners */}
            <Card className="border-green-200">
              <CardHeader className="bg-green-50 border-b border-green-200">
                <CardTitle className="text-green-900 flex items-center space-x-2">
                  <span>🏢</span>
                  <span>Divisions Ranked by Number of Learners</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {rankingsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                  </div>
                ) : divisionRankings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No division data available</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-green-50/50">
                        <TableHead className="w-16 text-center">Rank</TableHead>
                        <TableHead>Division / Department</TableHead>
                        <TableHead className="w-32 text-center">Number of Learners</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {divisionRankings.map((item) => (
                        <TableRow key={item.rank} className="hover:bg-green-50/30">
                          <TableCell className="text-center font-semibold text-green-700">{item.rank}</TableCell>
                          <TableCell className="font-medium">{item.divisionDepartment}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="bg-green-100 text-green-900">
                              {item.numberOfLearners}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="courses" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                <CardTitle>In Progress Course Runs ({inProgressRuns.length})</CardTitle>
              </div>
              <CardDescription>Currently ongoing training programs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {inProgressRuns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No courses in progress</div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course Name</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Learners</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedInProgressRuns.map((run) => (
                        <TableRow key={run.id}>
                          <TableCell className="font-medium">{run.courseName}</TableCell>
                          <TableCell>{formatDate(run.startDate)}</TableCell>
                          <TableCell>{formatDate(run.endDate)}</TableCell>
                          <TableCell>{run.participants}</TableCell>
                          <TableCell>{getStatusBadge(run.status)}</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => {
                                setSelectedCourseRun(run);
                                setViewLearnersOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                              View Learners
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <PaginationControls
                    page={inProgressPage}
                    perPage={inProgressPerPage}
                    total={inProgressRuns.length}
                    onPageChange={setInProgressPage}
                    onPerPageChange={(pp) => {
                      setInProgressPerPage(pp);
                      setInProgressPage(1);
                    }}
                  />
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    <CardTitle>Completed Course Runs ({filteredCompletedRuns.length})</CardTitle>
                  </div>
                  <CardDescription>Finished training programs with learner details</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFrom ? format(dateFrom, "MMM dd, yyyy") : "Start Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <span className="text-muted-foreground">to</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateTo ? format(dateTo, "MMM dd, yyyy") : "End Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                    </PopoverContent>
                  </Popover>
                  {(dateFrom || dateTo) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDateFrom(undefined);
                        setDateTo(undefined);
                        setCompletedPage(1);
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredCompletedRuns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {completedRuns.length === 0 ? "No completed courses" : "No courses found in selected date range"}
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course Name</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Learners</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedCompletedRuns.map((run) => (
                        <TableRow key={run.id}>
                          <TableCell className="font-medium">{run.courseName}</TableCell>
                          <TableCell>{formatDate(run.startDate)}</TableCell>
                          <TableCell>{formatDate(run.endDate)}</TableCell>
                          <TableCell>{run.participants}</TableCell>
                          <TableCell>{getStatusBadge(run.status)}</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => {
                                setSelectedCourseRun(run);
                                setViewLearnersOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                              View Learners
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <PaginationControls
                    page={completedPage}
                    perPage={completedPerPage}
                    total={filteredCompletedRuns.length}
                    onPageChange={setCompletedPage}
                    onPerPageChange={(pp) => {
                      setCompletedPerPage(pp);
                      setCompletedPage(1);
                    }}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="learners" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <CardTitle>All Learners ({totalLearners})</CardTitle>
              </div>
              <CardDescription>Employees enrolled in training programs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {learners.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No learners found</div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Contact</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {learners.map((learner) => (
                        <TableRow key={learner.id}>
                          <TableCell className="font-medium">{learner.name}</TableCell>
                          <TableCell>{learner.email}</TableCell>
                          <TableCell>{(learner as any).contact || "N/A"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <PaginationControls
                    page={learnersPagination.page}
                    perPage={learnersPerPage}
                    total={learnersPagination.total}
                    onPageChange={(p) => setLearnersPagination((prev) => ({ ...prev, page: p }))}
                    onPerPageChange={(pp) => {
                      setLearnersPerPage(pp);
                      setLearnersPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Learners Dialog */}
      <ViewLearnersDialog
        open={viewLearnersOpen}
        onOpenChange={setViewLearnersOpen}
        courseRunId={selectedCourseRun?.id || ""}
        courseRunData={selectedCourseRun || {}}
        displayStatusOverride={selectedCourseRun?.status}
      />

      {/* Resource Preview Dialog */}
      <Dialog open={!!previewResource} onOpenChange={() => setPreviewResource(null)}>
        <DialogContent className="max-w-6xl max-h-[95vh] min-w-[90vw] md:min-w-[800px] p-0 overflow-y-auto">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>{previewResource?.title}</DialogTitle>
            <DialogDescription>{previewResource?.description ? stripHtmlTags(previewResource.description) : "Resource preview"}</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-4">
            {previewResource && (
              <div className="flex flex-col space-y-4">
                <div className="border rounded-lg p-4 bg-muted/30 flex-shrink-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">File Name:</span>
                      <p className="text-muted-foreground break-words">{previewResource.fileName}</p>
                    </div>
                    <div>
                      <span className="font-medium">Published:</span>
                      <p className="text-muted-foreground">{previewResource.publishedAt && new Date(previewResource.publishedAt).toLocaleDateString()}</p>
                    </div>
                    {previewResource.uploader && (
                      <div>
                        <span className="font-medium">Uploaded By:</span>
                        <p className="text-muted-foreground">{previewResource.uploader.name}</p>
                      </div>
                    )}
                    {previewResource.fileSize && (
                      <div>
                        <span className="font-medium">File Size:</span>
                        <p className="text-muted-foreground">{(previewResource.fileSize / 1024).toFixed(2)} KB</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t flex gap-2">
                    <Button
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={async () => {
                        try {
                          const url = previewResource.fileUrl.startsWith("http")
                            ? previewResource.fileUrl
                            : `${import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:3001"}${previewResource.fileUrl}`;

                          // Fetch file as blob
                          const token = localStorage.getItem("polwel_access_token");
                          const response = await fetch(url, {
                            headers: token ? { Authorization: `Bearer ${token}` } : {},
                          });

                          if (!response.ok) throw new Error("Failed to download file");

                          const blob = await response.blob();
                          const downloadUrl = window.URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = downloadUrl;
                          a.download = previewResource.fileName || "resource.pdf";
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(downloadUrl);
                          document.body.removeChild(a);
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to download file",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                </div>

                {previewResource.mimeType === "application/pdf" ? (
                  <div className="border rounded-lg overflow-hidden bg-gray-100" style={{ minHeight: "600px", height: "1200px" }}>
                    <iframe
                      src={
                        previewResource.fileUrl.startsWith("http")
                          ? previewResource.fileUrl
                          : `${import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:3001"}${previewResource.fileUrl}`
                      }
                      className="w-full h-full border-0"
                      title={previewResource.title}
                    />
                  </div>
                ) : (
                  <div className="text-center py-8 border rounded-lg flex-shrink-0">
                    <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">Preview not available for this file type</p>
                    <Button
                      onClick={async () => {
                        try {
                          const url = previewResource.fileUrl.startsWith("http")
                            ? previewResource.fileUrl
                            : `${import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:3001"}${previewResource.fileUrl}`;

                          const token = localStorage.getItem("polwel_access_token");
                          const response = await fetch(url, {
                            headers: token ? { Authorization: `Bearer ${token}` } : {},
                          });

                          if (!response.ok) throw new Error("Failed to download file");

                          const blob = await response.blob();
                          const downloadUrl = window.URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = downloadUrl;
                          a.download = previewResource.fileName || "resource";
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(downloadUrl);
                          document.body.removeChild(a);
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to download file",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download File
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrganizationDashboard;
