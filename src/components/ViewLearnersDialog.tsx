import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, MapPin, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { clientOrganizationsApi, courseRunsApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/errorHandler";
import { formatDate } from "@/lib/date";

interface ViewLearnersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseRunId: string;
  courseRunData?: any;
}

interface LearnerRecord {
  id: string;
  learner: {
    id: string;
    fullname: string;
    email: string;
    designation: string;
    contactNumber: string;
  };
  enrollmentStatus: string;
  enrollmentDate?: string;
  completionStatus?: string;
}

const ViewLearnersDialog = ({ open, onOpenChange, courseRunId, courseRunData }: ViewLearnersDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [courseRun, setCourseRun] = useState<any>(courseRunData || null);
  const [learners, setLearners] = useState<LearnerRecord[]>([]);

  useEffect(() => {
    if (open && courseRunId) {
      // Reset courseRun when dialog opens with new courseRunId
      setCourseRun(null);
      setLearners([]);
      fetchData();
    }
  }, [open, courseRunId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch full course run details with all relations
      const courseRunResponse = await courseRunsApi.getById(courseRunId);

      // Handle different response structures
      let fetchedCourseRun = null;
      if (courseRunResponse && typeof courseRunResponse === "object") {
        // Try different possible response structures
        fetchedCourseRun = courseRunResponse.data || courseRunResponse.courseRun || courseRunResponse;
      }

      console.log("Course Run Data fetched:", fetchedCourseRun);
      console.log("Course title:", fetchedCourseRun?.course?.title);
      console.log("Venue:", fetchedCourseRun?.venue?.name);
      console.log("Trainers:", fetchedCourseRun?.courseRunTrainers);

      if (fetchedCourseRun) {
        setCourseRun(fetchedCourseRun);
      }

      // Fetch learners for this course run (scoped to current training coordinator)
      // Pass coordinatorId to filter learners assigned to this coordinator
      const response = await clientOrganizationsApi.getCourseRunLearners(courseRunId, user?.id);
      console.log("Learners fetched:", response);

      // Handle different learner response structures
      let learnersList = [];
      if (Array.isArray(response)) {
        learnersList = response;
      } else if (response?.learners && Array.isArray(response.learners)) {
        learnersList = response.learners;
      } else if (response?.data && Array.isArray(response.data)) {
        learnersList = response.data;
      }

      console.log("Processed learners:", learnersList);
      setLearners(learnersList);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast({
        title: "Error loading data",
        description: getErrorMessage(error, "Failed to load course run details or learners"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const enrolledLearners = learners.filter((l) => l.enrollmentStatus === "ENROLLED");
  const withdrawnLearners = learners.filter((l) => l.enrollmentStatus === "WITHDRAWN");

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || "";
    if (statusLower === "enrolled") {
      return <Badge className="bg-green-100 text-green-800">Enrolled</Badge>;
    }
    if (statusLower === "withdrawn") {
      return <Badge className="bg-red-100 text-red-800">Withdrawn</Badge>;
    }
    if (statusLower === "completed") {
      return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Course Run Learners</DialogTitle>
          <DialogDescription>Overview and participant list for this course run</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading learners...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Course Overview Card */}
            <Card className="border-l-4 border-l-[#F7941D]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {courseRun?.course?.title || courseRun?.courseName || courseRun?.title || "Strategic Thinking Masterclass"}
                </CardTitle>
                {courseRun?.course?.courseCode && (
                  <CardDescription className="text-sm text-muted-foreground">Course Code: {courseRun.course.courseCode}</CardDescription>
                )}
                {courseRun?.serialNumber && <CardDescription className="text-sm text-muted-foreground">Serial: {courseRun.serialNumber}</CardDescription>}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Duration */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-orange-50 rounded-lg">
                      <Calendar className="h-4 w-4 text-[#F7941D]" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Duration</p>
                      <p className="text-sm font-semibold">
                        {courseRun?.startDatetime ? formatDate(courseRun.startDatetime) : "N/A"}
                        {courseRun?.endDatetime && courseRun?.startDatetime && " - "}
                        {courseRun?.endDatetime ? formatDate(courseRun.endDatetime) : ""}
                      </p>
                    </div>
                  </div>

                  {/* Venue */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-orange-50 rounded-lg">
                      <MapPin className="h-4 w-4 text-[#F7941D]" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Venue</p>
                      <p className="text-sm font-semibold">{courseRun?.venue?.name || courseRun?.specifiedLocation || "POLWEL Learning Pod"}</p>
                      {courseRun?.venue?.address && <p className="text-xs text-muted-foreground mt-1">{courseRun.venue.address}</p>}
                    </div>
                  </div>

                  {/* Trainers */}
                  {courseRun?.courseRunTrainers && courseRun.courseRunTrainers.length > 0 && (
                    <div className="flex items-start gap-3 md:col-span-2">
                      <div className="p-2 bg-orange-50 rounded-lg">
                        <User className="h-4 w-4 text-[#F7941D]" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Trainer(s)</p>
                        <div className="space-y-1">
                          {courseRun.courseRunTrainers.map((ct: any, idx: number) => (
                            <div key={idx}>
                              <p className="text-sm font-semibold">{ct.trainer?.name || "Unknown Trainer"}</p>
                              {ct.trainer?.email && <p className="text-xs text-muted-foreground">{ct.trainer.email}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Status Badge */}
                  {courseRun?.status && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-orange-50 rounded-lg">
                        <span className="text-sm">📊</span>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Status</p>
                        <p className="text-sm font-semibold capitalize">{courseRun.status.replace(/_/g, " ")}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Enrolled Learners */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Enrolled Learners ({enrolledLearners.length})</h3>
                <Badge className="bg-green-100 text-green-800">{enrolledLearners.length}</Badge>
              </div>

              {enrolledLearners.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">No enrolled learners</CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="font-semibold">Name</TableHead>
                            <TableHead className="font-semibold">Email</TableHead>
                            <TableHead className="font-semibold">Designation</TableHead>
                            <TableHead className="font-semibold">Contact</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {enrolledLearners.map((record, idx) => (
                            <TableRow key={record.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                              <TableCell className="font-medium">{record.learner.fullname}</TableCell>
                              <TableCell className="text-sm">{record.learner.email}</TableCell>
                              <TableCell className="text-sm">{record.learner.designation || "—"}</TableCell>
                              <TableCell className="text-sm">{record.learner.contactNumber || "—"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Withdrawn Learners */}
            {withdrawnLearners.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Withdrawn Learners ({withdrawnLearners.length})</h3>
                  <Badge className="bg-red-100 text-red-800">{withdrawnLearners.length}</Badge>
                </div>

                <Card className="border-l-4 border-l-red-400">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-red-50">
                            <TableHead className="font-semibold">Name</TableHead>
                            <TableHead className="font-semibold">Email</TableHead>
                            <TableHead className="font-semibold">Designation</TableHead>
                            <TableHead className="font-semibold">Contact</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {withdrawnLearners.map((record, idx) => (
                            <TableRow key={record.id} className={idx % 2 === 0 ? "bg-white" : "bg-red-50/30"}>
                              <TableCell className="font-medium">{record.learner.fullname}</TableCell>
                              <TableCell className="text-sm">{record.learner.email}</TableCell>
                              <TableCell className="text-sm">{record.learner.designation || "—"}</TableCell>
                              <TableCell className="text-sm">{record.learner.contactNumber || "—"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ViewLearnersDialog;
