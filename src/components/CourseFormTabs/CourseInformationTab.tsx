import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, X } from "lucide-react";

interface CourseInformationTabProps {
  formData: any;
  onInputChange: (field: string, value: any) => void;
}

const CourseInformationTab: React.FC<CourseInformationTabProps> = ({ formData, onInputChange }) => {
  const categoryGroups = [
    {
      name: "Self-Mastery",
      color: "bg-red-100 text-red-800 border-red-200",
      subcategories: ["Growth Mindset", "Personal Effectiveness", "Self-awareness"]
    },
    {
      name: "Thinking Skills", 
      color: "bg-blue-100 text-blue-800 border-blue-200",
      subcategories: ["Agile Mindset", "Strategic Planning", "Critical Thinking & Creative Problem-Solving"]
    },
    {
      name: "People Skills",
      color: "bg-green-100 text-green-800 border-green-200", 
      subcategories: ["Emotional Intelligence", "Collaboration", "Communication"]
    },
    {
      name: "Leadership Skills",
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      subcategories: ["Mindful Leadership", "Empowerment", "Decision-making"]
    }
  ];

  const trainers = [
    "John Smith",
    "Sarah Johnson", 
    "Michael Chen",
    "Emily Davis",
  ];

  const partners = [
    "Excellence Training Partners",
    "Professional Development Corp",
    "Leadership Institute Singapore",
    "Corporate Training Solutions",
    "Skills Development Academy"
  ];

  const venues = [
    "Main Training Room",
    "Conference Hall A",
    "Conference Hall B",
    "Online Platform",
    "External Venue"
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="courseCode">Course Code *</Label>
          <Input
            id="courseCode"
            value={formData.courseCode || ''}
            onChange={(e) => onInputChange("courseCode", e.target.value)}
            placeholder="e.g., TRN001"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Course Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => onInputChange("title", e.target.value)}
            placeholder="Enter course title"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="category">Course Category *</Label>
          <Select value={formData.category} onValueChange={(value) => onInputChange("category", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categoryGroups.map((group) => (
                <React.Fragment key={group.name}>
                  <div className={`px-2 py-1 text-xs font-semibold ${group.color} rounded mx-1 my-1 pointer-events-none`}>
                    {group.name}
                  </div>
                  {group.subcategories.map((subcategory) => (
                    <SelectItem 
                      key={subcategory} 
                      value={subcategory}
                      className="ml-2 text-sm"
                    >
                      {subcategory}
                    </SelectItem>
                  ))}
                </React.Fragment>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Course Description / Learning Objectives</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => onInputChange("description", e.target.value)}
          placeholder="Enter course description and learning objectives"
          rows={4}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="duration">Course Duration</Label>
          <Input
            id="duration"
            type="number"
            value={formData.duration}
            onChange={(e) => onInputChange("duration", e.target.value)}
            placeholder="Duration"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="durationType">Duration Type</Label>
          <Select value={formData.durationType} onValueChange={(value) => onInputChange("durationType", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="days">Days</SelectItem>
              <SelectItem value="hours">Hours</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="trainer">Trainers *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full justify-between min-h-10"
              >
                {formData.trainer.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {formData.trainer.map((trainerName: string) => (
                      <Badge key={trainerName} variant="secondary" className="text-xs">
                        {trainerName}
                        <button
                          type="button"
                          className="ml-1 hover:bg-muted rounded-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            onInputChange("trainer", formData.trainer.filter((t: string) => t !== trainerName));
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  "Select trainers..."
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="Search trainers..." />
                <CommandList>
                  <CommandEmpty>No trainer found.</CommandEmpty>
                  <CommandGroup heading="Trainers">
                    {trainers.map((trainer) => (
                      <CommandItem
                        key={trainer}
                        value={trainer}
                        onSelect={() => {
                          if (!formData.trainer.includes(trainer)) {
                            onInputChange("trainer", [...formData.trainer, trainer]);
                          }
                        }}
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${
                            formData.trainer.includes(trainer) ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        {trainer}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandGroup heading="Partners">
                    {partners.map((partner) => (
                      <CommandItem
                        key={partner}
                        value={partner}
                        onSelect={() => {
                          if (!formData.trainer.includes(partner)) {
                            onInputChange("trainer", [...formData.trainer, partner]);
                          }
                        }}
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${
                            formData.trainer.includes(partner) ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        {partner}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="venue">Venue</Label>
          <Select value={formData.venue} onValueChange={(value) => onInputChange("venue", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select venue" />
            </SelectTrigger>
            <SelectContent>
              {venues.map((venue) => (
                <SelectItem key={venue} value={venue}>
                  {venue}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="specifiedLocation">Specified Location (Optional)</Label>
          <Input
            id="specifiedLocation"
            value={formData.specifiedLocation || ''}
            onChange={(e) => onInputChange("specifiedLocation", e.target.value)}
            placeholder="Enter specific location details"
          />
        </div>
      </div>

      {/* Certificate Generation */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">Certificate Generation</Label>
        <RadioGroup 
          value={formData.certificates} 
          onValueChange={(value) => onInputChange("certificates", value)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="polwel" id="polwel" />
            <Label htmlFor="polwel">YES - POLWEL generated</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="partner" id="partner" />
            <Label htmlFor="partner">YES - Partner generated</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="no" />
            <Label htmlFor="no">NO</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
};

export default CourseInformationTab;