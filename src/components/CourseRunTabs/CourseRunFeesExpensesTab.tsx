import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";
import type { CourseRun } from "@/types/courseRun";

interface CourseRunFeesExpensesTabProps {
  courseRun: CourseRun;
  onUpdate: (data: Partial<CourseRun>) => void;
}

const CourseRunFeesExpensesTab: React.FC<CourseRunFeesExpensesTabProps> = ({
  courseRun,
  onUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(courseRun);

  const handleSave = () => {
    onUpdate(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(courseRun);
    setIsEditing(false);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-8">
      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Fees & Expenses</h3>
        <div className="space-x-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save Changes
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              Edit Fees & Expenses
            </Button>
          )}
        </div>
      </div>

      {/* Course Fee Configuration */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          <h4 className="text-base font-medium">Course Fee Configuration</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="courseFee">Course Fee ($)</Label>
            <Input
              id="courseFee"
              type="number"
              value={formData.courseFee || 0}
              onChange={(e) => handleInputChange("courseFee", parseFloat(e.target.value) || 0)}
              disabled={!isEditing}
              placeholder="0.00"
            />
            <p className="text-sm text-muted-foreground">Base fee for this course run</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feeType">Fee Type</Label>
            <Select 
              value={formData.feeType || "per-run"} 
              onValueChange={(value) => handleInputChange("feeType", value)}
              disabled={!isEditing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select fee type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="per-run">Per Run</SelectItem>
                <SelectItem value="per-head">Per Head</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Additional Fees */}
      <div className="space-y-4">
        <h4 className="text-base font-medium">Additional Fees</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="venueFee">Venue Fee ($)</Label>
            <Input
              id="venueFee"
              type="number"
              value={formData.venueFee || 0}
              onChange={(e) => handleInputChange("venueFee", parseFloat(e.target.value) || 0)}
              disabled={!isEditing}
              placeholder="0.00"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="otherFees">Other Fees ($)</Label>
            <Input
              id="otherFees"
              type="number"
              value={formData.otherFees || 0}
              onChange={(e) => handleInputChange("otherFees", parseFloat(e.target.value) || 0)}
              disabled={!isEditing}
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
              value={formData.adminFees || 0}
              onChange={(e) => handleInputChange("adminFees", parseFloat(e.target.value) || 0)}
              disabled={!isEditing}
              placeholder="0.00"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="contingencyFees">Contingency Fees ($)</Label>
            <Input
              id="contingencyFees"
              type="number"
              value={formData.contingencyFees || 0}
              onChange={(e) => handleInputChange("contingencyFees", parseFloat(e.target.value) || 0)}
              disabled={!isEditing}
              placeholder="0.00"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseRunFeesExpensesTab;