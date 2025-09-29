import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { courseRunsApi, organizationsApi, polwelUsersApi } from "@/lib/api";
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

const PAYMENT_MODES = [
  "Self-Payment",
  "Transition Dollar (TS)",
  "Unit Local Training Fund (ULTF)",
  "Company-Sponsored (Non-Home Team)",
  "Polwel Training Subsidy",
];

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
    if (open && learner?.id) {
      setForm((prev) => ({
        ...prev,
        fullName: learner.fullname || "",
        designation: learner.designation || "",
        email: learner.email || "",
        contactNumber: learner.contact || "",
        division: learner.clientOrganizationId || "",
        departmentName: learner.departmentName || "",
      }));
      loadOrganizations();
      if (learner.clientOrganizationId) {
        handleOrganizationChange(learner.clientOrganizationId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadOrganizations = async () => {
    try {
      const data = await organizationsApi.list();
      setOrganizations(data);
    } catch (e) {
      console.error("Failed to load organizations", e);
    }
  };

  const loadCoordinators = async (organizationId: string) => {
    try {
      const data = await organizationsApi.getTrainingCoordinators(organizationId);
      setCoordinators(data);
      const primary = data.find((c: any) => c.isPrimaryCoordinator);
      if (primary) {
        setForm((f) => ({
          ...f,
          trainingCoordinatorId: primary.id,
          trainingCoordinatorEmail: primary.email || "",
          trainingCoordinatorPhone: primary.contactNumber || "",
        }));
      }
    } catch (e) {
      console.error("Failed to load coordinators", e);
    }
  };

  const handleOrganizationChange = (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId);
    setForm((f) => ({ ...f, division: orgId, buNumber: org?.buNumber || "" }));
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

  const handleDiscountChange = (discountId: string) => {
    const actualDiscountId = discountId === "none" ? null : discountId;
    const discount = actualDiscountId ? discounts.find((d) => d.id === actualDiscountId) : null;
    const percentage = discount ? discount.percentage : 0;
    const totalFees = form.currentDefaultCourseFee - (form.currentDefaultCourseFee * percentage) / 100;
    setForm((f) => ({ ...f, discountId: actualDiscountId, discountPercentage: percentage, totalFees }));
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
                <Select value={form.division} onValueChange={handleOrganizationChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Select value={form.paymentMode} onValueChange={(v) => handleChange("paymentMode", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map((pm) => (
                      <SelectItem key={pm} value={pm}>
                        {pm}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Select value={form.trainingCoordinatorId} onValueChange={handleCoordinatorChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select coordinator" />
                  </SelectTrigger>
                  <SelectContent>
                    {coordinators.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <div className="text-xl font-bold">
                  ${"{"}form.currentDefaultCourseFee{"}"}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Apply Discount</Label>
                <Select value={form.discountId ? form.discountId : "none"} onValueChange={handleDiscountChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="No discount" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No discount</SelectItem>
                    {discounts.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name} ({d.percentage}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Total Fees Before GST</Label>
                <div className="text-xl font-bold text-blue-600">
                  ${"{"}form.totalFees{"}"}
                </div>
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
