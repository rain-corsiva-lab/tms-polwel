import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { UserCheck, DollarSign, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { CourseRun } from "@/types/courseRun";
import { Checkbox } from "@/components/ui/checkbox";

interface TrainerAssignmentTabProps {
  courseRun: CourseRun;
  onUpdate: (data: Partial<CourseRun>) => void;
}

const TrainerAssignmentTab: React.FC<TrainerAssignmentTabProps> = ({
  courseRun,
  onUpdate
}) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(courseRun);
  
  // Dummy trainer data (from course creation)
  const availableTrainers = [
    {
      id: 'trainer-1',
      name: 'John Smith',
      organization: 'ABC Training Partners',
      baseFee: 1200,
      additionalCosts: 50,
      remarks: 'Preferred for technical courses'
    },
    {
      id: 'trainer-2',
      name: 'Sarah Johnson',
      organization: 'XYZ Consulting',
      baseFee: 800,
      additionalCosts: 0,
      remarks: 'Excellent for leadership training'
    },
    {
      id: 'trainer-3',
      name: 'Michael Chen',
      organization: 'TechEd Solutions',
      baseFee: 1000,
      additionalCosts: 100,
      remarks: 'Specialist in digital transformation'
    }
  ];

  // State for assigned trainers
  const [assignedTrainers, setAssignedTrainers] = useState<{[key: string]: {
    selected: boolean;
    baseFee: number;
    additionalCosts: number;
    remarks: string;
  }}>(() => {
    const initial: any = {};
    availableTrainers.forEach(trainer => {
      initial[trainer.id] = {
        selected: courseRun.trainerIds?.includes(trainer.id) || false,
        baseFee: trainer.baseFee,
        additionalCosts: trainer.additionalCosts,
        remarks: trainer.remarks
      };
    });
    return initial;
  });

  const handleSave = () => {
    onUpdate(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(courseRun);
    setIsEditing(false);
  };

  // Trainer assignment handlers
  const handleTrainerSelection = (trainerId: string, checked: boolean) => {
    setAssignedTrainers(prev => ({
      ...prev,
      [trainerId]: {
        ...prev[trainerId],
        selected: checked
      }
    }));
  };

  const handleTrainerFeeChange = (trainerId: string, field: string, value: any) => {
    setAssignedTrainers(prev => ({
      ...prev,
      [trainerId]: {
        ...prev[trainerId],
        [field]: value
      }
    }));
  };

  const getSelectedTrainersCount = () => {
    return Object.values(assignedTrainers).filter(t => t.selected).length;
  };

  const getTotalFees = () => {
    return Object.entries(assignedTrainers)
      .filter(([_, assignment]) => assignment.selected)
      .reduce((total, [_, assignment]) => {
        return total + assignment.baseFee + assignment.additionalCosts;
      }, 0);
  };

  const handleSendTrainingConfirmationEmail = () => {
    const selectedTrainers = availableTrainers.filter(trainer => 
      assignedTrainers[trainer.id].selected
    );
    
    if (selectedTrainers.length === 0) {
      toast({
        title: "No Trainers Selected",
        description: "Please select trainers before sending confirmation emails",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Training Confirmation Emails Sent",
      description: `Confirmation emails sent to ${selectedTrainers.length} selected trainer(s)`,
    });
  };

  // Filter trainers based on editing mode
  const displayTrainers = isEditing 
    ? availableTrainers 
    : availableTrainers.filter(trainer => assignedTrainers[trainer.id].selected);

  return (
    <div className="space-y-8">
      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Trainer Assignment</h3>
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
            <>
              <Button 
                variant="outline" 
                onClick={handleSendTrainingConfirmationEmail}
                disabled={getSelectedTrainersCount() === 0}
              >
                <Mail className="w-4 h-4 mr-2" />
                Send Training Confirmation Email
              </Button>
              <Button onClick={() => setIsEditing(true)}>
                Edit Trainer Assignment
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Trainer Assignment */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            <h4 className="text-base font-medium">Trainer Assignment</h4>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline">
              {getSelectedTrainersCount()} trainer(s) selected
            </Badge>
            <Badge variant="secondary">
              Total Fees: ${getTotalFees()}
            </Badge>
          </div>
        </div>

        <div className="space-y-4">
          {displayTrainers.length === 0 && !isEditing && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No trainers assigned yet</p>
              <Button 
                variant="outline" 
                onClick={() => setIsEditing(true)}
                className="mt-2"
              >
                Assign Trainers
              </Button>
            </div>
          )}
          {displayTrainers.map((trainer) => {
            const assignment = assignedTrainers[trainer.id];
            return (
              <div key={trainer.id} className="border rounded-lg p-4 space-y-4">
                {/* Trainer Selection Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={`trainer-${trainer.id}`}
                      checked={assignment.selected}
                      onCheckedChange={(checked) => 
                        handleTrainerSelection(trainer.id, checked as boolean)
                      }
                      disabled={!isEditing}
                    />
                    <div>
                      <Label htmlFor={`trainer-${trainer.id}`} className="font-medium">
                        {trainer.name}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {trainer.organization}
                      </p>
                    </div>
                  </div>
                  {assignment.selected && (
                    <Badge variant="default">Selected</Badge>
                  )}
                </div>

                {/* Fee Details - Show when selected */}
                {assignment.selected && (
                  <div className="ml-6 space-y-4 border-l-2 border-muted pl-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      <h5 className="text-sm font-medium">Trainer Fees</h5>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`baseFee-${trainer.id}`}>Base Fee</Label>
                        <Input
                          id={`baseFee-${trainer.id}`}
                          type="number"
                          value={assignment.baseFee}
                          onChange={(e) => 
                            handleTrainerFeeChange(trainer.id, 'baseFee', parseFloat(e.target.value))
                          }
                          disabled={true}
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">Base fee cannot be edited</p>
                      </div>
                      <div>
                        <Label htmlFor={`additionalCosts-${trainer.id}`}>Additional Costs</Label>
                        <Input
                          id={`additionalCosts-${trainer.id}`}
                          type="number"
                          value={assignment.additionalCosts}
                          onChange={(e) => 
                            handleTrainerFeeChange(trainer.id, 'additionalCosts', parseFloat(e.target.value))
                          }
                          disabled={!isEditing}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor={`remarks-${trainer.id}`}>Remarks</Label>
                      <Textarea
                        id={`remarks-${trainer.id}`}
                        placeholder="Add remarks for this trainer..."
                        value={assignment.remarks}
                        onChange={(e) => 
                          handleTrainerFeeChange(trainer.id, 'remarks', e.target.value)
                        }
                        disabled={true}
                        className="bg-muted"
                        rows={2}
                      />
                      <p className="text-xs text-muted-foreground">Remarks cannot be edited</p>
                    </div>

                    {/* Fee Summary */}
                    <div className="bg-muted/50 p-3 rounded-md">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total for this trainer:</span>
                        <Badge variant="secondary">
                          ${assignment.baseFee + assignment.additionalCosts}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Overall Summary */}
        {getSelectedTrainersCount() > 0 && (
          <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-medium">Assignment Summary</h5>
                <p className="text-sm text-muted-foreground">
                  {getSelectedTrainersCount()} trainer(s) assigned
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  ${getTotalFees()}
                </div>
                <div className="text-sm text-muted-foreground">Total Trainer Fees</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainerAssignmentTab;