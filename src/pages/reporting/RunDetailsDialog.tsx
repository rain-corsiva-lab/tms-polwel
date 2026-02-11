import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import api, { reportingApi } from "@/lib/api";
import { format } from "date-fns";
import { Calendar, MapPin, Users, DollarSign, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface RunDetails {
  id: string;
  courseRunCode?: string;
  serialNumber?: string;
  startDate: string;
  endDate: string;
  status: string;
  course?: {
    id?: string;
    code?: string;
    name?: string;
  };
  courseCode?: string;
  venue?: {
    id?: string;
    name?: string;
    location?: string | null;
  } | null;
  clientOrganization?: {
    id?: string;
    organizationName?: string;
  } | null;
  organization?: string;
  trainers?: Array<{
    id?: string;
    name?: string;
    email?: string;
    trainer?: {
      id?: string;
      name?: string;
    };
  }>;
  learners?: Array<{
    id?: string;
    name?: string;
    email?: string;
    attendanceRate?: string;
    learner?: {
      id?: string;
      name?: string;
      email?: string;
    };
    attendance?: Array<{
      id?: string;
      day?: number;
      status?: string;
    }>;
  }>;
  billing?: {
    id?: string;
    totalAmount?: number;
    paidAmount?: number;
    balanceAmount?: number;
    paymentStatus?: string;
    totalInvoices?: number;
  } | null;
}

interface RunDetailsDialogProps {
  runId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RunDetailsDialog({ runId, open, onOpenChange }: RunDetailsDialogProps) {
  const [details, setDetails] = useState<RunDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && runId) {
      fetchRunDetails();
    }
  }, [open, runId]);

  const fetchRunDetails = async () => {
    if (!runId) return;

    setLoading(true);
    try {
      const response = await reportingApi.getRunDetails(runId);
      setDetails(response.data);
    } catch (error: any) {
      console.error("Failed to fetch run details:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load run details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (!status) return <Badge className="bg-gray-500">N/A</Badge>;
    const statusColors: Record<string, string> = {
      DRAFT: "bg-gray-500",
      TENTATIVE: "bg-yellow-500",
      CONFIRMED: "bg-blue-500",
      IN_PROGRESS: "bg-purple-500",
      COMPLETED: "bg-green-500",
      CANCELLED: "bg-red-500",
    };
    return <Badge className={statusColors[status] || "bg-gray-500"}>{status.replace("_", " ")}</Badge>;
  };

  const calculateAttendanceRate = () => {
    if (!details || !details.learners || details.learners.length === 0) return 0;

    const totalSessions = details.learners.reduce((sum, learner) => sum + (learner?.attendance?.length || 0), 0);
    const presentSessions = details.learners.reduce((sum, learner) => sum + (learner?.attendance?.filter((a) => a?.status === "PRESENT").length || 0), 0);

    return totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Course Run Details</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : details ? (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Run Code</p>
                <p className="font-semibold">{details.courseRunCode || details.serialNumber || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                {getStatusBadge(details.status)}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Course</p>
                <p className="font-semibold">{details.course?.name || "N/A"}</p>
                <p className="text-xs text-muted-foreground">{details.course?.code || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Organisation</p>
                <p className="font-semibold">{details.clientOrganization?.organizationName || "N/A"}</p>
              </div>
            </div>

            <Separator />

            {/* Schedule & Venue */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Schedule & Venue
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p>{format(new Date(details.startDate), "dd MMM yyyy")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p>{format(new Date(details.endDate), "dd MMM yyyy")}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Venue
                  </p>
                  <p className="font-semibold">{details.venue?.name || "N/A"}</p>
                  {details.venue?.location && <p className="text-xs text-muted-foreground">{details.venue.location}</p>}
                </div>
              </div>
            </div>

            <Separator />

            {/* Trainers */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Trainers ({details.trainers?.length || 0})
              </h3>
              {details.trainers && details.trainers.length > 0 ? (
                <ul className="list-disc list-inside space-y-1">
                  {details.trainers.map((t, index) => (
                    <li key={t?.trainer?.id || index}>{t?.trainer?.name || t?.name || "Unknown Trainer"}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No trainers assigned</p>
              )}
            </div>

            <Separator />

            {/* Participants & Attendance */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Participants & Attendance
              </h3>
              <div className="mb-3">
                <p className="text-sm">
                  Total Participants: <span className="font-semibold">{details.learners?.length || 0}</span>
                </p>
                <p className="text-sm">
                  Attendance Rate: <span className="font-semibold">{calculateAttendanceRate()}%</span>
                </p>
              </div>
              {details.learners && details.learners.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Sessions</TableHead>
                      <TableHead className="text-right">Attended</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {details.learners.map((learner, index) => {
                      const attended = learner?.attendance?.filter((a) => a?.status === "PRESENT").length || 0;
                      const total = learner?.attendance?.length || 0;
                      return (
                        <TableRow key={learner?.learner?.id || learner?.id || index}>
                          <TableCell className="font-medium">{learner?.learner?.name || learner?.name || "Unknown"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{learner?.learner?.email || learner?.email || "N/A"}</TableCell>
                          <TableCell className="text-right">{total}</TableCell>
                          <TableCell className="text-right">
                            {attended}/{total}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No participants enrolled</p>
              )}
            </div>

            <Separator />

            {/* Billing */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Billing Information
              </h3>
              {details.billing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="font-semibold text-lg">${details.billing.totalAmount != null ? details.billing.totalAmount.toFixed(2) : "0.00"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Status</p>
                    <Badge
                      className={
                        details.billing.paymentStatus === "PAID"
                          ? "bg-green-500"
                          : details.billing.paymentStatus === "PARTIALLY_PAID"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }
                    >
                      {details.billing.paymentStatus ? details.billing.paymentStatus.replace("_", " ") : "N/A"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Paid Amount</p>
                    <p className="font-semibold">${details.billing.paidAmount != null ? details.billing.paidAmount.toFixed(2) : "0.00"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Balance</p>
                    <p className="font-semibold">${details.billing.balanceAmount != null ? details.billing.balanceAmount.toFixed(2) : "0.00"}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No billing information available</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">No details available</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
