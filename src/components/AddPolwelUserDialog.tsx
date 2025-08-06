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
import { polwelUsersApi } from "@/lib/api";
import type { CheckedState } from "@radix-ui/react-checkbox";

interface ModulePermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

interface UserPermissions {
  'user-management-polwel': ModulePermissions;
  'user-management-trainers': ModulePermissions;
  'user-management-client-orgs': ModulePermissions;
  'course-venue-setup': ModulePermissions;
  'course-runs-operations': ModulePermissions;
  'email-reporting-library': ModulePermissions;
  'finance-activity': ModulePermissions;
}

export function AddPolwelUserDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    status: "ACTIVE",
    department: "",
    permissionLevel: "",
  });

  const [permissions, setPermissions] = useState<UserPermissions>({
    'user-management-polwel': { view: false, create: false, edit: false, delete: false },
    'user-management-trainers': { view: false, create: false, edit: false, delete: false },
    'user-management-client-orgs': { view: false, create: false, edit: false, delete: false },
    'course-venue-setup': { view: false, create: false, edit: false, delete: false },
    'course-runs-operations': { view: false, create: false, edit: false, delete: false },
    'email-reporting-library': { view: false, create: false, edit: false, delete: false },
    'finance-activity': { view: false, create: false, edit: false, delete: false },
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

    setLoading(true);

    try {
      const response = await polwelUsersApi.create({
        name: formData.name,
        email: formData.email,
        status: formData.status,
        department: formData.department || undefined,
        permissionLevel: formData.permissionLevel || undefined,
      });

      toast({
        title: "POLWEL User Created",
        description: `POLWEL user "${formData.name}" has been created successfully. Temporary password: ${response.tempPassword}`,
      });

      // Reset form and close dialog
      setFormData({
        name: "",
        email: "",
        status: "ACTIVE",
        department: "",
        permissionLevel: "",
      });
      setPermissions({
        'user-management-polwel': { view: false, create: false, edit: false, delete: false },
        'user-management-trainers': { view: false, create: false, edit: false, delete: false },
        'user-management-client-orgs': { view: false, create: false, edit: false, delete: false },
        'course-venue-setup': { view: false, create: false, edit: false, delete: false },
        'course-runs-operations': { view: false, create: false, edit: false, delete: false },
        'email-reporting-library': { view: false, create: false, edit: false, delete: false },
        'finance-activity': { view: false, create: false, edit: false, delete: false },
      });
      setOpen(false);

      // Trigger a page refresh or parent component update
      window.location.reload();
    } catch (error) {
      console.error('Error creating POLWEL user:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create POLWEL user",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              value={formData.department}
              onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
              placeholder="Enter department"
            />
          </div>

          <div>
            <Label htmlFor="permissionLevel">Permission Level</Label>
            <Input
              id="permissionLevel"
              value={formData.permissionLevel}
              onChange={(e) => setFormData(prev => ({ ...prev, permissionLevel: e.target.value }))}
              placeholder="e.g., Administrator, Manager, Staff"
            />
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
                        <th className="text-left p-3 font-medium text-foreground">Module</th>
                        <th className="text-center p-3 font-medium text-foreground min-w-[80px]">View</th>
                        <th className="text-center p-3 font-medium text-foreground min-w-[80px]">Create</th>
                        <th className="text-center p-3 font-medium text-foreground min-w-[80px]">Edit</th>
                        <th className="text-center p-3 font-medium text-foreground min-w-[80px]">Delete</th>
                      </tr>
                    </thead>
                    <tbody>
                       {Object.entries(permissions).map(([module, modulePermissions]) => {
                         const moduleDisplayNames: Record<string, string> = {
                           'user-management-polwel': 'User Management - POLWEL Users',
                           'user-management-trainers': 'User Management - Trainers & Partners',
                           'user-management-client-orgs': 'User Management - Client Organisations',
                           'course-venue-setup': 'Course & Venue Setup',
                           'course-runs-operations': 'Course Runs & Operations',
                           'email-reporting-library': 'Email, Reporting and Resource Library',
                           'finance-activity': 'Finance and Activity'
                         };
                         
                          return (
                         <tr key={module} className="border-b hover:bg-muted/30">
                           <td className="p-3 font-medium text-foreground">
                             {moduleDisplayNames[module] || module}
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
                      );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating..." : "Create POLWEL User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}