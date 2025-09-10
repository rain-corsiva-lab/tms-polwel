import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { CourseRun } from "@/types/courseRun";

interface CancellationApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseRun: CourseRun | null;
  onApprove?: (courseRunId: string) => void;
  onReject?: (courseRunId: string) => void;
}

export default function CancellationApprovalDialog({ 
  open, 
  onOpenChange, 
  courseRun,
  onApprove,
  onReject
}: CancellationApprovalDialogProps) {
  const { toast } = useToast();
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);

  const handleApprove = () => {
    if (courseRun?.id && onApprove) {
      onApprove(courseRun.id);
    }
    
    toast({
      title: "Cancellation Approved",
      description: "Cancellation emails have been sent to learners",
    });

    onOpenChange(false);
    setDecision(null);
  };

  const handleReject = () => {
    if (courseRun?.id && onReject) {
      onReject(courseRun.id);
    }
    
    toast({
      title: "Cancellation Rejected",
      description: `The course run ${courseRun?.serialNumber} will continue as scheduled`,
    });

    onOpenChange(false);
    setDecision(null);
  };

  if (!courseRun) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Review Cancellation Request
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
                Cancelled (Pending Approval)
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Reason for Cancellation</Label>
            <Textarea
              value={courseRun.cancellationReason || "No reason provided"}
              readOnly
              rows={3}
              className="bg-muted"
            />
          </div>

          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Approving this cancellation will automatically send notification emails to all enrolled learners.
            </p>
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
            Reject
          </Button>
          <Button 
            onClick={handleApprove}
            className="flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}