import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { clientOrganizationsApi } from "@/lib/api";
import { BuNumberSelect } from "@/components/BuNumberSelect";

export function AddOrganisationDialog({ onOrganisationCreated }: { onOrganisationCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    organisationName: "",
    organisationType: "POLWEL" as "POLWEL" | "SPF" | "PUBLIC_SECTOR" | "PRIVATE_SECTOR",
    requireBuNumber: false,
    buNumber: "",
  });

  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.organisationName) {
      toast({
        title: "Validation Error",
        description: "Organisation name is required.",
        variant: "destructive",
      });
      return;
    }

    if (formData.requireBuNumber && !formData.buNumber) {
      toast({
        title: "Validation Error",
        description: "Please select or enter a BU number.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await clientOrganizationsApi.create({
        name: formData.organisationName,
        organizationType: formData.organisationType,
        buNumber: formData.requireBuNumber ? formData.buNumber : undefined,
      });

      toast({
        title: "Organisation Created",
        description: `Organisation "${formData.organisationName}" has been created successfully.`,
      });

      // Reset form and close dialog
      setFormData({
        organisationName: "",
        organisationType: "POLWEL",
        requireBuNumber: false,
        buNumber: "",
      });
      setOpen(false);

      if (onOrganisationCreated) {
        onOrganisationCreated();
      }
    } catch (error) {
      console.error("Error creating organisation:", error);
      const errMsg = (error as any)?.message || "";
      let userMessage = "Failed to create organisation. Please try again.";
      if (errMsg) {
        const lower = errMsg.toLowerCase();
        if (lower.includes("already exists") || lower.includes("organization with this name")) {
          userMessage = "Organization with this name already exists";
        } else if (!lower.includes("network") && !lower.includes("internal server error")) {
          userMessage = errMsg;
        }
      }
      toast({ title: "Error", description: userMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add New Organisation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Add New Organisation
          </DialogTitle>
          <DialogDescription>Create a new client organisation in the system.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="organisationName">Name of Division/Organisation *</Label>
            <Input
              id="organisationName"
              value={formData.organisationName}
              onChange={(e) => setFormData((prev) => ({ ...prev, organisationName: e.target.value }))}
              placeholder="e.g. Singapore Police Force, SPF / POLWEL"
            />
          </div>

          <div className="space-y-2">
            <Label>Organisation Type *</Label>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { value: "POLWEL", label: "POLWEL" },
                  { value: "SPF", label: "SPF" },
                  { value: "PUBLIC_SECTOR", label: "Public Sector" },
                  { value: "PRIVATE_SECTOR", label: "Private Sector" },
                ] as const
              ).map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="organisationType"
                    className="h-4 w-4"
                    checked={formData.organisationType === opt.value}
                    onChange={() => setFormData((prev) => ({ ...prev, organisationType: opt.value }))}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="requireBuNumber"
              checked={formData.requireBuNumber}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, requireBuNumber: !!checked, buNumber: "" }))}
            />
            <Label htmlFor="requireBuNumber">Require BU number?</Label>
          </div>

          {formData.requireBuNumber && (
            <div>
              <Label>BU Number *</Label>
              <BuNumberSelect value={formData.buNumber} onChange={(nextBuNumber) => setFormData((prev) => ({ ...prev, buNumber: nextBuNumber }))} />
              {formData.buNumber && <p className="text-xs text-muted-foreground mt-1">Selected: {formData.buNumber}</p>}
            </div>
          )}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating..." : "Create Organisation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
