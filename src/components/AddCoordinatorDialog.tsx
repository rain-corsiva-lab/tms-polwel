import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { errorHandlers } from "@/lib/errorHandler";
import { digitsOnly } from "@/lib/utils";

interface AddCoordinatorDialogProps {
  onCoordinatorAdd: (coordinatorData: {
    name: string;
    email: string;
    contactNumber: string;
    designation: string;
    password: string;
    isPrimary?: boolean;
  }) => Promise<void>;
}

export function AddCoordinatorDialog({ onCoordinatorAdd }: AddCoordinatorDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    contactNumber: "",
    designation: "",
    isPrimary: false,
  });

  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const sanitizedContact = digitsOnly(formData.contactNumber);

    if (!formData.name || !formData.email || !sanitizedContact || !formData.designation) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Generate temporary password for coordinator
      const tempPassword = Math.random().toString(36).slice(-8);

      await onCoordinatorAdd({
        name: formData.name.trim(),
        email: formData.email.trim(),
        contactNumber: sanitizedContact,
        designation: formData.designation.trim(),
        password: tempPassword,
        isPrimary: formData.isPrimary || false,
      });

      // Only show success toast if the API call succeeds
      toast({
        title: "Training Coordinator Created",
        description: `Training Coordinator "${formData.name}" has been created successfully. Onboarding email sent with secure link.`,
      });

      // Reset form and close dialog
      setFormData({
        name: "",
        email: "",
        contactNumber: "",
        designation: "",
        isPrimary: false,
      });
      setOpen(false);
    } catch (error) {
      errorHandlers.coordinatorCreate(error, toast);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add New Coordinator
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Add New Training Coordinator
          </DialogTitle>
          <DialogDescription>Create a new training coordinator account. User will set password in onboarding flow.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="coordinatorName">Training Coordinator Name *</Label>
            <Input
              id="coordinatorName"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Enter coordinator's full name"
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              id="isPrimary"
              type="checkbox"
              className="h-4 w-4"
              checked={formData.isPrimary}
              onChange={(e) => setFormData((prev) => ({ ...prev, isPrimary: e.target.checked }))}
            />
            <Label htmlFor="isPrimary">Set as primary training coordinator</Label>
          </div>

          <div>
            <Label htmlFor="coordinatorEmail">Email Address * (Unique Identifier)</Label>
            <Input
              id="coordinatorEmail"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Enter unique email address"
            />
          </div>

          <div>
            <Label htmlFor="coordinatorContact">Contact Number *</Label>
            <Input
              id="coordinatorContact"
              value={formData.contactNumber}
              inputMode="numeric"
              pattern="[0-9]*"
              onChange={(e) => setFormData((prev) => ({ ...prev, contactNumber: digitsOnly(e.target.value) }))}
              placeholder="Enter contact number"
            />
          </div>

          <div>
            <Label htmlFor="coordinatorDesignation">Designation *</Label>
            <Input
              id="coordinatorDesignation"
              value={formData.designation}
              onChange={(e) => setFormData((prev) => ({ ...prev, designation: e.target.value }))}
              placeholder="Enter designation"
            />
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit}>
            Create Coordinator
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
