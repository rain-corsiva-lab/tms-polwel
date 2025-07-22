import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { TrainerCalendar } from "@/components/TrainerCalendar";
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  MapPin, 
  Calendar, 
  Clock, 
  BookOpen,
  Edit,
  CheckCircle,
  AlertCircle
} from "lucide-react";

// Mock trainer data - this would typically come from authentication context
const trainerData = {
  id: "3",
  name: "David Chen",
  email: "david.chen@training.com",
  phone: "+65 9123 4567",
  organization: "Excellence Training Partners",
  department: "Professional Development",
  location: "Singapore",
  joinDate: "2023-09-01",
  status: "Active",
  availabilityStatus: "Available",
  specializations: ["Leadership Development", "Team Building", "Communication Skills"],
  certifications: ["Certified Professional Trainer", "Leadership Coach", "Team Dynamics Specialist"],
  writeUp: "Experienced trainer with over 5 years in corporate development. Passionate about empowering teams and individuals to reach their full potential through innovative training methodologies.",
  totalTrainingSessions: 45,
  upcomingSessions: 8,
  completedHours: 120,
  rating: 4.8,
  profileImage: null
};

const TrainerPartner = () => {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Trainer Dashboard</h1>
          <p className="text-muted-foreground">Manage your profile and training schedule</p>
        </div>
        <Button>
          <Edit className="h-4 w-4 mr-2" />
          Edit Profile
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Information */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={trainerData.profileImage || ""} />
                  <AvatarFallback className="text-lg">
                    {trainerData.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardTitle className="text-xl">{trainerData.name}</CardTitle>
              <div className="flex justify-center space-x-2">
                <Badge className={trainerData.status === 'Active' ? 'bg-success text-success-foreground' : 'bg-muted'}>
                  {trainerData.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{trainerData.email}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{trainerData.phone}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{trainerData.organization}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{trainerData.location}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Joined {new Date(trainerData.joinDate).toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Complete Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                Complete Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Specializations</h4>
                <div className="flex flex-wrap gap-2">
                  {trainerData.specializations.map((spec, index) => (
                    <Badge key={index} variant="secondary">
                      {spec}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Professional Write-up</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {trainerData.writeUp}
                </p>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Calendar Section */}
        <div className="lg:col-span-2">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                My Training Calendar
              </CardTitle>
              <p className="text-muted-foreground">View and manage your training sessions</p>
            </CardHeader>
            <CardContent>
              <TrainerCalendar 
                trainerId={trainerData.id} 
                trainerName={trainerData.name}
                trainerCourses={trainerData.specializations}
              />
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="h-2 w-2 bg-success rounded-full mt-2" />
                  <div>
                    <p className="text-sm font-medium">Completed "Leadership Development" session</p>
                    <p className="text-xs text-muted-foreground">2 days ago</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="h-2 w-2 bg-primary rounded-full mt-2" />
                  <div>
                    <p className="text-sm font-medium">Upcoming "Team Building Workshop"</p>
                    <p className="text-xs text-muted-foreground">Tomorrow at 2:00 PM</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="h-2 w-2 bg-warning rounded-full mt-2" />
                  <div>
                    <p className="text-sm font-medium">Session feedback received</p>
                    <p className="text-xs text-muted-foreground">3 days ago</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="h-2 w-2 bg-muted rounded-full mt-2" />
                  <div>
                    <p className="text-sm font-medium">Profile updated</p>
                    <p className="text-xs text-muted-foreground">1 week ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TrainerPartner;