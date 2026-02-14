import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import "@/styles/quill-custom.css";
import { quillModules } from "@/utils/quillImageHandler";

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
    onInputChange("venueId", venueId);

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
          <Label htmlFor="courseCode">Course Code *</Label>
          <Input
            id="courseCode"
            value={formData.courseCode || ""}
            onChange={(e) => onInputChange("courseCode", e.target.value)}
            placeholder="e.g. LDR01"
            maxLength={5}
          />
          <p className="text-[10px] text-muted-foreground">Maximum 5 characters (auto uppercased)</p>
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
                categoryGroups.map((group: any) => {
                  const label = group?.name || "Categories";
                  const subcategories = Array.isArray(group?.subcategories) ? group.subcategories : [];
                  return (
                    <SelectGroup key={label}>
                      <SelectLabel className={cn("mx-1 my-1 rounded px-2 py-1 text-xs font-semibold", group?.color || "bg-muted text-foreground")}>
                        {label}
                      </SelectLabel>
                      {subcategories.map((subcategory: string) => (
                        <SelectItem key={`${label}-${subcategory}`} value={subcategory} className="ml-2 text-sm">
                          {subcategory}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  );
                })}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Course Description</Label>
        <div className="border rounded-md overflow-hidden" style={{ minHeight: "220px" }}>
          <ReactQuill
            theme="snow"
            value={formData.description}
            onChange={(value) => onInputChange("description", value)}
            placeholder="Enter course description and overview"
            modules={quillModules}
            style={{ height: "180px" }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground">Rich text supported; images will be uploaded to server.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="learningObjectives">Learning Objectives</Label>
        <div className="border rounded-md overflow-hidden" style={{ minHeight: "220px" }}>
          <ReactQuill
            theme="snow"
            value={formData.learningObjectives || ""}
            onChange={(value) => onInputChange("learningObjectives", value)}
            placeholder="Enter learning objectives for this course"
            modules={quillModules}
            style={{ height: "180px" }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground">Rich text supported; images will be uploaded to server.</p>
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
                    {formData.trainer.map((trainerId: string) => {
                      const normalizedId = String(trainerId);
                      const trainer = trainers.find((t: any) => String(t?.id) === normalizedId);
                      const partner = partners.find((p: any) => String(p?.id) === normalizedId || String(p?.partnerId) === normalizedId);
                      const displayName = trainer?.name || partner?.partnerName || partner?.name || normalizedId;
                      return (
                        <Badge key={normalizedId} variant="secondary" className="text-xs">
                          {displayName}
                          <span
                            role="button"
                            tabIndex={0}
                            aria-label={`Remove ${displayName}`}
                            className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-muted"
                            onClick={(e) => {
                              e.stopPropagation();
                              onInputChange(
                                "trainer",
                                formData.trainer.filter((id: string) => String(id) !== normalizedId),
                              );
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                e.stopPropagation();
                                onInputChange(
                                  "trainer",
                                  formData.trainer.filter((id: string) => String(id) !== normalizedId),
                                );
                              }
                            }}
                          >
                            <X className="h-3 w-3" />
                          </span>
                        </Badge>
                      );
                    })}
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
                      const trainerId = trainer?.id;
                      if (!trainerId) {
                        return null;
                      }
                      const normalizedId = String(trainerId);
                      const displayName = trainer?.name || trainer?.email || normalizedId;
                      const isSelected = formData.trainer.includes(normalizedId);
                      return (
                        <CommandItem
                          key={normalizedId}
                          value={displayName}
                          onSelect={() => {
                            onInputChange(
                              "trainer",
                              isSelected ? formData.trainer.filter((id: string) => id !== normalizedId) : [...formData.trainer, normalizedId],
                            );
                          }}
                        >
                          <Check className={`mr-2 h-4 w-4 ${isSelected ? "opacity-100" : "opacity-0"}`} />
                          {displayName}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                  <CommandGroup heading="Partners">
                    {partners.map((partner: any) => {
                      if (!partner) {
                        return null;
                      }
                      const partnerIdRaw = partner.id || partner.partnerId || partner.value || partner.partnerName;
                      if (!partnerIdRaw) {
                        return null;
                      }
                      const partnerId = String(partnerIdRaw);
                      const name = partner.partnerName || partner.name || partner.label || partnerId;
                      const isSelected = formData.trainer.includes(partnerId);
                      return (
                        <CommandItem
                          key={partnerId}
                          value={name}
                          onSelect={() => {
                            onInputChange("trainer", isSelected ? formData.trainer.filter((id: string) => id !== partnerId) : [...formData.trainer, partnerId]);
                          }}
                        >
                          <Check className={`mr-2 h-4 w-4 ${isSelected ? "opacity-100" : "opacity-0"}`} />
                          {name}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <span className="text-xs text-gray-400">Note: Trainers and partners should be created in User Management before being able to select here.</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="minParticipants">Min Participants *</Label>
          <Input
            id="minParticipants"
            type="number"
            min="1"
            value={formData.minParticipants === 0 || formData.minParticipants === "" ? "" : formData.minParticipants}
            onChange={(e) => {
              const val = e.target.value;
              // Allow empty input for better UX - backend will validate minimum of 1
              onInputChange("minParticipants", val === "" ? "" : parseInt(val) || "");
            }}
            placeholder="Min pax (minimum 1)"
          />
          <p className="text-[10px] text-muted-foreground">Minimum value is 1</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxParticipants">Max Participants</Label>
          <Input
            id="maxParticipants"
            type="number"
            min="1"
            value={formData.maxParticipants || ""}
            onChange={(e) => onInputChange("maxParticipants", e.target.value ? parseInt(e.target.value) : "")}
            placeholder="Max pax (optional)"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="venueType">Venue</Label>
          <Select value={formData.venueType || ""} onValueChange={(value) => onInputChange("venueType", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select venue type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="HOTEL">Hotel</SelectItem>
              <SelectItem value="ON_PREMISE">On Premise</SelectItem>
              <SelectItem value="CLIENT_FACILITY">Client Facility</SelectItem>
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

      {/* Fee-related fields moved to FeesRevenueTab */}

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
