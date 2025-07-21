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
import { Plus, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AddTrainerDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    partnerOrganization: "",
    contactNumber: "",
    courses: "",
    status: "Active",
  });

  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.password) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Password complexity validation
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
    if (!passwordPattern.test(formData.password)) {
      toast({
        title: "Password Validation Error",
        description: "Password must be at least 12 characters with uppercase, lowercase, numbers, and symbols.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Trainer Created",
      description: `Trainer "${formData.name}" has been created successfully. Onboarding email sent with secure link.`,
    });

    // Reset form and close dialog
    setFormData({
      name: "",
      email: "",
      password: "",
      partnerOrganization: "",
      contactNumber: "",
      courses: "",
      status: "Active",
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add New Trainer/Partner
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Add New Trainer/Partner
          </DialogTitle>
          <DialogDescription>
            Create a new trainer account and assign them to partner organizations.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Trainer Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter trainer's full name"
            />
          </div>
          
          <div>
            <Label htmlFor="email">Email Address * (Must be unique)</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Enter trainer's email address"
            />
          </div>
          
          <div>
            <Label htmlFor="password">Temporary Password *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Min 12 chars, mixed case, numbers, symbols"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Password expires in 365 days. User will be required to change on first login.
            </p>
          </div>

          <div>
            <Label htmlFor="partnerOrganization">Partner Organization</Label>
            <Select onValueChange={(value) => setFormData(prev => ({ ...prev, partnerOrganization: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select partner organization" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Excellence Training Partners">Excellence Training Partners</SelectItem>
                <SelectItem value="Professional Development Corp">Professional Development Corp</SelectItem>
                <SelectItem value="Leadership Institute">Leadership Institute</SelectItem>
                <SelectItem value="Skills Training Ltd">Skills Training Ltd</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="contactNumber">Contact Number</Label>
            <Input
              id="contactNumber"
              value={formData.contactNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, contactNumber: e.target.value }))}
              placeholder="Trainer contact number"
            />
          </div>

          <div>
            <Label htmlFor="courses">Courses Assigned</Label>
            <Input
              id="courses"
              value={formData.courses}
              onChange={(e) => setFormData(prev => ({ ...prev, courses: e.target.value }))}
              placeholder="Assigned courses (comma separated)"
            />
          </div>

        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit}>
            Create Trainer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}