import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import DateInput from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, GraduationCap } from "lucide-react";
import { cn, digitsOnly } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { isValidEmail } from "@/lib/validators";
import { trainersApi } from "@/lib/api";
import { errorHandlers } from "@/lib/errorHandler";

export function AddTrainerDialog({ onTrainerCreated }: { onTrainerCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    contactNumber: "",
    onboardingDate: "",
    status: "ACTIVE",
    partnerOrganization: "",
    bio: "",
    experience: "",
  });

  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email) {
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
      await trainersApi.create({
        name: formData.name,
        email: formData.email,
        status: formData.status,
        partnerOrganization: formData.partnerOrganization || undefined,
        bio: formData.bio || undefined,
        experience: formData.experience || undefined,
        contactNumber: formData.contactNumber || undefined,
        onboardingDate: (formData as any).onboardingDate ? new Date((formData as any).onboardingDate).toISOString() : undefined,
      });

      toast({
        title: "Trainer Created",
        description: `Trainer "${formData.name}" has been created successfully. Onboarding email sent with secure link.`,
      });

      // Reset form and close dialog
      setFormData({
        name: "",
        email: "",
        contactNumber: "",
        onboardingDate: "",
        status: "ACTIVE",
        partnerOrganization: "",
        bio: "",
        experience: "",
      });
      setOpen(false);

      // Call the callback to refresh the parent component
      if (onTrainerCreated) {
        onTrainerCreated();
      }
    } catch (error) {
      errorHandlers.trainerCreate(error, toast);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Associate Trainer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Add Associate Trainer
          </DialogTitle>
          <DialogDescription>Create a new standalone associate trainer account. User will set password in onboarding flow.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Trainer Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Enter trainer's full name"
            />
          </div>

          <div>
            <Label htmlFor="email">Email Address * (Must be unique)</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Enter trainer's email address"
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
              placeholder="Trainer contact number"
            />
          </div>

          <div>
            <Label htmlFor="onboardingDate">Onboarding Date</Label>
            <DateInput
              id="onboardingDate"
              value={(formData as any).onboardingDate || ""}
              onChange={(v) => setFormData((prev) => ({ ...prev, onboardingDate: v }))}
            />
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating..." : "Create Associate Trainer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
