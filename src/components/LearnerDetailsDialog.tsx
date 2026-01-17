import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Calendar, Mail, User, Briefcase } from "lucide-react";

interface Learner {
  id: string;
  name: string;
  email: string;
  designation?: string;
  status?: string;
  enrolledCourses?: number;
  completedCourses?: number;
  organizationId?: string;
  createdAt: string;
  updatedAt?: string;
}

interface LearnerDetailsDialogProps {
  learner: Learner;
  trigger?: React.ReactNode;
}

export function LearnerDetailsDialog({ learner, trigger }: LearnerDetailsDialogProps) {
  const [open, setOpen] = useState(false);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    try {
      const d = new Date(dateString);
      if (Number.isNaN(d.getTime())) return "Invalid date";
      return format(d, "dd/MM/yyyy HH:mm");
    } catch (e) {
      return "Invalid date";
    }
  };

  const getStatusBadge = (status?: string) => {
    const statusLower = (status || "active").toLowerCase();
    const variant = statusLower === "active" ? "default" : "secondary";
    return (
      <Badge variant={variant} className={statusLower === "active" ? "bg-green-500" : ""}>
        {statusLower.charAt(0).toUpperCase() + statusLower.slice(1)}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Participant Details - {learner.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-4 w-4" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                  <p className="text-sm">{learner.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                  <p className="text-sm flex items-center gap-2">
                    <Mail className="h-3 w-3" />
                    {learner.email || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Designation</label>
                  <p className="text-sm flex items-center gap-2">
                    <Briefcase className="h-3 w-3" />
                    {learner.designation || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">{getStatusBadge(learner.status)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Course Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Course Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Enrolled Courses</label>
                  <p className="text-sm">{learner.enrolledCourses || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Completed Courses</label>
                  <p className="text-sm">{learner.completedCourses || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Account History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created At</label>
                  <p className="text-sm">{formatDate(learner.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                  <p className="text-sm">{formatDate(learner.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

