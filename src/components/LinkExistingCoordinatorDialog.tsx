import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Link2, Loader2, Check, ChevronsUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { clientOrganizationsApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface LinkExistingCoordinatorDialogProps {
  organizationId: string;
  onCoordinatorLinked: () => Promise<void>;
}

export function LinkExistingCoordinatorDialog({ organizationId, onCoordinatorLinked }: LinkExistingCoordinatorDialogProps) {
  const [open, setOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [isPrimary, setIsPrimary] = useState(false);
  const { toast } = useToast();

  const loadAvailableCoordinators = async () => {
    if (!open) return;
    try {
      setLoading(true);
      const response = await clientOrganizationsApi.getAvailableCoordinators(organizationId);
      if (response.success) {
        setCoordinators(response.coordinators || []);
      }
    } catch (err: any) {
      toast({
        title: "Error loading coordinators",
        description: err.message || "Failed to load available training coordinators.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAvailableCoordinators();
  }, [open, organizationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) {
      toast({
        title: "Validation Error",
        description: "Please select a training coordinator.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await clientOrganizationsApi.linkCoordinator(organizationId, selectedId, { isPrimary });
      if (response.success) {
        toast({
          title: "Success",
          description: "Training coordinator linked successfully.",
        });
        setSelectedId("");
        setIsPrimary(false);
        setOpen(false);
        await onCoordinatorLinked();
      }
    } catch (err: any) {
      toast({
        title: "Linking failed",
        description: err.message || "Failed to link coordinator. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCoordinator = coordinators.find((c) => c.id === selectedId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 border-slate-200 hover:bg-slate-50 text-slate-700 dark:border-slate-800 dark:hover:bg-slate-800 dark:text-slate-200">
          <Link2 className="h-4 w-4" />
          Add Existing Coordinator
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Link Existing Training Coordinator
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
            Select a coordinator already registered in the system to link them to this organization.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Select Coordinator *</Label>
            
            {loading ? (
              <div className="flex items-center space-x-2 py-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading available coordinators...</span>
              </div>
            ) : coordinators.length === 0 ? (
              <div className="text-sm text-slate-500 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-dashed text-center">
                No existing coordinators available to link.
              </div>
            ) : (
              <div className="w-full">
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={popoverOpen}
                      className="w-full justify-between font-normal text-left h-auto py-2.5 px-3 border border-slate-200 dark:border-slate-800"
                    >
                      {selectedCoordinator ? (
                        <div className="flex flex-col text-left">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedCoordinator.name}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{selectedCoordinator.email}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">Choose a coordinator...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[398px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search by name or email..." className="border-none focus:ring-0" />
                      <CommandList className="max-h-[220px]">
                        <CommandEmpty>No matches found</CommandEmpty>
                        <CommandGroup>
                          {coordinators.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={`${c.name} ${c.email}`}
                              onSelect={() => {
                                setSelectedId(c.id);
                                setPopoverOpen(false);
                              }}
                              className="flex items-center justify-between cursor-pointer py-2"
                            >
                              <div className="flex flex-col text-left">
                                <span className="font-semibold text-slate-900 dark:text-slate-100">{c.name}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{c.email}</span>
                              </div>
                              <Check
                                className={cn(
                                  "h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 ml-2",
                                  selectedId === c.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          {coordinators.length > 0 && (
            <div className="flex items-center space-x-2 pt-2">
              <input
                id="link-isPrimary"
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
              />
              <Label htmlFor="link-isPrimary" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Set as primary training coordinator
              </Label>
            </div>
          )}

          <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !selectedId} className="bg-blue-600 hover:bg-blue-700 text-white font-medium">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Link Coordinator
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
