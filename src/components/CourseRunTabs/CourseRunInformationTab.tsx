import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users } from "lucide-react";
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
    <div className="space-y-8">
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

      {/* Basic Information */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <h4 className="text-base font-medium">Basic Information</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
      </div>

      <Separator />

      {/* Schedule & Venue */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <h4 className="text-base font-medium">Schedule & Venue</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* Venue Selection */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="venueType">Venue</Label>
              <Select
                value={formData.venueType || 'Hotel'}
                onValueChange={(value) => handleInputChange('venueType', value)}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hotel">Hotel</SelectItem>
                  <SelectItem value="On-premise">On-premise</SelectItem>
                  <SelectItem value="Client's facility">Client's facility</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="venueHotel">Venue (Hotel)</Label>
              <Select
                value={formData.venueHotel || ''}
                onValueChange={(value) => handleInputChange('venueHotel', value)}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select hotel venue" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POLWEL Training Center - Main Hall">POLWEL Training Center - Main Hall</SelectItem>
                  <SelectItem value="Marina Bay Conference Center">Marina Bay Conference Center</SelectItem>
                  <SelectItem value="Corporate Training Room A">Corporate Training Room A</SelectItem>
                  <SelectItem value="Innovation Hub - Workshop Space">Innovation Hub - Workshop Space</SelectItem>
                  <SelectItem value="Executive Meeting Room">Executive Meeting Room</SelectItem>
                  <SelectItem value="Hotel Seminar Room">Hotel Seminar Room</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="specifiedLocation">Specified Location</Label>
            <Input
              id="specifiedLocation"
              placeholder="Enter specific location details (optional)"
              value={formData.specifiedLocation || ''}
              onChange={(e) => handleInputChange('specifiedLocation', e.target.value)}
              disabled={!isEditing}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Class Size Configuration */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          <h4 className="text-base font-medium">Class Size Configuration</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </div>

      <Separator />

      {/* Remarks */}
      <div className="space-y-4">
        <h4 className="text-base font-medium">Remarks</h4>
        <Textarea
          placeholder="Add any additional remarks or notes..."
          value={formData.remarks || ''}
          onChange={(e) => handleInputChange('remarks', e.target.value)}
          disabled={!isEditing}
          rows={3}
        />
      </div>
    </div>
  );
};

export default CourseRunInformationTab;