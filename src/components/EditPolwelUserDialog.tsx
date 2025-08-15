import { useState, useEffect } from "react";
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
import { Edit, Shield } from "lucide-react";
import { polwelUsersApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
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

interface PolwelUser {
  id: string;
  name: string;
  email: string;
  role: 'POLWEL';
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'LOCKED';
  lastLogin: string | null;
  mfaEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  permissions?: Array<{
    permission: {
      id: string;
      name: string;
      module: string;
      action: string;
    };
  }>;
}

interface EditPolwelUserDialogProps {
  user: PolwelUser;
  onUserUpdated: () => void;
}

export function EditPolwelUserDialog({ user, onUserUpdated }: EditPolwelUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
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

  // Load user permissions when dialog opens
  useEffect(() => {
    if (open && user.permissions) {
      const updatedPermissions = { ...permissions };
      
      user.permissions.forEach((userPermission) => {
        // Extract module and action from permission name (e.g., "users.view" -> module: "users", action: "view")
        const permissionName = userPermission.permission.name;
        const [permissionModule, permissionAction] = permissionName.split('.');
        
        // Map database permission names to frontend module names
        const moduleMapping: Record<string, keyof UserPermissions> = {
          'users': 'user-management-polwel',
          'trainers': 'user-management-trainers',
          'clients': 'user-management-client-orgs',
          'courses': 'course-venue-setup',
          'venues': 'course-venue-setup',
          'bookings': 'course-runs-operations',
          'calendar': 'course-runs-operations',
          'reports': 'email-reporting-library'
        };
        
        const frontendModule = moduleMapping[permissionModule];
        const actionMapping: Record<string, keyof ModulePermissions> = {
          'view': 'view',
          'create': 'create',
          'edit': 'edit',
          'delete': 'delete'
        };
        
        const frontendAction = actionMapping[permissionAction];
        
        if (frontendModule && frontendAction && updatedPermissions[frontendModule] && updatedPermissions[frontendModule][frontendAction] !== undefined) {
          updatedPermissions[frontendModule][frontendAction] = true;
        }
      });
      
      setPermissions(updatedPermissions);
    }
  }, [open, user.permissions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Convert permissions to array of permission names
      const permissionNames: string[] = [];
      Object.entries(permissions).forEach(([module, modulePermissions]) => {
        Object.entries(modulePermissions).forEach(([action, granted]) => {
          if (granted) {
            permissionNames.push(`${module}:${action}`);
          }
        });
      });

      await polwelUsersApi.update(user.id, {
        name: formData.name,
        email: formData.email,
        permissions: permissionNames,
      });

      toast({
        title: "User Updated",
        description: `${formData.name} has been updated successfully.`,
      });

      setOpen(false);
      onUserUpdated();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "Failed to update user. Please try again.",
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
        <Button variant="ghost" size="icon">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Edit POLWEL User
          </DialogTitle>
          <DialogDescription>
            Update user information and permissions for {user.name}.
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
              required
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
              required
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
            {loading ? "Updating..." : "Update User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
