import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface FeesExpensesTabProps {
  formData: any;
  calculations: any;
  onInputChange: (field: string, value: any) => void;
}

const FeesExpensesTab: React.FC<FeesExpensesTabProps> = ({ formData, calculations, onInputChange }) => {
  return (
    <div className="space-y-4">
      {/* Default Course Fee */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="defaultCourseFee">Default Course Fee ($)</Label>
          <Input
            id="defaultCourseFee"
            type="number"
            value={formData.defaultCourseFee || 0}
            onChange={(e) => onInputChange("defaultCourseFee", parseFloat(e.target.value) || 0)}
            placeholder="0.00"
          />
          <p className="text-sm text-muted-foreground">Base fee for this course template</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="feeType">Fee Type</Label>
          <Select value={formData.feeType || "per-run"} onValueChange={(value) => onInputChange("feeType", value)}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select fee type" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="per-run">Per Run</SelectItem>
              <SelectItem value="per-head">Per Head</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="venueFee">Venue Fee ($)</Label>
          <Input
            id="venueFee"
            type="number"
            value={formData.venueFee}
            onChange={(e) => onInputChange("venueFee", parseFloat(e.target.value) || 0)}
            placeholder="0.00"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="otherFees">Other Fees ($)</Label>
          <Input
            id="otherFees"
            type="number"
            value={formData.otherFees || 0}
            onChange={(e) => onInputChange("otherFees", parseFloat(e.target.value) || 0)}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="adminFees">Admin Fees ($)</Label>
          <Input
            id="adminFees"
            type="number"
            value={formData.adminFees}
            onChange={(e) => onInputChange("adminFees", parseFloat(e.target.value) || 0)}
            placeholder="0.00"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="contingencyFees">Contingency Fees ($)</Label>
          <Input
            id="contingencyFees"
            type="number"
            value={formData.contingencyFees}
            onChange={(e) => onInputChange("contingencyFees", parseFloat(e.target.value) || 0)}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="minPax">Minimum Pax</Label>
        <Input
          id="minPax"
          type="number"
          min="1"
          value={formData.minPax}
          onChange={(e) => onInputChange("minPax", parseInt(e.target.value) || 1)}
          placeholder="1"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="remarks">Remarks (for minimum pax not met)</Label>
        <Textarea
          id="remarks"
          value={formData.remarks}
          onChange={(e) => onInputChange("remarks", e.target.value)}
          placeholder="Enter remarks when minimum pax is not met"
          rows={2}
        />
      </div>

    </div>
  );
};

export default FeesExpensesTab;