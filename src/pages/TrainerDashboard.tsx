import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EditProfileDialog } from "@/components/EditProfileDialog";
import { AddTrainerBlockoutDialog } from "@/components/AddTrainerBlockoutDialog";
import TrainerCalendar from "@/components/TrainerCalendar";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Mail, 
  Phone, 
  Building2, 
  User, 
  Edit,
  Plus,
  Ban
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { trainerDashboardApi } from "@/lib/api";

interface TrainerProfile {
  id: string;
  name: string;
  email: string;
  contactNumber?: string;
  status: string;
  availabilityStatus: string;
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
  reason: string;
  type: string;
  description?: string;
  isRecurring: boolean;
}

interface DashboardData {
  profile: TrainerProfile;
  statistics: TrainerStatistics;
  upcomingCourseRuns: CourseRun[];
  blockoutDates: BlockoutDate[];
}

export default function TrainerDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedDateEvents, setSelectedDateEvents] = useState<{ courseRuns: any[], blockouts: any[] }>({ courseRuns: [], blockouts: [] });
  const { toast } = useToast();

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await trainerDashboardApi.getDashboard();
      setDashboardData(response.data);
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
  }, []);

  // Get events for selected date
  const getEventsForDate = (date: Date) => {
    if (!dashboardData) return [];
    
    const dateStr = date.toISOString().split('T')[0];
    const events = [];

    // Check for course runs
    const courseRuns = dashboardData.upcomingCourseRuns.filter(run => 
      run.startDate.startsWith(dateStr)
    );
    
    // Check for blockouts
    const blockouts = dashboardData.blockoutDates.filter(blockout => {
      const blockoutDate = new Date(blockout.startDate).toISOString().split('T')[0];
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

  const { profile, statistics, upcomingCourseRuns, blockoutDates } = dashboardData;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Trainer Dashboard</h1>
            <p className="text-muted-foreground">Manage your profile and training schedule</p>
          </div>
          <Button onClick={() => setShowEditProfile(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile & Stats */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <Card>
              <CardHeader className="text-center">
                <Avatar className="w-20 h-20 mx-auto mb-4">
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {profile.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <CardTitle>{profile.name}</CardTitle>
                <Badge 
                  variant={profile.status === 'ACTIVE' ? 'default' : 'secondary'}
                  className="mb-2"
                >
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
                  <span className="text-sm">Joined {new Date(profile.createdAt).toLocaleDateString()}</span>
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
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {profile.bio}
                    </p>
                  </div>
                )}

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setShowEditProfile(true)}
                >
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
          </div>

          {/* Right Column - Today's Schedule */}
          <div className="lg:col-span-1 space-y-6">
            {/* Statistics */}
            <div className="grid grid-cols-2 gap-4">
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
            </div>

            {/* Selected Date Events */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(selectedDateEvents.courseRuns.length > 0 || selectedDateEvents.blockouts.length > 0) ? (
                  <div className="space-y-3">
                    {selectedDateEvents.courseRuns.map((run: any) => (
                      <div key={run.id} className="p-3 border rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <CalendarIcon className="h-4 w-4 text-primary" />
                          <span className="font-medium">{run.courseName}</span>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>{run.startTime} - {run.endTime}</div>
                          <div>{run.venue?.name}</div>
                        </div>
                      </div>
                    ))}
                    {selectedDateEvents.blockouts.map((blockout: any) => (
                      <div key={blockout.id} className="p-3 border rounded-lg bg-red-50">
                        <div className="flex items-center space-x-2 mb-2">
                          <CalendarIcon className="h-4 w-4 text-red-500" />
                          <span className="font-medium text-red-700">{blockout.reason}</span>
                        </div>
                        <div className="text-sm text-red-600">
                          Unavailable
                        </div>
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
                          {new Date(run.startDate).toLocaleDateString()} - {new Date(run.endDate).toLocaleDateString()}
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

      {/* Edit Profile Dialog */}
      <EditProfileDialog
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        profile={profile}
        onProfileUpdated={fetchDashboardData}
      />
    </div>
  );
}
