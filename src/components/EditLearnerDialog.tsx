import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { courseRunsApi, clientOrganizationsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface EditLearnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseRunId: string;
  enrollment: any; // courseRunLearner with included learner
  baseCourseFee: number;
  discounts?: Array<{ id: string; name: string; percentage: number }>;
  onSuccess?: () => void;
}

interface Organization {
  id: string;
  name: string;
  buNumber?: string;
}
interface Coordinator {
  id: string;
  name: string;
  email?: string;
  contactNumber?: string;
  isPrimaryCoordinator?: boolean;
}

interface SearchableSelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SearchableSelectProps {
  value?: string | null;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
  className?: string;
}

const PAYMENT_MODES = [
  "Self-Payment",
  "Transition Dollar (TS)",
  "Unit Local Training Fund (ULTF)",
  "Company-Sponsored (Non-Home Team)",
  "Polwel Training Subsidy",
];

const currencyFormatter = new Intl.NumberFormat("en-SG", {
  style: "currency",
  currency: "SGD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatCurrency = (value: unknown) => {
  const numeric = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return currencyFormatter.format(0);
  }
  return currencyFormatter.format(numeric);
};

const computeDiscountedTotal = (baseFee: number, discountPercentage: number) => {
  const base = Number.isFinite(baseFee) ? baseFee : 0;
  const pct = Number.isFinite(discountPercentage) ? discountPercentage : 0;
  const discounted = base - base * (pct / 100);
  return Number(discounted.toFixed(2));
};

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onValueChange,
  options,
  placeholder = "Select an option",
  disabled = false,
  emptyMessage = "No results found",
  className,
}) => {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

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

export const EditLearnerDialog: React.FC<EditLearnerDialogProps> = ({
  open,
  onOpenChange,
  courseRunId,
  enrollment,
  baseCourseFee,
  discounts = [],
  onSuccess,
}) => {
  const { toast } = useToast();
  const learner = enrollment?.learner || {};
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
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
    discountId: enrollment?.discountId || null,
    discountPercentage: enrollment?.discountPercentage || 0,
    currentDefaultCourseFee: enrollment?.currentDefaultCourseFee || baseCourseFee,
    totalFees: enrollment?.totalFees || enrollment?.currentDefaultCourseFee || baseCourseFee,
    feesRemarks: enrollment?.feesRemarks || "",
    invoiceNumber: enrollment?.invoiceNumber || "",
    remarks: enrollment?.remarks || "",
  });

  // Load initial when opening
  useEffect(() => {
    if (!open || !learner?.id) {
      return;
    }

    const baseFeeValue = Number(enrollment?.currentDefaultCourseFee ?? baseCourseFee ?? 0);
    const discountPct = Number(enrollment?.discountPercentage ?? 0);
    const initialTotal = typeof enrollment?.totalFees === "number" ? Number(enrollment.totalFees) : computeDiscountedTotal(baseFeeValue, discountPct);

    setForm((prev) => ({
      ...prev,
      fullName: learner.fullname || "",
      designation: learner.designation || "",
      email: learner.email || "",
      contactNumber: learner.contact || "",
      division: learner.clientOrganizationId || "",
      departmentName: learner.departmentName || "",
      buNumber: learner.clientOrganization?.buNumber || prev.buNumber || "",
      paymentMode: enrollment?.paymentMode || learner.paymentMode || prev.paymentMode || "",
      trainingCoordinatorId:
        enrollment?.trainingCoordinatorId || enrollment?.trainingCoordinator?.id || learner?.trainingCoordinatorId || prev.trainingCoordinatorId || "",
      trainingCoordinatorEmail:
        enrollment?.trainingCoordinator?.email ||
        enrollment?.trainingCoordinatorEmail ||
        learner?.trainingCoordinator?.email ||
        prev.trainingCoordinatorEmail ||
        "",
      trainingCoordinatorPhone:
        enrollment?.trainingCoordinator?.contactNumber ||
        enrollment?.trainingCoordinatorPhone ||
        learner?.trainingCoordinator?.contactNumber ||
        prev.trainingCoordinatorPhone ||
        "",
      discountId: enrollment?.discountId ?? null,
      discountPercentage: discountPct,
      currentDefaultCourseFee: baseFeeValue,
      totalFees: initialTotal,
      feesRemarks: enrollment?.feesRemarks || "",
      invoiceNumber: enrollment?.invoiceNumber || "",
      remarks: enrollment?.remarks || "",
    }));

    if (learner.clientOrganizationId) {
      loadCoordinators(learner.clientOrganizationId);
    } else {
      setCoordinators([]);
    }

    let active = true;
    (async () => {
      const mapped = await loadOrganizations();
      if (!active) return;

      if (learner.clientOrganizationId) {
        const selectedOrg = mapped.find((o) => o.id === learner.clientOrganizationId) ?? null;
        if (selectedOrg?.buNumber) {
          setForm((prev) => ({ ...prev, buNumber: selectedOrg.buNumber || prev.buNumber || "" }));
        }
      } else {
        setCoordinators([]);
      }
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, learner?.id, learner?.clientOrganizationId, baseCourseFee, enrollment]);

  const loadOrganizations = async (): Promise<Organization[]> => {
    try {
      const response = await clientOrganizationsApi.getAll({ limit: 1000 });
      const orgs = Array.isArray(response?.organizations)
        ? response.organizations
        : Array.isArray(response?.data?.organizations)
        ? response.data.organizations
        : [];
      const mapped: Organization[] = orgs.map((org: any) => ({
        id: org.id,
        name: org.name,
        buNumber: org.buNumber || "",
      }));
      setOrganizations(mapped);
      return mapped;
    } catch (e) {
      console.error("Failed to load organizations", e);
      setOrganizations([]);
      return [];
    }
  };

  const loadCoordinators = async (organizationId: string) => {
    if (!organizationId) {
      setCoordinators([]);
      return;
    }

    try {
      const response = await clientOrganizationsApi.getCoordinators(organizationId, { limit: 100 });
      const coordinatorList = Array.isArray(response?.coordinators)
        ? response.coordinators
        : Array.isArray(response?.data?.coordinators)
        ? response.data.coordinators
        : [];
      const mapped = coordinatorList.map((coord: any) => ({
        id: coord.id,
        name: coord.name,
        email: coord.email,
        contactNumber: coord.contactNumber || "",
        isPrimaryCoordinator: coord.isPrimaryCoordinator,
      }));
      setCoordinators(mapped);

      const primary = mapped.find((c) => c.isPrimaryCoordinator);
      setForm((f) => {
        const existing = mapped.find((c) => c.id === f.trainingCoordinatorId);
        if (existing) {
          return {
            ...f,
            trainingCoordinatorEmail: existing.email || "",
            trainingCoordinatorPhone: existing.contactNumber || "",
          };
        }
        if (primary) {
          return {
            ...f,
            trainingCoordinatorId: primary.id,
            trainingCoordinatorEmail: primary.email || "",
            trainingCoordinatorPhone: primary.contactNumber || "",
          };
        }
        return f;
      });
    } catch (e) {
      console.error("Failed to load coordinators", e);
      setCoordinators([]);
    }
  };

  const handleOrganizationChange = (orgId: string, options: { preserveCoordinator?: boolean; organizationOverride?: Organization | null } = {}) => {
    const { preserveCoordinator = false, organizationOverride = null } = options;
    const org = organizationOverride || organizations.find((o) => o.id === orgId);
    setForm((f) => ({
      ...f,
      division: orgId,
      buNumber: org?.buNumber || f.buNumber || "",
      ...(preserveCoordinator ? {} : { trainingCoordinatorId: "", trainingCoordinatorEmail: "", trainingCoordinatorPhone: "" }),
    }));
    loadCoordinators(orgId);
  };

  const handleCoordinatorChange = (coordId: string) => {
    const coord = coordinators.find((c) => c.id === coordId);
    if (!coord) return;
    setForm((f) => ({
      ...f,
      trainingCoordinatorId: coordId,
      trainingCoordinatorEmail: coord.email || "",
      trainingCoordinatorPhone: coord.contactNumber || "",
    }));
  };

  const organizationOptions: SearchableSelectOption[] = organizations.map((org) => ({
    value: org.id,
    label: org.name,
    description: org.buNumber ? `BU: ${org.buNumber}` : undefined,
  }));

  const coordinatorOptions: SearchableSelectOption[] = coordinators.map((coord) => ({
    value: coord.id,
    label: coord.name,
    description: coord.email,
  }));

  const paymentModeOptions: SearchableSelectOption[] = PAYMENT_MODES.map((mode) => ({
    value: mode,
    label: mode,
  }));

  const discountOptions: SearchableSelectOption[] = [
    { value: "none", label: "No discount" },
    ...discounts.map((discount) => ({
      value: discount.id,
      label: discount.name,
      description: `${discount.percentage}%`,
    })),
  ];

  const handleDiscountChange = (discountId: string) => {
    const actualDiscountId = discountId === "none" ? null : discountId;
    const discount = actualDiscountId ? discounts.find((d) => d.id === actualDiscountId) : null;
    const percentage = discount ? discount.percentage : 0;
    setForm((f) => ({
      ...f,
      discountId: actualDiscountId,
      discountPercentage: percentage,
      totalFees: computeDiscountedTotal(f.currentDefaultCourseFee, percentage),
    }));
  };

  const handleChange = (field: string, value: any) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSave = async () => {
    if (!learner?.id) return;
    setSaving(true);
    try {
      await courseRunsApi.updateEnrollment(courseRunId, learner.id, {
        learnerData: {
          fullName: form.fullName,
          designation: form.designation,
          email: form.email,
          contactNumber: form.contactNumber,
          division: form.division,
          departmentName: form.departmentName,
          paymentMode: form.paymentMode,
          trainingCoordinatorId: form.trainingCoordinatorId,
        },
        enrollmentData: {
          discountId: form.discountId === "none" ? null : form.discountId,
          discountPercentage: form.discountPercentage,
          currentDefaultCourseFee: form.currentDefaultCourseFee,
          totalFees: form.totalFees,
          feesRemarks: form.feesRemarks,
          invoiceNumber: form.invoiceNumber,
          remarks: form.remarks,
        },
      });
      toast({ title: "Updated", description: "Learner enrollment updated successfully" });
      onSuccess?.();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: e.message || "Failed to update enrollment", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Learner</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input value={form.fullName} onChange={(e) => handleChange("fullName", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Designation *</Label>
                <Input value={form.designation} onChange={(e) => handleChange("designation", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Contact Number</Label>
                <Input value={form.contactNumber} onChange={(e) => handleChange("contactNumber", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organization Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Division *</Label>
                <SearchableSelect value={form.division} onValueChange={handleOrganizationChange} options={organizationOptions} placeholder="Select division" />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Input value={form.departmentName} onChange={(e) => handleChange("departmentName", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>BU Number</Label>
                <Input value={form.buNumber} disabled className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label>Payment Mode *</Label>
                <SearchableSelect
                  value={form.paymentMode}
                  onValueChange={(value) => handleChange("paymentMode", value)}
                  options={paymentModeOptions}
                  placeholder="Select payment mode"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Training Coordinator</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Coordinator Name</Label>
                <SearchableSelect
                  value={form.trainingCoordinatorId}
                  onValueChange={handleCoordinatorChange}
                  options={coordinatorOptions}
                  placeholder={coordinators.length ? "Select coordinator" : "No coordinators found"}
                  disabled={!form.division}
                  emptyMessage={coordinators.length ? "No results" : "No coordinators found"}
                />
              </div>
              <div className="space-y-2">
                <Label>Coordinator Email</Label>
                <Input value={form.trainingCoordinatorEmail} disabled className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label>Coordinator Phone</Label>
                <Input value={form.trainingCoordinatorPhone} disabled className="bg-gray-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fees & Payment Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Current Default Course Fee</Label>
                <div className="text-xl font-bold">{formatCurrency(form.currentDefaultCourseFee)}</div>
              </div>
              <div className="space-y-2">
                <Label>Apply Discount</Label>
                <SearchableSelect
                  value={form.discountId ? form.discountId : "none"}
                  onValueChange={handleDiscountChange}
                  options={discountOptions}
                  placeholder="No discount"
                />
              </div>
              <div className="space-y-2">
                <Label>Total Fees Before GST</Label>
                <div className="text-xl font-bold text-blue-600">{formatCurrency(form.totalFees)}</div>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Fees Remarks</Label>
                <Input value={form.feesRemarks} onChange={(e) => handleChange("feesRemarks", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Invoice Number</Label>
                <Input value={form.invoiceNumber} onChange={(e) => handleChange("invoiceNumber", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Remarks</Label>
                <Textarea value={form.remarks} onChange={(e) => handleChange("remarks", e.target.value)} rows={3} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditLearnerDialog;
