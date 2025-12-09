import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, AlertCircle, CheckSquare, Mail, ArrowRight, Download, Calendar as CalendarIcon, MapPin } from "lucide-react";
import { dashboardApi } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

// Action Item Card Component with hover animation
interface ActionItemCardProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
  onClick: () => void;
}

const ActionItemCard = ({ title, count, icon, iconBgColor, iconColor, onClick }: ActionItemCardProps) => {
  return (
    <Card className="cursor-pointer transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg border border-border/50" onClick={onClick}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-4xl font-bold text-foreground">{count}</p>
            <div className="flex items-center text-sm text-primary hover:underline cursor-pointer">
              Click to view details <ArrowRight className="ml-1 h-4 w-4" />
            </div>
          </div>
          <div className={`p-3 rounded-xl ${iconBgColor}`}>
            <div className={iconColor}>{icon}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return { label: "Confirmed", variant: "default" as const, className: "bg-green-500 hover:bg-green-600" };
      case "PENDING":
        return { label: "Pending", variant: "secondary" as const, className: "bg-gray-200 text-gray-700" };
      case "CONFIRMED_PENDING_TA_APPROVAL":
        return { label: "Pending TA", variant: "outline" as const, className: "border-orange-500 text-orange-600" };
      case "CONFIRMED_PENDING_CONFIRMATION_EMAILS":
        return { label: "Pending Emails", variant: "outline" as const, className: "border-blue-500 text-blue-600" };
      case "ACTIVE":
        return { label: "Active", variant: "default" as const, className: "bg-blue-500 hover:bg-blue-600" };
      case "IN_PROGRESS":
        return { label: "In Progress", variant: "default" as const, className: "bg-purple-500 hover:bg-purple-600" };
      case "DRAFT":
        return { label: "Draft", variant: "secondary" as const, className: "bg-gray-100 text-gray-600" };
      default:
        return { label: status, variant: "secondary" as const, className: "" };
    }
  };

  const config = getStatusConfig(status);
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
};

// Course Run Type Badge
const CourseRunTypeBadge = ({ type }: { type: string | null }) => {
  if (!type) return null;
  const isOpen = type === "OPEN";
  return (
    <Badge variant={isOpen ? "default" : "secondary"} className={isOpen ? "bg-blue-500" : "bg-gray-200 text-gray-700"}>
      {isOpen ? "Open" : "Dedicated"}
    </Badge>
  );
};

// Pie chart colors
const PIE_COLORS = ["#22c55e", "#3b82f6", "#eab308", "#ef4444", "#8b5cf6", "#f97316"];

const Home = () => {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();

  // Auto-redirect based on user role for better UX
  useEffect(() => {
    if (user) {
      // For trainers, redirect to their new dashboard
      if (user.role === "TRAINER") {
        navigate("/trainer-dashboard", { replace: true });
        return;
      }

      // Training coordinators are now handled at login and don't reach this page
      if (user.role === "TRAINING_COORDINATOR" && user.organizationId) {
        navigate("/org", { replace: true });
        return;
      }
    }
  }, [user, navigate]);

  if (!user) return null;

  // Dashboard for POLWEL users
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your training management system</p>
      </div>

      {/* Only show dashboard content for POLWEL users */}
      {hasRole(["POLWEL"]) && <DashboardContent />}
    </div>
  );
};

export default Home;

// Main Dashboard Content Component
function DashboardContent() {
  const navigate = useNavigate();

  // State for all data
  const [actionItems, setActionItems] = useState<any>(null);
  const [upcomingRuns, setUpcomingRuns] = useState<any[]>([]);
  const [completedRunsYTD, setCompletedRunsYTD] = useState<any[]>([]);
  const [completedRunTypes, setCompletedRunTypes] = useState<any[]>([]);
  const [completedByCategory, setCompletedByCategory] = useState<any[]>([]);
  const [completionRate, setCompletionRate] = useState<any[]>([]);
  const [cancellationRates, setCancellationRates] = useState<any[]>([]);
  const [draftRuns, setDraftRuns] = useState<any[]>([]);

  // Loading states
  const [loadingActionItems, setLoadingActionItems] = useState(true);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [loadingDrafts, setLoadingDrafts] = useState(true);

  // Calendar state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Fetch action items
  useEffect(() => {
    (async () => {
      try {
        setLoadingActionItems(true);
        const resp = await dashboardApi.getActionItems();
        const data = resp?.data ?? resp;
        setActionItems(data);
      } catch (e) {
        console.error("Failed to load action items:", e);
      } finally {
        setLoadingActionItems(false);
      }
    })();
  }, []);

  // Fetch upcoming runs when date changes
  const loadUpcomingRuns = useCallback(async (date?: Date) => {
    try {
      setLoadingUpcoming(true);
      // Use local date format (YYYY-MM-DD) to avoid timezone issues
      // toISOString() converts to UTC which can shift the date by a day
      let dateStr: string | undefined;
      if (date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        dateStr = `${year}-${month}-${day}`;
      }
      const resp = await dashboardApi.getUpcomingRuns(dateStr);
      const data = resp?.data ?? resp;
      setUpcomingRuns(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load upcoming runs:", e);
      setUpcomingRuns([]);
    } finally {
      setLoadingUpcoming(false);
    }
  }, []);

  useEffect(() => {
    loadUpcomingRuns(selectedDate);
  }, [selectedDate, loadUpcomingRuns]);

  // Fetch chart data
  useEffect(() => {
    (async () => {
      try {
        setLoadingCharts(true);
        const [ytd, types, category, completion, cancellation] = await Promise.all([
          dashboardApi.getCompletedRunsYTD(),
          dashboardApi.getCompletedRunTypes(),
          dashboardApi.getCompletedByCategory(),
          dashboardApi.getCompletionRate(),
          dashboardApi.getCancellationRates(),
        ]);

        setCompletedRunsYTD(ytd?.data ?? []);
        setCompletedRunTypes(types?.data ?? []);
        setCompletedByCategory(category?.data ?? []);
        setCompletionRate(completion?.data ?? []);
        setCancellationRates(cancellation?.data ?? []);
      } catch (e) {
        console.error("Failed to load chart data:", e);
      } finally {
        setLoadingCharts(false);
      }
    })();
  }, []);

  // Fetch draft runs
  useEffect(() => {
    (async () => {
      try {
        setLoadingDrafts(true);
        const resp = await dashboardApi.getDraftRuns();
        const data = resp?.data ?? resp;
        setDraftRuns(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to load draft runs:", e);
        setDraftRuns([]);
      } finally {
        setLoadingDrafts(false);
      }
    })();
  }, []);

  // Date formatting helper
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // Handle calendar date select
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  // Export to Excel handler
  const handleExportExcel = () => {
    // Implementation for Excel export
    console.log("Export to Excel clicked");
  };

  return (
    <div className="space-y-6">
      {/* Action Items Section - 4 Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loadingActionItems ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <ActionItemCard
              title="Pending Billing Runs"
              count={actionItems?.pendingBillingRuns ?? 0}
              icon={<DollarSign className="h-6 w-6" />}
              iconBgColor="bg-green-100"
              iconColor="text-green-600"
              onClick={() => navigate("/post-run-management")}
            />
            <ActionItemCard
              title="Pending Waiver Requests"
              count={actionItems?.pendingWaiverRequests ?? 0}
              icon={<AlertCircle className="h-6 w-6" />}
              iconBgColor="bg-orange-100"
              iconColor="text-orange-600"
              onClick={() => navigate("/waiver-requests")}
            />
            <ActionItemCard
              title="Training Assignment Approval"
              count={actionItems?.pendingTrainerApproval ?? 0}
              icon={<CheckSquare className="h-6 w-6" />}
              iconBgColor="bg-blue-100"
              iconColor="text-blue-600"
              onClick={() => navigate("/course-runs?status=CONFIRMED_PENDING_TA_APPROVAL")}
            />
            <ActionItemCard
              title="Email Confirmation Pending"
              count={actionItems?.pendingConfirmationEmails ?? 0}
              icon={<Mail className="h-6 w-6" />}
              iconBgColor="bg-purple-100"
              iconColor="text-purple-600"
              onClick={() => navigate("/course-runs?status=CONFIRMED_PENDING_CONFIRMATION_EMAILS")}
            />
          </>
        )}
      </div>

      {/* Upcoming Runs Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold">Upcoming Runs</CardTitle>
              <CardDescription>View upcoming training runs by calendar or table</CardDescription>
            </div>
            <Button variant="outline" onClick={handleExportExcel}>
              <Download className="mr-2 h-4 w-4" />
              Export to Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            {/* Calendar */}
            <div className="border rounded-lg p-4">
              <Calendar mode="single" selected={selectedDate} onSelect={handleDateSelect} className="rounded-md" />
            </div>

            {/* Table */}
            <div className="border rounded-lg">
              {loadingUpcoming ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : upcomingRuns.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No upcoming runs for the selected date</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course Run</TableHead>
                      <TableHead>Open/Dedicated</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Participants</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingRuns.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell className="font-medium">{run.courseTitle}</TableCell>
                        <TableCell>
                          <CourseRunTypeBadge type={run.courseRunType} />
                        </TableCell>
                        <TableCell>{formatDate(run.startDate)}</TableCell>
                        <TableCell>{formatDate(run.endDate)}</TableCell>
                        <TableCell>
                          <StatusBadge status={run.status} />
                        </TableCell>
                        <TableCell>
                          <span className={run.participantCount >= run.minParticipants ? "text-orange-600 font-medium" : ""}>
                            {run.participantCount}/{run.minParticipants}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => navigate(`/course-runs/${run.id}`)}>
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row 1: Completed Runs YTD & Completed Run Types */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Number of Runs Completed (Year to Date)</CardTitle>
            <CardDescription>Monthly breakdown of completed training runs</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingCharts ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={completedRunsYTD}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="completedRuns" name="Completed Runs" fill="#1f2937" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="bg-blue-100 text-blue-800 px-2 py-1 rounded inline-block">Completed Run Types (By Month)</CardTitle>
            <CardDescription>Open vs Dedicated runs completed each month</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingCharts ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={completedRunTypes}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="open" name="Open Run" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="dedicated" name="Dedicated Run" fill="#84cc16" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Completed by Category & Completion Rate */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Completed Course by Category</CardTitle>
            <CardDescription>Distribution of completed courses across categories</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingCharts ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={completedByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, value, percentage }) => `${name}, ${value}, ${percentage}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {completedByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Course Completion Rate by Month</CardTitle>
            <CardDescription>Completed vs Cancelled runs each month</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingCharts ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={completionRate}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="completed" name="Completed" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cancelled" name="Cancelled" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Open Run Cancellation Rates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Open Run Course Cancellation Rates</CardTitle>
          <CardDescription>Courses sorted by cancellation rate</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingCharts ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : cancellationRates.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No cancellation data available</div>
          ) : (
            <div className="rounded-lg overflow-hidden border">
              <Table>
                <TableHeader className="bg-orange-500">
                  <TableRow>
                    <TableHead className="text-white font-semibold">#</TableHead>
                    <TableHead className="text-white font-semibold">Open Run Course</TableHead>
                    <TableHead className="text-white font-semibold text-center">Total Runs</TableHead>
                    <TableHead className="text-white font-semibold text-center">Cancelled Runs</TableHead>
                    <TableHead className="text-white font-semibold text-center">Cancellation Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cancellationRates.map((item, index) => (
                    <TableRow key={item.courseId} className={index % 2 === 0 ? "bg-orange-50" : ""}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{item.courseName}</TableCell>
                      <TableCell className="text-center">{item.totalRuns}</TableCell>
                      <TableCell className="text-center">{item.cancelledRuns}</TableCell>
                      <TableCell className="text-center font-bold">{item.cancellationRate.toFixed(2)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Draft Runs Section */}
      <Card>
        <CardHeader>
          <CardTitle>Draft Runs</CardTitle>
          <CardDescription>{draftRuns.length} runs in draft status</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingDrafts ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : draftRuns.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No draft runs available</div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {draftRuns.map((run) => (
                <div
                  key={run.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/course-runs/${run.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="font-semibold">{run.courseTitle}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-4 w-4" />
                          {run.startDate || "No date set"}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-red-500" />
                          {run.venueName}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={run.status} />
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
