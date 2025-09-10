import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CourseRun } from "@/types/courseRun";
import { Users, Calendar, MapPin, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SendCourseConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseRun: CourseRun | null;
  onConfirm: (courseRun: CourseRun) => void;
}

export const SendCourseConfirmationDialog = ({ 
  open, 
  onOpenChange, 
  courseRun, 
  onConfirm 
}: SendCourseConfirmationDialogProps) => {
  if (!courseRun) return null;

  const handleSendConfirmation = () => {
    onConfirm(courseRun);
    toast({
      title: "Course Confirmation Sent",
      description: `Confirmation emails have been sent to all ${courseRun.currentParticipants} enrolled learners.`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Send Course Confirmation
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-2">{courseRun.courseTitle}</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{courseRun.startDate} - {courseRun.endDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{courseRun.venue?.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{courseRun.currentParticipants} enrolled learners</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              This will send confirmation emails to all enrolled learners with course details, 
              schedule, venue information, and pre-course instructions.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSendConfirmation}>
            Send Confirmation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};