import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { errorHandlers } from "@/lib/errorHandler";

interface TrainingCoordinator {
  id: string;
  name: string;
  email: string;
  designation: string;
  status: string;
  isPrimaryCoordinator?: boolean;
  contactNumber?: string | null;
}

interface EditCoordinatorDialogProps {
  coordinator: TrainingCoordinator | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCoordinatorUpdate: (
    coordinatorId: string,
    coordinatorData: {
      name?: string;
      email?: string;
      contactNumber?: string | null;
      designation?: string;
      status?: string;
      isPrimary?: boolean;
    }
  ) => Promise<void>;
}

export function EditCoordinatorDialog({ coordinator, open, onOpenChange, onCoordinatorUpdate }: EditCoordinatorDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    contactNumber: "",
    designation: "",
    status: "ACTIVE",
    isPrimary: false,
  });
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();

  // Update form data when coordinator prop changes
  useEffect(() => {
    if (coordinator) {
      setFormData({
        name: coordinator.name || "",
        email: coordinator.email || "",
        contactNumber: coordinator.contactNumber || "",
        designation: coordinator.designation || "",
        status: coordinator.status || "ACTIVE",
        isPrimary: !!coordinator.isPrimaryCoordinator,
      });
    }
  }, [coordinator]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!coordinator || !formData.name || !formData.email || !formData.designation || !formData.contactNumber) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const sanitizedContact = formData.contactNumber.trim();

      await onCoordinatorUpdate(coordinator.id, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        contactNumber: sanitizedContact || null,
        designation: formData.designation.trim(),
        status: formData.status,
        isPrimary: formData.isPrimary,
      });

      // Only show success toast if the API call succeeds
      toast({
        title: "Coordinator Updated",
        description: `Training Coordinator "${formData.name}" has been updated successfully.`,
      });

      onOpenChange(false);
    } catch (error) {
      errorHandlers.coordinatorUpdate(error, toast);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    if (coordinator) {
      setFormData({
        name: coordinator.name || "",
        email: coordinator.email || "",
        contactNumber: coordinator.contactNumber || "",
        designation: coordinator.designation || "",
        status: coordinator.status || "ACTIVE",
        isPrimary: !!coordinator.isPrimaryCoordinator,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Training Coordinator
          </DialogTitle>
          <DialogDescription>Update the training coordinator information below.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="coordinatorName">Coordinator Name *</Label>
            <Input
              id="coordinatorName"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Enter coordinator's full name"
              disabled={loading}
            />
          </div>

          <div className="flex items-center space-x-2">
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
            <Label htmlFor="coordinatorEmail">Email Address *</Label>
            <Input
              id="coordinatorEmail"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Enter email address"
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="coordinatorContact">Contact Number *</Label>
            <Input
              id="coordinatorContact"
              value={formData.contactNumber}
              onChange={(e) => setFormData((prev) => ({ ...prev, contactNumber: e.target.value }))}
              placeholder="Enter contact number"
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="coordinatorDesignation">Designation *</Label>
            <Input
              id="coordinatorDesignation"
              value={formData.designation}
              onChange={(e) => setFormData((prev) => ({ ...prev, designation: e.target.value }))}
              placeholder="Enter designation"
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="coordinatorStatus">Status *</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Coordinator"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
