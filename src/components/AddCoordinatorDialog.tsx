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
import { Plus, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AddCoordinatorDialogProps {
  onCoordinatorAdd: (coordinatorData: {
    name: string;
    email: string;
    department: string;
    password: string;
  }) => Promise<void>;
}

export function AddCoordinatorDialog({ onCoordinatorAdd }: AddCoordinatorDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    contactNumber: "",
    department: "",
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
      });

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
      });
      setOpen(false);
    } catch (error) {
      console.error('Error creating coordinator:', error);
      
      let errorMessage = "Failed to create coordinator";
      
      if (error instanceof Error) {
        // Parse API error message
        if (error.message.includes('already exists') || error.message.includes('already in use')) {
          errorMessage = "A coordinator with this email address already exists";
        } else if (error.message.includes('email')) {
          errorMessage = "Invalid email address provided";
        } else if (error.message.includes('validation')) {
          errorMessage = "Invalid data provided. Please check your input and try again";
        } else if (error.message.includes('permission')) {
          errorMessage = "You don't have permission to create coordinators";
        } else if (error.message.includes('organization')) {
          errorMessage = "Organization not found or no longer exists";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
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