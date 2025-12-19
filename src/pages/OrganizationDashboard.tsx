import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, BookOpen, Eye, Loader2, CalendarIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { clientOrganizationsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/date";
import { getErrorMessage } from "@/lib/errorHandler";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
  const [learnersPagination, setLearnersPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [learnersPerPage, setLearnersPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState("details");

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

  const organizationId = user?.organizationId;

  useEffect(() => {
    if (!hasRole("TRAINING_COORDINATOR") || !organizationId) {
      navigate("/", { replace: true });
      return;
    }
    fetchOrganizationData();
  }, [organizationId]);

  useEffect(() => {
    if (activeTab === "learners" && organizationId) {
      fetchLearners();
    }
  }, [activeTab, organizationId, learnersPagination.page, learnersPerPage]);

  const fetchOrganizationData = async () => {
    if (!organizationId) return;
    try {
      setLoading(true);
      const [orgData, courseRunsData] = await Promise.all([
        clientOrganizationsApi.getById(organizationId),
        clientOrganizationsApi.getCoordinatorCourseRuns(organizationId),
      ]);
      setOrganization(orgData);

      // Combine all course runs and filter by status
      const allRuns = [...(courseRunsData.inProgress || []), ...(courseRunsData.completed || [])];

      // Only "COMPLETED" status goes to completed table
      const completed = allRuns.filter((run) => {
        const statusLower = run.status.toLowerCase();
        return statusLower === "completed" || statusLower === "pending_billing";
      });

      // Everything else goes to in-progress table
      const inProgress = allRuns.filter((run) => {
        const statusLower = run.status.toLowerCase();
        return statusLower !== "completed" && statusLower !== "pending_billing";
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

  const fetchLearners = async () => {
    if (!organizationId) return;
    try {
      const response = await clientOrganizationsApi.getCoordinatorLearners(organizationId, {
        page: learnersPagination.page,
        limit: learnersPerPage,
      });
      setLearners(response.learners || []);
      setLearnersPagination(response.pagination || learnersPagination);
    } catch (error: any) {
      toast({
        title: "Error loading participants",
        description: getErrorMessage(error, "Failed to load participants"),
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes("progress") || statusLower === "ongoing" || statusLower === "in_progress") {
      return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
    }
    if (statusLower === "completed" || statusLower === "pending_billing") {
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
    }
    if (statusLower === "active") {
      return <Badge className="bg-green-100 text-green-800">Active</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
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

  const totalLearners = learnersPagination.total || learners.length;
  const activeLearners = learners.filter((l) => l.status === "ACTIVE").length;
  const completedCourses = completedRuns.length;
  const ongoingCourses = inProgressRuns.length;

  return (
    <div className="pt-[var(--header-height)] p-6 space-y-6">
      <Header />
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{organization.name}</h1>
          {/* <p className="text-muted-foreground">Organisation Details and Training Information</p> */}
        </div>
        {getStatusBadge(organization.status)}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Participants</p>
                <p className="text-3xl font-bold">{totalLearners}</p>
                <p className="text-xs text-muted-foreground mt-1">{activeLearners} currently active</p>
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Organisation Details</TabsTrigger>
          <TabsTrigger value="courses">List of Course Runs</TabsTrigger>
          <TabsTrigger value="learners">Participants</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organisation Information</CardTitle>
              {/* <CardDescription>Basic details and contact information for the Organisation</CardDescription> */}
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
                  <p className="text-sm font-medium text-muted-foreground">Registration Number</p>
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
          </Card>
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
                        <TableHead>Participants</TableHead>
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
                              View Participants
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
                  <CardDescription>Finished training programs with participant details</CardDescription>
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
                        <TableHead>Participants</TableHead>
                        <TableHead>Status</TableHead>
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
                <CardTitle>Participants ({totalLearners})</CardTitle>
              </div>
              <CardDescription>Employees enrolled in training programs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {learners.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No participants found</div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Designation</TableHead>
                        <TableHead>Enrolled</TableHead>
                        <TableHead>Completed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {learners.map((learner) => (
                        <TableRow key={learner.id}>
                          <TableCell className="font-medium">{learner.name}</TableCell>
                          <TableCell>{learner.email}</TableCell>
                          <TableCell>{learner.designation}</TableCell>
                          <TableCell>{learner.enrolledCourses}</TableCell>
                          <TableCell>{learner.completedCourses}</TableCell>
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

      {/* View Participants Dialog */}
      <ViewLearnersDialog
        open={viewLearnersOpen}
        onOpenChange={setViewLearnersOpen}
        courseRunId={selectedCourseRun?.id || ""}
        courseRunData={selectedCourseRun || {}}
      />
    </div>
  );
};

export default OrganizationDashboard;
