import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Calculator } from "lucide-react";
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

  // Calculate total fees
  const calculateTotalFees = () => {
    const courseFee = formData.courseFee || 0;
    const venueFee = formData.venueFee || 0;
    const otherFees = formData.otherFees || 0;
    const adminFees = formData.adminFees || 0;
    const contingencyFees = formData.contingencyFees || 0;
    
    return courseFee + venueFee + otherFees + adminFees + contingencyFees;
  };

  // Calculate per participant fee
  const calculatePerParticipantFee = () => {
    const totalFees = calculateTotalFees();
    const participants = formData.currentParticipants || 1;
    return totalFees / participants;
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

      <Separator />

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

      <Separator />

      {/* Minimum Participants & Remarks */}
      <div className="space-y-4">
        <h4 className="text-base font-medium">Participation Requirements</h4>
        
        <div className="space-y-2">
          <Label htmlFor="minParticipants">Minimum Participants</Label>
          <Input
            id="minParticipants"
            type="number"
            min="1"
            value={formData.minParticipants || formData.minClassSize}
            onChange={(e) => handleInputChange("minParticipants", parseInt(e.target.value) || 1)}
            disabled={!isEditing}
            placeholder="1"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="feeRemarks">Remarks (for minimum participants not met)</Label>
          <Textarea
            id="feeRemarks"
            value={formData.feeRemarks || ''}
            onChange={(e) => handleInputChange("feeRemarks", e.target.value)}
            disabled={!isEditing}
            placeholder="Enter remarks when minimum participants is not met"
            rows={3}
          />
        </div>
      </div>

      <Separator />

      {/* Fee Summary */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4" />
          <h4 className="text-base font-medium">Fee Summary</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Fee Breakdown */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
            <h5 className="font-medium">Fee Breakdown</h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Course Fee:</span>
                <span>${(formData.courseFee || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Venue Fee:</span>
                <span>${(formData.venueFee || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Other Fees:</span>
                <span>${(formData.otherFees || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Admin Fees:</span>
                <span>${(formData.adminFees || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Contingency Fees:</span>
                <span>${(formData.contingencyFees || 0).toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Total Fees:</span>
                <Badge variant="secondary">${calculateTotalFees().toFixed(2)}</Badge>
              </div>
            </div>
          </div>

          {/* Per Participant Calculation */}
          <div className="space-y-3 p-4 border rounded-lg bg-primary/5">
            <h5 className="font-medium">Per Participant Fee</h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Fees:</span>
                <span>${calculateTotalFees().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Current Participants:</span>
                <span>{formData.currentParticipants || 1}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Fee Per Participant:</span>
                <Badge variant="default">${calculatePerParticipantFee().toFixed(2)}</Badge>
              </div>
            </div>
            {formData.feeType === 'per-head' && (
              <p className="text-xs text-muted-foreground">
                Fee is charged per participant
              </p>
            )}
          </div>
        </div>

        {/* Revenue Projection */}
        <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
          <h5 className="font-medium mb-2">Revenue Projection</h5>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                ${(calculateTotalFees() * 0.8).toFixed(2)}
              </div>
              <div className="text-muted-foreground">Minimum (80% capacity)</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                ${calculateTotalFees().toFixed(2)}
              </div>
              <div className="text-muted-foreground">Current ({formData.currentParticipants} participants)</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                ${(calculateTotalFees() * (formData.maxClassSize || formData.recommendedClassSize) / (formData.currentParticipants || 1)).toFixed(2)}
              </div>
              <div className="text-muted-foreground">Maximum ({formData.maxClassSize || formData.recommendedClassSize} participants)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseRunFeesExpensesTab;