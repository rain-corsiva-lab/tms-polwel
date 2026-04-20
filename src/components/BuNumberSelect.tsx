import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { clientOrganizationsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface BuNumberSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  allowTemplateManage?: boolean;
  allowClear?: boolean;
}

export function BuNumberSelect({
  value,
  onChange,
  placeholder = "Select or type BU number",
  disabled = false,
  allowTemplateManage = true,
  allowClear = true,
}: BuNumberSelectProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [buNumbers, setBuNumbers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editingValue, setEditingValue] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");

  const loadBuNumbers = async () => {
    try {
      setLoading(true);
      const list = await clientOrganizationsApi.getBuNumbers();
      setBuNumbers(list);
    } catch {
      setBuNumbers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBuNumbers();
  }, []);

  const filteredBuNumbers = useMemo(
    () => buNumbers.filter((bn) => bn.toLowerCase().includes(search.toLowerCase())),
    [buNumbers, search],
  );

  const isNewBuNumber =
    search.trim().length > 0 &&
    !buNumbers.some((bn) => bn.toLowerCase() === search.trim().toLowerCase());

  const hasMatchingOption = value
    ? buNumbers.some((bn) => bn.toLowerCase() === value.toLowerCase())
    : false;

  const selectedDisplayValue = hasMatchingOption ? value : "";

  const parseErrorMessage = (error: unknown, fallback: string) => {
    const message = (error as any)?.message;
    return typeof message === "string" && message.trim() ? message : fallback;
  };

  const resetTransientState = () => {
    setSearch("");
    setEditingValue(null);
    setEditingDraft("");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      loadBuNumbers();
    } else {
      resetTransientState();
    }
  };

  const handleSelect = (nextValue: string) => {
    onChange(nextValue);
    setSearch("");
    setOpen(false);
  };

  const handleCreateAndSelect = async () => {
    const trimmed = search.trim().toUpperCase();
    if (!trimmed) return;
    try {
      setActionLoading(true);
      await clientOrganizationsApi.createBuNumber(trimmed);
      setBuNumbers((prev) => Array.from(new Set([...prev, trimmed])).sort());
      handleSelect(trimmed);
    } catch (error) {
      toast({ title: "Error", description: parseErrorMessage(error, "Failed to add BU number."), variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartRename = (currentValue: string) => {
    setEditingValue(currentValue);
    setEditingDraft(currentValue);
  };

  const handleRename = async (currentValue: string) => {
    const nextValue = editingDraft.trim().toUpperCase();
    if (!nextValue) {
      toast({ title: "Validation Error", description: "BU number is required.", variant: "destructive" });
      return;
    }

    if (nextValue === currentValue) {
      setEditingValue(null);
      setEditingDraft("");
      return;
    }

    try {
      setActionLoading(true);
      await clientOrganizationsApi.updateBuNumber(currentValue, nextValue);
      setBuNumbers((prev) => prev.map((bn) => (bn === currentValue ? nextValue : bn)).sort());
      if (value === currentValue) {
        onChange(nextValue);
      }
      setEditingValue(null);
      setEditingDraft("");
      toast({ title: "Updated", description: `BU number "${currentValue}" renamed to "${nextValue}".` });
    } catch (error) {
      toast({ title: "Error", description: parseErrorMessage(error, "Failed to rename BU number."), variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (targetValue: string) => {
    const confirmed = window.confirm(`Delete BU number "${targetValue}" from template list?`);
    if (!confirmed) return;

    try {
      setActionLoading(true);
      await clientOrganizationsApi.deleteBuNumber(targetValue);
      setBuNumbers((prev) => prev.filter((bn) => bn !== targetValue));
      if (value === targetValue) {
        onChange("");
      }
      toast({ title: "Deleted", description: `BU number "${targetValue}" has been removed.` });
    } catch (error) {
      toast({ title: "Error", description: parseErrorMessage(error, "Failed to delete BU number."), variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between mt-1" type="button" disabled={disabled}>
          <span className={cn(!selectedDisplayValue && "text-muted-foreground")}>{selectedDisplayValue || placeholder}</span>
          {loading || actionLoading ? <Loader2 className="ml-2 h-4 w-4 animate-spin opacity-50" /> : <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="!p-0 !bg-white !border !border-gray-200 !shadow-lg !rounded-md" align="start">
        <div className="!p-2 !border-b !bg-white !border-gray-200">
          <Input placeholder="Search or type new BU number..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8" autoFocus />
        </div>
        <div className="max-h-56 overflow-y-auto !py-1 !bg-white">
          {allowClear && value && (
            <button
              type="button"
              onClick={() => handleSelect("")}
              className="w-full text-left px-3 py-1.5 text-sm !text-gray-600 !bg-white hover:!bg-gray-100 cursor-pointer"
            >
              Clear selection
            </button>
          )}

          {filteredBuNumbers.map((bn) =>
            editingValue === bn ? (
              <div key={`${bn}-editing`} className="flex items-center gap-2 px-2 py-1.5">
                <Input value={editingDraft} onChange={(e) => setEditingDraft(e.target.value)} className="h-8" />
                <Button type="button" variant="outline" size="icon" onClick={() => handleRename(bn)} className="h-8 w-8" title="Save">
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setEditingValue(null);
                    setEditingDraft("");
                  }}
                  className="h-8 w-8"
                  title="Cancel"
                >
                  <X className="h-4 w-4 text-gray-600" />
                </Button>
              </div>
            ) : (
              <div key={bn} className="w-full flex items-center gap-1 px-1">
                <button
                  type="button"
                  onClick={() => handleSelect(bn)}
                  className={cn(
                    "flex-1 flex items-center gap-2 px-2 py-1.5 text-sm !text-black !bg-white hover:!bg-gray-100 cursor-pointer rounded-sm",
                    value === bn && "!bg-gray-100 font-medium",
                  )}
                >
                  <Check className={cn("h-4 w-4 !text-gray-600", value === bn ? "opacity-100" : "opacity-0")} />
                  {bn}
                </button>
                {allowTemplateManage && (
                  <div className="flex items-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleStartRename(bn)}
                      className="h-7 w-7 border border-transparent hover:border-gray-200 hover:bg-gray-100"
                      title="Rename"
                    >
                      <Pencil className="h-3.5 w-3.5 text-gray-500" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(bn)}
                      className="h-7 w-7 border border-transparent hover:border-red-200 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                )}
              </div>
            ),
          )}

          {isNewBuNumber && (
            <button
              type="button"
              onClick={handleCreateAndSelect}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm !text-blue-600 !bg-white hover:!bg-gray-100 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add &quot;{search.trim().toUpperCase()}&quot;
            </button>
          )}

          {filteredBuNumbers.length === 0 && !isNewBuNumber && (
            <div className="px-3 py-4 text-sm !text-gray-600 text-center !bg-white">No results</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
