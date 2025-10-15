import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import DateInput from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Plus, Building2, Edit, X, Check, ChevronsUpDown } from "lucide-react";
import { cn, digitsOnly } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { partnersApi } from "@/lib/api";
import { errorHandlers } from "@/lib/errorHandler";

// Available courses for selection
const availableCourses = [
  "Leadership Development",
  "Team Building",
  "Communication Skills",
  "Customer Service",
  "Project Management",
  "Time Management",
  "Conflict Resolution",
  "Public Speaking",
  "Digital Literacy",
  "Safety Training",
  "Compliance Training",
  "HR Policies",
  "Data Analysis",
  "Software Development",
  "Technical Skills",
  "Sales Training",
  "Professional Development",
  "Career Coaching",
  "Presentation Skills",
];

interface PartnerData {
  id?: string;
  partnerName: string;
  coursesAssigned: string[];
  pointOfContact: string;
  contactNumber: string;
  contactDesignation: string;
  onboardingDate?: string;
}

interface AddPartnerDialogProps {
  onPartnerCreated?: () => void;
  onSuccess?: () => void;
  mode?: "create" | "edit";
  partner?: PartnerData;
}

export function AddPartnerDialog({ onPartnerCreated, onSuccess, mode = "create", partner }: AddPartnerDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [courseSearchOpen, setCourseSearchOpen] = useState(false);
  const [formData, setFormData] = useState({
    partnerName: "",
    coursesAssigned: [] as string[],
    pointOfContact: "",
    contactNumber: "",
    contactDesignation: "",
    onboardingDate: "",
  });

  const { toast } = useToast();
  const isEditMode = mode === "edit";

  // Initialize form data when in edit mode
  useEffect(() => {
    if (isEditMode && partner) {
      setFormData({
        partnerName: partner.partnerName || "",
        coursesAssigned: partner.coursesAssigned || [],
        pointOfContact: partner.pointOfContact || "",
        contactNumber: digitsOnly(partner.contactNumber || ""),
        contactDesignation: partner.contactDesignation || "",
        onboardingDate: partner.onboardingDate || "",
      });
    }
  }, [isEditMode, partner]);

  const sanitizeSGPhone = (value: string) => {
    let digits = digitsOnly(value || "");
    if (digits.startsWith("65") && digits.length >= 10) digits = digits.slice(2);
    if (digits.length > 8) digits = digits.slice(0, 8);
    return digits;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Only partner name is required since it's just data, not a user account
    if (!formData.partnerName) {
      toast({
        title: "Validation Error",
        description: "Please enter the partner name.",
        variant: "destructive",
      });
      return;
    }

    // Validate phone number length (must be 8 digits if provided)
    const phoneDigits = sanitizeSGPhone(formData.contactNumber);
    if (phoneDigits && phoneDigits.length !== 8) {
      toast({
        title: "Validation Error",
        description: "Contact number must be 8 digits (Singapore local).",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      ...formData,
      contactNumber: phoneDigits,
    };

    setLoading(true);
    try {
      if (isEditMode && partner?.id) {
        // Update existing partner
        await partnersApi.update(partner.id, payload);
        toast({
          title: "Partner Updated",
          description: `Partner "${payload.partnerName}" has been updated successfully.`,
        });
      } else {
        // Create new partner
        await partnersApi.create(payload);
        toast({
          title: "Partner Created",
          description: `Partner "${payload.partnerName}" has been created successfully.`,
        });
      }

      // Reset form and close dialog
      resetForm();
      setOpen(false);

      if (onPartnerCreated) onPartnerCreated();
      if (onSuccess) onSuccess();
    } catch (error) {
      if (isEditMode) {
        errorHandlers.partnerUpdate(error, toast);
      } else {
        errorHandlers.partnerCreate(error, toast);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      partnerName: "",
      coursesAssigned: [],
      pointOfContact: "",
      contactNumber: "",
      contactDesignation: "",
      onboardingDate: "",
    });
  };

  const addCourse = (course: string) => {
    if (!formData.coursesAssigned.includes(course)) {
      setFormData((prev) => ({
        ...prev,
        coursesAssigned: [...prev.coursesAssigned, course],
      }));
    }
    setCourseSearchOpen(false);
  };

  const removeCourse = (courseToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      coursesAssigned: prev.coursesAssigned.filter((course) => course !== courseToRemove),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEditMode ? (
          <Button variant="ghost" size="sm">
            <Edit className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Training Partner
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {isEditMode ? "Edit Partner" : "Add New Partner"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update partner organization information and contact details."
              : "Register a new partner organization with their contact details and assigned courses."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="partnerName">Partner Name *</Label>
            <Input
              id="partnerName"
              value={formData.partnerName}
              onChange={(e) => setFormData({ ...formData, partnerName: e.target.value })}
              placeholder="Enter partner organization name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Courses Assigned</Label>
            <Popover open={courseSearchOpen} onOpenChange={setCourseSearchOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={courseSearchOpen} className="w-full justify-between">
                  Search and select courses...
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search courses..." />
                  <CommandList>
                    <CommandEmpty>No course found.</CommandEmpty>
                    <CommandGroup>
                      {availableCourses
                        .filter((course) => !formData.coursesAssigned.includes(course))
                        .map((course) => (
                          <CommandItem key={course} onSelect={() => addCourse(course)}>
                            <Check className={cn("mr-2 h-4 w-4", formData.coursesAssigned.includes(course) ? "opacity-100" : "opacity-0")} />
                            {course}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {formData.coursesAssigned.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.coursesAssigned.map((course) => (
                  <Badge key={course} variant="secondary" className="flex items-center gap-1">
                    {course}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeCourse(course)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="pointOfContact">Point of Contact</Label>
            <Input
              id="pointOfContact"
              value={formData.pointOfContact}
              onChange={(e) => setFormData({ ...formData, pointOfContact: e.target.value })}
              placeholder="Enter contact person name"
            />
          </div>

          <div>
            <Label htmlFor="contactNumber">Contact Number</Label>
            <Input
              id="contactNumber"
              value={formData.contactNumber}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={10}
              onChange={(e) => setFormData({ ...formData, contactNumber: sanitizeSGPhone(e.target.value) })}
              placeholder="Enter contact number"
            />
            <p className="text-xs text-muted-foreground mt-1">Enter 8-digit local number (country code 65 is auto-ignored).</p>
          </div>

          <div>
            <Label htmlFor="contactDesignation">Contact Designation</Label>
            <Input
              id="contactDesignation"
              value={formData.contactDesignation}
              onChange={(e) => setFormData({ ...formData, contactDesignation: e.target.value })}
              placeholder="Enter contact person designation"
            />
          </div>

          <div>
            <Label htmlFor="onboardingDate">Onboarding Date</Label>
            <DateInput id="onboardingDate" value={formData.onboardingDate || ""} onChange={(v) => setFormData({ ...formData, onboardingDate: v || "" })} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isEditMode ? "Update Training Partner" : "Add Training Partner"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
