import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Send, Calendar, User, Mail, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { TrainerAssignment } from "@/types/courseRun";

interface TrainerAssignmentTabProps {
  courseRunId: string;
  assignments: TrainerAssignment[];
  onAssignTrainer: (assignment: TrainerAssignment) => void;
}

const TrainerAssignmentTab: React.FC<TrainerAssignmentTabProps> = ({
  courseRunId,
  assignments,
  onAssignTrainer
}) => {
  const { toast } = useToast();
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [availableTrainers, setAvailableTrainers] = useState<Array<{id: string, name: string}>>([]);
  const [newAssignment, setNewAssignment] = useState<Partial<TrainerAssignment>>({
    courseRunId,
    confirmationSent: false
  });

  // Mock trainers data - replace with API call
  useEffect(() => {
    const mockTrainers = [
      { id: 'trainer-1', name: 'Mr. John Trainer' },
      { id: 'trainer-2', name: 'Ms. Sarah Smith' },
      { id: 'trainer-3', name: 'Dr. Michael Chen' },
      { id: 'trainer-4', name: 'Ms. Emily Johnson' },
      { id: 'trainer-5', name: 'Mr. David Brown' }
    ];
    setAvailableTrainers(mockTrainers);
  }, []);

  const handleAssignTrainer = () => {
    if (!newAssignment.trainerId || !newAssignment.trainerName) {
      toast({
        title: "Error",
        description: "Please select a trainer",
        variant: "destructive"
      });
      return;
    }

    const assignment: TrainerAssignment = {
      id: `assignment-${Date.now()}`,
      courseRunId,
      trainerId: newAssignment.trainerId || '',
      trainerName: newAssignment.trainerName || '',
      dayAssigned: newAssignment.dayAssigned,
      confirmationSent: false,
      assignmentDate: new Date().toISOString(),
      remarks: newAssignment.remarks
    };

    onAssignTrainer(assignment);
    setNewAssignment({
      courseRunId,
      confirmationSent: false
    });
    setIsAssignDialogOpen(false);
  };

  const handleSendConfirmation = (assignmentId: string) => {
    // Update assignment to mark confirmation as sent
    toast({
      title: "Confirmation Sent",
      description: "Training assignment confirmation has been sent to the trainer",
    });
  };

  const handleTrainerSelect = (trainerId: string) => {
    const trainer = availableTrainers.find(t => t.id === trainerId);
    setNewAssignment({
      ...newAssignment,
      trainerId,
      trainerName: trainer?.name || ''
    });
  };

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Trainer Assignment</h3>
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Assign Trainer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Assign Trainer to Course Run</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="trainer">Select Trainer *</Label>
                <Select
                  value={newAssignment.trainerId}
                  onValueChange={handleTrainerSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a trainer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTrainers.map(trainer => (
                      <SelectItem key={trainer.id} value={trainer.id}>
                        {trainer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dayAssigned">Day Assigned (Optional)</Label>
                <Input
                  id="dayAssigned"
                  type="date"
                  value={newAssignment.dayAssigned || ''}
                  onChange={(e) => setNewAssignment({...newAssignment, dayAssigned: e.target.value})}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Specify if trainer is assigned to specific days only
                </p>
              </div>

              <div>
                <Label htmlFor="remarks">Assignment Remarks</Label>
                <Textarea
                  id="remarks"
                  value={newAssignment.remarks || ''}
                  onChange={(e) => setNewAssignment({...newAssignment, remarks: e.target.value})}
                  placeholder="Add any special instructions or notes for the trainer..."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssignTrainer}>
                Assign Trainer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Trainer Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Assigned Trainers ({assignments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                <User className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4">No trainers assigned yet</p>
              <Button onClick={() => setIsAssignDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Assign First Trainer
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Trainer</TableHead>
                      <TableHead>Assignment Date</TableHead>
                      <TableHead>Day Assigned</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{assignment.trainerName}</p>
                              <p className="text-sm text-muted-foreground">ID: {assignment.trainerId}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {new Date(assignment.assignmentDate).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          {assignment.dayAssigned ? (
                            <Badge variant="outline">
                              {new Date(assignment.dayAssigned).toLocaleDateString()}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">All days</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={assignment.confirmationSent ? "default" : "secondary"}>
                            {assignment.confirmationSent ? (
                              <div className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Confirmed
                              </div>
                            ) : (
                              'Pending Confirmation'
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            {!assignment.confirmationSent && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSendConfirmation(assignment.id)}
                              >
                                <Send className="w-4 h-4 mr-1" />
                                Send Confirmation
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Assignment Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Assignment Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-primary">{assignments.length}</div>
                      <div className="text-sm text-muted-foreground">Total Assigned</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {assignments.filter(a => a.confirmationSent).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Confirmed</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">
                        {assignments.filter(a => !a.confirmationSent).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Pending</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {assignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm">
                <Mail className="w-4 h-4 mr-2" />
                Send All Confirmations
              </Button>
              <Button variant="outline" size="sm">
                <Calendar className="w-4 h-4 mr-2" />
                Update Trainer Calendar
              </Button>
              <Button variant="outline" size="sm">
                Generate Assignment Report
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TrainerAssignmentTab;