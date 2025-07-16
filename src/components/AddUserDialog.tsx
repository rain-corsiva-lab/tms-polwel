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
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AddUserDialog() {
  const [open, setOpen] = useState(false);
  const [userType, setUserType] = useState<string>("");
  const [formData, setFormData] = useState({
    // Common fields
    name: "",
    email: "",
    password: "",
    additionalEmails: "",
    mfaRequired: true,
    
    // POLWEL specific
    permissionLevel: "",
    department: "",
    
    // Training Coordinator specific
    organizationName: "",
    division: "",
    divisionAddress: "",
    buCostCentre: "",
    buNumberRequired: false,
    paymentMode: "",
    contactNumber: "",
    
    // Trainer specific
    courses: "",
    availabilityStatus: "Available",
    partnerOrganization: "",
    
    // Learner specific
    enrolledCourses: "",
    
    status: "Active",
  });

  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Enhanced validation based on requirements
    if (!userType || !formData.name || !formData.email || !formData.password) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Training Coordinator specific validation
    if (userType === "TrainingCoordinator") {
      if (!formData.organizationName || !formData.division) {
        toast({
          title: "Validation Error",
          description: "Organization and Division are mandatory for Training Coordinators.",
          variant: "destructive",
        });
        return;
      }
      
      // BU Cost Centre mandatory for SPF/POLWEL organizations
      if ((formData.organizationName.includes("SPF") || formData.organizationName.includes("POLWEL")) && !formData.buCostCentre) {
        toast({
          title: "Validation Error",
          description: "BU Cost Centre is mandatory for SPF/POLWEL organizations.",
          variant: "destructive",
        });
        return;
      }
    }

    // Password complexity validation (minimum 12 characters, mixed case, numbers, symbols)
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
    if (!passwordPattern.test(formData.password)) {
      toast({
        title: "Password Validation Error",
        description: "Password must be at least 12 characters with uppercase, lowercase, numbers, and symbols.",
        variant: "destructive",
      });
      return;
    }

    // Here you would typically send the data to your backend
    toast({
      title: "User Created",
      description: `${userType === "TrainingCoordinator" ? "Training Coordinator" : userType} "${formData.name}" has been created successfully. Onboarding email sent with secure link.`,
    });

    // Reset form and close dialog
    setFormData({
      name: "",
      email: "",
      password: "",
      additionalEmails: "",
      mfaRequired: true,
      permissionLevel: "",
      department: "",
      organizationName: "",
      division: "",
      divisionAddress: "",
      buCostCentre: "",
      buNumberRequired: false,
      paymentMode: "",
      contactNumber: "",
      courses: "",
      availabilityStatus: "Available",
      partnerOrganization: "",
      enrolledCourses: "",
      status: "Active",
    });
    setUserType("");
    setOpen(false);
  };

  const renderUserTypeFields = () => {
    switch (userType) {
      case "POLWEL":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="permissionLevel">Permission Level *</Label>
              <Select onValueChange={(value) => setFormData(prev => ({ ...prev, permissionLevel: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select permission level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Administrator">Administrator</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="Coordinator">Coordinator</SelectItem>
                  <SelectItem value="Viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                placeholder="e.g. System Administration, Course Management"
              />
            </div>
          </div>
        );

      case "TrainingCoordinator":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="organizationName">Organization Name *</Label>
              <Select onValueChange={(value) => setFormData(prev => ({ ...prev, organizationName: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Singapore Police Force">Singapore Police Force</SelectItem>
                  <SelectItem value="POLWEL">POLWEL</SelectItem>
                  <SelectItem value="Other Government Agency">Other Government Agency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="division">Division / Department *</Label>
              <Input
                id="division"
                value={formData.division}
                onChange={(e) => setFormData(prev => ({ ...prev, division: e.target.value }))}
                placeholder="e.g. Ang Mo Kio Division, Airport Police Division"
              />
            </div>
            <div>
              <Label htmlFor="divisionAddress">Division Address</Label>
              <Input
                id="divisionAddress"
                value={formData.divisionAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, divisionAddress: e.target.value }))}
                placeholder="Enter division address"
              />
            </div>
            <div>
              <Label htmlFor="buCostCentre">
                BU Cost Centre {(formData.organizationName.includes("SPF") || formData.organizationName.includes("POLWEL")) ? "*" : ""}
              </Label>
              <Input
                id="buCostCentre"
                value={formData.buCostCentre}
                onChange={(e) => setFormData(prev => ({ ...prev, buCostCentre: e.target.value }))}
                placeholder="Mandatory for SPF/POLWEL organizations"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="buNumberRequired"
                checked={formData.buNumberRequired}
                onChange={(e) => setFormData(prev => ({ ...prev, buNumberRequired: e.target.checked }))}
              />
              <Label htmlFor="buNumberRequired">Require BU Number for learner enrollment</Label>
            </div>
            <div>
              <Label htmlFor="paymentMode">Payment Mode</Label>
              <Select onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMode: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ULTF">ULTF</SelectItem>
                  <SelectItem value="Transition Dollars">Transition Dollars</SelectItem>
                  <SelectItem value="Self Sponsored">Self Sponsored</SelectItem>
                  <SelectItem value="Not Applicable">Not Applicable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="contactNumber">Contact Number *</Label>
              <Input
                id="contactNumber"
                value={formData.contactNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, contactNumber: e.target.value }))}
                placeholder="Training coordinator contact number"
              />
            </div>
            <div>
              <Label htmlFor="additionalEmails">Additional Email Contacts</Label>
              <Input
                id="additionalEmails"
                value={formData.additionalEmails}
                onChange={(e) => setFormData(prev => ({ ...prev, additionalEmails: e.target.value }))}
                placeholder="Comma-separated emails for multiple contacts"
              />
            </div>
          </div>
        );

      case "Trainer":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="partnerOrganization">Partner Organization</Label>
              <Input
                id="partnerOrganization"
                value={formData.partnerOrganization}
                onChange={(e) => setFormData(prev => ({ ...prev, partnerOrganization: e.target.value }))}
                placeholder="Training partner organization"
              />
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
            <div>
              <Label htmlFor="availabilityStatus">Availability Status</Label>
              <Select onValueChange={(value) => setFormData(prev => ({ ...prev, availabilityStatus: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="Unavailable">Unavailable</SelectItem>
                  <SelectItem value="Limited">Limited Availability</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "Learner":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="organizationName">Organization Name *</Label>
              <Select onValueChange={(value) => setFormData(prev => ({ ...prev, organizationName: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Singapore Police Force">Singapore Police Force</SelectItem>
                  <SelectItem value="POLWEL">POLWEL</SelectItem>
                  <SelectItem value="Other Government Agency">Other Government Agency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="division">Division / Department</Label>
              <Input
                id="division"
                value={formData.division}
                onChange={(e) => setFormData(prev => ({ ...prev, division: e.target.value }))}
                placeholder="e.g. Ang Mo Kio Division"
              />
            </div>
            <div>
              <Label htmlFor="enrolledCourses">Enrolled Courses</Label>
              <Input
                id="enrolledCourses"
                value={formData.enrolledCourses}
                onChange={(e) => setFormData(prev => ({ ...prev, enrolledCourses: e.target.value }))}
                placeholder="Initial course enrollment (comma separated)"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user account in the Training Management System.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User Type Selection */}
          <div>
            <Label htmlFor="userType">User Type *</Label>
            <Select onValueChange={setUserType}>
              <SelectTrigger>
                <SelectValue placeholder="Select user type" />
              </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POLWEL">POLWEL User</SelectItem>
                  <SelectItem value="TrainingCoordinator">Training Coordinator</SelectItem>
                  <SelectItem value="Trainer">Trainer & Partner</SelectItem>
                  <SelectItem value="Learner">Learner</SelectItem>
                </SelectContent>
            </Select>
          </div>

          {/* Common Fields */}
          {userType && (
            <>
              <div>
                <Label htmlFor="name">
                  {userType === "TrainingCoordinator" ? "Training Coordinator Name" : "Name"} *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter full name"
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email Address * (Must be unique)</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter unique email address"
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

              {/* User Type Specific Fields */}
              {renderUserTypeFields()}
            </>
          )}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={!userType}>
            Create User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}