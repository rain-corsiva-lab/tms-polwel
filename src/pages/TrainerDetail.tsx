import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Mail, Phone, Calendar, Edit, Loader2 } from "lucide-react";
import TrainerCalendar from "@/components/TrainerCalendar";
import { EditProfileDialog } from "@/components/EditProfileDialog";
import { trainersApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

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

interface TrainingFee {
  id: string;
  courseCode: string;
  feesPerRun: string;
  remarks: string;
}

interface Course {
  id: string;
  title: string;
  code: string;
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

  // State for training fees
  const [trainingFees, setTrainingFees] = useState<TrainingFee[]>([
    { id: "1", courseCode: "LD-001", feesPerRun: "$2,500", remarks: "Standard leadership development course" },
    { id: "2", courseCode: "CS-002", feesPerRun: "$1,800", remarks: "Communication skills workshop" },
    { id: "3", courseCode: "TB-003", feesPerRun: "$2,200", remarks: "Team building intensive program" },
    { id: "4", courseCode: "PM-004", feesPerRun: "$3,000", remarks: "Advanced project management certification" }
  ]);
  
  // Available courses data
  const availableCourses: Course[] = [
    { id: "1", title: "Leadership Development Program", code: "LD-001" },
    { id: "2", title: "Communication Skills Workshop", code: "CS-002" },
    { id: "3", title: "Team Building Intensive", code: "TB-003" },
    { id: "4", title: "Project Management Certification", code: "PM-004" },
    { id: "5", title: "Customer Service Excellence", code: "CSE-005" },
    { id: "6", title: "Digital Marketing Fundamentals", code: "DM-006" },
    { id: "7", title: "Financial Planning & Analysis", code: "FPA-007" },
    { id: "8", title: "Human Resources Management", code: "HRM-008" }
  ];

  // State for add training fee form
  const [isAddFeeDialogOpen, setIsAddFeeDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    courseTitle: "",
    courseCode: "",
    feesPerRun: "",
    remarks: ""
  });

  useEffect(() => {
    if (id) {
      fetchTrainer();
    }
  }, [id]);

const fetchTrainer = async () => {
    if (!id) return;
    
    // Dummy data for trainers
    const dummyTrainers: Record<string, Trainer> = {
      "1": {
        id: "1",
        name: "David Chen",
        email: "david.chen@training.com",
        role: "TRAINER",
        status: "ACTIVE",
        availabilityStatus: "Available",
        partnerOrganization: "Excellence Training Partners",
        bio: "Experienced trainer with over 5 years in corporate development. Passionate about empowering teams and individuals to reach their full potential through innovative training methodologies.",
        specializations: ["Leadership Development", "Team Building", "Communication Skills"],
        certifications: ["Certified Professional Trainer", "Leadership Coach", "Team Dynamics Specialist"],
        experience: "5 years",
        createdAt: "2023-09-01T00:00:00Z",
        updatedAt: "2024-08-12T10:30:00Z"
      },
      "2": {
        id: "2",
        name: "Jennifer Lee",
        email: "jennifer.lee@skillsacademy.com", 
        role: "TRAINER",
        status: "ACTIVE",
        availabilityStatus: "Available",
        partnerOrganization: "Skills Academy",
        bio: "Certified communication specialist with expertise in presentation skills and public speaking. Helps professionals develop confidence and clarity in their communication.",
        specializations: ["Communication Skills", "Presentation Skills", "Public Speaking"],
        certifications: ["Communication Specialist", "Presentation Coach"],
        experience: "4 years",
        createdAt: "2023-10-15T00:00:00Z",
        updatedAt: "2024-08-11T14:15:00Z"
      },
      "3": {
        id: "3", 
        name: "Michael Wong",
        email: "michael.wong@techtraining.com",
        role: "TRAINER",
        status: "PENDING", 
        availabilityStatus: "Unavailable",
        partnerOrganization: "Tech Training Solutions",
        bio: "Technical trainer specializing in project management and agile methodologies. Brings practical industry experience to training programs.",
        specializations: ["Technical Skills", "Project Management", "Agile Methodology"],
        certifications: ["PMP", "Agile Certified Practitioner"],
        experience: "6 years",
        createdAt: "2024-08-01T00:00:00Z",
        updatedAt: "2024-08-01T00:00:00Z"
      },
      "4": {
        id: "4",
        name: "Sarah Kim", 
        email: "sarah.kim@professionaldevelopment.com",
        role: "TRAINER",
        status: "ACTIVE",
        availabilityStatus: "Limited",
        partnerOrganization: "Professional Development Center",
        bio: "Career development specialist focused on helping professionals advance their careers through strategic planning and skill development.",
        specializations: ["Professional Development", "Career Coaching", "Leadership Mentoring"],
        certifications: ["Career Coach", "Leadership Mentor"],
        experience: "7 years",
        createdAt: "2023-11-20T00:00:00Z",
        updatedAt: "2024-08-10T09:00:00Z"
      }
    };
    
    try {
      setLoading(true);
      setError(null);
      const data = await trainersApi.getById(id);
      setTrainer(data);
      setSpecializations(data.specializations || []);
      setWriteUp(data.bio || "");
    } catch (error) {
      console.error('Error fetching trainer:', error);
      // Use dummy data when API fails
      const dummyTrainer = dummyTrainers[id];
      if (dummyTrainer) {
        setTrainer(dummyTrainer);
        setSpecializations(dummyTrainer.specializations || []);
        setWriteUp(dummyTrainer.bio || "");
      } else {
        setError('Trainer not found');
      }
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

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCourseSelect = (courseId: string) => {
    const selectedCourse = availableCourses.find(course => course.id === courseId);
    if (selectedCourse) {
      setFormData(prev => ({
        ...prev,
        courseTitle: selectedCourse.title,
        courseCode: selectedCourse.code
      }));
    }
  };

  const handleAddTrainingFee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.courseTitle || !formData.feesPerRun) {
      toast({ title: "Error", description: "Course title and fees are required", variant: "destructive" });
      return;
    }

    const newFee: TrainingFee = {
      id: Date.now().toString(),
      courseCode: formData.courseCode,
      feesPerRun: formData.feesPerRun,
      remarks: formData.remarks
    };

    setTrainingFees(prev => [...prev, newFee]);
    setFormData({ courseTitle: "", courseCode: "", feesPerRun: "", remarks: "" });
    setIsAddFeeDialogOpen(false);
    toast({ title: "Success", description: "Training fee added successfully" });
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

      {/* Training Fee Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-foreground">Training Fee</h2>
          <Dialog open={isAddFeeDialogOpen} onOpenChange={setIsAddFeeDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Training Fee
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-background border z-50">
              <DialogHeader>
                <DialogTitle>Add Training Fee</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddTrainingFee} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="courseTitle">Course Title *</Label>
                  <Select onValueChange={handleCourseSelect} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border z-50">
                      {availableCourses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="courseCode">Course Code</Label>
                  <Input
                    id="courseCode"
                    value={formData.courseCode}
                    readOnly
                    placeholder="Auto-filled based on course selection"
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feesPerRun">Fees (per run) *</Label>
                  <Input
                    id="feesPerRun"
                    value={formData.feesPerRun}
                    onChange={(e) => handleFormChange("feesPerRun", e.target.value)}
                    placeholder="e.g., $2,500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea
                    id="remarks"
                    value={formData.remarks}
                    onChange={(e) => handleFormChange("remarks", e.target.value)}
                    placeholder="Additional notes or comments"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddFeeDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Add Fee</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course Code</TableHead>
                <TableHead>Fees (per run)</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trainingFees.length > 0 ? (
                trainingFees.map((fee) => (
                  <TableRow key={fee.id}>
                    <TableCell className="font-medium">{fee.courseCode}</TableCell>
                    <TableCell>{fee.feesPerRun}</TableCell>
                    <TableCell>{fee.remarks}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                    No training fees added yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <TrainerCalendar trainerId={trainer.id} trainerName={trainer.name} />
    </div>
  );
};

export default TrainerDetail;