import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Paperclip } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { CourseRun } from "@/types/courseRun";

interface SendCourseCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseRun: CourseRun | null;
}

const SendCourseCompletionDialog = ({ 
  open, 
  onOpenChange, 
  courseRun 
}: SendCourseCompletionDialogProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    cc: "",
    additionalBody: "",
    attachments: null as FileList | null
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!courseRun) return;

    toast({
      title: "Course Completion Email Sent",
      description: `Completion email sent for ${courseRun.serialNumber} - ${courseRun.courseTitle}`,
    });

    // Reset form
    setFormData({
      cc: "",
      additionalBody: "",
      attachments: null
    });
    
    onOpenChange(false);
  };

  if (!courseRun) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Send Course Completion Email
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="courseInfo" className="text-sm font-medium">
              Course Information
            </Label>
            <div className="p-3 bg-muted rounded-md">
              <p className="font-medium text-sm">{courseRun.courseTitle}</p>
              <p className="text-xs text-muted-foreground">
                {courseRun.serialNumber} • {courseRun.courseCode}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cc" className="text-sm font-medium">
              CC
            </Label>
            <Input
              id="cc"
              type="email"
              value={formData.cc}
              onChange={(e) => setFormData(prev => ({ ...prev, cc: e.target.value }))}
              placeholder="Enter CC recipients (optional)"
            />
            <p className="text-xs text-muted-foreground">
              CC recipients will receive additional content and attachments
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="additionalBody" className="text-sm font-medium">
              Additional Body Content (CC only)
            </Label>
            <Textarea
              id="additionalBody"
              value={formData.additionalBody}
              onChange={(e) => setFormData(prev => ({ ...prev, additionalBody: e.target.value }))}
              placeholder="Enter any additional message content for CC recipients only..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Learners will only receive the standard templated email content
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="attachments" className="text-sm font-medium">
              Additional Attachments (CC only)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="attachments"
                type="file"
                multiple
                onChange={(e) => setFormData(prev => ({ ...prev, attachments: e.target.files }))}
                className="flex-1"
              />
              <Paperclip className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              Attachments will only be sent to CC recipients, not to learners
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              <Mail className="w-4 h-4 mr-2" />
              Send Course Completion Email
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SendCourseCompletionDialog;