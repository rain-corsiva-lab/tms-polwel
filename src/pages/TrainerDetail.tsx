import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Mail, Phone, Calendar, Edit } from "lucide-react";
import { TrainerCalendar } from "@/components/TrainerCalendar";
import { EditProfileDialog } from "@/components/EditProfileDialog";

const TrainerDetail = () => {
  const { id } = useParams();
  
  // State for editable profile data
  const [specializations, setSpecializations] = useState(["Leadership", "Communication", "Project Management"]);
  const [writeUp, setWriteUp] = useState("Experienced trainer specializing in leadership development and corporate communication strategies. Passionate about helping teams reach their full potential through targeted training programs.");

  // Mock trainer data
  const trainer = {
    id: id || "1",
    name: "Dr. Sarah Johnson",
    email: "sarah.johnson@techcorp.com",
    phone: "+65 9123 4567",
    specializations,
    status: "Available",
    experience: "8 years",
    rating: "4.8/5.0",
    coursesCompleted: 156,
    writeUp
  };

  const handleProfileSave = (data: { specializations: string[]; writeUp: string }) => {
    setSpecializations(data.specializations);
    setWriteUp(data.writeUp);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      Available: "default",
      Unavailable: "secondary",
      Limited: "outline"
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || "secondary"}>{status}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Link to="/trainers">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Trainers
          </Button>
        </Link>
      </div>

      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <User className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">{trainer.name}</h1>
            {getStatusBadge(trainer.status)}
          </div>
          <p className="text-muted-foreground">Professional Trainer & Consultant</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{trainer.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{trainer.phone}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile Information</CardTitle>
            <EditProfileDialog 
              specializations={trainer.specializations}
              writeUp={trainer.writeUp}
              onSave={handleProfileSave}
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Specializations</h4>
              <div className="flex flex-wrap gap-2">
                {trainer.specializations.map((spec, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {spec}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Professional Write-up</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {trainer.writeUp}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <TrainerCalendar trainerId={trainer.id} trainerName={trainer.name} trainerCourses={trainer.specializations} />
    </div>
  );
};

export default TrainerDetail;