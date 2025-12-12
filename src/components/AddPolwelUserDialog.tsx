import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { polwelUsersApi } from "@/lib/api";
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
  | "waiver";

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
});

export function AddPolwelUserDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    // department and permissionLevel removed
  });

  const [permissions, setPermissions] = useState<UserPermissions>(createDefaultPermissions());

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
    const hasAnyPermission = Object.values(permissions).some((module) => Object.values(module).some((permission) => permission));

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

      const response = await polwelUsersApi.create({
        name: formData.name,
        email: formData.email,
        permissions: permissionNames,
      });

      toast({
        title: "POLWEL User Created",
        description: `POLWEL user "${formData.name}" has been created successfully. Temporary password: ${response.tempPassword}`,
      });

      // Reset form and close dialog
      setFormData({ name: "", email: "" });
      setPermissions(createDefaultPermissions());
      setOpen(false);

      // Trigger a page refresh or parent component update
      window.location.reload();
    } catch (error) {
      errorHandlers.userCreate(error, toast);
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
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add New POLWEL User
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Add New POLWEL User
          </DialogTitle>
          {/* <DialogDescription>Create a new POLWEL staff account with appropriate system permissions.</DialogDescription> */}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name *</Label>
            <Input id="name" value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} placeholder="Enter full name" />
          </div>

          <div>
            <Label htmlFor="email">Email Address * (Must be unique)</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Enter @polwel.org email address"
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
                            {/* All checkbox for this module */}
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
                                      {} as ModulePermissions
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
            {loading ? "Creating..." : "Create POLWEL User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
