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
  return (
    <div className="space-y-4">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="billingRate">Billing Rate ($)</Label>
          <Input
            id="billingRate"
            type="number"
            value={formData.billingRate || 0}
            onChange={(e) => onInputChange("billingRate", parseFloat(e.target.value) || 0)}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="venueFee">Venue Expenses ($)</Label>
          <Input
            id="venueFee"
            type="number"
            value={formData.venueFee || 0}
            onChange={(e) => onInputChange("venueFee", parseFloat(e.target.value) || 0)}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contractsFeePayout">Contracts Fee Payout ($)</Label>
          <Input
            id="contractsFeePayout"
            type="number"
            value={formData.contractsFeePayout || 0}
            onChange={(e) => onInputChange("contractsFeePayout", parseFloat(e.target.value) || 0)}
            placeholder="0.00"
          />
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
