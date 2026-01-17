import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Edit, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { trainerDashboardApi, referencesApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/errorHandler";

interface EditProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  profile: {
    id: string;
    name: string;
    email: string;
    bio?: string;
    specializations?: string[];
    experience?: string;
  };
  // called after successful update; optional payload with the updated fields
  onProfileUpdated?: (updatedData?: { specializations: string[]; writeUp: string }) => void;
}

export function EditProfileDialog({ isOpen, onClose, profile, onProfileUpdated }: EditProfileDialogProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>(profile.specializations || []);
  const [profileWriteUp, setProfileWriteUp] = useState(profile.bio || "");
  const [availableSpecializations, setAvailableSpecializations] = useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const { toast } = useToast();

  // Fetch categories and flatten subcategories into specializations list
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        const response = await referencesApi.getCategories();
        
        if (response.success && response.data?.categories) {
          // Flatten all subcategories from all categories into a single list
          const allSubcategories: string[] = [];
          response.data.categories.forEach((category: any) => {
            if (category.subcategories && Array.isArray(category.subcategories)) {
              allSubcategories.push(...category.subcategories);
            }
          });
          
          // Remove duplicates and sort alphabetically
          const uniqueSubcategories = Array.from(new Set(allSubcategories)).sort();
          setAvailableSpecializations(uniqueSubcategories);
        }
      } catch (error) {
        console.error("Error loading categories:", error);
        toast({
          title: "Warning",
          description: "Failed to load specializations. Please try again later.",
          variant: "destructive",
        });
        // Set empty array on error
        setAvailableSpecializations([]);
      } finally {
        setLoadingCategories(false);
      }
    };

    if (isOpen) {
      loadCategories();
    }
  }, [isOpen, toast]);

  // Sync local state when profile prop changes
  useEffect(() => {
    setSelectedSpecializations(profile.specializations || []);
    setProfileWriteUp(profile.bio || "");
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedSpecializations.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one specialization.",
        variant: "destructive",
      });
      return;
    }

    if (!profileWriteUp.trim()) {
      toast({
        title: "Error",
        description: "Please provide a professional write-up.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Call API to update profile
      await trainerDashboardApi.updateProfile({
        bio: profileWriteUp.trim(),
        specializations: selectedSpecializations,
      });

      // pass updated values back to parent if they want them
      onProfileUpdated?.({ specializations: selectedSpecializations, writeUp: profileWriteUp.trim() });

      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });

      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to update profile. Please try again."),
        variant: "destructive",
      });
    }
  };

  const addSpecialization = (specialization: string) => {
    if (!selectedSpecializations.includes(specialization)) {
      setSelectedSpecializations([...selectedSpecializations, specialization]);
    }
    setPopoverOpen(false);
  };

  const removeSpecialization = (specializationToRemove: string) => {
    setSelectedSpecializations(selectedSpecializations.filter((spec) => spec !== specializationToRemove));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Complete Profile</DialogTitle>
            <DialogDescription>Update your specializations and professional write-up.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Specializations Section */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Specializations</Label>

              {/* Add Specialization */}
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between" disabled={loadingCategories}>
                    <div className="flex items-center">
                      <Plus className="h-4 w-4 mr-2" />
                      {loadingCategories ? "Loading specializations..." : "Add Specialization"}
                    </div>
                    <ChevronsUpDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search specializations..." />
                    <CommandList>
                      {loadingCategories ? (
                        <CommandEmpty>Loading specializations...</CommandEmpty>
                      ) : availableSpecializations.length === 0 ? (
                        <CommandEmpty>No specializations available.</CommandEmpty>
                      ) : (
                        <>
                          <CommandEmpty>No specializations found.</CommandEmpty>
                          <CommandGroup>
                            {availableSpecializations
                              .filter((spec) => !selectedSpecializations.includes(spec))
                              .map((specialization) => (
                                <CommandItem key={specialization} value={specialization} onSelect={() => addSpecialization(specialization)}>
                                  <Check className={cn("mr-2 h-4 w-4", "opacity-0")} />
                                  {specialization}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Selected Specializations */}
              <div className="flex flex-wrap gap-2">
                {selectedSpecializations.map((specialization, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {specialization}
                    <X className="h-3 w-3 cursor-pointer hover:bg-secondary-foreground/20 rounded" onClick={() => removeSpecialization(specialization)} />
                  </Badge>
                ))}
              </div>
            </div>

            {/* Write-up Section */}
            <div className="space-y-3">
              <Label htmlFor="writeup" className="text-sm font-medium">
                Professional Write-up
              </Label>
              <Textarea
                id="writeup"
                placeholder="Describe your experience, expertise, and training philosophy..."
                value={profileWriteUp}
                onChange={(e) => setProfileWriteUp(e.target.value)}
                className="min-h-[120px] resize-none"
              />
              <p className="text-xs text-muted-foreground">Share your professional background and what makes you unique as a trainer.</p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
