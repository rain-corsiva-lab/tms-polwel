import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, BookOpen, Eye, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { clientOrganizationsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/date";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import PaginationControls from "@/components/ui/pagination";

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
  const [inProgressRuns, setInProgressRuns] = useState<CourseRun[]>([]);
  const [completedRuns, setCompletedRuns] = useState<CourseRun[]>([]);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [learnersPagination, setLearnersPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [learnersPerPage, setLearnersPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState("details");

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
      setInProgressRuns(courseRunsData.inProgress || []);
      setCompletedRuns(courseRunsData.completed || []);
    } catch (error: any) {
      toast({
        title: "Error loading dashboard",
        description: error.message || "Failed to load organization data",
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
        title: "Error loading learners",
        description: error.message || "Failed to load learners",
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
                <p className="text-sm font-medium text-muted-foreground">Total Learners</p>
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
          <TabsTrigger value="learners">Learners</TabsTrigger>
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
            <CardContent>
              {inProgressRuns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No courses in progress</div>
              ) : (
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
                    {inProgressRuns.map((run) => (
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
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                <CardTitle>Completed Course Runs ({completedRuns.length})</CardTitle>
              </div>
              <CardDescription>Finished training programs with learner details</CardDescription>
            </CardHeader>
            <CardContent>
              {completedRuns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No completed courses</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course Name</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Participants</TableHead>
                      <TableHead>Status</TableHead>
                      {/* <TableHead className="text-right">Actions</TableHead> */}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedRuns.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell className="font-medium">{run.courseName}</TableCell>
                        <TableCell>{formatDate(run.startDate)}</TableCell>
                        <TableCell>{formatDate(run.endDate)}</TableCell>
                        <TableCell>{run.participants}</TableCell>
                        <TableCell>{getStatusBadge(run.status)}</TableCell>
                        {/* <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/course-runs/${run.id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </TableCell> */}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="learners" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <CardTitle>Learners ({totalLearners})</CardTitle>
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
                        <TableHead>Department</TableHead>
                        <TableHead>Enrolled</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead>Status</TableHead>
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
                          <TableCell>{getStatusBadge(learner.status)}</TableCell>
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
    </div>
  );
};

export default OrganizationDashboard;
