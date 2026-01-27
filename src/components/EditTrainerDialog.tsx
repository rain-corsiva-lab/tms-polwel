import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import DateInput from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, Edit, Plus, Check, ChevronsUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isValidEmail } from "@/lib/validators";
import { trainersApi, referencesApi } from "@/lib/api";
import { digitsOnly, cn } from "@/lib/utils";
import { errorHandlers } from "@/lib/errorHandler";

interface Trainer {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  contactNumber?: string;
  onboardingDate?: string | null;
  partnerOrganization?: string;
  courses?: string[];
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  specializations?: string[];
  certifications?: string[];
  bio?: string;
  experience?: string;
}

interface EditTrainerDialogProps {
  trainer: Trainer;
  onTrainerUpdated: () => void;
}

export function EditTrainerDialog({ trainer, onTrainerUpdated }: EditTrainerDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Map enum values to display values
  const [formData, setFormData] = useState({
    name: trainer.name,
    email: trainer.email,
    status: trainer.status,
    contactNumber: digitsOnly((trainer as any).contactNumber || ""),
    onboardingDate: (trainer as any).onboardingDate ? String((trainer as any).onboardingDate).split("T")[0] : "",
    partnerOrganization: trainer.partnerOrganization || "",
    bio: trainer.bio || "",
    specializations: trainer.specializations || trainer.courses || [],
    certifications: trainer.certifications || [],
    experience: trainer.experience || "",
  });

  const [newCertification, setNewCertification] = useState("");

  const { toast } = useToast();

  // Load categories when dialog opens
  useEffect(() => {
    if (open) {
      const loadCategories = async () => {
        try {
          setLoadingCategories(true);
          const response = await referencesApi.getCategories();
          const categoriesData = response?.success && response?.data?.categories 
            ? response.data.categories 
            : [];
          setCategories(categoriesData);
        } catch (error) {
          console.error("Error loading categories:", error);
          setCategories([]);
        } finally {
          setLoadingCategories(false);
        }
      };
      loadCategories();
    }
  }, [open]);

  const sanitizeSGPhone = (value: string | undefined) => {
    if (!value) return undefined;
    let digits = value.replace(/\D/g, "");
    if (digits.startsWith("65") && digits.length >= 10) digits = digits.slice(2);
    if (digits.length > 8) digits = digits.slice(0, 8);
    return digits || undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!isValidEmail(formData.email)) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid email address (name@email.com).",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      const sanitizedPhone = sanitizeSGPhone(formData.contactNumber);
      await trainersApi.update(trainer.id, {
        name: formData.name,
        email: formData.email,
        status: formData.status,
        ...(sanitizedPhone !== undefined && { contactNumber: sanitizedPhone }),
        ...(formData.onboardingDate ? { onboardingDate: new Date(formData.onboardingDate).toISOString() } : {}),
        partnerOrganization: formData.partnerOrganization || undefined,
        bio: formData.bio || undefined,
        specializations: formData.specializations,
        certifications: formData.certifications,
        experience: formData.experience || undefined,
      });

      toast({
        title: "Trainer Updated",
        description: `${formData.name} has been updated successfully.`,
      });

      setOpen(false);
      onTrainerUpdated();
    } catch (error) {
      errorHandlers.trainerUpdate(error, toast);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | string[]) => {
    if (field === "contactNumber") {
      const nextValue = digitsOnly(value as string);
      setFormData((prev) => ({
        ...prev,
        [field]: nextValue,
      }));
    } else if (field === "specializations") {
      setFormData((prev) => ({
        ...prev,
        specializations: value as string[],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const toggleSpecialization = (subcategory: string) => {
    const currentSpecs = formData.specializations;
    const isSelected = currentSpecs.includes(subcategory);
    
    if (isSelected) {
      handleInputChange("specializations", currentSpecs.filter((spec) => spec !== subcategory));
    } else {
      handleInputChange("specializations", [...currentSpecs, subcategory]);
    }
  };

  const removeSpecialization = (spec: string) => {
    handleInputChange("specializations", formData.specializations.filter((s) => s !== spec));
  };

  const addCertification = () => {
    if (newCertification.trim() && !formData.certifications.includes(newCertification.trim())) {
      setFormData((prev) => ({
        ...prev,
        certifications: [...prev.certifications, newCertification.trim()],
      }));
      setNewCertification("");
    }
  };

  const removeCertification = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Edit Trainer</DialogTitle>
          {/* <DialogDescription>Update trainer information and specializations.</DialogDescription> */}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="overflow-y-auto px-6 space-y-4 flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={formData.name} onChange={(e) => handleInputChange("name", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => handleInputChange("email", e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactNumber">Contact Number</Label>
                <Input
                  id="contactNumber"
                  value={(formData as any).contactNumber}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  onChange={(e) => handleInputChange("contactNumber", e.target.value)}
                  placeholder="Mobile or office number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="onboardingDate">Onboarding Date</Label>
              <DateInput id="onboardingDate" value={(formData as any).onboardingDate} onChange={(v) => handleInputChange("onboardingDate", v)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="partnerOrganization">Partner Organization</Label>
              <Input
                id="partnerOrganization"
                value={formData.partnerOrganization}
                onChange={(e) => handleInputChange("partnerOrganization", e.target.value)}
                placeholder="Enter partner organization"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" value={formData.bio} onChange={(e) => handleInputChange("bio", e.target.value)} placeholder="Enter trainer bio" rows={3} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience">Experience</Label>
              <Textarea
                id="experience"
                value={formData.experience}
                onChange={(e) => handleInputChange("experience", e.target.value)}
                placeholder="Enter trainer experience"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Specializations</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between min-h-10 h-auto py-2">
                    {formData.specializations.length > 0 ? (
                      <div className="flex flex-wrap gap-1 flex-1 mr-2">
                        {formData.specializations.length <= 3 ? (
                          formData.specializations.map((spec) => (
                            <Badge
                              key={spec}
                              variant="secondary"
                              className="text-xs flex items-center gap-1 pr-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeSpecialization(spec);
                              }}
                            >
                              {spec}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="p-0 w-3 h-3 hover:bg-transparent"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeSpecialization(spec);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          ))
                        ) : (
                          <>
                            {formData.specializations.slice(0, 2).map((spec) => (
                              <Badge
                                key={spec}
                                variant="secondary"
                                className="text-xs flex items-center gap-1 pr-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeSpecialization(spec);
                                }}
                              >
                                {spec}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="p-0 w-3 h-3 hover:bg-transparent"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeSpecialization(spec);
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </Badge>
                            ))}
                            <Badge variant="secondary" className="text-xs">
                              ... +{formData.specializations.length - 2} more
                            </Badge>
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground flex-1 text-left">
                        {loadingCategories ? "Loading..." : "Select specializations..."}
                      </span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search specializations..." />
                    <CommandList>
                      {loadingCategories && (
                        <CommandEmpty>Loading categories...</CommandEmpty>
                      )}
                      {!loadingCategories && categories.length === 0 && (
                        <CommandEmpty>No categories available</CommandEmpty>
                      )}
                      {!loadingCategories &&
                        categories.length > 0 &&
                        categories.map((group: any) => {
                          const label = group?.name || "Categories";
                          const subcategories = Array.isArray(group?.subcategories) ? group.subcategories : [];
                          return (
                            <CommandGroup key={label} heading={label}>
                              {subcategories.map((subcategory: string) => {
                                const isSelected = formData.specializations.includes(subcategory);
                                return (
                                  <CommandItem
                                    key={`${label}-${subcategory}`}
                                    value={subcategory}
                                    onSelect={() => toggleSpecialization(subcategory)}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                                    {subcategory}
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          );
                        })}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Certifications</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newCertification}
                  onChange={(e) => setNewCertification(e.target.value)}
                  placeholder="Add certification"
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addCertification())}
                />
                <Button type="button" onClick={addCertification} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.certifications.map((cert, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {cert}
                    <Button type="button" variant="ghost" size="sm" className="h-auto p-0 ml-1" onClick={() => removeCertification(index)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Trainer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
