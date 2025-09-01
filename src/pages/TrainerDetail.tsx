import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Mail, Phone, Calendar, Edit, Loader2 } from "lucide-react";
import TrainerCalendar from "@/components/TrainerCalendar";
import { EditProfileDialog } from "@/components/EditProfileDialog";
import { trainersApi } from "@/lib/api";
import Swal from "sweetalert2";
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

interface TrainerFee {
  id: string;
  feePerRun: number;
  remarks?: string | null;
  course: { id: string; courseCode?: string; title: string };
}
interface CourseOption {
  id: string;
  courseCode?: string;
  title: string;
}

const TrainerDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();

  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedDateEvents, setSelectedDateEvents] = useState<{ courseRuns: any[]; blockouts: any[] }>({ courseRuns: [], blockouts: [] });
  const [fees, setFees] = useState<TrainerFee[]>([]);
  const [courseOptions, setCourseOptions] = useState<CourseOption[]>([]);
  const [showFeeDialog, setShowFeeDialog] = useState(false);
  const [editingFee, setEditingFee] = useState<TrainerFee | null>(null);

  // State for editable profile data
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [writeUp, setWriteUp] = useState("");

  useEffect(() => {
    if (id) {
      fetchTrainer();
      loadFees();
      loadCourses();
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
        updatedAt: "2024-08-12T10:30:00Z",
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
        updatedAt: "2024-08-11T14:15:00Z",
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
        updatedAt: "2024-08-01T00:00:00Z",
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
        updatedAt: "2024-08-10T09:00:00Z",
      },
    };

    try {
      setLoading(true);
      setError(null);
      const data = await trainersApi.getById(id);
      setTrainer(data);
      setSpecializations(data.specializations || []);
      setWriteUp(data.bio || "");
    } catch (error) {
      console.error("Error fetching trainer:", error);
      // Use dummy data when API fails
      const dummyTrainer = dummyTrainers[id];
      if (dummyTrainer) {
        setTrainer(dummyTrainer);
        setSpecializations(dummyTrainer.specializations || []);
        setWriteUp(dummyTrainer.bio || "");
      } else {
        setError("Trainer not found");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = () => {
    // Refresh trainer data after profile update
    fetchTrainer();
    setShowEditProfile(false);
  };

  const loadFees = async () => {
    if (!id) return;
    try {
      const resp = await trainersApi.getFees(id);
      setFees(resp.fees || []);
    } catch (e) {
      console.error(e);
    }
  };
  const loadCourses = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/courses?limit=200`, {
        headers: { Authorization: localStorage.getItem("token") ? `Bearer ${localStorage.getItem("token")}` : "" },
      });
      if (res.ok) {
        const json = await res.json();
        const list = json.courses || json.data || [];
        setCourseOptions(list.map((c: any) => ({ id: c.id, courseCode: c.courseCode, title: c.title })));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addFee = async (data: { courseId: string; feePerRun: number; remarks?: string }) => {
    if (!id) return;
    try {
      const resp = await trainersApi.createFee(id, data);
      setFees((prev) => [resp.fee, ...prev]);
      setShowFeeDialog(false);
      toast({ title: "Fee added" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed", variant: "destructive" });
    }
  };
  const updateFee = async (feeId: string, data: { feePerRun?: number; remarks?: string }) => {
    if (!id) return;
    try {
      const resp = await trainersApi.updateFee(id, feeId, data);
      setFees((prev) => prev.map((f) => (f.id === feeId ? resp.fee : f)));
      setEditingFee(null);
      toast({ title: "Fee updated" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed", variant: "destructive" });
    }
  };
  const deleteFee = async (fee: TrainerFee) => {
    if (!id) return;
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Delete fee for ${(fee.course.courseCode || "") + " - " + fee.course.title}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    try {
      await trainersApi.deleteFee(id, fee.id);
      setFees((prev) => prev.filter((f) => f.id !== fee.id));
      await Swal.fire({ title: "Deleted", icon: "success", timer: 1500, showConfirmButton: false });
    } catch (e: any) {
      await Swal.fire({ title: "Error", text: e.message || "Failed", icon: "error" });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      Available: "default",
      AVAILABLE: "default",
      Unavailable: "secondary",
      UNAVAILABLE: "secondary",
      Limited: "outline",
      LIMITED: "outline",
    } as const;

    return (
      <Badge className=" w-fit self-center" variant={variants[status as keyof typeof variants] || "secondary"}>
        {status}
      </Badge>
    );
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
              <p className="text-gray-600 mb-4">{error || "Trainer not found"}</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Contact & Profile */}
        <div className="lg:col-span-1 space-y-6">
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
              <Button size="sm" variant="outline" onClick={() => setShowEditProfile(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
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
                <p className="text-sm text-muted-foreground leading-relaxed">{writeUp || trainer.bio || "No bio available"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center Column - Calendar */}
        <div className="lg:col-span-1 space-y-6">
          <TrainerCalendar
            trainerId={trainer.id}
            trainerName={trainer.name}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            onEventsChange={setSelectedDateEvents}
          />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Training Fee</CardTitle>
              <Button
                size="sm"
                onClick={() => {
                  setEditingFee(null);
                  setShowFeeDialog(true);
                }}
              >
                Add Training Fee
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left p-2">Course Code</th>
                    <th className="text-left p-2">Fees (per run)</th>
                    <th className="text-left p-2">Remarks</th>
                    <th className="p-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {fees.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-muted-foreground">
                        No fees added
                      </td>
                    </tr>
                  )}
                  {fees.map((f) => (
                    <tr key={f.id} className="border-t">
                      <td className="p-2">{f.course.courseCode || "N/A"}</td>
                      <td className="p-2">${`$${f.feePerRun.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
                      <td className="p-2">{f.remarks || ""}</td>
                      <td className="p-2 text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingFee(f);
                            setShowFeeDialog(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteFee(f)}>
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Selected Date Events */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </CardTitle>
              <CardDescription>Events and blockouts for selected date</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedDateEvents.courseRuns.length > 0 || selectedDateEvents.blockouts.length > 0 ? (
                <div className="space-y-3">
                  {selectedDateEvents.courseRuns.map((run: any) => (
                    <div key={run.id} className="p-3 border rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="font-medium">{run.courseName}</span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {run.startTime} - {run.endTime}
                          </span>
                        </div>
                        {run.venue && (
                          <div className="flex items-center space-x-1">
                            <Mail className="h-3 w-3" />
                            <span>{run.venue.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {selectedDateEvents.blockouts.map((blockout: any) => (
                    <div key={blockout.id} className="p-3 border rounded-lg bg-red-50">
                      <div className="flex items-center space-x-2 mb-2">
                        <Calendar className="h-4 w-4 text-red-500" />
                        <span className="font-medium text-red-700">{blockout.reason}</span>
                      </div>
                      <div className="text-sm text-red-600">
                        <div>Unavailable</div>
                        {blockout.description && <div className="mt-1">{blockout.description}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No events scheduled for this date</p>
                  <p className="text-sm text-muted-foreground">Click "Add Blockout Date Range" to block this date</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <EditProfileDialog
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        profile={{
          id: trainer.id,
          name: trainer.name,
          email: trainer.email,
          bio: trainer.bio,
          specializations: trainer.specializations,
          experience: trainer.experience,
        }}
        onProfileUpdated={handleProfileSave}
      />
      {showFeeDialog && (
        <FeeDialog
          open={showFeeDialog}
          editing={!!editingFee}
          fee={editingFee || undefined}
          courseOptions={courseOptions}
          onClose={() => {
            setShowFeeDialog(false);
            setEditingFee(null);
          }}
          onSubmit={(data) => (editingFee ? updateFee(editingFee.id, data) : addFee(data))}
        />
      )}
    </div>
  );
};

const FeeDialog = ({
  open,
  editing,
  fee,
  courseOptions,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editing: boolean;
  fee?: TrainerFee;
  courseOptions: CourseOption[];
  onClose: () => void;
  onSubmit: (data: { courseId: string; feePerRun: number; remarks?: string }) => void;
}) => {
  const [courseId, setCourseId] = useState(fee?.course.id || "");
  const [feePerRun, setFeePerRun] = useState(fee ? fee.feePerRun.toString() : "");
  const [remarks, setRemarks] = useState(fee?.remarks || "");
  const { toast } = useToast();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing && !courseId) {
      toast({ title: "Course required", variant: "destructive" });
      return;
    }
    const num = parseFloat(feePerRun);
    if (isNaN(num)) {
      toast({ title: "Fee must be number", variant: "destructive" });
      return;
    }
    onSubmit({ courseId: courseId || fee!.course.id, feePerRun: num, remarks: remarks || undefined });
  };
  if (!open) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <div className="bg-background rounded-md w-full max-w-md p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">{editing ? "Edit" : "Add"} Training Fee</h3>
          <button onClick={onClose}>×</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {!editing && (
            <div>
              <label className="text-sm font-medium mb-1 block">Course Code *</label>
              <select className="w-full border rounded p-2" value={courseId} onChange={(e) => setCourseId(e.target.value)} required>
                <option value="">Select course</option>
                {courseOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {(c.courseCode || "N/A") + " - " + c.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-sm font-medium mb-1 block">Fees (per run) *</label>
            <input value={feePerRun} onChange={(e) => setFeePerRun(e.target.value)} className="w-full border rounded p-2" placeholder="e.g., 2500" required />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Remarks</label>
            <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} className="w-full border rounded p-2" rows={3} />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{editing ? "Update Fee" : "Add Fee"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TrainerDetail;
