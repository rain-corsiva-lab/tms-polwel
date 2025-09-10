import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { User, CheckCircle, X, Calendar, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { CourseRun } from "@/types/courseRun";

interface TrainerApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseRun: CourseRun | null;
  onApprove?: (courseRunId: string) => void;
  onReject?: (courseRunId: string) => void;
}

export default function TrainerApprovalDialog({ 
  open, 
  onOpenChange, 
  courseRun,
  onApprove,
  onReject
}: TrainerApprovalDialogProps) {
  const { toast } = useToast();

  const handleApprove = () => {
    if (courseRun?.id && onApprove) {
      onApprove(courseRun.id);
    }
    
    toast({
      title: "Trainer Assignment Approved",
      description: "Confirmation emails have been sent to trainers and participants",
    });

    onOpenChange(false);
  };

  const handleReject = () => {
    if (courseRun?.id && onReject) {
      onReject(courseRun.id);
    }
    
    toast({
      title: "Trainer Assignment Rejected",
      description: `The trainer assignment for ${courseRun?.serialNumber} has been rejected and needs reassignment`,
    });

    onOpenChange(false);
  };

  if (!courseRun) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-500" />
            Review Trainer Assignment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Course: <span className="font-medium">{courseRun.courseTitle}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Serial Number: <span className="font-medium">{courseRun.serialNumber}</span>
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                Active (Pending Approval)
              </Badge>
            </div>
          </div>

          <div className="border rounded-lg p-4 bg-muted/20">
            <Label className="text-sm font-medium mb-2 block">Assigned Trainer(s)</Label>
            <div className="space-y-3">
              {courseRun.trainers?.map((trainer, index) => (
                <div key={trainer.id} className="flex items-center gap-3 p-3 bg-background rounded border">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{trainer.name}</p>
                    <p className="text-xs text-muted-foreground">Trainer ID: {trainer.id}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs mb-1">
                      Lead Trainer
                    </Badge>
                    <p className="text-sm font-semibold text-green-600">
                      ${courseRun.contractFees.baseAmount.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {courseRun.contractFees.perRun ? 'Per Run' : 'Per Head'}
                    </p>
                  </div>
                </div>
              ))}
              
              {courseRun.contractFees.additionalCosts > 0 && (
                <div className="flex items-center justify-between p-2 bg-amber-50 rounded border border-amber-200">
                  <span className="text-sm text-amber-800">Additional Costs</span>
                  <span className="text-sm font-semibold text-amber-800">
                    +${courseRun.contractFees.additionalCosts.toLocaleString()}
                  </span>
                </div>
              )}
              
              <div className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200">
                <span className="text-sm font-medium text-blue-800">Total Trainer Fees</span>
                <span className="text-lg font-bold text-blue-800">
                  ${(courseRun.contractFees.baseAmount + courseRun.contractFees.additionalCosts).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>{new Date(courseRun.startDate).toLocaleDateString()} - {new Date(courseRun.endDate).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>{courseRun.venue?.name}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleReject}
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Reject Assignment
          </Button>
          <Button 
            onClick={handleApprove}
            className="flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Approve Assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}