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
    
    // POLWEL specific
    permissionAccess: "",
    
    // Client (TC) specific
    organizationName: "",
    division: "",
    divisionAddress: "",
    buCostCentre: "",
    paymentMode: "",
    contactNumber: "",
    
    // Trainer specific
    courses: "",
    status: "Active",
  });

  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!userType || !formData.name || !formData.email || !formData.password) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Here you would typically send the data to your backend
    toast({
      title: "User Created",
      description: `${userType} user "${formData.name}" has been created successfully.`,
    });

    // Reset form and close dialog
    setFormData({
      name: "",
      email: "",
      password: "",
      permissionAccess: "",
      organizationName: "",
      division: "",
      divisionAddress: "",
      buCostCentre: "",
      paymentMode: "",
      contactNumber: "",
      courses: "",
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
              <Label htmlFor="permissionAccess">Permission Access *</Label>
              <Select onValueChange={(value) => setFormData(prev => ({ ...prev, permissionAccess: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select permission level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="coordinator">Coordinator</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "Client":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="organizationName">Organization Name *</Label>
              <Input
                id="organizationName"
                value={formData.organizationName}
                onChange={(e) => setFormData(prev => ({ ...prev, organizationName: e.target.value }))}
                placeholder="e.g. Singapore Police Force"
              />
            </div>
            <div>
              <Label htmlFor="division">Division / Department *</Label>
              <Input
                id="division"
                value={formData.division}
                onChange={(e) => setFormData(prev => ({ ...prev, division: e.target.value }))}
                placeholder="e.g. Ang Mo Kio / AAO"
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
              <Label htmlFor="buCostCentre">BU Cost Centre</Label>
              <Input
                id="buCostCentre"
                value={formData.buCostCentre}
                onChange={(e) => setFormData(prev => ({ ...prev, buCostCentre: e.target.value }))}
                placeholder="For billing purpose (mandatory for SPF/POLWEL)"
              />
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
              <Label htmlFor="contactNumber">TC Contact Number</Label>
              <Input
                id="contactNumber"
                value={formData.contactNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, contactNumber: e.target.value }))}
                placeholder="Training coordinator contact number"
              />
            </div>
          </div>
        );

      case "Trainer":
        return (
          <div className="space-y-4">
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
              <Label htmlFor="courses">Courses Conducted</Label>
              <Input
                id="courses"
                value={formData.courses}
                onChange={(e) => setFormData(prev => ({ ...prev, courses: e.target.value }))}
                placeholder="List of courses (comma separated)"
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
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
                <SelectItem value="Client">Client (Training Coordinator)</SelectItem>
                <SelectItem value="Trainer">Trainer & Partner</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Common Fields */}
          {userType && (
            <>
              <div>
                <Label htmlFor="name">
                  {userType === "Client" ? "Training Coordinator Name" : "Name"} *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter full name"
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>
              
              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter temporary password"
                />
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