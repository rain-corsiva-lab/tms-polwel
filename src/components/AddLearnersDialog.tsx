import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, User, Trash2, ChevronsUpDown, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { courseRunsApi, clientOrganizationsApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Course {
  id: string;
  title: string;
  defaultCourseFee: number;
  discounts?: Array<{ id: string; name: string; percentage: number }>;
}

interface CourseRun {
  id: string;
  course: Course;
}

interface Organization {
  id: string;
  name: string;
  buNumber?: string;
}

interface TrainingCoordinator {
  id: string;
  name: string;
  email?: string;
  contactNumber?: string;
  isPrimaryCoordinator?: boolean;
}

interface Learner {
  id: string;
  fullname: string;
  designation?: string;
  email?: string;
  contact?: string;
  clientOrganizationId?: string;
  departmentName?: string;
}

interface SingleRegistrationData {
  selectedLearnerId?: string | null;
  fullName: string;
  designation: string;
  email: string;
  contactNumber: string;
  division: string;
  departmentName: string;
  buNumber: string;
  paymentMode: string;
  trainingCoordinatorId: string;
  trainingCoordinatorEmail: string;
  trainingCoordinatorPhone: string;
  currentDefaultCourseFee: number;
  discountId?: string | null;
  discountPercentage: number;
  totalFees: number;
  feesRemarks: string;
  invoiceNumber: string;
  remarks: string;
}

interface GroupLearnerData {
  selectedLearnerId?: string | null;
  fullName: string;
  designation: string;
  email: string;
  contactNumber: string;
}

interface GroupRegistrationData {
  division: string;
  departmentName: string;
  buNumber: string;
  paymentMode: string;
  trainingCoordinatorId: string;
  trainingCoordinatorEmail: string;
  trainingCoordinatorPhone: string;
  currentDefaultCourseFee: number;
  discountId?: string | null;
  discountPercentage: number;
  totalFees: number;
  feesRemarks: string;
  invoiceNumber: string;
  learners: GroupLearnerData[];
  remarks: string;
}

interface AddLearnersDialogProps {
  courseRun?: CourseRun;
  courseRunId?: string;
  baseCourseFee?: number;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerLabel?: string;
}

interface SearchableSelectOption {
  value: string;
  label: string;
  description?: string;
  meta?: Record<string, any>;
}

interface SearchableSelectProps {
  value?: string | null;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
  className?: string;
  clearOption?: SearchableSelectOption;
}

const PAYMENT_MODES = [
  "Self-Payment",
  "Transition Dollar (TS)",
  "Unit Local Training Fund (ULTF)",
  "Company-Sponsored (Non-Home Team)",
  "Polwel Training Subsidy",
];

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onValueChange,
  options,
  placeholder = "Select an option",
  disabled = false,
  emptyMessage = "No results found",
  className,
  clearOption,
}) => {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value) || (clearOption && clearOption.value === value ? clearOption : undefined);

  const handleSelect = (nextValue: string) => {
    onValueChange(nextValue);
    setOpen(false);
  };

  const buttonLabel = selectedOption?.label || placeholder;

  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between", className, disabled && "cursor-not-allowed bg-gray-50 text-muted-foreground")}
        >
          <span className="truncate text-left">{buttonLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command loop>
          <CommandInput placeholder="Search..." className="h-9" />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            {clearOption && (
              <CommandItem key="__clear" value={clearOption.value} onSelect={() => handleSelect(clearOption.value)}>
                <Check className={cn("mr-2 h-4 w-4", value === clearOption.value ? "opacity-100" : "opacity-0")} />
                <span>{clearOption.label}</span>
              </CommandItem>
            )}
            <CommandGroup>
              {options.map((option) => (
                <CommandItem key={option.value} value={`${option.label} ${option.description ?? ""}`.trim()} onSelect={() => handleSelect(option.value)}>
                  <Check className={cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col">
                    <span>{option.label}</span>
                    {option.description ? <span className="text-xs text-muted-foreground">{option.description}</span> : null}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export const AddLearnersDialog: React.FC<AddLearnersDialogProps> = ({
  courseRun,
  courseRunId,
  baseCourseFee,
  onSuccess,
  open: controlledOpen,
  onOpenChange,
  triggerLabel,
}) => {
  // Runtime guard
  const resolvedCourseRunId = courseRun?.id || courseRunId || "";
  const effectiveBaseFee = courseRun?.course?.defaultCourseFee ?? baseCourseFee ?? 0;
  const discountsList: any[] = (courseRun?.course?.discounts as any[]) || [];

  if (!courseRun && !courseRunId) {
    // Render nothing if insufficient data; caller can pass the object or id
    return null;
  }
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const dialogOpen = isControlled ? controlledOpen! : internalOpen;
  const setDialogOpen = (next: boolean) => {
    if (!isControlled) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  };
  const [mode, setMode] = useState<"single" | "group">("single");
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [coordinators, setCoordinators] = useState<TrainingCoordinator[]>([]);
  const { toast } = useToast();

  // Single Registration State
  const [singleData, setSingleData] = useState<SingleRegistrationData>({
    fullName: "",
    designation: "",
    email: "",
    contactNumber: "",
    division: "",
    departmentName: "",
    buNumber: "",
    paymentMode: "",
    trainingCoordinatorId: "",
    trainingCoordinatorEmail: "",
    trainingCoordinatorPhone: "",
    currentDefaultCourseFee: effectiveBaseFee,
    discountId: null,
    discountPercentage: 0,
    totalFees: effectiveBaseFee,
    feesRemarks: "",
    invoiceNumber: "",
    remarks: "",
  });

  // Group Registration State
  const [groupData, setGroupData] = useState<GroupRegistrationData>({
    division: "",
    departmentName: "",
    buNumber: "",
    paymentMode: "",
    trainingCoordinatorId: "",
    trainingCoordinatorEmail: "",
    trainingCoordinatorPhone: "",
    currentDefaultCourseFee: effectiveBaseFee,
    discountId: null,
    discountPercentage: 0,
    totalFees: effectiveBaseFee,
    feesRemarks: "",
    invoiceNumber: "",
    learners: [
      {
        fullName: "",
        designation: "",
        email: "",
        contactNumber: "",
      },
    ],
    remarks: "",
  });

  // Load initial data
  useEffect(() => {
    if (dialogOpen && organizations.length === 0) {
      loadOrganizations();
    }
  }, [dialogOpen, organizations.length]);

  const loadOrganizations = async () => {
    try {
      const response = await clientOrganizationsApi.getAll({ limit: 1000 });
      const orgs = Array.isArray(response?.organizations) ? response.organizations : [];
      setOrganizations(
        orgs.map((org: any) => ({
          id: org.id,
          name: org.name,
          buNumber: org.buNumber || "",
        }))
      );
    } catch (error) {
      console.error("Failed to load organizations:", error);
      setOrganizations([]);
    }
  };

  const loadLearners = async (organizationId: string) => {
    if (!organizationId) {
      setLearners([]);
      return;
    }

    try {
      const response = await clientOrganizationsApi.getLearners(organizationId, { limit: 1000 });
      const learnerList = Array.isArray(response?.learners) ? response.learners : [];
      setLearners(
        learnerList.map((learner: any) => ({
          id: learner.id,
          fullname: learner.fullname || learner.name || "",
          designation: learner.designation || "",
          email: learner.email || "",
          contact: learner.contact || "",
          clientOrganizationId: learner.clientOrganizationId || learner.organizationId,
          departmentName: learner.departmentName || "",
        }))
      );
    } catch (error) {
      console.error("Failed to load learners:", error);
      setLearners([]);
    }
  };

  const loadCoordinators = async (organizationId: string) => {
    if (!organizationId) {
      setCoordinators([]);
      return;
    }

    try {
      const response = await clientOrganizationsApi.getCoordinators(organizationId, { limit: 100 });
      const coordinatorList = Array.isArray(response?.coordinators) ? response.coordinators : [];
      const mappedCoordinators: TrainingCoordinator[] = coordinatorList.map((coord: any) => ({
        id: coord.id,
        name: coord.name,
        email: coord.email,
        contactNumber: coord.contactNumber || "",
        isPrimaryCoordinator: coord.isPrimaryCoordinator,
      }));
      setCoordinators(mappedCoordinators);

      const primaryCoordinator = mappedCoordinators.find((c) => c.isPrimaryCoordinator);
      if (primaryCoordinator) {
        if (mode === "single") {
          setSingleData((prev) => ({
            ...prev,
            trainingCoordinatorId: primaryCoordinator.id,
            trainingCoordinatorEmail: primaryCoordinator.email || "",
            trainingCoordinatorPhone: primaryCoordinator.contactNumber || "",
          }));
        } else {
          setGroupData((prev) => ({
            ...prev,
            trainingCoordinatorId: primaryCoordinator.id,
            trainingCoordinatorEmail: primaryCoordinator.email || "",
            trainingCoordinatorPhone: primaryCoordinator.contactNumber || "",
          }));
        }
      }
    } catch (error) {
      console.error("Failed to load coordinators:", error);
      setCoordinators([]);
    }
  };

  // Calculate fees with discount
  const calculateTotalFees = (baseFee: number, discountPercentage: number): number => {
    const discountAmount = (baseFee * discountPercentage) / 100;
    return baseFee - discountAmount;
  };

  // Handle organization change
  const handleOrganizationChange = (organizationId: string) => {
    const org = organizations.find((o) => o.id === organizationId);
    if (org) {
      if (mode === "single") {
        setSingleData((prev) => ({
          ...prev,
          division: organizationId,
          buNumber: org.buNumber || "",
        }));
      } else {
        setGroupData((prev) => ({
          ...prev,
          division: organizationId,
          buNumber: org.buNumber || "",
        }));
      }
      loadCoordinators(organizationId);
      loadLearners(organizationId);
    }
  };

  // Handle coordinator change
  const handleCoordinatorChange = (coordinatorId: string) => {
    const coordinator = coordinators.find((c) => c.id === coordinatorId);
    if (coordinator) {
      if (mode === "single") {
        setSingleData((prev) => ({
          ...prev,
          trainingCoordinatorId: coordinatorId,
          trainingCoordinatorEmail: coordinator.email || "",
          trainingCoordinatorPhone: coordinator.contactNumber || "",
        }));
      } else {
        setGroupData((prev) => ({
          ...prev,
          trainingCoordinatorId: coordinatorId,
          trainingCoordinatorEmail: coordinator.email || "",
          trainingCoordinatorPhone: coordinator.contactNumber || "",
        }));
      }
    }
  };

  // Handle learner selection (pre-fill data)
  const handleLearnerSelection = (learnerId: string, learnerIndex?: number) => {
    if (learnerId === "__none__") {
      if (mode === "single") {
        setSingleData((prev) => ({
          ...prev,
          selectedLearnerId: null,
          fullName: "",
          designation: "",
          email: "",
          contactNumber: "",
          departmentName: "",
        }));
      } else if (learnerIndex !== undefined) {
        setGroupData((prev) => ({
          ...prev,
          learners: prev.learners.map((l, i) =>
            i === learnerIndex
              ? {
                  ...l,
                  selectedLearnerId: null,
                  fullName: "",
                  designation: "",
                  email: "",
                  contactNumber: "",
                }
              : l
          ),
        }));
      }
      return;
    }

    const learner = learners.find((l) => l.id === learnerId);
    if (learner) {
      if (mode === "single") {
        setSingleData((prev) => ({
          ...prev,
          selectedLearnerId: learnerId,
          fullName: learner.fullname,
          designation: learner.designation || "",
          email: learner.email || "",
          contactNumber: learner.contact || "",
          departmentName: learner.departmentName || "",
        }));

        // Load organization data if learner has one
        if (learner.clientOrganizationId) {
          handleOrganizationChange(learner.clientOrganizationId);
        }
      } else if (learnerIndex !== undefined) {
        setGroupData((prev) => ({
          ...prev,
          learners: prev.learners.map((l, i) =>
            i === learnerIndex
              ? {
                  ...l,
                  selectedLearnerId: learnerId,
                  fullName: learner.fullname,
                  designation: learner.designation || "",
                  email: learner.email || "",
                  contactNumber: learner.contact || "",
                }
              : l
          ),
        }));
      }
    }
  };

  const resolveDiscountSelection = (discountId: string) => {
    const actualDiscountId = discountId === "none" ? null : discountId;
    const discount = actualDiscountId ? discountsList.find((d) => d.id === actualDiscountId) : null;
    const discountPercentage = discount ? discount.percentage : 0;
    return { actualDiscountId, discountPercentage };
  };

  const handleSingleDiscountChange = (discountId: string) => {
    const { actualDiscountId, discountPercentage } = resolveDiscountSelection(discountId);
    const totalFees = calculateTotalFees(singleData.currentDefaultCourseFee, discountPercentage);
    setSingleData((prev) => ({
      ...prev,
      discountId: actualDiscountId,
      discountPercentage,
      totalFees,
    }));
  };

  const handleGroupDiscountChange = (discountId: string) => {
    const { actualDiscountId, discountPercentage } = resolveDiscountSelection(discountId);
    const totalFees = calculateTotalFees(groupData.currentDefaultCourseFee, discountPercentage);
    setGroupData((prev) => ({
      ...prev,
      discountId: actualDiscountId,
      discountPercentage,
      totalFees,
    }));
  };

  // Add new learner to group
  const addGroupLearner = () => {
    setGroupData((prev) => ({
      ...prev,
      learners: [
        ...prev.learners,
        {
          fullName: "",
          designation: "",
          email: "",
          contactNumber: "",
        },
      ],
    }));
  };

  // Remove learner from group
  const removeGroupLearner = (index: number) => {
    if (groupData.learners.length > 1) {
      setGroupData((prev) => ({
        ...prev,
        learners: prev.learners.filter((_, i) => i !== index),
      }));
    }
  };

  // Submit registration
  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (mode === "single") {
        // Validate single registration
        if (!singleData.fullName || !singleData.email || !singleData.division) {
          toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
          return;
        }

        // Submit single registration
        const cleanSingleData = {
          ...singleData,
          discountId: singleData.discountId === "none" ? null : singleData.discountId,
          selectedLearnerId: singleData.selectedLearnerId === "__none__" ? null : singleData.selectedLearnerId,
        };
        await courseRunsApi.enrollLearner(resolvedCourseRunId, {
          mode: "single",
          data: cleanSingleData,
        });
      } else {
        // Validate group registration
        if (!groupData.division || groupData.learners.some((l) => !l.fullName || !l.email)) {
          toast({ title: "Error", description: "Please fill in all required fields for all learners", variant: "destructive" });
          return;
        }

        // Submit group registration
        const processedLearners = groupData.learners.map((learner) => ({
          ...learner,
          selectedLearnerId: learner.selectedLearnerId === "__none__" ? null : learner.selectedLearnerId,
          currentDefaultCourseFee: groupData.currentDefaultCourseFee,
          discountId: groupData.discountId,
          discountPercentage: groupData.discountPercentage,
          totalFees: groupData.totalFees,
          feesRemarks: groupData.feesRemarks,
          invoiceNumber: groupData.invoiceNumber,
        }));

        const cleanGroupData = {
          division: groupData.division,
          departmentName: groupData.departmentName,
          buNumber: groupData.buNumber,
          paymentMode: groupData.paymentMode,
          trainingCoordinatorId: groupData.trainingCoordinatorId,
          trainingCoordinatorEmail: groupData.trainingCoordinatorEmail,
          trainingCoordinatorPhone: groupData.trainingCoordinatorPhone,
          remarks: groupData.remarks,
          currentDefaultCourseFee: groupData.currentDefaultCourseFee,
          discountId: groupData.discountId,
          discountPercentage: groupData.discountPercentage,
          totalFees: groupData.totalFees,
          feesRemarks: groupData.feesRemarks,
          invoiceNumber: groupData.invoiceNumber,
          learners: processedLearners,
        };
        await courseRunsApi.enrollLearners(resolvedCourseRunId, {
          mode: "group",
          data: cleanGroupData,
        });
      }

      toast({ title: "Success", description: "Learners enrolled successfully" });
      setDialogOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to enroll learners:", error);
      toast({ title: "Error", description: "Failed to enroll learners", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSingleData({
      fullName: "",
      designation: "",
      email: "",
      contactNumber: "",
      division: "",
      departmentName: "",
      buNumber: "",
      paymentMode: "",
      trainingCoordinatorId: "",
      trainingCoordinatorEmail: "",
      trainingCoordinatorPhone: "",
      currentDefaultCourseFee: effectiveBaseFee,
      discountId: null,
      discountPercentage: 0,
      totalFees: effectiveBaseFee,
      feesRemarks: "",
      invoiceNumber: "",
      remarks: "",
    });

    setGroupData({
      division: "",
      departmentName: "",
      buNumber: "",
      paymentMode: "",
      trainingCoordinatorId: "",
      trainingCoordinatorEmail: "",
      trainingCoordinatorPhone: "",
      currentDefaultCourseFee: effectiveBaseFee,
      discountId: null,
      discountPercentage: 0,
      totalFees: effectiveBaseFee,
      feesRemarks: "",
      invoiceNumber: "",
      learners: [
        {
          fullName: "",
          designation: "",
          email: "",
          contactNumber: "",
        },
      ],
      remarks: "",
    });
  };

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(isOpen) => {
        setDialogOpen(isOpen);
        if (!isOpen) {
          setMode("single");
          resetForm();
        }
      }}
    >
      {!isControlled && (
        <DialogTrigger asChild>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            {triggerLabel || "Add Learners"}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Learners</DialogTitle>
        </DialogHeader>

        {/* Mode Selection */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card
            className={`cursor-pointer transition-all ${mode === "single" ? "ring-2 ring-blue-500 bg-blue-50" : "hover:bg-gray-50"}`}
            onClick={() => setMode("single")}
          >
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <Plus className="h-8 w-8 text-gray-400 mb-2" />
              <h3 className="font-medium">Single Registration</h3>
              <p className="text-sm text-gray-500">Add one learner at a time</p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all ${mode === "group" ? "ring-2 ring-blue-500 bg-blue-50" : "hover:bg-gray-50"}`}
            onClick={() => setMode("group")}
          >
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <Users className="h-8 w-8 text-gray-400 mb-2" />
              <h3 className="font-medium">Group Registration</h3>
              <p className="text-sm text-gray-500">Add multiple learners at once</p>
            </CardContent>
          </Card>
        </div>

        {mode === "single" ? (
          <SingleRegistrationForm
            data={singleData}
            setData={setSingleData}
            organizations={organizations}
            learners={learners}
            coordinators={coordinators}
            courseRun={courseRun}
            onOrganizationChange={handleOrganizationChange}
            onCoordinatorChange={handleCoordinatorChange}
            onLearnerSelection={handleLearnerSelection}
            onDiscountChange={handleSingleDiscountChange}
          />
        ) : (
          <GroupRegistrationForm
            data={groupData}
            setData={setGroupData}
            organizations={organizations}
            learners={learners}
            coordinators={coordinators}
            courseRun={courseRun}
            onOrganizationChange={handleOrganizationChange}
            onCoordinatorChange={handleCoordinatorChange}
            onLearnerSelection={handleLearnerSelection}
            onGroupDiscountChange={handleGroupDiscountChange}
            onAddLearner={addGroupLearner}
            onRemoveLearner={removeGroupLearner}
          />
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Adding..." : mode === "single" ? "Add Learner" : `Add ${groupData.learners.length} Learners`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Single Registration Form Component
interface SingleRegistrationFormProps {
  data: SingleRegistrationData;
  setData: React.Dispatch<React.SetStateAction<SingleRegistrationData>>;
  organizations: Organization[];
  learners: Learner[];
  coordinators: TrainingCoordinator[];
  courseRun: CourseRun;
  onOrganizationChange: (orgId: string) => void;
  onCoordinatorChange: (coordId: string) => void;
  onLearnerSelection: (learnerId: string) => void;
  onDiscountChange: (discountId: string) => void;
}

const SingleRegistrationForm: React.FC<SingleRegistrationFormProps> = ({
  data,
  setData,
  organizations,
  learners,
  coordinators,
  courseRun,
  onOrganizationChange,
  onCoordinatorChange,
  onLearnerSelection,
  onDiscountChange,
}) => {
  const isFieldDisabled = (field: string) => {
    const disabledFields = ["fullName", "designation", "email", "contactNumber", "division"];
    return data.selectedLearnerId && disabledFields.includes(field);
  };

  const learnerOptions: SearchableSelectOption[] = (learners || []).map((learner) => ({
    value: learner.id,
    label: learner.fullname,
    description: learner.email,
  }));

  const organizationOptions: SearchableSelectOption[] = (organizations || []).map((org) => ({
    value: org.id,
    label: org.name,
    description: org.buNumber ? `BU: ${org.buNumber}` : undefined,
  }));

  const coordinatorOptions: SearchableSelectOption[] = (coordinators || []).map((coord) => ({
    value: coord.id,
    label: coord.name,
    description: coord.email,
  }));

  const discountOptions: SearchableSelectOption[] = (courseRun.course.discounts || []).map((discount) => ({
    value: discount.id,
    label: `${discount.name} (${discount.percentage}%)`,
  }));

  const paymentModeOptions: SearchableSelectOption[] = PAYMENT_MODES.map((mode) => ({
    value: mode,
    label: mode,
  }));

  return (
    <div className="space-y-6">
      {/* Learner Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Select Existing Learner (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <SearchableSelect
            value={data.selectedLearnerId || "__none__"}
            onValueChange={onLearnerSelection}
            options={learnerOptions}
            placeholder="Select existing learner or leave blank to add new"
            clearOption={{ value: "__none__", label: "Add new learner" }}
          />
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Full Name *</Label>
            <Input
              value={data.fullName}
              onChange={(e) => setData((prev) => ({ ...prev, fullName: e.target.value }))}
              disabled={isFieldDisabled("fullName")}
              className={isFieldDisabled("fullName") ? "bg-gray-50" : ""}
            />
          </div>
          <div className="space-y-2">
            <Label>Designation *</Label>
            <Input
              value={data.designation}
              onChange={(e) => setData((prev) => ({ ...prev, designation: e.target.value }))}
              disabled={isFieldDisabled("designation")}
              className={isFieldDisabled("designation") ? "bg-gray-50" : ""}
            />
          </div>
          <div className="space-y-2">
            <Label>Email Address *</Label>
            <Input
              type="email"
              value={data.email}
              onChange={(e) => setData((prev) => ({ ...prev, email: e.target.value }))}
              disabled={isFieldDisabled("email")}
              className={isFieldDisabled("email") ? "bg-gray-50" : ""}
            />
          </div>
          <div className="space-y-2">
            <Label>Contact Number</Label>
            <Input
              type="tel"
              value={data.contactNumber}
              onChange={(e) => setData((prev) => ({ ...prev, contactNumber: e.target.value }))}
              disabled={isFieldDisabled("contactNumber")}
              className={isFieldDisabled("contactNumber") ? "bg-gray-50" : ""}
            />
          </div>
        </CardContent>
      </Card>

      {/* Organization Information */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Division *</Label>
            <SearchableSelect
              value={data.division}
              onValueChange={onOrganizationChange}
              options={organizationOptions}
              placeholder="Select division"
              disabled={isFieldDisabled("division")}
            />
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Input
              value={data.departmentName}
              onChange={(e) => setData((prev) => ({ ...prev, departmentName: e.target.value }))}
              placeholder="Department name"
            />
          </div>
          <div className="space-y-2">
            <Label>BU Number</Label>
            <Input value={data.buNumber} disabled className="bg-gray-50" />
          </div>
          <div className="space-y-2">
            <Label>Payment Mode *</Label>
            <SearchableSelect
              value={data.paymentMode}
              onValueChange={(value) => setData((prev) => ({ ...prev, paymentMode: value }))}
              options={paymentModeOptions}
              placeholder="Select payment mode"
            />
          </div>
        </CardContent>
      </Card>

      {/* Training Coordinator */}
      <Card>
        <CardHeader>
          <CardTitle>Training Coordinator</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Coordinator Name</Label>
            <SearchableSelect
              value={data.trainingCoordinatorId}
              onValueChange={onCoordinatorChange}
              options={coordinatorOptions}
              placeholder="Select coordinator"
              emptyMessage={organizationOptions.length === 0 ? "Select a division first" : "No coordinators found"}
            />
          </div>
          <div className="space-y-2">
            <Label>Coordinator Email</Label>
            <Input value={data.trainingCoordinatorEmail} disabled className="bg-gray-50" />
          </div>
          <div className="space-y-2">
            <Label>Coordinator Phone</Label>
            <Input value={data.trainingCoordinatorPhone} disabled className="bg-gray-50" />
          </div>
        </CardContent>
      </Card>

      {/* Fees & Payment Information */}
      <Card>
        <CardHeader>
          <CardTitle>Fees & Payment Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Current Default Course Fee</Label>
            <div className="text-2xl font-bold">${data.currentDefaultCourseFee}</div>
          </div>
          <div className="space-y-2">
            <Label>Apply Discount (Optional)</Label>
            <SearchableSelect
              value={data.discountId ?? "none"}
              onValueChange={onDiscountChange}
              options={discountOptions}
              placeholder="No discount"
              clearOption={{ value: "none", label: "No discount" }}
            />
          </div>
          <div className="space-y-2">
            <Label>Total Fees Before GST</Label>
            <div className="text-2xl font-bold text-blue-600">${data.totalFees}</div>
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Fees Remarks</Label>
            <Input
              value={data.feesRemarks}
              onChange={(e) => setData((prev) => ({ ...prev, feesRemarks: e.target.value }))}
              placeholder="Standard training fee"
            />
          </div>
          <div className="space-y-2">
            <Label>Invoice Number</Label>
            <Input value={data.invoiceNumber} onChange={(e) => setData((prev) => ({ ...prev, invoiceNumber: e.target.value }))} placeholder="INV-2024-001" />
          </div>
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Remarks</Label>
            <Textarea
              value={data.remarks}
              onChange={(e) => setData((prev) => ({ ...prev, remarks: e.target.value }))}
              placeholder="Regular enrollment for skills development program"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Group Registration Form Component
interface GroupRegistrationFormProps {
  data: GroupRegistrationData;
  setData: React.Dispatch<React.SetStateAction<GroupRegistrationData>>;
  organizations: Organization[];
  learners: Learner[];
  coordinators: TrainingCoordinator[];
  courseRun: CourseRun;
  onOrganizationChange: (orgId: string) => void;
  onCoordinatorChange: (coordId: string) => void;
  onLearnerSelection: (learnerId: string, learnerIndex?: number) => void;
  onGroupDiscountChange: (discountId: string) => void;
  onAddLearner: () => void;
  onRemoveLearner: (index: number) => void;
}

const GroupRegistrationForm: React.FC<GroupRegistrationFormProps> = ({
  data,
  setData,
  organizations,
  learners,
  coordinators,
  courseRun,
  onOrganizationChange,
  onCoordinatorChange,
  onLearnerSelection,
  onGroupDiscountChange,
  onAddLearner,
  onRemoveLearner,
}) => {
  const organizationOptions: SearchableSelectOption[] = (organizations || []).map((org) => ({
    value: org.id,
    label: org.name,
    description: org.buNumber ? `BU: ${org.buNumber}` : undefined,
  }));

  const coordinatorOptions: SearchableSelectOption[] = (coordinators || []).map((coord) => ({
    value: coord.id,
    label: coord.name,
    description: coord.email,
  }));

  const learnerOptions: SearchableSelectOption[] = (learners || []).map((learner) => ({
    value: learner.id,
    label: learner.fullname,
    description: learner.email,
  }));

  const discountOptions: SearchableSelectOption[] = (courseRun.course.discounts || []).map((discount) => ({
    value: discount.id,
    label: `${discount.name} (${discount.percentage}%)`,
  }));

  const paymentModeOptions: SearchableSelectOption[] = PAYMENT_MODES.map((mode) => ({
    value: mode,
    label: mode,
  }));

  const groupTotal = data.totalFees * data.learners.length;

  return (
    <div className="space-y-6">
      {/* Group Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Group Information
          </CardTitle>
          <p className="text-sm text-gray-500">Common details for all learners in this group</p>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Division *</Label>
            <SearchableSelect value={data.division} onValueChange={onOrganizationChange} options={organizationOptions} placeholder="Select division" />
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Input
              value={data.departmentName}
              onChange={(e) => setData((prev) => ({ ...prev, departmentName: e.target.value }))}
              placeholder="Department name"
            />
          </div>
          <div className="space-y-2">
            <Label>BU Number</Label>
            <Input value={data.buNumber} disabled className="bg-gray-50" />
          </div>
          <div className="space-y-2">
            <Label>Payment Mode *</Label>
            <SearchableSelect
              value={data.paymentMode}
              onValueChange={(value) => setData((prev) => ({ ...prev, paymentMode: value }))}
              options={paymentModeOptions}
              placeholder="Select payment mode"
            />
          </div>
        </CardContent>
      </Card>

      {/* Training Coordinator */}
      <Card>
        <CardHeader>
          <CardTitle>Training Coordinator</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Coordinator Name</Label>
            <SearchableSelect
              value={data.trainingCoordinatorId}
              onValueChange={onCoordinatorChange}
              options={coordinatorOptions}
              placeholder="Select coordinator"
              emptyMessage={organizationOptions.length === 0 ? "Select a division first" : "No coordinators found"}
            />
          </div>
          <div className="space-y-2">
            <Label>Coordinator Email</Label>
            <Input value={data.trainingCoordinatorEmail} disabled className="bg-gray-50" />
          </div>
          <div className="space-y-2">
            <Label>Coordinator Phone</Label>
            <Input value={data.trainingCoordinatorPhone} disabled className="bg-gray-50" />
          </div>
        </CardContent>
      </Card>

      {/* Shared Fees & Payment */}
      <Card>
        <CardHeader>
          <CardTitle>Fees & Payment Information</CardTitle>
          <p className="text-sm text-gray-500">Applied uniformly to all learners in this group</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Base Fee per Learner</Label>
            <div className="text-2xl font-semibold">${data.currentDefaultCourseFee}</div>
          </div>
          <div className="space-y-2">
            <Label>Discount</Label>
            <SearchableSelect
              value={data.discountId ?? "none"}
              onValueChange={onGroupDiscountChange}
              options={discountOptions}
              placeholder="No discount"
              clearOption={{ value: "none", label: "No discount" }}
            />
          </div>
          <div className="space-y-2">
            <Label>Total Per Learner</Label>
            <div className="text-2xl font-semibold text-blue-600">${data.totalFees}</div>
          </div>
          <div className="space-y-2">
            <Label>Group Total ({data.learners.length} learners)</Label>
            <div className="text-xl font-semibold text-blue-600">${groupTotal}</div>
          </div>
          <div className="space-y-2">
            <Label>Fees Remarks</Label>
            <Input
              value={data.feesRemarks}
              onChange={(e) => setData((prev) => ({ ...prev, feesRemarks: e.target.value }))}
              placeholder="Standard training fee"
            />
          </div>
          <div className="space-y-2">
            <Label>Invoice Number</Label>
            <Input value={data.invoiceNumber} onChange={(e) => setData((prev) => ({ ...prev, invoiceNumber: e.target.value }))} placeholder="INV-2024-001" />
          </div>
        </CardContent>
      </Card>

      {/* Learners */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Learners</CardTitle>
              <p className="text-sm text-gray-500">
                Add individual learner details ({data.learners.length} learner{data.learners.length !== 1 ? "s" : ""})
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={onAddLearner}>
              <Plus className="h-4 w-4 mr-2" />
              Add Learner
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {data.learners.map((learner, index) => (
            <GroupLearnerCard
              key={index}
              learner={learner}
              index={index}
              canRemove={data.learners.length > 1}
              onLearnerSelection={(learnerId) => onLearnerSelection(learnerId, index)}
              onRemove={() => onRemoveLearner(index)}
              onUpdate={(updatedLearner) => {
                setData((prev) => ({
                  ...prev,
                  learners: prev.learners.map((l, i) => (i === index ? updatedLearner : l)),
                }));
              }}
              learnerOptions={learnerOptions}
            />
          ))}
        </CardContent>
      </Card>

      {/* Additional Remarks */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Remarks</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.remarks}
            onChange={(e) => setData((prev) => ({ ...prev, remarks: e.target.value }))}
            placeholder="Regular enrollment for skills development program"
            rows={3}
          />
        </CardContent>
      </Card>
    </div>
  );
};

// Group Learner Card Component
interface GroupLearnerCardProps {
  learner: GroupLearnerData;
  index: number;
  learnerOptions: SearchableSelectOption[];
  canRemove: boolean;
  onLearnerSelection: (learnerId: string) => void;
  onRemove: () => void;
  onUpdate: (learner: GroupLearnerData) => void;
}

const GroupLearnerCard: React.FC<GroupLearnerCardProps> = ({ learner, index, learnerOptions, canRemove, onLearnerSelection, onRemove, onUpdate }) => {
  const isFieldDisabled = (field: string) => {
    const disabledFields = ["fullName", "designation", "email", "contactNumber"];
    return learner.selectedLearnerId && disabledFields.includes(field);
  };

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge variant="secondary">
            <User className="h-3 w-3 mr-1" />
            Learner {index + 1}
          </Badge>
          {canRemove && (
            <Button variant="ghost" size="sm" onClick={onRemove} className="text-red-500 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Learner Selection */}
        <div className="space-y-2">
          <Label className="text-sm">Select Existing Learner (Optional)</Label>
          <SearchableSelect
            value={learner.selectedLearnerId || "__none__"}
            onValueChange={onLearnerSelection}
            options={learnerOptions}
            placeholder="Select existing learner or leave blank to add new"
            clearOption={{ value: "__none__", label: "Add new learner" }}
          />
        </div>

        {/* Personal Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              value={learner.fullName}
              onChange={(e) => onUpdate({ ...learner, fullName: e.target.value })}
              disabled={isFieldDisabled("fullName")}
              className={isFieldDisabled("fullName") ? "bg-gray-50" : ""}
              placeholder="Enter full name"
            />
          </div>
          <div className="space-y-2">
            <Label>Designation *</Label>
            <Input
              value={learner.designation}
              onChange={(e) => onUpdate({ ...learner, designation: e.target.value })}
              disabled={isFieldDisabled("designation")}
              className={isFieldDisabled("designation") ? "bg-gray-50" : ""}
              placeholder="Job title"
            />
          </div>
          <div className="space-y-2">
            <Label>Email Address *</Label>
            <Input
              type="email"
              value={learner.email}
              onChange={(e) => onUpdate({ ...learner, email: e.target.value })}
              disabled={isFieldDisabled("email")}
              className={isFieldDisabled("email") ? "bg-gray-50" : ""}
              placeholder="learner@company.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Contact Number</Label>
            <Input
              type="tel"
              value={learner.contactNumber}
              onChange={(e) => onUpdate({ ...learner, contactNumber: e.target.value })}
              disabled={isFieldDisabled("contactNumber")}
              className={isFieldDisabled("contactNumber") ? "bg-gray-50" : ""}
              placeholder="+65 xxxx xxxx"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
