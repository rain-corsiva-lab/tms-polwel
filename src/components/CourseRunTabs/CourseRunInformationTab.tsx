import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Users, DollarSign } from "lucide-react";
import type { CourseRun } from "@/types/courseRun";

interface CourseRunInformationTabProps {
  courseRun: CourseRun;
  onUpdate: (data: Partial<CourseRun>) => void;
}

const CourseRunInformationTab: React.FC<CourseRunInformationTabProps> = ({
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
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Course Run Details</h3>
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
              Edit Course Run
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="serialNumber">Course Run Serial Number</Label>
                <Input
                  id="serialNumber"
                  value={formData.serialNumber}
                  onChange={(e) => handleInputChange('serialNumber', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="courseCode">Course Code (Max 5 chars)</Label>
                <Input
                  id="courseCode"
                  value={formData.courseCode}
                  onChange={(e) => handleInputChange('courseCode', e.target.value.slice(0, 5))}
                  disabled={!isEditing}
                  maxLength={5}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="courseTitle">Course Title</Label>
              <Input
                id="courseTitle"
                value={formData.courseTitle}
                disabled
                className="bg-muted"
              />
            </div>

            <div>
              <Label htmlFor="type">Course Run Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleInputChange('type', value)}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="Dedicated">Dedicated</SelectItem>
                  <SelectItem value="Talks">Talks</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Course Run Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange('status', value)}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Schedule & Venue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Schedule & Venue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="venue">Venue</Label>
              <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{formData.venue?.name}</p>
                  <p className="text-sm text-muted-foreground">{formData.venue?.address}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Class Size Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Class Size Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="minClassSize">Minimum Class Size</Label>
                <Input
                  id="minClassSize"
                  type="number"
                  value={formData.minClassSize}
                  onChange={(e) => handleInputChange('minClassSize', parseInt(e.target.value))}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="maxClassSize">Maximum Class Size</Label>
                <Input
                  id="maxClassSize"
                  type="number"
                  value={formData.maxClassSize || ''}
                  onChange={(e) => handleInputChange('maxClassSize', e.target.value ? parseInt(e.target.value) : undefined)}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="recommendedClassSize">Recommended Class Size</Label>
                <Input
                  id="recommendedClassSize"
                  type="number"
                  value={formData.recommendedClassSize}
                  onChange={(e) => handleInputChange('recommendedClassSize', parseInt(e.target.value))}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-md">
              <div>
                <Label htmlFor="individualRegistration">Individual Registration Required</Label>
                <p className="text-sm text-muted-foreground">
                  If disabled, individual learner details are not required
                </p>
              </div>
              <Switch
                id="individualRegistration"
                checked={formData.individualRegistrationRequired}
                onCheckedChange={(checked) => handleInputChange('individualRegistrationRequired', checked)}
                disabled={!isEditing}
              />
            </div>

            {/* Current enrollment status */}
            <div className="p-3 bg-muted/50 rounded-md">
              <div className="flex items-center justify-between">
                <span className="font-medium">Current Participants</span>
                <Badge variant="secondary">
                  {formData.currentParticipants} / {formData.maxClassSize || '∞'}
                </Badge>
              </div>
              <div className="mt-2">
                <div className="w-full bg-background rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      formData.currentParticipants >= formData.minClassSize 
                        ? 'bg-green-500' 
                        : 'bg-yellow-500'
                    }`}
                    style={{
                      width: `${Math.min(
                        (formData.currentParticipants / (formData.maxClassSize || formData.recommendedClassSize)) * 100,
                        100
                      )}%`
                    }}
                  ></div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.currentParticipants >= formData.minClassSize 
                    ? 'Minimum class size met' 
                    : `${formData.minClassSize - formData.currentParticipants} more needed for minimum`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contract Fees */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Contract Fees
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="baseAmount">Base Contract Fee</Label>
              <Input
                id="baseAmount"
                type="number"
                value={formData.contractFees.baseAmount}
                onChange={(e) => handleInputChange('contractFees', {
                  ...formData.contractFees,
                  baseAmount: parseFloat(e.target.value)
                })}
                disabled={!isEditing}
              />
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="perRun"
                  checked={formData.contractFees.perRun}
                  onCheckedChange={(checked) => handleInputChange('contractFees', {
                    ...formData.contractFees,
                    perRun: checked,
                    perHead: checked ? false : formData.contractFees.perHead
                  })}
                  disabled={!isEditing}
                />
                <Label htmlFor="perRun">Per Run</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="perHead"
                  checked={formData.contractFees.perHead}
                  onCheckedChange={(checked) => handleInputChange('contractFees', {
                    ...formData.contractFees,
                    perHead: checked,
                    perRun: checked ? false : formData.contractFees.perRun
                  })}
                  disabled={!isEditing}
                />
                <Label htmlFor="perHead">Per Head</Label>
              </div>
            </div>

            <div>
              <Label htmlFor="additionalCosts">Additional Costs</Label>
              <Input
                id="additionalCosts"
                type="number"
                value={formData.contractFees.additionalCosts}
                onChange={(e) => handleInputChange('contractFees', {
                  ...formData.contractFees,
                  additionalCosts: parseFloat(e.target.value)
                })}
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Remarks */}
      <Card>
        <CardHeader>
          <CardTitle>Remarks</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Add any additional remarks or notes..."
            value={formData.remarks || ''}
            onChange={(e) => handleInputChange('remarks', e.target.value)}
            disabled={!isEditing}
            rows={3}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default CourseRunInformationTab;