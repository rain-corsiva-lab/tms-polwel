import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Mail, Phone, Calendar } from "lucide-react";
import { TrainerCalendar } from "@/components/TrainerCalendar";

const TrainerDetail = () => {
  const { id } = useParams();

  // Mock trainer data
  const trainer = {
    id: id || "1",
    name: "Dr. Sarah Johnson",
    email: "sarah.johnson@techcorp.com",
    phone: "+65 9123 4567",
    specializations: ["Leadership", "Communication", "Project Management"],
    status: "Available",
    experience: "8 years",
    rating: "4.8/5.0",
    coursesCompleted: 156
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

      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
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

      </div>

      <TrainerCalendar trainerId={trainer.id} trainerName={trainer.name} trainerCourses={trainer.specializations} />
    </div>
  );
};

export default TrainerDetail;