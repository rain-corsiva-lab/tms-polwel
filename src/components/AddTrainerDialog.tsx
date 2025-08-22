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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, GraduationCap, Check, ChevronsUpDown, X } from "lucide-react";
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

export function AddTrainerDialog({ onTrainerCreated }: { onTrainerCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [courseSearchOpen, setCourseSearchOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    contactNumber: "",
    courses: [] as string[],
    status: "ACTIVE",
    partnerOrganization: "",
    bio: "",
    experience: "",
  });

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

    setLoading(true);
    try {
      await trainersApi.create({
        name: formData.name,
        email: formData.email,
        status: formData.status,
        availabilityStatus: "AVAILABLE",
        partnerOrganization: formData.partnerOrganization || undefined,
        bio: formData.bio || undefined,
        specializations: formData.courses,
        experience: formData.experience || undefined,
      });

      toast({
        title: "Trainer Created",
        description: `Trainer "${formData.name}" has been created successfully. Onboarding email sent with secure link.`,
      });

      // Reset form and close dialog
      setFormData({
        name: "",
        email: "",
        contactNumber: "",
        courses: [],
        status: "ACTIVE",
        partnerOrganization: "",
        bio: "",
        experience: "",
      });
      setOpen(false);
      
      // Call the callback to refresh the parent component
      if (onTrainerCreated) {
        onTrainerCreated();
      }
    } catch (error) {
      console.error('Error creating trainer:', error);
      
      let errorMessage = "Failed to create trainer";
      
      if (error instanceof Error) {
        // Parse API error message
        if (error.message.includes('already exists') || error.message.includes('already in use')) {
          errorMessage = "A trainer with this email address already exists";
        } else if (error.message.includes('email')) {
          errorMessage = "Invalid email address provided";
        } else if (error.message.includes('validation')) {
          errorMessage = "Invalid data provided. Please check your input and try again";
        } else if (error.message.includes('permission')) {
          errorMessage = "You don't have permission to create trainers";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
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
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add New Trainer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Add New Trainer
          </DialogTitle>
          <DialogDescription>
            Create a new standalone trainer account. User will set password in onboarding flow.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Trainer Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter trainer's full name"
            />
          </div>
          
          <div>
            <Label htmlFor="email">Email Address * (Must be unique)</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Enter trainer's email address"
            />
          </div>

          <div>
            <Label htmlFor="partnerOrganization">Partner Organization</Label>
            <Input
              id="partnerOrganization"
              value={formData.partnerOrganization}
              onChange={(e) => setFormData(prev => ({ ...prev, partnerOrganization: e.target.value }))}
              placeholder="Enter partner organization name"
            />
          </div>
          

          <div>
            <Label htmlFor="contactNumber">Contact Number</Label>
            <Input
              id="contactNumber"
              value={formData.contactNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, contactNumber: e.target.value }))}
              placeholder="Trainer contact number"
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
            {loading ? "Creating..." : "Create Trainer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}