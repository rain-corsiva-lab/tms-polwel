import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import DateInput from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Building2, Edit } from "lucide-react";
import { digitsOnly } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { isValidEmail } from "@/lib/validators";
import { partnersApi } from "@/lib/api";
import { errorHandlers } from "@/lib/errorHandler";

interface PartnerData {
  id?: string;
  partnerName: string;
  email?: string;
  contactNumber: string;
  onboardingDate?: string;
}

interface AddPartnerDialogProps {
  onPartnerCreated?: () => void;
  onSuccess?: () => void;
  mode?: "create" | "edit";
  partner?: PartnerData;
}

export function AddPartnerDialog({ onPartnerCreated, onSuccess, mode = "create", partner }: AddPartnerDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [formData, setFormData] = useState({
    partnerName: "",
    email: "",
    partnerOrganization: "",
    contactNumber: "",
    onboardingDate: "",
    bio: "",
    experience: "",
    status: "ACTIVE",
    pointOfContact: "",
    pointOfContactDepartment: "",
    pointOfContactEmail: "",
    contactDesignation: "",
  });

  const { toast } = useToast();
  const isEditMode = mode === "edit";

  // Initialize form data when in edit mode
  useEffect(() => {
    if (isEditMode && partner) {
      setFormData({
        partnerName: partner.partnerName || "",
        email: partner.email || "",
        partnerOrganization: (partner as any).partnerOrganization || "",
        contactNumber: digitsOnly(partner.contactNumber || ""),
        onboardingDate: partner.onboardingDate || "",
        bio: (partner as any).bio || "",
        experience: (partner as any).experience || "",
        status: (partner as any).status || "ACTIVE",
        pointOfContact: (partner as any).pointOfContact || "",
        pointOfContactDepartment: (partner as any).pointOfContactDepartment || "",
        pointOfContactEmail: (partner as any).pointOfContactEmail || "",
        contactDesignation: (partner as any).contactDesignation || "",
      });
    }
  }, [isEditMode, partner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { [key: string]: string } = {};

    if (!formData.partnerName) {
      newErrors.partnerName = "Partner Name is required";
    }

    if (!formData.email) {
      newErrors.email = "Email Address is required";
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address (name@email.com)";
    }

    // Validate point-of-contact email if provided
    if (formData.pointOfContactEmail && !isValidEmail(formData.pointOfContactEmail)) {
      newErrors.pointOfContactEmail = "Please enter a valid email address (name@email.com)";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstError = Object.values(newErrors)[0];
      toast({
        title: "Validation Error",
        description: firstError,
        variant: "destructive",
      });
      return;
    }

    setErrors({});

    setLoading(true);
    try {
      if (isEditMode && partner?.id) {
        // Update existing partner
        await partnersApi.update(partner.id, {
          partnerName: formData.partnerName,
          email: formData.email,
          partnerOrganization: formData.partnerOrganization || undefined,
          pointOfContact: formData.pointOfContact || undefined,
          pointOfContactDepartment: formData.pointOfContactDepartment || undefined,
          pointOfContactEmail: formData.pointOfContactEmail || undefined,
          contactNumber: formData.contactNumber || undefined,
          contactDesignation: formData.contactDesignation || undefined,
          onboardingDate: formData.onboardingDate ? new Date(formData.onboardingDate).toISOString() : undefined,
          bio: formData.bio || undefined,
          experience: formData.experience || undefined,
          status: formData.status,
        });
        toast({
          title: "Partner Updated",
          description: `Partner "${formData.partnerName}" has been updated successfully.`,
        });
      } else {
        // Create new partner
        await partnersApi.create({
          partnerName: formData.partnerName,
          email: formData.email,
          partnerOrganization: formData.partnerOrganization || undefined,
          pointOfContact: formData.pointOfContact || undefined,
          pointOfContactDepartment: formData.pointOfContactDepartment || undefined,
          pointOfContactEmail: formData.pointOfContactEmail || undefined,
          contactNumber: formData.contactNumber || undefined,
          contactDesignation: formData.contactDesignation || undefined,
          onboardingDate: formData.onboardingDate ? new Date(formData.onboardingDate).toISOString() : undefined,
          bio: formData.bio || undefined,
          experience: formData.experience || undefined,
        });
        toast({
          title: "Partner Created",
          description: `Partner "${formData.partnerName}" has been created successfully.`,
        });
      }

      // Reset form and close dialog
      setFormData({
        partnerName: "",
        email: "",
        partnerOrganization: "",
        contactNumber: "",
        onboardingDate: "",
        bio: "",
        experience: "",
        status: "ACTIVE",
        pointOfContact: "",
        pointOfContactDepartment: "",
        pointOfContactEmail: "",
        contactDesignation: "",
      });
      setErrors({});
      setOpen(false);

      if (onPartnerCreated) onPartnerCreated();
      if (onSuccess) onSuccess();
    } catch (error) {
      if (isEditMode) {
        errorHandlers.partnerUpdate(error, toast);
      } else {
        errorHandlers.partnerCreate(error, toast);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        setErrors({});
      }
    }}>
      <DialogTrigger asChild>
        {isEditMode ? (
          <Button variant="ghost" size="sm">
            <Edit className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Training Partner
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {isEditMode ? "Edit Partner" : "Add Training Partner"}
          </DialogTitle>
          {/* <DialogDescription>
            {isEditMode ? "Update partner information and contact details." : "Create a new training partner account. Partners do not have login capability."}
          </DialogDescription> */}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="overflow-y-auto px-6 space-y-4 flex-1">
            <div>
              <Label htmlFor="partnerName">Partner Name *</Label>
              <Input
                id="partnerName"
                value={formData.partnerName}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, partnerName: e.target.value }));
                  if (errors.partnerName) setErrors((prev) => ({ ...prev, partnerName: "" }));
                }}
                placeholder="Enter partner organization name"
                className={errors.partnerName ? "border-red-500" : ""}
              />
              {errors.partnerName && <p className="text-sm text-red-500 mt-1">{errors.partnerName}</p>}
            </div>

            <div>
              <Label htmlFor="email">Email Address * (Must be unique)</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, email: e.target.value }));
                  if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
                }}
                placeholder="Enter partner's email address"
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
            </div>

            <div>
              <Label htmlFor="partnerOrganization">Partner Organization</Label>
              <Input
                id="partnerOrganization"
                value={formData.partnerOrganization}
                onChange={(e) => setFormData((prev) => ({ ...prev, partnerOrganization: e.target.value }))}
                placeholder="Enter partner organization name"
              />
            </div>

            {/* Point-of-Contact Section */}
            <div className="space-y-4 border-t pt-4 mt-4">
              <h3 className="text-sm font-semibold text-gray-700">Point-of-Contact Details</h3>
              
              <div>
                <Label htmlFor="pointOfContact">Point-of-Contact Name</Label>
                <Input
                  id="pointOfContact"
                  value={formData.pointOfContact}
                  onChange={(e) => setFormData((prev) => ({ ...prev, pointOfContact: e.target.value }))}
                  placeholder="Enter point-of-contact name"
                />
              </div>

              <div>
                <Label htmlFor="pointOfContactDepartment">Department</Label>
                <Input
                  id="pointOfContactDepartment"
                  value={formData.pointOfContactDepartment}
                  onChange={(e) => setFormData((prev) => ({ ...prev, pointOfContactDepartment: e.target.value }))}
                  placeholder="Enter department"
                />
              </div>

              <div>
                <Label htmlFor="contactDesignation">Designation</Label>
                <Input
                  id="contactDesignation"
                  value={formData.contactDesignation}
                  onChange={(e) => setFormData((prev) => ({ ...prev, contactDesignation: e.target.value }))}
                  placeholder="Enter designation"
                />
              </div>

              <div>
                <Label htmlFor="pointOfContactEmail">Email</Label>
                <Input
                  id="pointOfContactEmail"
                  type="email"
                  value={formData.pointOfContactEmail}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, pointOfContactEmail: e.target.value }));
                    if (errors.pointOfContactEmail) setErrors((prev) => ({ ...prev, pointOfContactEmail: "" }));
                  }}
                  placeholder="Enter point-of-contact email"
                  className={errors.pointOfContactEmail ? "border-red-500" : ""}
                />
                {errors.pointOfContactEmail && <p className="text-sm text-red-500 mt-1">{errors.pointOfContactEmail}</p>}
              </div>

              <div>
                <Label htmlFor="contactNumber">Contact Number</Label>
                <Input
                  id="contactNumber"
                  value={formData.contactNumber}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  onChange={(e) => {
                    const nextValue = digitsOnly(e.target.value);
                    setFormData((prev) => ({ ...prev, contactNumber: nextValue }));
                  }}
                  placeholder="Enter contact number"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="onboardingDate">Onboarding Date</Label>
              <DateInput id="onboardingDate" value={formData.onboardingDate || ""} onChange={(v) => setFormData((prev) => ({ ...prev, onboardingDate: v }))} />
            </div>

            {isEditMode && (
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
                placeholder="Enter partner bio"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="experience">Experience</Label>
              <Textarea
                id="experience"
                value={formData.experience}
                onChange={(e) => setFormData((prev) => ({ ...prev, experience: e.target.value }))}
                placeholder="Enter partner experience"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" onClick={handleSubmit} disabled={loading}>
              {loading ? "Saving..." : isEditMode ? "Update Training Partner" : "Create Training Partner"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
