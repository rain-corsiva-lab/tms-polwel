import { useParams, Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Mail, Phone, Calendar, Edit, Loader2 } from "lucide-react";
import { formatDateDDMMYYYY } from "@/lib/utils";
import TrainerCalendar from "@/components/TrainerCalendar";
import { EditProfileDialog } from "@/components/EditProfileDialog";
import { trainersApi, coursesApi } from "@/lib/api";
import Swal from "sweetalert2";
import { useToast } from "@/hooks/use-toast";

interface Trainer {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  contactNumber?: string;
  onboardingDate?: string | null;
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
        contactNumber: "+65 9123 4567",
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
        contactNumber: "+65 8765 4321",
        partnerOrganization: "Skills Academy",
        bio: "Certified communication specialist with expertise in presentation skills and public speaking. Helps professionals develop confidence and clarity in their communication.",
        specializations: ["Communication Skills", "Presentation Skills", "Public Speaking"],
        certifications: ["Communication Specialist", "Presentation Coach"],
        createdAt: "2023-10-15T00:00:00Z",
        updatedAt: "2024-08-11T14:15:00Z",
      },
      "3": {
        id: "3",
        name: "Michael Wong",
        email: "michael.wong@techtraining.com",
        role: "TRAINER",
        status: "PENDING",
        contactNumber: "+65 6543 2109",
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
        contactNumber: "+65 6555 1234",
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
      // use central API client that handles auth
      const resp = await coursesApi.getAll({ limit: 200 });
      let list: any[] = [];
      if (resp && resp.success && resp.data && Array.isArray(resp.data.courses)) {
        list = resp.data.courses;
      } else if (resp && Array.isArray((resp as any).data)) {
        list = (resp as any).data;
      } else if (Array.isArray(resp)) {
        list = resp;
      } else if (resp && resp.data && Array.isArray((resp as any).data.courses)) {
        list = (resp as any).data.courses;
      }

      if (Array.isArray(list)) {
        setCourseOptions(list.map((c: any) => ({ id: c.id, courseCode: c.courseCode, title: c.title })));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // If the page was opened with ?openFee=1, open the dialog once courseOptions are loaded
  const openFeeHandled = useRef(false);
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (!openFeeHandled.current && params.get("openFee") && courseOptions.length > 0) {
        openFeeHandled.current = true;
        setEditingFee(null);
        setShowFeeDialog(true);
        // remove param so it doesn't reopen repeatedly
        params.delete("openFee");
        const newQuery = params.toString();
        const newUrl = window.location.pathname + (newQuery ? `?${newQuery}` : "");
        window.history.replaceState({}, "", newUrl);
      }
    } catch (err) {
      // ignore
    }
  }, [courseOptions]);

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
      setShowFeeDialog(false);
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
      ACTIVE: "default",
      INACTIVE: "destructive",
      PENDING: "outline",
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

      {/* Layout rows: contact/profile, training fees, calendar/events */}
      <div className="grid gap-6 lg:grid-cols-2">
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
            {trainer.contactNumber && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{trainer.contactNumber}</span>
              </div>
            )}
            {trainer.onboardingDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{formatDateDDMMYYYY(trainer.onboardingDate)}</span>
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
        {/* Training Fee full width */}
        <Card className="lg:col-span-2">
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
                  <th className="text-left p-2">Course Name</th>
                  <th className="text-left p-2">Fees (per run)</th>
                  <th className="text-left p-2">Remarks</th>
                  <th className="p-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {fees.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted-foreground">
                      No fees added
                    </td>
                  </tr>
                )}
                {fees.map((f) => (
                  <tr key={f.id} className="border-t">
                    <td className="p-2 whitespace-nowrap">{f.course.courseCode || "N/A"}</td>
                    <td className="p-2">{f.course.title}</td>
                    <td className="p-2">{`$${f.feePerRun.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
                    <td className="p-2 max-w-[250px] truncate" title={f.remarks || ""}>
                      {f.remarks || ""}
                    </td>
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
        {/* Calendar and events */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{trainer.name} Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <TrainerCalendar
              trainerId={trainer.id}
              trainerName={trainer.name}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              onEventsChange={setSelectedDateEvents}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{selectedDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</CardTitle>
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
          onSubmitAdd={(data) => addFee(data)}
          onSubmitUpdate={(data) => editingFee && updateFee(editingFee.id, data)}
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
  onSubmitAdd,
  onSubmitUpdate,
}: {
  open: boolean;
  editing: boolean;
  fee?: TrainerFee;
  courseOptions: CourseOption[];
  onClose: () => void;
  onSubmitAdd: (data: { courseId: string; feePerRun: number; remarks?: string }) => void;
  onSubmitUpdate: (data: { courseId: string; feePerRun: number; remarks?: string }) => void;
}) => {
  const [courseId, setCourseId] = useState(fee?.course.id || "");
  const [feePerRun, setFeePerRun] = useState(fee ? fee.feePerRun.toString() : "");
  const [remarks, setRemarks] = useState(fee?.remarks || "");
  const { toast } = useToast();
  useEffect(() => {
    // sync with props when editing fee changes
    setCourseId(fee?.course.id || "");
    setFeePerRun(fee ? fee.feePerRun.toString() : "");
    setRemarks(fee?.remarks || "");
  }, [fee]);
  const sanitizeMoneyInput = (v: string) => {
    // keep digits and dot only, allow single dot and max 2 decimals
    let s = v.replace(/[^0-9.]/g, "");
    const parts = s.split(".");
    if (parts.length > 2) s = parts[0] + "." + parts.slice(1).join("");
    if (s.includes(".")) {
      const [intPart, decPart] = s.split(".");
      s = intPart + "." + (decPart || "").slice(0, 2);
    }
    return s;
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing && !courseId) {
      toast({ title: "Course required", variant: "destructive" });
      return;
    }
    const sanitized = sanitizeMoneyInput(feePerRun);
    const num = parseFloat(sanitized);
    if (isNaN(num)) {
      toast({ title: "Fee must be number", variant: "destructive" });
      return;
    }
    if (editing) {
      onSubmitUpdate({ courseId: courseId || fee!.course.id, feePerRun: num, remarks: remarks || undefined });
    } else {
      onSubmitAdd({ courseId: courseId || fee!.course.id, feePerRun: num, remarks: remarks || undefined });
    }
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
            <input
              value={feePerRun}
              onChange={(e) => setFeePerRun(sanitizeMoneyInput(e.target.value))}
              className="w-full border rounded p-2"
              placeholder="e.g., 2500"
              required
              inputMode="decimal"
              pattern="^[0-9]+(\.[0-9]{0,2})?$"
            />
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
