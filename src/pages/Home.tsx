import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { EditProfileDialog } from "@/components/EditProfileDialog";
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  MapPin, 
  Calendar, 
  BookOpen,
  Edit
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
  specializations: ["Leadership Development", "Team Building", "Communication Skills"],
  writeUp: "Experienced trainer with over 5 years in corporate development. Passionate about empowering teams and individuals to reach their full potential through innovative training methodologies.",
  profileImage: null
};

const Home = () => {
  const [trainerProfile, setTrainerProfile] = useState(trainerData);

  const handleProfileUpdate = (updatedData: { specializations: string[]; writeUp: string }) => {
    setTrainerProfile(prev => ({
      ...prev,
      specializations: updatedData.specializations,
      writeUp: updatedData.writeUp
    }));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Welcome Back, {trainerProfile.name}</h1>
          <p className="text-muted-foreground">Training Management Dashboard</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={trainerProfile.profileImage || ""} />
                <AvatarFallback className="text-lg">
                  {trainerProfile.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
            </div>
            <CardTitle className="text-xl">{trainerProfile.name}</CardTitle>
            <div className="flex justify-center space-x-2">
              <Badge className={trainerProfile.status === 'Active' ? 'bg-success text-success-foreground' : 'bg-muted'}>
                {trainerProfile.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{trainerProfile.email}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{trainerProfile.phone}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{trainerProfile.organization}</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{trainerProfile.location}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Joined {new Date(trainerProfile.joinDate).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Complete Profile Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                Complete Profile
              </CardTitle>
              <EditProfileDialog 
                specializations={trainerProfile.specializations}
                writeUp={trainerProfile.writeUp}
                onSave={handleProfileUpdate}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2">Specializations</h4>
              <div className="flex flex-wrap gap-2">
                {trainerProfile.specializations.map((spec, index) => (
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
                {trainerProfile.writeUp}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Home;