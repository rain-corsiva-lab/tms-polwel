import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { errorHandlers } from "@/lib/errorHandler";

interface AddCoordinatorDialogProps {
  onCoordinatorAdd: (coordinatorData: {
    name: string;
    email: string;
    department: string;
    password: string;
    isPrimaryCoordinator?: boolean;
  }) => Promise<void>;
}

export function AddCoordinatorDialog({ onCoordinatorAdd }: AddCoordinatorDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    contactNumber: "",
    department: "",
    isPrimaryCoordinator: false,
  });

  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.contactNumber || !formData.department) {
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
        name: formData.name,
        email: formData.email,
        department: formData.department,
        password: tempPassword,
        isPrimaryCoordinator: formData.isPrimaryCoordinator,
      });

      // Only show success toast if the API call succeeds
      toast({
        title: "Training Coordinator Created",
        description: `Training Coordinator "${formData.name}" has been created successfully.`,
      });

      // Reset form and close dialog
      setFormData({
        name: "",
        email: "",
        contactNumber: "",
        department: "",
        isPrimaryCoordinator: false,
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
          <DialogDescription>
            Create a new training coordinator account. User will set password in onboarding flow.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="coordinatorName">Training Coordinator Name *</Label>
            <Input
              id="coordinatorName"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter coordinator's full name"
            />
          </div>
          
          <div>
            <Label htmlFor="coordinatorEmail">Email Address * (Unique Identifier)</Label>
            <Input
              id="coordinatorEmail"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Enter unique email address"
            />
          </div>
          
          <div>
            <Label htmlFor="coordinatorContact">Contact Number *</Label>
            <Input
              id="coordinatorContact"
              value={formData.contactNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, contactNumber: e.target.value }))}
              placeholder="Enter contact number"
            />
          </div>

          <div>
            <Label htmlFor="coordinatorDepartment">Department *</Label>
            <Input
              id="coordinatorDepartment"
              value={formData.department}
              onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
              placeholder="Enter department"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="primaryCoordinator"
              checked={formData.isPrimaryCoordinator}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, isPrimaryCoordinator: checked as boolean }))
              }
            />
            <Label htmlFor="primaryCoordinator" className="text-sm font-normal">
              Make primary coordinator
            </Label>
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