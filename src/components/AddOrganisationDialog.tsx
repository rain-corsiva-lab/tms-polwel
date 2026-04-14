import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Building2, ChevronsUpDown, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { clientOrganizationsApi } from "@/lib/api";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function AddOrganisationDialog({ onOrganisationCreated }: { onOrganisationCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [buNumbers, setBuNumbers] = useState<string[]>([]);
  const [buLoading, setBuLoading] = useState(false);
  const [buComboOpen, setBuComboOpen] = useState(false);
  const [buSearch, setBuSearch] = useState("");
  const [formData, setFormData] = useState({
    organisationName: "",
    organisationType: "POLWEL" as "POLWEL" | "SPF" | "PUBLIC_SECTOR" | "PRIVATE_SECTOR",
    requireBuNumber: false,
    buNumber: "",
  });

  const { toast } = useToast();
  const buInputRef = useRef<HTMLInputElement>(null);

  // Fetch BU numbers when dialog opens
  useEffect(() => {
    if (!open) return;
    setBuLoading(true);
    clientOrganizationsApi
      .getBuNumbers()
      .then((list) => setBuNumbers(list))
      .catch(() => setBuNumbers([]))
      .finally(() => setBuLoading(false));
  }, [open]);

  const filteredBuNumbers = buNumbers.filter((bn) => bn.toLowerCase().includes(buSearch.toLowerCase()));

  // Whether buSearch is a new value not in the list
  const isNewBuNumber = buSearch.trim().length > 0 && !buNumbers.some((bn) => bn.toLowerCase() === buSearch.trim().toLowerCase());

  const handleSelectBuNumber = (value: string) => {
    setFormData((prev) => ({ ...prev, buNumber: value }));
    setBuSearch("");
    setBuComboOpen(false);
  };

  const handleCreateAndSelectBuNumber = async () => {
    const trimmed = buSearch.trim().toUpperCase();
    if (!trimmed) return;
    try {
      await clientOrganizationsApi.createBuNumber(trimmed);
      setBuNumbers((prev) => [...prev, trimmed].sort());
      handleSelectBuNumber(trimmed);
    } catch {
      toast({ title: "Error", description: "Failed to add BU number.", variant: "destructive" });
    }
  };

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
      setBuSearch("");
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
              <Popover open={buComboOpen} onOpenChange={setBuComboOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={buComboOpen} className="w-full justify-between mt-1" type="button">
                    <span className={cn(!formData.buNumber && "text-muted-foreground")}>{formData.buNumber || "Select or type BU number"}</span>
                    {buLoading ? <Loader2 className="ml-2 h-4 w-4 animate-spin opacity-50" /> : <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="!p-0 !bg-white !border !border-gray-200 !shadow-lg !rounded-md" align="start">
                  <div className="!p-2 !border-b !bg-white !border-gray-200">
                    <Input
                      ref={buInputRef}
                      placeholder="Search or type new BU number..."
                      value={buSearch}
                      onChange={(e) => setBuSearch(e.target.value)}
                      className="h-8"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-52 overflow-y-auto !py-1 !bg-white">
                    {filteredBuNumbers.map((bn) => (
                      <button
                        key={bn}
                        type="button"
                        onClick={() => handleSelectBuNumber(bn)}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-1.5 text-sm !text-black !bg-white hover:!bg-gray-100 cursor-pointer",
                          formData.buNumber === bn && "!bg-gray-100 font-medium",
                        )}
                      >
                        <Check className={cn("h-4 w-4 !text-gray-600", formData.buNumber === bn ? "opacity-100" : "opacity-0")} />
                        {bn}
                      </button>
                    ))}
                    {isNewBuNumber && (
                      <button
                        type="button"
                        onClick={handleCreateAndSelectBuNumber}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm !text-blue-600 !bg-white hover:!bg-gray-100 cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                        Add &quot;{buSearch.trim().toUpperCase()}&quot;
                      </button>
                    )}
                    {filteredBuNumbers.length === 0 && !isNewBuNumber && (
                      <div className="px-3 py-4 text-sm !text-gray-600 text-center !bg-white">No results</div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
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
