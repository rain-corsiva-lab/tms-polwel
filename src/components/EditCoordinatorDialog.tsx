import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { errorHandlers } from "@/lib/errorHandler";

interface TrainingCoordinator {
  id: string;
  name: string;
  email: string;
  department: string;
  status: string;
}

interface EditCoordinatorDialogProps {
  coordinator: TrainingCoordinator | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCoordinatorUpdate: (coordinatorId: string, coordinatorData: {
    name?: string;
    email?: string;
    department?: string;
    status?: string;
  }) => Promise<void>;
}

export function EditCoordinatorDialog({ 
  coordinator, 
  open, 
  onOpenChange, 
  onCoordinatorUpdate 
}: EditCoordinatorDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
    status: "ACTIVE",
  });
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();

  // Update form data when coordinator prop changes
  useEffect(() => {
    if (coordinator) {
      setFormData({
        name: coordinator.name || "",
        email: coordinator.email || "",
        department: coordinator.department || "",
        status: coordinator.status || "ACTIVE",
      });
    }
  }, [coordinator]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!coordinator || !formData.name || !formData.email || !formData.department) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      await onCoordinatorUpdate(coordinator.id, {
        name: formData.name,
        email: formData.email,
        department: formData.department,
        status: formData.status,
      });

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
        department: coordinator.department || "",
        status: coordinator.status || "ACTIVE",
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
          <DialogDescription>
            Update the training coordinator information below.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="coordinatorName">Coordinator Name *</Label>
            <Input
              id="coordinatorName"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter coordinator's full name"
              disabled={loading}
            />
          </div>
          
          <div>
            <Label htmlFor="coordinatorEmail">Email Address *</Label>
            <Input
              id="coordinatorEmail"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Enter email address"
              disabled={loading}
            />
          </div>
          
          <div>
            <Label htmlFor="coordinatorDepartment">Department *</Label>
            <Input
              id="coordinatorDepartment"
              value={formData.department}
              onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
              placeholder="Enter department"
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="coordinatorStatus">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
              disabled={loading}
            >
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
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Coordinator'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
