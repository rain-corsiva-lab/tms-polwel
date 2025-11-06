import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FeesRevenueTabProps {
  formData: any;
  onInputChange: (field: string, value: any) => void;
  venues?: any[];
  selectedVenueId?: string;
}

const FeesRevenueTab: React.FC<FeesRevenueTabProps> = ({ formData, onInputChange, venues = [], selectedVenueId }) => {
  const selectedVenue = venues.find((v: any) => v?.id === selectedVenueId);
  const handleNumericInputChange = (field: string, value: string) => {
    // Remove leading zeros and handle empty string
    const cleanValue = value.replace(/^0+/, "") || "0";
    const numericValue = parseFloat(cleanValue) || 0;
    onInputChange(field, numericValue);
  };

  const formatDisplayValue = (value: number | undefined) => {
    // Return empty string if value is 0 or undefined, otherwise return the value as string
    return value === 0 || value === undefined ? "" : value.toString();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="defaultCourseFee">Default Course Fee ($)</Label>
          <Input
            id="defaultCourseFee"
            type="number"
            step="0.01"
            min="0"
            value={formatDisplayValue(formData.defaultCourseFee)}
            onChange={(e) => handleNumericInputChange("defaultCourseFee", e.target.value)}
            placeholder="0.00"
          />
          <p className="text-sm text-muted-foreground">per pax w/o GST</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contractFees">Contract Fees ($)</Label>
          <Input
            id="contractFees"
            type="number"
            step="0.01"
            min="0"
            value={formatDisplayValue(formData.contractFees)}
            onChange={(e) => handleNumericInputChange("contractFees", e.target.value)}
            placeholder="0.00"
          />
          <p className="text-sm text-muted-foreground">Trainer/contract fees paid out</p>
        </div>
      </div>

      {/* Venue Fee Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="venueFeeType">Fee Type</Label>
          <Select value={formData.venueFeeType} disabled onValueChange={(value) => onInputChange("venueFeeType", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select fee type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PER_HEAD">Per Head</SelectItem>
              <SelectItem value="PER_VENUE">Per Venue</SelectItem>
              <SelectItem value="FIXED">Fixed</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Automatically set based on selected venue</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="venueFee">Venue Expenses ($)</Label>
          <div className="relative">
            <Input
              id="venueFee"
              type="number"
              step="0.01"
              min="0"
              value={formatDisplayValue(formData.venueFee)}
              onChange={(e) => handleNumericInputChange("venueFee", e.target.value)}
              placeholder="0.00"
              className="pr-20"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {formData.venueFeeType === "PER_HEAD" ? "per head" : formData.venueFeeType === "PER_VENUE" ? "per venue" : ""}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Auto-filled from selected venue</p>
        </div>
      </div>

      {/* Additional Venue Settings */}
      {formData.venueFeeType === "PER_VENUE" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t mt-4">
          <div className="space-y-2">
            <Label htmlFor="venueMaxParticipants">Maximum Participants (Override)</Label>
            <Input
              id="venueMaxParticipants"
              type="number"
              min="1"
              value={formData.venueMaxParticipants || ""}
              onChange={(e) => onInputChange("venueMaxParticipants", e.target.value)}
              placeholder="Enter maximum participants"
            />
            <p className="text-sm text-muted-foreground">Override maximum allowed participants for this venue</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="perHeadPriceIfMaxExceed">Extra Head Price ($)</Label>
            <Input
              id="perHeadPriceIfMaxExceed"
              type="number"
              step="0.01"
              min="0"
              value={formData.perHeadPriceIfMaxExceed || ""}
              onChange={(e) => onInputChange("perHeadPriceIfMaxExceed", e.target.value)}
              placeholder="0.00"
            />
            <p className="text-sm text-muted-foreground">Fee per participant if maximum is exceeded</p>
          </div>
        </div>
      )}

      <div className="space-y-2 pt-4 border-t mt-4">
        <Label htmlFor="remarks">Remarks</Label>
        <Textarea
          id="remarks"
          value={formData.remarks}
          onChange={(e) => onInputChange("remarks", e.target.value)}
          placeholder="Enter any remarks for this course's financial arrangement"
          rows={3}
        />
      </div>
    </div>
  );
};

export default FeesRevenueTab;
