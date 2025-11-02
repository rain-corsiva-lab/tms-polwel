import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface FeesRevenueTabProps {
  formData: any;
  onInputChange: (field: string, value: any) => void;
}

const FeesRevenueTab: React.FC<FeesRevenueTabProps> = ({ formData, onInputChange }) => {
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              className={formData.venueFeeType ? "pr-16" : ""}
            />
            {formData.venueFeeType && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{formData.venueFeeType}</span>}
          </div>
          {formData.venueFeeType && <p className="text-xs text-muted-foreground">Auto-filled from selected venue</p>}
        </div>
      </div>

      <div className="space-y-2">
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
