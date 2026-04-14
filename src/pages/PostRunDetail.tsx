import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import DateInput from "@/components/ui/date-input";
import { useToast } from "@/hooks/use-toast";
import { courseRunsApi } from "@/lib/api";
import { formatDate } from "@/lib/date";
import { getErrorMessage } from "@/lib/errorHandler";
import { ArrowLeft, Calendar, MapPin, Users, Save, Plus, Trash2, Loader2, Check, ChevronsUpDown, X, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import Swal from "sweetalert2";

interface CourseRunDetails {
  id: string;
  serialNumber?: string;
  courseRunType?: string;
  course?: {
    id: string;
    title: string;
    courseCode: string;
    category?: string;
  };
  startDatetime: string;
  endDatetime: string;
  venue?: {
    id: string;
    name: string;
    address: string;
  };
  specifiedLocation?: string;
  minClassSize?: number;
  maxClassSize?: number;
  currentParticipants?: number;
  status: string;
  baseCourseFee?: number | null;
  feeType?: string | null;
  courseRunFeeType?: string | null;
  venueFinalFee?: number | null;
  contractFees?: number | null;
  additionalCostExceedingCapacity?: number | null;
  trainers?: Array<{
    id: string;
    user?: {
      id: string;
      name: string;
      email: string;
    };
    role?: string;
  }>;
  billing?: {
    id: string;
    valueOfWorkDone?: number;
    contractFeePBMSBENumber?: string;
    contractPBMSInvoiceDate?: string;
    contractInvoiceAmount?: number;
    venuePBMSBENumber?: string;
    venuePBMSInvoiceDate?: string;
    venueInvoiceAmount?: number;
    finalRemarks?: string;
    courseRunBillingEntries?: Array<{
      id: string;
      pbmsInvoiceNumber?: string;
      pbmsInvoiceDate?: string;
      invoiceAmount?: number;
      remarks?: string;
    }>;
  };
}

interface Learner {
  id: string;
  name: string;
  email: string;
  nricOrPassport?: string;
  contactNumber?: string;
  discountType?: string;
  discountPercentage?: number;
  courseFee?: number;
  paymentMode?: string;
  status?: string;
  attendanceStatus?: string;
  enrollmentStatus?: string;
  waiverStatus?: string;
}

interface BillingEntry {
  id?: string;
  pbmsInvoiceNumber: string;
  pbmsInvoiceDate: string;
  invoiceAmount: string;
  learnerIds: string[];
  remarks: string;
}

interface BillingFormData {
  valueOfWorkDone: string;
  contractFeePBMSBENumber: string;
  contractPBMSInvoiceDate: string;
  contractInvoiceAmount: string;
  venuePBMSBENumber: string;
  venuePBMSInvoiceDate: string;
  venueInvoiceAmount: string;
  finalRemarks: string;
  entries: BillingEntry[];
}

const createEmptyBillingEntry = (): BillingEntry => ({
  pbmsInvoiceNumber: "",
  pbmsInvoiceDate: "",
  invoiceAmount: "",
  learnerIds: [],
  remarks: "",
});

const createEmptyBillingForm = (): BillingFormData => ({
  valueOfWorkDone: "",
  contractFeePBMSBENumber: "",
  contractPBMSInvoiceDate: "",
  contractInvoiceAmount: "",
  venuePBMSBENumber: "",
  venuePBMSInvoiceDate: "",
  venueInvoiceAmount: "",
  finalRemarks: "",
  entries: [createEmptyBillingEntry()],
});

const PostRunDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [courseRun, setCourseRun] = useState<CourseRunDetails | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [availableLearners, setAvailableLearners] = useState<Learner[]>([]);
  const [learnerSearchOpen, setLearnerSearchOpen] = useState<{ [key: number]: boolean }>({});
  const [learnerSearch, setLearnerSearch] = useState<{ [key: number]: string }>({});
  const [attendeesCount, setAttendeesCount] = useState<number>(0);

  // Billing form is always editable regardless of course run status
  const isCompleted = false;

  const [billingForm, setBillingForm] = useState<BillingFormData>(() => createEmptyBillingForm());

  const fetchCourseRunDetails = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const response = await courseRunsApi.getById(id);

      if (!response?.success) {
        throw new Error(response?.message || "Failed to load course run details");
      }

      const isCourseRunLike = (value: any) =>
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        ("id" in value || "course" in value || "courseRunLearners" in value || "startDatetime" in value);

      const courseRunCandidates = [
        response?.courseRun,
        response?.data?.courseRun,
        response?.data?.course_run,
        response?.data?.courseRunDetail,
        response?.data,
        response?.result?.courseRun,
        response?.result,
      ];

      const cr: any = courseRunCandidates.find(isCourseRunLike);

      if (!cr) {
        throw new Error("Course run payload missing in API response");
      }

      // Normalize trainers from course_run_trainers
      const trainers = Array.isArray(cr.courseRunTrainers)
        ? cr.courseRunTrainers
            .map((crt: any) =>
              crt?.trainer
                ? {
                    id: crt.trainer.id,
                    user: {
                      id: crt.trainer.id,
                      name: crt.trainer.name,
                      email: crt.trainer.email,
                    },
                    role: crt.role,
                  }
                : null,
            )
            .filter(Boolean)
        : [];

      const normalizedCourseRun = {
        ...cr,
        trainers,
        billing: cr.billing ?? cr.courseRunBilling ?? null,
        courseRunBilling: cr.courseRunBilling ?? cr.billing ?? null,
      };

      setCourseRun(normalizedCourseRun);

      const billingSource = normalizedCourseRun.billing;

      if (billingSource) {
        const mapAmount = (value: any) => {
          if (value === null || value === undefined) return "";
          const num = Number(value);
          return Number.isNaN(num) ? String(value) : num.toString();
        };

        const resolvedEntries = Array.isArray(billingSource.courseRunBillingEntries)
          ? billingSource.courseRunBillingEntries.map((entry: any) => ({
              id: entry.id,
              pbmsInvoiceNumber: entry.pbmsInvoiceNumber || "",
              pbmsInvoiceDate: entry.pbmsInvoiceDate || "",
              invoiceAmount: mapAmount(entry.invoiceAmount),
              learnerIds: Array.isArray(entry.courseRunLearners)
                ? entry.courseRunLearners.map((crl: any) => crl?.learnerId || crl?.learner_id || crl?.learner?.id).filter(Boolean)
                : [],
              remarks: entry.remarks || "",
            }))
          : [];

        setBillingForm({
          valueOfWorkDone: mapAmount(billingSource.valueOfWorkDone),
          contractFeePBMSBENumber: billingSource.contractFeePBMSBENumber || "",
          contractPBMSInvoiceDate: billingSource.contractPBMSInvoiceDate || "",
          contractInvoiceAmount: mapAmount(billingSource.contractInvoiceAmount),
          venuePBMSBENumber: billingSource.venuePBMSBENumber || "",
          venuePBMSInvoiceDate: billingSource.venuePBMSInvoiceDate || "",
          venueInvoiceAmount: mapAmount(billingSource.venueInvoiceAmount),
          finalRemarks: billingSource.finalRemarks || "",
          entries: resolvedEntries.length > 0 ? resolvedEntries : [createEmptyBillingEntry()],
        });
      } else {
        // Pre-fill contract and venue invoice amounts from course run data
        const contractFeesVal = Number(cr.contractFees ?? 0);
        const additionalCostVal = Number(cr.additionalCostExceedingCapacity ?? 0);
        const preFillContractAmount = contractFeesVal + additionalCostVal;
        const preFillVenueAmount = Number(cr.venueFinalFee ?? 0);

        setBillingForm({
          ...createEmptyBillingForm(),
          contractInvoiceAmount: preFillContractAmount > 0 ? preFillContractAmount.toFixed(2) : "",
          venueInvoiceAmount: preFillVenueAmount > 0 ? preFillVenueAmount.toFixed(2) : "",
        });
      }

      // Fetch learners enrolled in this course run and normalize
      const learnersResponse = await courseRunsApi.getLearners(id);
      if (learnersResponse?.success && Array.isArray(learnersResponse.learners)) {
        const flattened: Learner[] = learnersResponse.learners
          .map((en: any) => {
            // Backend returns enrollment with nested learner
            const l = en?.learner;
            if (!l) return null;
            const name = l.fullname || l.name || "";
            const email = l.email || "";
            // Use currentDefaultCourseFee from enrollment if present
            const courseFee = Number(en?.currentDefaultCourseFee ?? en?.courseFee ?? l?.courseFee ?? 0);
            // Discount percentage usually on enrollment
            const discountPercentage = Number(en?.discountPercentage ?? l?.discountPercentage ?? 0);
            const discountType = en?.discountType ?? l?.discountType ?? undefined;
            const paymentMode = en?.paymentMode ?? l?.paymentMode ?? undefined;
            const status = en?.status ?? l?.status ?? undefined;
            const attendanceStatus = en?.attendanceStatus ?? undefined;
            const enrollmentStatus = en?.enrollmentStatus ?? undefined;
            const waiverStatus = en?.waiverStatus ?? undefined;

            return {
              id: l.id, // use learner id consistently for selection
              name,
              email,
              courseFee,
              discountPercentage,
              discountType,
              paymentMode,
              status,
              attendanceStatus,
              enrollmentStatus,
              waiverStatus,
            } as Learner;
          })
          .filter(Boolean) as Learner[];

        setAvailableLearners(flattened);
        setAttendeesCount(flattened.length);
        console.log("Fetched learners(flattened):", flattened);
      } else {
        console.warn("No participants found or API call failed");
      }
    } catch (error: any) {
      console.error("Error fetching course run:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to load course run details"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchCourseRunDetails();
  }, [fetchCourseRunDetails]);

  const handleAddEntry = () => {
    setBillingForm((prev) => ({
      ...prev,
      entries: [
        ...prev.entries,
        {
          pbmsInvoiceNumber: "",
          pbmsInvoiceDate: "",
          invoiceAmount: "",
          learnerIds: [],
          remarks: "",
        },
      ],
    }));
  };

  const handleRemoveEntry = (index: number) => {
    if (billingForm.entries.length === 1) {
      toast({
        title: "Cannot remove",
        description: "At least one entry is required",
        variant: "destructive",
      });
      return;
    }

    setBillingForm((prev) => {
      const updatedEntries = prev.entries.filter((_, i) => i !== index);
      // Recalculate total invoice amount and auto-update Value of Work Done
      const totalInvoiceAmount = updatedEntries.reduce((sum, entry) => {
        const amount = parseFloat(entry.invoiceAmount) || 0;
        return sum + amount;
      }, 0);

      return {
        ...prev,
        entries: updatedEntries,
        // Auto-update Value of Work Done when entry is removed
        valueOfWorkDone: totalInvoiceAmount > 0 ? totalInvoiceAmount.toFixed(2) : prev.valueOfWorkDone,
      };
    });
  };

  const handleEntryChange = (index: number, field: keyof BillingEntry, value: any) => {
    setBillingForm((prev) => {
      const updatedEntries = prev.entries.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry));

      // If learnerIds changed, recalculate invoice amount
      if (field === "learnerIds") {
        // Duplicate validation: a learner cannot appear in more than one entry
        const allIds = updatedEntries.flatMap((e) => e.learnerIds.map((id) => ({ id, entryIndex: updatedEntries.indexOf(e) })));
        const seen = new Map<string, number>();
        let duplicateName: string | null = null;
        for (const { id: lid, entryIndex } of allIds) {
          if (seen.has(lid) && seen.get(lid) !== entryIndex) {
            const l = availableLearners.find((x) => x.id === lid);
            duplicateName = l?.name || l?.email || lid;
            break;
          }
          seen.set(lid, entryIndex);
        }
        if (duplicateName) {
          // revert the change
          return {
            ...prev,
            entries: prev.entries,
          };
        }
        const calculatedAmount = calculateInvoiceAmount(value);
        updatedEntries[index].invoiceAmount = calculatedAmount;
      }

      // Calculate total invoice amount and auto-update Value of Work Done
      const totalInvoiceAmount = updatedEntries.reduce((sum, entry) => {
        const amount = parseFloat(entry.invoiceAmount) || 0;
        return sum + amount;
      }, 0);

      return {
        ...prev,
        entries: updatedEntries,
        // Auto-update Value of Work Done when invoice amounts change
        valueOfWorkDone: totalInvoiceAmount > 0 ? totalInvoiceAmount.toFixed(2) : prev.valueOfWorkDone,
      };
    });
    if (field === "learnerIds") {
      // Show toast after state update attempt (duplicate handled via early return above)
      const entries = (billingForm.entries || []).map((e) => e.learnerIds);
      const flattened = entries.flat();
      const duplicates = flattened.filter((id, i) => flattened.indexOf(id) !== i);
      if (duplicates.length > 0) {
        const first = duplicates[0];
        const l = availableLearners.find((x) => x.id === first);
        toast({
          title: "Duplicate learner",
          description: `${l?.name || l?.email || "A learner"} is selected in more than one billing entry. Each learner can only belong to one entry.`,
          variant: "destructive",
        });
      }
    }
  };

  const calculateInvoiceAmount = (learnerIds: string[]): string => {
    const selectedLearners = availableLearners.filter((l) => learnerIds.includes(l.id));
    const totalAmount = selectedLearners.reduce((sum, learner) => {
      const baseAmount = learner.courseFee || 0;
      const discountPercentage = learner.discountPercentage || 0;
      const discountAmount = (baseAmount * discountPercentage) / 100;
      return sum + (baseAmount - discountAmount);
    }, 0);
    return totalAmount.toFixed(2);
  };

  // Calculate total invoice amount from all entries
  const calculateTotalInvoiceAmount = (): string => {
    const total = billingForm.entries.reduce((sum, entry) => {
      const amount = parseFloat(entry.invoiceAmount) || 0;
      return sum + amount;
    }, 0);
    return total.toFixed(2);
  };

  const handleSaveBilling = async (markAsCompleted: boolean = false) => {
    if (!id) return;

    // Validation
    if (!billingForm.valueOfWorkDone) {
      toast({
        title: "Validation Error",
        description: "Value of Work Done is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      const payload = {
        courseRunId: id,
        valueOfWorkDone: parseInt(billingForm.valueOfWorkDone) || 0,
        contractFeePBMSBENumber: billingForm.contractFeePBMSBENumber,
        contractPBMSInvoiceDate: billingForm.contractPBMSInvoiceDate || null,
        contractInvoiceAmount: billingForm.contractInvoiceAmount ? parseFloat(billingForm.contractInvoiceAmount) : null,
        venuePBMSBENumber: billingForm.venuePBMSBENumber,
        venuePBMSInvoiceDate: billingForm.venuePBMSInvoiceDate || null,
        venueInvoiceAmount: billingForm.venueInvoiceAmount ? parseFloat(billingForm.venueInvoiceAmount) : null,
        finalRemarks: billingForm.finalRemarks,
        entries: billingForm.entries.map((entry) => ({
          pbmsInvoiceNumber: entry.pbmsInvoiceNumber,
          pbmsInvoiceDate: entry.pbmsInvoiceDate || null,
          invoiceAmount: entry.invoiceAmount ? parseFloat(entry.invoiceAmount) : null,
          learnerIds: entry.learnerIds,
          remarks: entry.remarks,
        })),
        markAsCompleted,
      };

      const response = await courseRunsApi.saveBilling(payload);

      if (response?.success) {
        if (markAsCompleted) {
          toast({
            title: "Success",
            description: "Billing saved and course run marked as completed.",
          });
          navigate("/post-run-management");
        } else {
          toast({
            title: "Saved",
            description: "Billing information saved successfully.",
          });
          await fetchCourseRunDetails();
        }
      } else {
        throw new Error(response?.message || "Failed to save billing information");
      }
    } catch (error: any) {
      console.error("Error saving billing:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to save billing information"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!courseRun) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Course run not found</p>
          <Button onClick={() => navigate("/post-run-management")} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Post Run Management
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/post-run-management")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{courseRun.course?.title || "Course Run"}</h1>
            <p className="text-muted-foreground">
              {courseRun.course?.courseCode || courseRun.serialNumber} • {courseRun.courseRunType || courseRun.course?.category || "—"}
            </p>
          </div>
          <Badge
            className={
              courseRun.status === "COMPLETED"
                ? "bg-emerald-600 text-white"
                : courseRun.status === "INCOMPLETED"
                  ? "bg-orange-100 text-orange-800"
                  : courseRun.status === "CANCELLED"
                    ? "bg-red-100 text-red-800"
                    : "bg-amber-100 text-amber-800"
            }
          >
            {courseRun.status === "COMPLETED"
              ? "Completed"
              : courseRun.status === "INCOMPLETED"
                ? "Incomplete"
                : courseRun.status === "CANCELLED"
                  ? "Cancelled"
                  : "Pending Billing"}
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Date of Course Run */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">Date of Course Run</span>
                </div>
                <div className="text-2xl font-bold">{formatDate(courseRun.startDatetime)}</div>
                <div className="text-sm text-muted-foreground">to {formatDate(courseRun.endDatetime)}</div>
              </CardContent>
            </Card>

            {/* Trainer(s) */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">Trainer(s)</span>
                </div>
                <div className="text-2xl font-bold">
                  {courseRun.trainers && courseRun.trainers.length > 0
                    ? courseRun.trainers
                        .map((t) => t.user?.name)
                        .filter(Boolean)
                        .join(", ")
                    : "—"}
                </div>
                {courseRun.trainers && courseRun.trainers.length > 0 && (
                  <div className="text-sm text-muted-foreground">{courseRun.trainers.map((t) => t.role || "Trainer").join(", ")}</div>
                )}
              </CardContent>
            </Card>

            {/* Total Attendees */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">Total Attendees</span>
                </div>
                <div className="text-2xl font-bold">{attendeesCount || courseRun.currentParticipants || 0}</div>
                <div className="text-sm text-muted-foreground">Participants</div>
              </CardContent>
            </Card>
          </div>

          {/* Course Information */}
          <Card>
            <CardHeader>
              <CardTitle>Course Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Course Title</div>
                  <div className="font-medium">{courseRun.course?.title || "—"}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Course Code</div>
                  <div className="font-medium">{courseRun.course?.courseCode || courseRun.serialNumber || "—"}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Venue</div>
                  <div className="font-medium">{courseRun.venue?.name || courseRun.specifiedLocation || "—"}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Duration</div>
                  <div className="font-medium">
                    {(() => {
                      try {
                        const start = new Date(courseRun.startDatetime);
                        const end = new Date(courseRun.endDatetime);
                        const diffMs = end.getTime() - start.getTime();
                        if (isNaN(diffMs) || diffMs < 0) return "—";
                        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                        return `${diffDays} day${diffDays !== 1 ? "s" : ""}`;
                      } catch {
                        return "—";
                      }
                    })()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing">
          <div className="space-y-6">
            {/* Billing Rate Section */}
            <Card>
              <CardHeader>
                <CardTitle>Billing Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="billingRate">Billing Rate (Default Course Fee)</Label>
                    <Input
                      id="billingRate"
                      value={courseRun.baseCourseFee != null ? `$${Number(courseRun.baseCourseFee).toFixed(2)}` : "—"}
                      disabled
                      className="mt-2"
                    />
                    {(courseRun.courseRunFeeType || courseRun.feeType) && (
                      <p className="text-xs text-muted-foreground mt-1">Fee Type: {courseRun.courseRunFeeType || courseRun.feeType}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="valueOfWorkDone">Value of Work Done</Label>
                    <Input
                      id="valueOfWorkDone"
                      type="number"
                      placeholder="Enter total value of work done"
                      value={billingForm.valueOfWorkDone}
                      onChange={(e) => setBillingForm({ ...billingForm, valueOfWorkDone: e.target.value })}
                      disabled={isCompleted}
                      className="mt-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Billing Information Input */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Billing Information Input</CardTitle>
                {!isCompleted && (
                  <Button onClick={handleAddEntry} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Entry
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {billingForm.entries.map((entry, index) => (
                    <div key={index} className="border rounded-lg p-4 relative">
                      {!isCompleted && billingForm.entries.length > 1 && (
                        <Button variant="ghost" size="sm" className="absolute top-2 right-2" onClick={() => handleRemoveEntry(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}

                      <h4 className="font-medium mb-4">Entry {index + 1}</h4>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <Label htmlFor={`pbmsInvoiceNumber-${index}`}>PBMS Invoice Number</Label>
                          <Input
                            id={`pbmsInvoiceNumber-${index}`}
                            placeholder="Enter PBMS invoice number"
                            value={entry.pbmsInvoiceNumber}
                            onChange={(e) => handleEntryChange(index, "pbmsInvoiceNumber", e.target.value)}
                            disabled={isCompleted}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`pbmsInvoiceDate-${index}`}>PBMS Invoice Date</Label>
                          <DateInput
                            value={entry.pbmsInvoiceDate}
                            onChange={(date) => handleEntryChange(index, "pbmsInvoiceDate", date)}
                            disabled={isCompleted}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`invoiceAmount-${index}`}>Invoice Amount</Label>
                          <Input
                            id={`invoiceAmount-${index}`}
                            placeholder="Calculated from selected participants"
                            value={entry.invoiceAmount}
                            onChange={(e) => handleEntryChange(index, "invoiceAmount", e.target.value)}
                            disabled={isCompleted}
                            className="mt-2"
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <Label>Participants</Label>
                        <Popover
                          open={!isCompleted && (learnerSearchOpen[index] || false)}
                          onOpenChange={(open) => !isCompleted && setLearnerSearchOpen({ ...learnerSearchOpen, [index]: open })}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={learnerSearchOpen[index] || false}
                              className="w-full justify-between mt-2"
                              disabled={isCompleted}
                            >
                              <span className="truncate">
                                {entry.learnerIds.length > 0 ? `${entry.learnerIds.length} participant(s) selected` : "Select participants"}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0" align="start">
                            <div className="p-2 border-b">
                              <Input
                                placeholder="Search participants..."
                                value={learnerSearch[index] || ""}
                                onChange={(e) => {
                                  setLearnerSearch({ ...learnerSearch, [index]: e.target.value });
                                }}
                                className="h-9"
                              />
                            </div>
                            <div className="max-h-[300px] overflow-y-auto p-2">
                              {availableLearners.length === 0 ? (
                                <div className="text-center py-6 text-sm text-muted-foreground">No participants available</div>
                              ) : (
                                <div className="space-y-1">
                                  {availableLearners
                                    .filter((learner) => {
                                      const searchTerm = (learnerSearch[index] || "").toLowerCase();
                                      if (!searchTerm) return true;
                                      return learner.name.toLowerCase().includes(searchTerm) || learner.email.toLowerCase().includes(searchTerm);
                                    })
                                    .map((learner) => {
                                      const isSelected = entry.learnerIds.includes(learner.id);
                                      // Disable learners who are:
                                      // 1. Absent with APPROVED waiver (attendanceStatus === "ABSENT" AND waiverStatus === "APPROVED")
                                      // 2. Withdrawn (enrollmentStatus === "WITHDRAWN")
                                      // 3. Self-sponsored payment (paymentMode === "SELF_SPONSORED")
                                      // 4. Transition Dollars payment (paymentMode === "TRANSITION_DOLLARS")
                                      const isAbsent = learner.attendanceStatus === "ABSENT";
                                      const isAbsentWithApprovedWaiver = isAbsent && learner.waiverStatus === "APPROVED";
                                      const isWithdrawn = learner.enrollmentStatus === "WITHDRAWN";
                                      const isSelfPayment = learner.paymentMode === "SELF_SPONSORED";
                                      const isTransitionDollar = learner.paymentMode === "TRANSITION_DOLLARS";
                                      const isDisabled = isAbsentWithApprovedWaiver || isWithdrawn || isSelfPayment || isTransitionDollar;

                                      // Determine reason for being disabled
                                      let disabledReason = "";
                                      if (isAbsentWithApprovedWaiver) disabledReason = "Absent (Waiver Approved)";
                                      else if (isWithdrawn) disabledReason = "Withdrawn";
                                      else if (isSelfPayment || isTransitionDollar) disabledReason = "Already Paid";

                                      return (
                                        <div
                                          key={learner.id}
                                          className={`flex items-start gap-3 p-2 rounded-md ${
                                            isDisabled ? "opacity-50 cursor-not-allowed bg-gray-100" : "hover:bg-accent cursor-pointer"
                                          }`}
                                          onClick={() => {
                                            if (isDisabled) return;
                                            const newLearnerIds = isSelected
                                              ? entry.learnerIds.filter((id) => id !== learner.id)
                                              : [...entry.learnerIds, learner.id];
                                            handleEntryChange(index, "learnerIds", newLearnerIds);
                                          }}
                                        >
                                          <div className="flex items-center justify-center w-4 h-4 border rounded mt-0.5">
                                            {isSelected && <Check className="h-3 w-3" />}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm leading-tight">{learner.name}</div>
                                            <div className="text-xs text-muted-foreground leading-tight mt-0.5">
                                              {learner.email}
                                              {isDisabled && <span className="ml-2 text-red-600 font-medium">({disabledReason})</span>}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                        {entry.learnerIds.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {entry.learnerIds.map((lid) => {
                              const l = availableLearners.find((x) => x.id === lid);
                              if (!l) return null;
                              const fee = Number(l.courseFee || 0);
                              const pct = Number(l.discountPercentage || 0);
                              const net = fee - (fee * pct) / 100;
                              return (
                                <span key={lid} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-sm">
                                  {l.name || l.email} - ${net.toFixed(0)}
                                  {!isCompleted && (
                                    <button
                                      type="button"
                                      className="ml-1 opacity-70 hover:opacity-100"
                                      onClick={() => {
                                        const newLearnerIds = entry.learnerIds.filter((id) => id !== lid);
                                        handleEntryChange(index, "learnerIds", newLearnerIds);
                                      }}
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="mb-4">
                        <Label>Discounts Allocated (Applied to Selected Participants)</Label>
                        <div className="mt-2 p-4 border rounded-md bg-muted/50">
                          <div className="grid grid-cols-4 gap-2 text-sm font-medium text-muted-foreground mb-2">
                            <div>Learner</div>
                            <div>Discount Type</div>
                            <div>Percentage</div>
                            <div>Amount</div>
                          </div>
                          {entry.learnerIds.length === 0 ? (
                            <div className="text-sm text-muted-foreground text-center py-4">No discounts applied to selected participants</div>
                          ) : (
                            <div className="space-y-2">
                              {entry.learnerIds.map((learnerId) => {
                                const learner = availableLearners.find((l) => l.id === learnerId);
                                if (!learner) return null;
                                const fee = Number(learner.courseFee || 0);
                                const pct = Number(learner.discountPercentage || 0);
                                const amt = (fee * pct) / 100;
                                return (
                                  <div key={learnerId} className="grid grid-cols-4 gap-2 items-center text-sm">
                                    <div className="truncate">{learner.name || learner.email || learnerId}</div>
                                    <div>{learner.discountType || "—"}</div>
                                    <div>{pct ? `${pct}%` : "0%"}</div>
                                    <div>${amt.toFixed(2)}</div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor={`remarks-${index}`}>Remarks</Label>
                        <Textarea
                          id={`remarks-${index}`}
                          placeholder="Enter any remarks"
                          value={entry.remarks}
                          onChange={(e) => handleEntryChange(index, "remarks", e.target.value)}
                          disabled={isCompleted}
                          className="mt-2"
                          rows={3}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Contract and Venue Fees */}
            <Card>
              <CardHeader>
                <CardTitle>Contract and Venue Fees</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Contract Fees */}
                  <div>
                    <h4 className="font-medium mb-4">Contract Fees</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="contractFeePBMSBENumber">PBMS Business Expenditure Number</Label>
                        <Input
                          id="contractFeePBMSBENumber"
                          placeholder="Enter PBMS invoice number"
                          value={billingForm.contractFeePBMSBENumber}
                          onChange={(e) => setBillingForm({ ...billingForm, contractFeePBMSBENumber: e.target.value })}
                          disabled={isCompleted}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="contractPBMSInvoiceDate">PBMS Invoice Date</Label>
                        <DateInput
                          value={billingForm.contractPBMSInvoiceDate}
                          onChange={(date) => setBillingForm({ ...billingForm, contractPBMSInvoiceDate: date })}
                          disabled={isCompleted}
                        />
                      </div>
                      <div>
                        <Label htmlFor="contractInvoiceAmount">Invoice Amount</Label>
                        <Input
                          id="contractInvoiceAmount"
                          type="number"
                          placeholder="Enter invoice amount"
                          value={billingForm.contractInvoiceAmount}
                          onChange={(e) => setBillingForm({ ...billingForm, contractInvoiceAmount: e.target.value })}
                          disabled={isCompleted}
                          className="mt-2"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Venue Fees */}
                  <div>
                    <h4 className="font-medium mb-4">Venue Fees - {courseRun.venue?.name || "—"}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="venuePBMSBENumber">PBMS Business Expenditure Number</Label>
                        <Input
                          id="venuePBMSBENumber"
                          placeholder="Enter PBMS invoice number"
                          value={billingForm.venuePBMSBENumber}
                          onChange={(e) => setBillingForm({ ...billingForm, venuePBMSBENumber: e.target.value })}
                          disabled={isCompleted}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="venuePBMSInvoiceDate">PBMS Invoice Date</Label>
                        <DateInput
                          value={billingForm.venuePBMSInvoiceDate}
                          onChange={(date) => setBillingForm({ ...billingForm, venuePBMSInvoiceDate: date })}
                          disabled={isCompleted}
                        />
                      </div>
                      <div>
                        <Label htmlFor="venueInvoiceAmount">Invoice Amount</Label>
                        <Input
                          id="venueInvoiceAmount"
                          type="number"
                          placeholder="Enter invoice amount"
                          value={billingForm.venueInvoiceAmount}
                          onChange={(e) => setBillingForm({ ...billingForm, venueInvoiceAmount: e.target.value })}
                          disabled={isCompleted}
                          className="mt-2"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Remarks */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Remarks</CardTitle>
              </CardHeader>
              <CardContent>
                <Label htmlFor="finalRemarks">Final Remarks</Label>
                <Textarea
                  id="finalRemarks"
                  placeholder="Enter any additional remarks"
                  value={billingForm.finalRemarks}
                  onChange={(e) => setBillingForm({ ...billingForm, finalRemarks: e.target.value })}
                  disabled={isCompleted}
                  className="mt-2"
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" onClick={() => handleSaveBilling(false)} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save
                      </>
                    )}
                  </Button>
                  {courseRun.status !== "COMPLETED" && (
                    <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleSaveBilling(true)} disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Mark as Completed
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PostRunDetail;
