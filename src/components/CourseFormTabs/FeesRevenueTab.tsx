import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

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
    <div className="space-y-6">
      {/* REVENUE SECTION */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-sm">
            <DollarSign className="h-4 w-4 mr-2" />
            Revenue
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label htmlFor="defaultCourseFee" className="text-sm font-medium">
              Default Course Fee ($)
            </Label>
            <Input
              id="defaultCourseFee"
              type="number"
              step="0.01"
              min="0"
              value={formatDisplayValue(formData.defaultCourseFee)}
              onChange={(e) => handleNumericInputChange("defaultCourseFee", e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500">Fee charged to learners/client per pax</p>
          </div>
        </CardContent>
      </Card>

      {/* EXPENSES SECTION */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Expenses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 3-Column Layout: Contract Fees, Venue Fee Type, Base Venue Fee */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Contract Fees */}
            <div className="space-y-2">
              <Label htmlFor="contractFees" className="text-sm font-medium">
                Contract Fees ($)
              </Label>
              <Input
                id="contractFees"
                type="number"
                step="0.01"
                min="0"
                value={formatDisplayValue(formData.contractFees)}
                onChange={(e) => handleNumericInputChange("contractFees", e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500">Contract/trainer fees paid out</p>
            </div>

            {/* Venue Fee Type */}
            <div className="space-y-2">
              <Label htmlFor="venueFeeType" className="text-sm font-medium">
                Venue Fee Type
              </Label>
              <Select value={formData.venueFeeType} onValueChange={(value) => onInputChange("venueFeeType", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select fee type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PER_HEAD">PER_HEAD</SelectItem>
                  <SelectItem value="PER_VENUE">PER_VENUE</SelectItem>
                  <SelectItem value="FIXED">FIXED</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">Pricing model for venue charges</p>
            </div>

            {/* Base Venue Fee */}
            <div className="space-y-2">
              <Label htmlFor="venueFee" className="text-sm font-medium">
                Base Venue Fee ($)
              </Label>
              <Input
                id="venueFee"
                type="number"
                step="0.01"
                min="0"
                value={formatDisplayValue(formData.venueFee)}
                onChange={(e) => handleNumericInputChange("venueFee", e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500">Base venue rental fee</p>
            </div>
          </div>

          {/* Show venue-specific fields if PER_VENUE fee type */}
          {formData.venueFeeType === "PER_VENUE" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="venueMaxParticipants" className="text-sm font-medium">
                  Max Participants (Venue)
                </Label>
                <Input
                  id="venueMaxParticipants"
                  type="number"
                  min="1"
                  value={typeof formData.venueMaxParticipants === "number" ? formData.venueMaxParticipants : formData.venueMaxParticipants || ""}
                  onChange={(e) => onInputChange("venueMaxParticipants", e.target.value ? parseInt(e.target.value, 10) : "")}
                  placeholder="Enter maximum participants"
                />
                <p className="text-xs text-gray-500">Maximum participants before per-head charges apply</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="perHeadPriceIfMaxExceed" className="text-sm font-medium">
                  Per Head Fee if Max Exceeded ($)
                </Label>
                <Input
                  id="perHeadPriceIfMaxExceed"
                  type="number"
                  step="0.01"
                  min="0"
                  value={typeof formData.perHeadPriceIfMaxExceed === "number" ? formData.perHeadPriceIfMaxExceed : formData.perHeadPriceIfMaxExceed || ""}
                  onChange={(e) => onInputChange("perHeadPriceIfMaxExceed", e.target.value ? parseFloat(e.target.value) : "")}
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500">Additional fee per participant if maximum is exceeded</p>
              </div>
            </div>
          )}

          {/* 1-Column Layout: Remarks (full width) */}
          <div className="space-y-2">
            <Label htmlFor="remarks" className="text-sm font-medium">
              Remarks
            </Label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => onInputChange("remarks", e.target.value)}
              placeholder="Enter any remarks for this course's financial arrangement"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeesRevenueTab;
