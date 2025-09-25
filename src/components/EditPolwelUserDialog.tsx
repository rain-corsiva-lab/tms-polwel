import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, Shield } from "lucide-react";
import { polwelUsersApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { errorHandlers } from "@/lib/errorHandler";
import type { CheckedState } from "@radix-ui/react-checkbox";

interface ModulePermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve?: boolean;
}

// ...existing code...

interface UserPermissions {
  "user-management-polwel": ModulePermissions;
  "user-management-trainers": ModulePermissions;
  "user-management-client-orgs": ModulePermissions;
  "course-venue-setup": ModulePermissions;
  "course-runs-operations": ModulePermissions;
  "email-reporting-library": ModulePermissions;
  "finance-activity": ModulePermissions;
}

interface PolwelUser {
  id: string;
  name: string;
  email: string;
  role: "POLWEL";
  status: "ACTIVE" | "INACTIVE" | "PENDING" | "LOCKED";
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  permissions?: Array<
    | string
    | {
        id?: string;
        permissionName?: string;
        granted?: boolean;
        createdAt?: string;
      }
  >;
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
    // department and permissionLevel removed
  });

  const [permissions, setPermissions] = useState<UserPermissions>({
    "user-management-polwel": { view: false, create: false, edit: false, delete: false },
    "user-management-trainers": { view: false, create: false, edit: false, delete: false },
    "user-management-client-orgs": { view: false, create: false, edit: false, delete: false },
    "course-venue-setup": { view: false, create: false, edit: false, delete: false },
    // Approve exists only for course-runs
    "course-runs-operations": { view: false, create: false, edit: false, delete: false, approve: false },
    "email-reporting-library": { view: false, create: false, edit: false, delete: false },
    "finance-activity": { view: false, create: false, edit: false, delete: false },
  });

  const { toast } = useToast();

  // Load user permissions when dialog opens
  useEffect(() => {
    if (open && user.permissions) {
      const updatedPermissions = { ...permissions };

      const moduleMapping: Record<string, keyof UserPermissions> = {
        users: "user-management-polwel",
        trainers: "user-management-trainers",
        clients: "user-management-client-orgs",
        courses: "course-runs-operations",
        venues: "course-venue-setup",
        bookings: "finance-activity",
        reports: "email-reporting-library",
      };
      const actionMapping: Record<string, keyof ModulePermissions> = {
        view: "view",
        create: "create",
        edit: "edit",
        delete: "delete",
        approve: "approve",
      };

      user.permissions.forEach((perm) => {
        const raw = typeof perm === "string" ? perm : perm?.permissionName;
        if (!raw) return;
        const [permissionModule, permissionAction] = raw.split(".");
        const frontendModule = moduleMapping[permissionModule];
        const frontendAction = actionMapping[permissionAction];
        if (
          frontendModule &&
          frontendAction &&
          updatedPermissions[frontendModule] &&
          typeof updatedPermissions[frontendModule][frontendAction] !== "undefined"
        ) {
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
      // Convert permissions to array of canonical permission names
      const permissionNamesRaw: string[] = [];
      Object.entries(permissions).forEach(([module, modulePermissions]) => {
        Object.entries(modulePermissions).forEach(([action, granted]) => {
          if (granted) {
            permissionNamesRaw.push(`${module}:${action}`);
          }
        });
      });
      // Map to canonical names
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const { mapFrontendPermissions } = await import("@/lib/permissionMapping");
      const permissionNames = mapFrontendPermissions(permissionNamesRaw);

      await polwelUsersApi.update(user.id, {
        name: formData.name,
        email: formData.email,
        permissions: permissionNames,
      });

      // If editing the currently logged-in user, fetch fresh details and refresh auth storage
      try {
        const { authService } = await import("@/lib/auth");
        const me = authService.getUser();
        if (me && me.id === user.id) {
          // Re-fetch this user to get updated permissions and store
          const refreshed = await polwelUsersApi.getById(user.id);
          const nextUser = { ...me, permissions: (refreshed?.permissions || []).filter((p: any) => p.granted).map((p: any) => p.permissionName) };
          localStorage.setItem("polwel_user_data", JSON.stringify(nextUser));
          window.dispatchEvent(new CustomEvent("polwel_auth_updated"));
        }
      } catch (e) {
        // ignore refresh errors
      }

      toast({
        title: "User Updated",
        description: `${formData.name} has been updated successfully.`,
      });

      setOpen(false);
      onUserUpdated();
    } catch (error) {
      errorHandlers.userUpdate(error, toast);
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (module: keyof UserPermissions, permission: keyof ModulePermissions, checked: CheckedState) => {
    setPermissions((prev) => ({
      ...prev,
      [module]: {
        ...prev[module],
        [permission]: checked === true,
      },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Edit POLWEL User
          </DialogTitle>
          <DialogDescription>Update user information and permissions for {user.name}.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
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
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Enter @polwel.org email address"
              required
            />
          </div>

          {/* department and permissionLevel fields removed */}

          <div>
            <Label>Access Level *</Label>
            <p className="text-sm text-muted-foreground mb-4">Please define the access level for this staff member.</p>

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
                        <th className="text-center p-3 font-medium text-foreground min-w-[80px]">Approve</th>
                        <th className="text-center p-3 font-medium text-foreground min-w-[80px]">All</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(permissions).map(([module, modulePermissions]) => {
                        const moduleDisplayNames: Record<string, string> = {
                          "user-management-polwel": "User Management - POLWEL Users",
                          "user-management-trainers": "User Management - Trainers & Partners",
                          "user-management-client-orgs": "User Management - Client Organisations",
                          "course-venue-setup": "Course & Venue Setup",
                          "course-runs-operations": "Course Runs & Operations",
                          "email-reporting-library": "Email, Reporting and Resource Library",
                          "finance-activity": "Finance and Activity",
                        };

                        return (
                          <tr key={module} className="border-b hover:bg-muted/30">
                            <td className="p-3 font-medium text-foreground">{moduleDisplayNames[module] || module}</td>
                            <td className="p-3 text-center">
                              <Checkbox
                                checked={Boolean((modulePermissions as any).view)}
                                onCheckedChange={(s) => handlePermissionChange(module as keyof UserPermissions, "view" as keyof ModulePermissions, s)}
                                className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <Checkbox
                                checked={Boolean((modulePermissions as any).create)}
                                onCheckedChange={(s) => handlePermissionChange(module as keyof UserPermissions, "create" as keyof ModulePermissions, s)}
                                className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <Checkbox
                                checked={Boolean((modulePermissions as any).edit)}
                                onCheckedChange={(s) => handlePermissionChange(module as keyof UserPermissions, "edit" as keyof ModulePermissions, s)}
                                className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <Checkbox
                                checked={Boolean((modulePermissions as any).delete)}
                                onCheckedChange={(s) => handlePermissionChange(module as keyof UserPermissions, "delete" as keyof ModulePermissions, s)}
                                className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                              />
                            </td>
                            <td className="p-3 text-center">
                              {module === "course-runs-operations" ? (
                                <Checkbox
                                  checked={Boolean((modulePermissions as any).approve)}
                                  onCheckedChange={(s) => handlePermissionChange(module as keyof UserPermissions, "approve" as any, s)}
                                  className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                                />
                              ) : (
                                <div />
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <Checkbox
                                checked={Object.values(modulePermissions).every((v) => v) as CheckedState}
                                onCheckedChange={(checkedState) => {
                                  const setAll = checkedState === true;
                                  setPermissions((prev) => ({
                                    ...prev,
                                    [module]: Object.keys(prev[module]).reduce((acc, key) => ({ ...acc, [key]: setAll }), {} as any),
                                  }));
                                }}
                              />
                            </td>
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
