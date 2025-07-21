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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { CheckedState } from "@radix-ui/react-checkbox";

interface ModulePermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

interface UserPermissions {
  staffs: ModulePermissions;
  members: ModulePermissions;
  volunteers: ModulePermissions;
  donors: ModulePermissions;
}

export function AddPolwelUserDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    status: "Active",
  });

  const [permissions, setPermissions] = useState<UserPermissions>({
    staffs: { view: false, create: false, edit: false, delete: false },
    members: { view: false, create: false, edit: false, delete: false },
    volunteers: { view: false, create: false, edit: false, delete: false },
    donors: { view: false, create: false, edit: false, delete: false },
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

    // Check if at least one permission is granted
    const hasAnyPermission = Object.values(permissions).some(module =>
      Object.values(module).some(permission => permission)
    );

    if (!hasAnyPermission) {
      toast({
        title: "Permission Error",
        description: "Please grant at least one permission to the user.",
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
      title: "POLWEL User Created",
      description: `POLWEL user "${formData.name}" has been created successfully. Onboarding email sent with secure link.`,
    });

    // Reset form and close dialog
    setFormData({
      name: "",
      email: "",
      password: "",
      status: "Active",
    });
    setPermissions({
      staffs: { view: false, create: false, edit: false, delete: false },
      members: { view: false, create: false, edit: false, delete: false },
      volunteers: { view: false, create: false, edit: false, delete: false },
      donors: { view: false, create: false, edit: false, delete: false },
    });
    setOpen(false);
  };

  const handlePermissionChange = (module: keyof UserPermissions, permission: keyof ModulePermissions, checked: CheckedState) => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [permission]: checked === true
      }
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add New POLWEL User
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Add New POLWEL User
          </DialogTitle>
          <DialogDescription>
            Create a new POLWEL staff account with appropriate system permissions.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name *</Label>
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
              placeholder="Enter @polwel.org email address"
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
            <Label>Access Level *</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Please define the access level for this staff member.
            </p>
            
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium text-foreground">MODULE</th>
                        <th className="text-center p-3 font-medium text-foreground min-w-[80px]">VIEW</th>
                        <th className="text-center p-3 font-medium text-foreground min-w-[80px]">CREATE</th>
                        <th className="text-center p-3 font-medium text-foreground min-w-[80px]">EDIT</th>
                        <th className="text-center p-3 font-medium text-foreground min-w-[80px]">DELETE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(permissions).map(([module, modulePermissions]) => (
                        <tr key={module} className="border-b hover:bg-muted/30">
                          <td className="p-3 font-medium text-foreground capitalize">
                            {module}
                          </td>
                          {Object.entries(modulePermissions).map(([permission, checked]) => (
                            <td key={permission} className="p-3 text-center">
                              <Checkbox
                                checked={checked as CheckedState}
                                onCheckedChange={(checkedState) => 
                                  handlePermissionChange(
                                    module as keyof UserPermissions, 
                                    permission as keyof ModulePermissions, 
                                    checkedState
                                  )
                                }
                                className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit}>
            Create POLWEL User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}