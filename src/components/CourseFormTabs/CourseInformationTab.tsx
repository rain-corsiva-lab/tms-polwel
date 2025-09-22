import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, X } from "lucide-react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

interface CourseInformationTabProps {
  formData: any;
  onInputChange: (field: string, value: any) => void;
  onVenueSelect?: (venue: any) => void;
  categories: any[];
  trainers: any[];
  partners: any[];
  venues: any[];
  loading?: { categories?: boolean; trainers?: boolean; venues?: boolean };
}

const CourseInformationTab: React.FC<CourseInformationTabProps> = ({
  formData,
  onInputChange,
  onVenueSelect,
  categories,
  trainers,
  partners,
  venues,
  loading,
}) => {
  const categoryGroups = Array.isArray(categories) ? categories : [];

  const handleVenueChange = (venueId: string) => {
    onInputChange("venue", venueId);

    // Find the selected venue and trigger auto-fill
    if (onVenueSelect && Array.isArray(venues)) {
      const selectedVenue = venues.find((venue: any) => venue?.id === venueId);
      if (selectedVenue) {
        onVenueSelect(selectedVenue);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Course Title *</Label>
          <Input id="title" value={formData.title} onChange={(e) => onInputChange("title", e.target.value)} placeholder="Enter course title" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="courseCode">Course Code</Label>
          <Input id="courseCode" value={formData.courseCode || ""} onChange={(e) => onInputChange("courseCode", e.target.value)} placeholder="e.g. LDR-101" />
          <p className="text-[10px] text-muted-foreground">Optional unique code (auto uppercased)</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Course Category *</Label>
          <Select value={formData.category} onValueChange={(value) => onInputChange("category", value)}>
            <SelectTrigger>
              <SelectValue placeholder={loading?.categories ? "Loading..." : "Select category"} />
            </SelectTrigger>
            <SelectContent>
              {loading?.categories && (
                <SelectItem value="__loading__" disabled>
                  Loading...
                </SelectItem>
              )}
              {!loading?.categories && categoryGroups.length === 0 && (
                <SelectItem value="__empty__" disabled>
                  No categories
                </SelectItem>
              )}
              {!loading?.categories &&
                categoryGroups.length > 0 &&
                categoryGroups.map((group: any) => (
                  <React.Fragment key={group.name}>
                    <div className={`px-2 py-1 text-xs font-semibold ${group.color || "bg-muted text-foreground"} rounded mx-1 my-1 pointer-events-none`}>
                      {group.name}
                    </div>
                    {(group.subcategories || []).map((subcategory: string) => (
                      <SelectItem key={subcategory} value={subcategory} className="ml-2 text-sm">
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
        <div className="border rounded-md">
          <ReactQuill
            theme="snow"
            value={formData.description}
            onChange={(value) => onInputChange("description", value)}
            placeholder="Enter course description and learning objectives"
            modules={{
              toolbar: [
                [{ header: [1, 2, 3, false] }],
                ["bold", "italic", "underline", "strike"],
                [{ list: "ordered" }, { list: "bullet" }],
                ["link", "image"],
                ["clean"],
              ],
            }}
            className="h-48"
          />
        </div>
        <p className="text-[10px] text-muted-foreground">Rich text supported; images allowed.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="duration">Course Duration</Label>
          <Input id="duration" type="number" value={formData.duration} onChange={(e) => onInputChange("duration", e.target.value)} placeholder="Duration" />
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
              <Button variant="outline" role="combobox" className="w-full justify-between min-h-10">
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
                            onInputChange(
                              "trainer",
                              formData.trainer.filter((t: string) => t !== trainerName)
                            );
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
                    {trainers.map((trainer: any) => {
                      const displayName = trainer.name || trainer;
                      return (
                        <CommandItem
                          key={trainer.id || displayName}
                          value={displayName}
                          onSelect={() => {
                            if (!formData.trainer.includes(displayName)) {
                              onInputChange("trainer", [...formData.trainer, displayName]);
                            }
                          }}
                        >
                          <Check className={`mr-2 h-4 w-4 ${formData.trainer.includes(displayName) ? "opacity-100" : "opacity-0"}`} />
                          {displayName}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                  <CommandGroup heading="Partners">
                    {partners.map((partner: any) => {
                      const name = partner.name || partner;
                      return (
                        <CommandItem
                          key={partner.id || name}
                          value={name}
                          onSelect={() => {
                            if (!formData.trainer.includes(name)) {
                              onInputChange("trainer", [...formData.trainer, name]);
                            }
                          }}
                        >
                          <Check className={`mr-2 h-4 w-4 ${formData.trainer.includes(name) ? "opacity-100" : "opacity-0"}`} />
                          {name}
                        </CommandItem>
                      );
                    })}
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
          <Select value={formData.venue} onValueChange={handleVenueChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select venue" />
            </SelectTrigger>
            <SelectContent>
              {Array.isArray(venues) && venues.length > 0 ? (
                venues.map((venue: any) => {
                  const name = typeof venue === "string" ? venue : venue?.name || "Unnamed Venue";
                  const venueId = venue?.id || name;
                  return (
                    <SelectItem key={venueId} value={venueId}>
                      {name}
                    </SelectItem>
                  );
                })
              ) : (
                <SelectItem value="__no_venues__" disabled>
                  No venues available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="specifiedLocation">Specified Location (Optional)</Label>
          <Input
            id="specifiedLocation"
            value={formData.specifiedLocation || ""}
            onChange={(e) => onInputChange("specifiedLocation", e.target.value)}
            placeholder="Enter specific location details"
          />
        </div>
      </div>

      {/* Certificate Generation */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">Certificate Generation</Label>
        <RadioGroup value={formData.certificates} onValueChange={(value) => onInputChange("certificates", value)}>
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
