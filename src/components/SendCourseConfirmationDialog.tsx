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

interface SendCourseConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseRun: CourseRun | null;
}

const SendCourseConfirmationDialog = ({ 
  open, 
  onOpenChange, 
  courseRun 
}: SendCourseConfirmationDialogProps) => {
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
      title: "Course Confirmation Email Sent",
      description: `Confirmation email sent for ${courseRun.serialNumber} - ${courseRun.courseTitle}`,
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
            Send Course Confirmation Email
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
              placeholder="by default sent to all learners"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="additionalBody" className="text-sm font-medium">
              Additional Body Content
            </Label>
            <Textarea
              id="additionalBody"
              value={formData.additionalBody}
              onChange={(e) => setFormData(prev => ({ ...prev, additionalBody: e.target.value }))}
              placeholder="Enter any additional message content..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="attachments" className="text-sm font-medium">
              Additional Attachments
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
              Send Course Confirmation Email
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SendCourseConfirmationDialog;