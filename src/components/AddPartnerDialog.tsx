import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Plus, Building2, Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { trainersApi } from "@/lib/api";

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
  "Marketing Fundamentals",
  "Financial Management",
  "Strategic Planning",
  "Change Management"
];

export function AddPartnerDialog({ onPartnerCreated }: { onPartnerCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [courseSearchOpen, setCourseSearchOpen] = useState(false);
  const [formData, setFormData] = useState({
    partnerName: "",
    courses: [] as string[],
    contactName: "",
    contactNumber: "",
    contactDesignation: "",
  });

  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.partnerName || !formData.contactName || !formData.contactNumber) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement partner organization API endpoint on backend
      // For now, we'll simulate the API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "Partner Added",
        description: `Partner organization "${formData.partnerName}" has been added successfully.`,
      });

      // Reset form and close dialog
      setFormData({
        partnerName: "",
        courses: [],
        contactName: "",
        contactNumber: "",
        contactDesignation: "",
      });
      setOpen(false);
      
      // Call the callback to refresh the parent component
      if (onPartnerCreated) {
        onPartnerCreated();
      }
    } catch (error) {
      console.error('Error creating partner:', error);
      toast({
        title: "Error",
        description: "Failed to create partner organization. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addCourse = (course: string) => {
    if (!formData.courses.includes(course)) {
      setFormData(prev => ({
        ...prev,
        courses: [...prev.courses, course]
      }));
    }
    setCourseSearchOpen(false);
  };

  const removeCourse = (courseToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      courses: prev.courses.filter(course => course !== courseToRemove)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add New Partner
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Add New Partner
          </DialogTitle>
          <DialogDescription>
            Add a new partner organization with course assignments and contact details.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="partnerName">Partner Name *</Label>
            <Input
              id="partnerName"
              value={formData.partnerName}
              onChange={(e) => setFormData(prev => ({ ...prev, partnerName: e.target.value }))}
              placeholder="Enter partner organization name"
            />
          </div>

          <div>
            <Label htmlFor="courses">Courses Assigned</Label>
            <div className="space-y-2">
              <Popover open={courseSearchOpen} onOpenChange={setCourseSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={courseSearchOpen}
                    className="w-full justify-between"
                  >
                    Search and select courses...
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search courses..." />
                    <CommandList>
                      <CommandEmpty>No courses found.</CommandEmpty>
                      <CommandGroup>
                        {availableCourses
                          .filter(course => !formData.courses.includes(course))
                          .map((course) => (
                            <CommandItem
                              key={course}
                              value={course}
                              onSelect={() => addCourse(course)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.courses.includes(course) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {course}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              
              {/* Selected courses display */}
              {formData.courses.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.courses.map((course) => (
                    <Badge key={course} variant="secondary" className="flex items-center gap-1">
                      {course}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={() => removeCourse(course)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div>
            <Label htmlFor="contactName">Point of Contact Name *</Label>
            <Input
              id="contactName"
              value={formData.contactName}
              onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
              placeholder="Enter contact person's name"
            />
          </div>
          
          <div>
            <Label htmlFor="contactNumber">Contact Number *</Label>
            <Input
              id="contactNumber"
              value={formData.contactNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, contactNumber: e.target.value }))}
              placeholder="Enter contact number"
            />
          </div>
          
          <div>
            <Label htmlFor="contactDesignation">Contact Designation</Label>
            <Input
              id="contactDesignation"
              value={formData.contactDesignation}
              onChange={(e) => setFormData(prev => ({ ...prev, contactDesignation: e.target.value }))}
              placeholder="Enter contact person's designation"
            />
          </div>
        </form>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Adding..." : "Add Partner"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}