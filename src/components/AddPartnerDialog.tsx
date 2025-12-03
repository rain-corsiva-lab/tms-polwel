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
  const [formData, setFormData] = useState({
    partnerName: "",
    email: "",
    partnerOrganization: "",
    contactNumber: "",
    onboardingDate: "",
    bio: "",
    experience: "",
    status: "ACTIVE",
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
      });
    }
  }, [isEditMode, partner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.partnerName || !formData.email) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (!isValidEmail(formData.email)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address (name@email.com).",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (isEditMode && partner?.id) {
        // Update existing partner
        await partnersApi.update(partner.id, {
          partnerName: formData.partnerName,
          email: formData.email,
          partnerOrganization: formData.partnerOrganization || undefined,
          contactNumber: formData.contactNumber || undefined,
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
          contactNumber: formData.contactNumber || undefined,
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
      });
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
    <Dialog open={open} onOpenChange={setOpen}>
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
                onChange={(e) => setFormData((prev) => ({ ...prev, partnerName: e.target.value }))}
                placeholder="Enter partner organization name"
              />
            </div>

            <div>
              <Label htmlFor="email">Email Address * (Must be unique)</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="Enter partner's email address"
              />
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
                placeholder="Partner contact number"
              />
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
