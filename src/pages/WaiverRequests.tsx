import React, { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PaginationControls from "@/components/ui/pagination";
import { waiversApi, clientOrganizationsApi, coursesApi } from "@/lib/api";
import { WaiverDetailsDialog } from "@/components/WaiverDetailsDialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, FileText, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Can } from "@/lib/casl/Can";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WaiverRequest {
  id: string;
  courseRunId: string;
  learnerId: string;
  learnerName: string;
  learnerEmail: string;
  organization: {
    id: string;
    name: string;
    type: string;
  } | null;
  courseName: string;
  courseCode: string | null;
  courseCategory: string | null;
  courseRunStartDate: string | null;
  courseRunEndDate: string | null;
  waiverReason: string;
  waiverStatus: "PENDING" | "APPROVED" | "REJECTED";
  waiverRejectReason: string | null;
  waiverSubmittedAt: string;
  waiverReviewedAt: string | null;
  waiverReviewer: {
    id: string;
    name: string;
    email: string;
  } | null;
  submittedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
  supportingDocument: {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    url: string;
  } | null;
}

interface Organization {
  id: string;
  name: string;
}

interface Course {
  id: string;
  title: string;
  courseCode: string | null;
}

interface WaiverCounts {
  pending: number;
  approved: number;
  rejected: number;
}

const WaiverRequests: React.FC = () => {
  const { toast } = useToast();

  // State
  const [waiverRequests, setWaiverRequests] = useState<WaiverRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<WaiverCounts>({ pending: 0, approved: 0, rejected: 0 });

  // Filters
  const [activeTab, setActiveTab] = useState<string>("PENDING");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [organizationFilter, setOrganizationFilter] = useState<string>("ALL");
  const [courseFilter, setCourseFilter] = useState<string>("ALL");

  // Filter options
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  // Dialog
  const [selectedWaiver, setSelectedWaiver] = useState<WaiverRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [activeTab, debouncedSearch, organizationFilter, courseFilter]);

  // Load filter options
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [orgsResponse, coursesResponse] = await Promise.all([clientOrganizationsApi.getAll({ all: true }), coursesApi.getAll({ limit: 500 })]);

        if (orgsResponse.success && orgsResponse.organizations) {
          setOrganizations(
            orgsResponse.organizations.map((org: any) => ({
              id: org.id,
              name: org.name,
            }))
          );
        }

        if (coursesResponse.success && coursesResponse.courses) {
          setCourses(
            coursesResponse.courses.map((course: any) => ({
              id: course.id,
              title: course.title,
              courseCode: course.courseCode,
            }))
          );
        }
      } catch (err) {
        console.error("Error loading filter options:", err);
      }
    };

    loadFilterOptions();
  }, []);

  // Fetch waiver requests
  const fetchWaiverRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        page,
        limit: perPage,
        search: debouncedSearch || undefined,
        status: activeTab !== "ALL" ? activeTab : undefined,
        organizationId: organizationFilter !== "ALL" ? organizationFilter : undefined,
        courseId: courseFilter !== "ALL" ? courseFilter : undefined,
      };

      const response = await waiversApi.getAll(params);

      if (!response.success) {
        throw new Error(response.error || "Failed to fetch waiver requests");
      }

      setWaiverRequests(response.waiverRequests || []);
      setCounts(response.counts || { pending: 0, approved: 0, rejected: 0 });
      setTotal(response.pagination?.total || 0);
    } catch (err: any) {
      const message = err?.message || "Failed to load waiver requests";
      setError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [page, perPage, debouncedSearch, activeTab, organizationFilter, courseFilter, toast]);

  useEffect(() => {
    fetchWaiverRequests();
  }, [fetchWaiverRequests]);

  // Handle view details
  const handleViewDetails = (waiver: WaiverRequest) => {
    setSelectedWaiver(waiver);
    setDialogOpen(true);
  };

  // Handle approve/reject completion
  const handleWaiverAction = useCallback(() => {
    fetchWaiverRequests();
    setDialogOpen(false);
    setSelectedWaiver(null);
  }, [fetchWaiverRequests]);

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
            Pending
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
            Approved
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Generate request ID for display
  const generateRequestId = (id: string) => {
    return `WR${id.slice(-4).toUpperCase()}`;
  };

  return (
    <Can I="view" a="Waiver" passThrough>
      {(allowed) =>
        !allowed ? (
          <div className="container mx-auto px-4 py-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>You don't have permission to view waiver requests. Please contact your administrator.</AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="container mx-auto px-4 py-6 space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Waiver Requests</h1>
              {/* <p className="text-muted-foreground mt-1">Review and manage waiver requests for absent or withdrawn participants</p> */}
            </div>

            {/* Counter Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-l-4 border-l-amber-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pending Requests</p>
                      <p className="text-3xl font-bold text-amber-600">{counts.pending}</p>
                    </div>
                    <Clock className="h-8 w-8 text-amber-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Approved</p>
                      <p className="text-3xl font-bold text-green-600">{counts.approved}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-red-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                      <p className="text-3xl font-bold text-red-600">{counts.rejected}</p>
                    </div>
                    <XCircle className="h-8 w-8 text-red-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Table Card */}
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl">Waiver Requests</CardTitle>
                    {/* <CardDescription>Search and filter waiver requests by learner, organization, or course</CardDescription> */}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    {/* Search */}
                    <div className="relative w-full sm:w-64">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search requests..." className="pl-9" />
                    </div>

                    {/* Organization Filter */}
                    <Select value={organizationFilter} onValueChange={setOrganizationFilter}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="All Organisations" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Organizations</SelectItem>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Course Filter */}
                    <Select value={courseFilter} onValueChange={setCourseFilter}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="All Courses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Courses</SelectItem>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger value="PENDING" className="gap-2">
                      Pending
                      <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-800">
                        {counts.pending}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="APPROVED" className="gap-2">
                      Approved
                      <Badge variant="secondary" className="ml-1 bg-green-100 text-green-800">
                        {counts.approved}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="REJECTED" className="gap-2">
                      Rejected
                      <Badge variant="secondary" className="ml-1 bg-red-100 text-red-800">
                        {counts.rejected}
                      </Badge>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value={activeTab} className="mt-4">
                    {loading ? (
                      <div className="flex items-center justify-center py-12 text-muted-foreground">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading waiver requests...
                      </div>
                    ) : error ? (
                      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
                    ) : waiverRequests.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-muted-foreground">
                        <FileText className="h-12 w-12 opacity-30" />
                        <p>No {activeTab.toLowerCase()} waiver requests found</p>
                        {(searchTerm || organizationFilter !== "ALL" || courseFilter !== "ALL") && (
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSearchTerm("");
                              setOrganizationFilter("ALL");
                              setCourseFilter("ALL");
                            }}
                          >
                            Clear filters
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[100px]">Course Run ID</TableHead>
                              <TableHead className="min-w-[150px]"> Participant Name</TableHead>
                              <TableHead className="min-w-[150px]">Organization</TableHead>
                              <TableHead className="min-w-[180px]">Course Name</TableHead>
                              <TableHead className="min-w-[150px]">Submitted By</TableHead>
                              <TableHead className="w-[120px]">Submitted Date</TableHead>
                              <TableHead className="w-[100px]">Status</TableHead>
                              <TableHead className="w-[100px] text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {waiverRequests.map((waiver) => (
                              <TableRow key={waiver.id}>
                                <TableCell className="font-medium">{generateRequestId(waiver.id)}</TableCell>
                                <TableCell>{waiver.learnerName}</TableCell>
                                <TableCell>{waiver.organization?.name || "—"}</TableCell>
                                <TableCell>{waiver.courseName}</TableCell>
                                <TableCell>{waiver.submittedBy ? <span title={waiver.submittedBy.email}>{waiver.submittedBy.name}</span> : "—"}</TableCell>
                                <TableCell>{formatDate(waiver.waiverSubmittedAt)}</TableCell>
                                <TableCell>{getStatusBadge(waiver.waiverStatus)}</TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="sm" onClick={() => handleViewDetails(waiver)} className="flex items-center gap-1">
                                    <FileText className="h-4 w-4" />
                                    View Details
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* Pagination */}
                    {!loading && !error && waiverRequests.length > 0 && (
                      <PaginationControls
                        page={page}
                        perPage={perPage}
                        total={total}
                        onPageChange={setPage}
                        onPerPageChange={(value) => {
                          setPerPage(value);
                          setPage(1);
                        }}
                      />
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Waiver Details Dialog */}
            <WaiverDetailsDialog open={dialogOpen} onOpenChange={setDialogOpen} waiverId={selectedWaiver?.id || null} onAction={handleWaiverAction} />
          </div>
        )
      }
    </Can>
  );
};

export default WaiverRequests;
