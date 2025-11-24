import { useState, useEffect } from "react";
import { formatDate } from "../lib/date";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { trainersApi, coursesApi } from "@/lib/api";
import Swal from "sweetalert2";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EditProfileDialog } from "@/components/EditProfileDialog";
import { AddTrainerBlockoutDialog } from "@/components/AddTrainerBlockoutDialog";
import TrainerCalendar from "@/components/TrainerCalendar";
import { Calendar as CalendarIcon, Clock, MapPin, Mail, Phone, Building2, User, Edit, Plus, Ban } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { trainerDashboardApi } from "@/lib/api";
import { TrainerTrainingSummary } from "@/components/TrainerTrainingSummary";

interface TrainerProfile {
  id: string;
  name: string;
  email: string;
  contactNumber?: string;
  status: string;
  onboardingDate?: string | null;
  partnerOrganization?: string;
  bio?: string;
  specializations?: string[];
  certifications?: string[];
  experience?: string;
  createdAt: string;
}

interface TrainerStatistics {
  totalSessionsCompleted: number;
  totalSessionsUpcoming: number;
  totalLearnersTrained: number;
  totalBlockouts: number;
}

interface CourseRun {
  id: string;
  courseName: string;
  courseCategory: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  status: string;
  currentParticipants: number;
  maxParticipants: number;
  venue?: {
    name: string;
    address?: string;
  };
}

interface BlockoutDate {
  id: string;
  startDate: string;
  endDate: string;
  remarks?: string | null;
  description?: string;
  isRecurring: boolean;
}

interface DashboardData {
  profile: TrainerProfile;
  statistics: TrainerStatistics;
  upcomingCourseRuns: CourseRun[];
  blockoutDates: BlockoutDate[];
  fees?: { id: string; feePerRun: number; remarks?: string; course: { id: string; courseCode?: string; title: string } }[];
}

export default function TrainerDashboard() {
  const { user, hasRole } = useAuth();
  const isTrainerUser = hasRole("TRAINER");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [feesState, setFeesState] = useState<DashboardData["fees"]>([]);
  const [loading, setLoading] = useState(true);
  const [showFeeDialog, setShowFeeDialog] = useState(false);
  const [editingFee, setEditingFee] = useState<any | null>(null);
  const [courseOptions, setCourseOptions] = useState<{ id: string; courseCode?: string; title: string }[]>([]);
  const [courseId, setCourseId] = useState("");
  const [feePerRun, setFeePerRun] = useState("");
  const [remarks, setRemarks] = useState("");
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedDateEvents, setSelectedDateEvents] = useState<{ courseRuns: any[]; blockouts: any[] }>({ courseRuns: [], blockouts: [] });
  const { toast } = useToast();

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await trainerDashboardApi.getDashboard();
      setDashboardData(response.data);
      // initialize local fees state
      setFeesState(response.data?.fees || []);
    } catch (error: any) {
      toast({
        title: "Error Loading Dashboard",
        description: error.message || "Failed to load trainer dashboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const resp = await coursesApi.getAll({ limit: 200 });
      let list: any[] = [];
      if (resp && resp.success && resp.data && Array.isArray(resp.data.courses)) {
        list = resp.data.courses;
      } else if (resp && Array.isArray((resp as any).data)) {
        list = (resp as any).data;
      } else if (Array.isArray(resp)) {
        list = resp;
      }
      if (Array.isArray(list)) setCourseOptions(list.map((c: any) => ({ id: c.id, courseCode: c.courseCode, title: c.title })));
    } catch (err) {
      console.error("Error loading courses", err);
    }
  };

  // Open add dialog
  const openAddDialog = () => {
    setEditingFee(null);
    setCourseId("");
    setFeePerRun("");
    setRemarks("");
    // ensure courseOptions are loaded when opening
    loadCourses();
    setShowFeeDialog(true);
  };

  const sanitizeMoneyInput = (v: string) => {
    let s = v.replace(/[^0-9.]/g, "");
    const parts = s.split(".");
    if (parts.length > 2) s = parts[0] + "." + parts.slice(1).join("");
    if (s.includes(".")) {
      const [intPart, decPart] = s.split(".");
      s = intPart + "." + (decPart || "").slice(0, 2);
    }
    return s;
  };

  const openEditDialog = (f: any) => {
    setEditingFee(f);
    setCourseId(f.course?.id || "");
    setFeePerRun(String(f.feePerRun || ""));
    setRemarks(f.remarks || "");
    setShowFeeDialog(true);
  };

  const submitFee = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      if (!editingFee) {
        if (!courseId) throw new Error("Course required");
        const sanitized = feePerRun.replace(/[^0-9.]/g, "");
        const parsed = parseFloat(sanitized);
        if (isNaN(parsed)) throw new Error("Fee must be a number");
        const trainerId = dashboardData?.profile?.id;
        if (!trainerId) throw new Error("Trainer id not available");
        const resp = await trainersApi.createFee(trainerId, { courseId, feePerRun: parsed, remarks: remarks || undefined });
        const newFee = resp.fee;
        setFeesState((prev) => [newFee, ...(prev || [])]);
      } else {
        const sanitized = feePerRun.replace(/[^0-9.]/g, "");
        const parsed = parseFloat(sanitized);
        if (isNaN(parsed)) throw new Error("Fee must be a number");
        const trainerId = dashboardData?.profile?.id;
        if (!trainerId) throw new Error("Trainer id not available");
        const resp = await trainersApi.updateFee(trainerId, editingFee.id, { feePerRun: parsed, remarks: remarks || undefined });
        const updated = resp.fee;
        setFeesState((prev) => (prev || []).map((x: any) => (x.id === updated.id ? updated : x)));
      }
      setShowFeeDialog(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed", variant: "destructive" });
    }
  };

  const removeFee = async (f: any) => {
    const r = await Swal.fire({
      title: "Delete fee?",
      text: `Delete fee for ${(f.course.courseCode || "") + " - " + f.course.title}?`,
      icon: "warning",
      showCancelButton: true,
    });
    if (!r.isConfirmed) return;
    try {
      const trainerId = dashboardData?.profile?.id;
      if (!trainerId) throw new Error("Trainer id not available");
      await trainersApi.deleteFee(trainerId, f.id);
      setFeesState((prev) => (prev || []).filter((x: any) => x.id !== f.id));
      toast({ title: "Fee deleted successfully" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed", variant: "destructive" });
    }
  };

  // Get events for selected date
  const getEventsForDate = (date: Date) => {
    if (!dashboardData) return [];

    const dateStr = date.toISOString().split("T")[0];
    const events = [];

    // Check for course runs
    const courseRuns = dashboardData.upcomingCourseRuns.filter((run) => run.startDate.startsWith(dateStr));

    // Check for blockouts
    const blockouts = dashboardData.blockoutDates.filter((blockout) => {
      const blockoutDate = new Date(blockout.startDate).toISOString().split("T")[0];
      return blockoutDate === dateStr;
    });

    return [...courseRuns, ...blockouts];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Failed to load dashboard data</p>
          <Button onClick={fetchDashboardData} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const { profile, statistics, upcomingCourseRuns, blockoutDates, fees = [] } = dashboardData;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Dashboard</h1>
            <p className="text-muted-foreground">Manage your profile and schedule</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={() => setShowEditProfile(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile & Stats */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <Card>
              <CardHeader className="text-center">
                <Avatar className="w-20 h-20 mx-auto mb-4">
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {profile.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <CardTitle>{profile.name}</CardTitle>
                <Badge variant={profile.status === "ACTIVE" ? "default" : "secondary"} className="mb-2 w-fit self-center">
                  {profile.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{profile.email}</span>
                </div>
                {profile.contactNumber && (
                  <div className="flex items-center space-x-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{profile.contactNumber}</span>
                  </div>
                )}
                {profile.partnerOrganization && (
                  <div className="flex items-center space-x-3">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{profile.partnerOrganization}</span>
                  </div>
                )}
                <div className="flex items-center space-x-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Joined {formatDate(profile.createdAt)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Complete Profile Section */}
            <Card>
              <CardHeader>
                <CardTitle>Complete Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2">Specializations</h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.specializations && profile.specializations.length > 0 ? (
                      profile.specializations.map((spec, index) => (
                        <Badge key={index} variant="outline">
                          {spec}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No specializations added</p>
                    )}
                  </div>
                </div>

                {profile.bio && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Professional Write-up</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{profile.bio}</p>
                  </div>
                )}

                <Button variant="outline" className="w-full" onClick={() => setShowEditProfile(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Center Column - Calendar */}
          <div className="lg:col-span-1 space-y-6">
            <TrainerCalendar
              trainerId={profile?.id || "1"}
              trainerName={profile?.name || "David Chen"}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              onEventsChange={setSelectedDateEvents}
            />
            {/* calendar continues - fees moved to full-width below */}
          </div>

          {/* Right Column - Today's Schedule */}
          <div className="lg:col-span-1 space-y-6">
            {/* Statistics */}
            {/* <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{statistics.totalSessionsCompleted}</div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{statistics.totalSessionsUpcoming}</div>
                  <div className="text-sm text-muted-foreground">Upcoming</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{statistics.totalLearnersTrained}</div>
                  <div className="text-sm text-muted-foreground">Learners Trained</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{statistics.totalBlockouts}</div>
                  <div className="text-sm text-muted-foreground">Blockouts</div>
                </CardContent>
              </Card>
            </div> */}

            {/* Selected Date Events */}
            <Card>
              <CardHeader>
                <CardTitle>{formatDate(selectedDate)}</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDateEvents.courseRuns.length > 0 || selectedDateEvents.blockouts.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDateEvents.courseRuns.map((run: any) => (
                      <div key={run.id} className="p-3 border rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <CalendarIcon className="h-4 w-4 text-primary" />
                          <span className="font-medium">{run.courseName}</span>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>
                            {run.startTime} - {run.endTime}
                          </div>
                          <div>{run.venue?.name}</div>
                        </div>
                      </div>
                    ))}
                    {selectedDateEvents.blockouts.map((blockout: any) => (
                      <div key={blockout.id} className="p-3 border rounded-lg bg-red-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <CalendarIcon className="h-4 w-4 text-red-500" />
                            <span className="font-medium text-red-700">{blockout.remarks || "Unavailable"}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                const trainerId = dashboardData?.profile?.id;
                                if (!trainerId) return;
                                const result = await Swal.fire({
                                  title: "Remove unavailable dates?",
                                  text: "This will make the selected dates available again.",
                                  icon: "warning",
                                  showCancelButton: true,
                                  confirmButtonColor: "#dc2626",
                                  cancelButtonColor: "#6b7280",
                                  confirmButtonText: "Yes, remove",
                                  cancelButtonText: "Cancel",
                                });
                                if (!result.isConfirmed) return;
                                await trainersApi.deleteBlockout(trainerId, blockout.id);
                                toast({ title: "Blockout removed", description: "The date range is now available." });
                                setSelectedDateEvents((prev) => ({
                                  ...prev,
                                  blockouts: prev.blockouts.filter((b: any) => b.id !== blockout.id),
                                }));
                                setSelectedDate(new Date(selectedDate));
                              } catch (e: any) {
                                toast({ title: "Error", description: e?.message || "Failed to remove blockout", variant: "destructive" });
                              }
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                        <div className="text-sm text-red-600">Unavailable</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No events scheduled for this date</p>
                    <p className="text-sm text-muted-foreground">Click "Add Blockout Date Range" to block this date</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        {/* Full width Training Fee section - hidden for trainer users */}
        {!isTrainerUser && (
          <div className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium">Training Fee</CardTitle>
                  <CardDescription>Your configured per-course fees</CardDescription>
                </div>
                <div>
                  <Button size="sm" onClick={() => openAddDialog()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Training Fee
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="text-left p-2">Course Code</th>
                        <th className="text-left p-2">Course</th>
                        <th className="text-left p-2">Fee</th>
                        <th className="text-left p-2">Remarks</th>
                        <th className="text-right p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!feesState || feesState.length === 0) && (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-muted-foreground">
                            No fees
                          </td>
                        </tr>
                      )}
                      {(feesState || []).map((f) => (
                        <tr key={f.id} className="border-t">
                          <td className="p-2 whitespace-nowrap">{f.course.courseCode || "N/A"}</td>
                          <td className="p-2">{f.course.title}</td>
                          <td className="p-2">{f.feePerRun.toLocaleString(undefined, { style: "currency", currency: "SGD" })}</td>
                          <td className="p-2">{f.remarks || ""}</td>
                          <td className="p-2 justify-items-end">
                            <div className="flex items-center space-x-2">
                              <Button size="sm" variant="ghost" onClick={() => openAddDialog()} type="button">
                                Add Fee
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => openEditDialog(f)} type="button">
                                Edit
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => removeFee(f)} type="button">
                                Remove
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Fee Dialog (Dialog component) */}
        {!isTrainerUser && (
          <Dialog open={showFeeDialog} onOpenChange={(open) => setShowFeeDialog(open)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingFee ? "Edit" : "Add"} Training Fee</DialogTitle>
                <DialogDescription>{editingFee ? "Update the fee details" : "Add a fee for a course"}</DialogDescription>
              </DialogHeader>
              <form onSubmit={submitFee} className="space-y-4">
                {!editingFee && (
                  <div>
                    <Label>Course *</Label>
                    <Select onValueChange={(v) => setCourseId(v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courseOptions.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {(c.courseCode || "N/A") + " - " + c.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>Fees (per run) *</Label>
                  <Input
                    value={feePerRun}
                    onChange={(e) => {
                      // allow only digits and dot
                      const v = e.target.value;
                      const sanitized = v.replace(/[^0-9.]/g, "");
                      setFeePerRun(sanitized);
                    }}
                    required
                  />
                </div>
                <div>
                  <Label>Remarks</Label>
                  <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowFeeDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingFee ? "Update Fee" : "Add Fee"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Upcoming Sessions Table
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Training Sessions</CardTitle>
            <CardDescription>Your scheduled training sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingCourseRuns.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Course</th>
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Time</th>
                      <th className="text-left p-2">Participants</th>
                      <th className="text-left p-2">Venue</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingCourseRuns.map((run) => (
                      <tr key={run.id} className="border-b">
                        <td className="p-2">
                          <div>
                            <div className="font-medium">{run.courseName}</div>
                            <div className="text-sm text-muted-foreground">{run.courseCategory}</div>
                          </div>
                        </td>
                        <td className="p-2">
                          {formatDate(run.startDate)} - {formatDate(run.endDate)}
                        </td>
                        <td className="p-2">{run.startTime} - {run.endTime}</td>
                        <td className="p-2">{run.currentParticipants}/{run.maxParticipants}</td>
                        <td className="p-2">
                          {run.venue ? run.venue.name : 'TBD'}
                        </td>
                        <td className="p-2">
                          <Badge variant={run.status === 'ACTIVE' ? 'default' : 'secondary'}>
                            {run.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No upcoming training sessions</p>
              </div>
            )}
          </CardContent>
        </Card> */}
      </div>

      {/* Training Summary at bottom */}
      <div className="max-w-7xl mx-auto space-y-6 my-5">
        <TrainerTrainingSummary mode="self" />
      </div>

      {/* Edit Profile Dialog */}
      <EditProfileDialog isOpen={showEditProfile} onClose={() => setShowEditProfile(false)} profile={profile} onProfileUpdated={fetchDashboardData} />
    </div>
  );
}
