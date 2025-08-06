import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Mail, Phone, Calendar, Edit, Loader2 } from "lucide-react";
import { TrainerCalendar } from "@/components/TrainerCalendar";
import { EditProfileDialog } from "@/components/EditProfileDialog";
import { trainersApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Trainer {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  availabilityStatus?: string;
  partnerOrganization?: string;
  bio?: string;
  specializations?: string[];
  certifications?: string[];
  experience?: string;
  createdAt: string;
  updatedAt: string;
}

const TrainerDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for editable profile data
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [writeUp, setWriteUp] = useState("");

  useEffect(() => {
    if (id) {
      fetchTrainer();
    }
  }, [id]);

  const fetchTrainer = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await trainersApi.getById(id);
      setTrainer(data);
      setSpecializations(data.specializations || []);
      setWriteUp(data.bio || "");
    } catch (error) {
      console.error('Error fetching trainer:', error);
      setError('Failed to load trainer details');
      toast({
        title: "Error",
        description: "Failed to load trainer details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = (data: { specializations: string[]; writeUp: string }) => {
    setSpecializations(data.specializations);
    setWriteUp(data.writeUp);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      Available: "default",
      AVAILABLE: "default",
      Unavailable: "secondary", 
      UNAVAILABLE: "secondary",
      Limited: "outline",
      LIMITED: "outline"
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || "secondary"}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading trainer details...</span>
        </div>
      </div>
    );
  }

  if (error || !trainer) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-4 mb-6">
          <Link to="/trainers">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Trainers
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-red-600 mb-2">Error Loading Trainer</h3>
              <p className="text-gray-600 mb-4">{error || 'Trainer not found'}</p>
              <Button onClick={fetchTrainer}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            {trainer.partnerOrganization && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{trainer.partnerOrganization}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile Information</CardTitle>
            <EditProfileDialog 
              specializations={specializations}
              writeUp={writeUp}
              onSave={handleProfileSave}
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Specializations</h4>
              <div className="flex flex-wrap gap-2">
                {specializations.map((spec, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {spec}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Professional Write-up</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {writeUp || trainer.bio || "No bio available"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <TrainerCalendar trainerId={trainer.id} trainerName={trainer.name} trainerCourses={specializations} />
    </div>
  );
};

export default TrainerDetail;