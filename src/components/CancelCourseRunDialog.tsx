import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Paperclip } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { CourseRun } from "@/types/courseRun";

interface CancelCourseRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseRun: CourseRun | null;
}

export default function CancelCourseRunDialog({ 
  open, 
  onOpenChange, 
  courseRun 
}: CancelCourseRunDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    reason: '',
    attachments: null as FileList | null
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.reason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for cancellation",
        variant: "destructive",
      });
      return;
    }

    // Here you would typically send the cancellation request to your API
    toast({
      title: "Cancellation Request Submitted",
      description: `Cancellation request for ${courseRun?.serialNumber} has been sent to management for approval.`,
    });

    // Reset form and close dialog
    setFormData({ reason: '', attachments: null });
    onOpenChange(false);
  };

  const handleCancel = () => {
    setFormData({ reason: '', attachments: null });
    onOpenChange(false);
  };

  if (!courseRun) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Course Run</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Course: <span className="font-medium">{courseRun.courseTitle}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Serial Number: <span className="font-medium">{courseRun.serialNumber}</span>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Cancellation *</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="attachments">Attachments (if any)</Label>
            <div className="relative">
              <Input
                id="attachments"
                type="file"
                multiple
                onChange={(e) => setFormData(prev => ({ ...prev, attachments: e.target.files }))}
                className="pr-10"
              />
              <Paperclip className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive">
              Submit Cancellation Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}