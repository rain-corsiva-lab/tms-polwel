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
import { useAuth } from "@/hooks/useAuth";
import { errorHandlers } from "@/lib/errorHandler";
import type { CheckedState } from "@radix-ui/react-checkbox";

interface ModulePermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve?: boolean;
}

type ModuleKey =
  | "polwel-users"
  | "trainers-partners"
  | "client-organizations"
  | "course-venue"
  | "course-run"
  | "post-course-run"
  | "billing-reports"
  | "waiver"
  | "resource-library";

type UserPermissions = Record<ModuleKey, ModulePermissions>;

const moduleConfig: Record<ModuleKey, { label: string; supportsApprove?: boolean }> = {
  "polwel-users": { label: "POLWEL Users" },
  "trainers-partners": { label: "Trainers & Partners" },
  "client-organizations": { label: "Client Organisations" },
  "course-venue": { label: "Course & Venue" },
  "course-run": { label: "Course Run", supportsApprove: true },
  "post-course-run": { label: "Post Course Run" },
  "billing-reports": { label: "Billing Reports" },
  waiver: { label: "Waiver Requests" },
  "resource-library": { label: "Resource Library" },
};

const createDefaultPermissions = (): UserPermissions => ({
  "polwel-users": { view: false, create: false, edit: false, delete: false },
  "trainers-partners": { view: false, create: false, edit: false, delete: false },
  "client-organizations": { view: false, create: false, edit: false, delete: false },
  "course-venue": { view: false, create: false, edit: false, delete: false },
  "course-run": { view: false, create: false, edit: false, delete: false, approve: false },
  "post-course-run": { view: false, create: false, edit: false, delete: false },
  "billing-reports": { view: false, create: false, edit: false, delete: false },
  waiver: { view: false, create: false, edit: false, delete: false },
  "resource-library": { view: false, create: false, edit: false, delete: false },
});

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

  const [permissions, setPermissions] = useState<UserPermissions>(createDefaultPermissions());

  const { toast } = useToast();
  const { user: currentUser, refreshUser } = useAuth();

  // Load user permissions when dialog opens
  useEffect(() => {
    if (!open || !user.permissions) {
      return;
    }

    const updatedPermissions = createDefaultPermissions();

    const moduleMapping: Record<string, ModuleKey | undefined> = {
      users: "polwel-users",
      trainers: "trainers-partners",
      clients: "client-organizations",
      "course-venue": "course-venue",
      "course-run": "course-run",
      courses: "course-venue", // legacy canonical
      "course-runs": "course-run",
      venues: "course-venue", // legacy canonical
      reports: "billing-reports", // Billing & Reports module uses reports.* permissions
      "post-course-run": "post-course-run", // Post Course Run module uses post-course-run.* permissions
      "billing-reports": "billing-reports", // Also support direct billing-reports key
      waiver: "waiver", // Waiver module
      waivers: "waiver", // Alternate naming
      "resource-library": "resource-library", // Resource Library module
      // Handle malformed database entries:
      post: "post-course-run", // DB has "post.course.run.*" malformed entries
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

      // Normalize malformed "post.course.run.*" to "post-course-run.*"
      let normalized = raw.toLowerCase().trim();
      normalized = normalized.replace(/^post\.course\.run\./i, "post-course-run.");

      // Support both canonical ("module.action") and frontend mapping ("module:action")
      const parts = normalized.includes(":") ? normalized.split(":") : normalized.split(".");
      const [permissionModule, permissionAction] = parts;
      let frontendModule = moduleMapping[permissionModule];
      const frontendAction = actionMapping[permissionAction];

      // Legacy course permissions map approve to course-run only
      if (permissionModule === "courses" && permissionAction === "approve") {
        frontendModule = "course-run";
      } else if (!frontendModule && (permissionModule === "courses" || permissionModule === "course-venue" || permissionModule === "venues")) {
        frontendModule = "course-venue";
      }

      if (frontendModule && frontendAction && updatedPermissions[frontendModule] && typeof updatedPermissions[frontendModule][frontendAction] !== "undefined") {
        updatedPermissions[frontendModule][frontendAction] = true;
      }
    });

    // Schedule state update asynchronously to avoid flushSync warning
    // Use queueMicrotask to defer until after current render cycle
    queueMicrotask(() => {
      setPermissions(updatedPermissions);
    });
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

      // If editing the currently logged-in user, refresh their permissions immediately
      if (currentUser && currentUser.id === user.id) {
        try {
          await refreshUser();
        } catch (e) {
          console.error("Failed to refresh current user permissions:", e);
        }
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

  const handlePermissionChange = (module: ModuleKey, permission: keyof ModulePermissions, checked: CheckedState) => {
    setPermissions((prev) => {
      const modulePermissions = prev[module];
      if (permission === "approve" && typeof modulePermissions.approve === "undefined") {
        return prev;
      }

      return {
        ...prev,
        [module]: {
          ...modulePermissions,
          [permission]: checked === true,
        },
      };
    });
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
          {/* <DialogDescription>Update user information and permissions for {user.name}.</DialogDescription> */}
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
                      {(Object.keys(moduleConfig) as ModuleKey[]).map((moduleKey) => {
                        const config = moduleConfig[moduleKey];
                        const modulePermissions = permissions[moduleKey];

                        return (
                          <tr key={moduleKey} className="border-b hover:bg-muted/30">
                            <td className="p-3 font-medium text-foreground">{config.label}</td>
                            <td className="p-3 text-center">
                              <Checkbox
                                checked={modulePermissions.view}
                                onCheckedChange={(s) => handlePermissionChange(moduleKey, "view", s)}
                                className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <Checkbox
                                checked={modulePermissions.create}
                                onCheckedChange={(s) => handlePermissionChange(moduleKey, "create", s)}
                                className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <Checkbox
                                checked={modulePermissions.edit}
                                onCheckedChange={(s) => handlePermissionChange(moduleKey, "edit", s)}
                                className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <Checkbox
                                checked={modulePermissions.delete}
                                onCheckedChange={(s) => handlePermissionChange(moduleKey, "delete", s)}
                                className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                              />
                            </td>
                            <td className="p-3 text-center">
                              {config.supportsApprove ? (
                                <Checkbox
                                  checked={Boolean(modulePermissions.approve)}
                                  onCheckedChange={(s) => handlePermissionChange(moduleKey, "approve", s)}
                                  className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                                />
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <Checkbox
                                checked={
                                  (Object.entries(modulePermissions) as [keyof ModulePermissions, boolean | undefined][])
                                    .filter(([key]) => key !== "approve" || config.supportsApprove)
                                    .every(([, value]) => value === true) as CheckedState
                                }
                                onCheckedChange={(checkedState) => {
                                  const setAll = checkedState === true;
                                  setPermissions((prev) => ({
                                    ...prev,
                                    [moduleKey]: (Object.entries(prev[moduleKey]) as [keyof ModulePermissions, boolean | undefined][]).reduce(
                                      (acc, [key, value]) => {
                                        if (key === "approve" && !config.supportsApprove) {
                                          return { ...acc, [key]: value };
                                        }
                                        return { ...acc, [key]: setAll };
                                      },
                                      {} as ModulePermissions,
                                    ),
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
