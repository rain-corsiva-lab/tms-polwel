import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileBarChart, Building2, Users, CheckCircle, Calendar, MapPin, Download, Loader2 } from "lucide-react";
import { Can } from "@/lib/casl/Can";
import { reportingApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function Reporting() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  const handleDownloadLearnerReport = async () => {
    setDownloading(true);
    try {
      await reportingApi.downloadLearnerReport();
      toast({ title: "Download started", description: "Your Learner Report is downloading." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Download failed";
      toast({ title: "Download failed", description: msg, variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const reports = [
    {
      id: "board-report",
      title: "Board Report",
      description: "Quarterly performance summary for board meetings",
      icon: FileBarChart,
      path: "/reporting/board-report",
      color: "from-blue-500 to-blue-600",
    },
    {
      id: "runs-by-organisation",
      title: "Runs by Organisation",
      description: "View all course runs grouped by client organisation",
      icon: Building2,
      path: "/reporting/runs-by-organisation",
      color: "from-purple-500 to-purple-600",
    },
    {
      id: "runs-by-trainer",
      title: "Runs by Trainer",
      description: "View all course runs grouped by trainer",
      icon: Users,
      path: "/reporting/runs-by-trainer",
      color: "from-green-500 to-green-600",
    },
    {
      id: "runs-by-status",
      title: "Runs by Status",
      description: "View course runs filtered by current status",
      icon: CheckCircle,
      path: "/reporting/runs-by-status",
      color: "from-yellow-500 to-yellow-600",
    },
    {
      id: "runs-by-period",
      title: "Runs by Period",
      description: "View course runs filtered by month and year",
      icon: Calendar,
      path: "/reporting/runs-by-period",
      color: "from-red-500 to-red-600",
    },
    {
      id: "runs-by-venue",
      title: "Runs by Venue",
      description: "View course runs grouped by venue with utilization stats",
      icon: MapPin,
      path: "/reporting/runs-by-venue",
      color: "from-indigo-500 to-indigo-600",
    },
  ];

  return (
    <Can I="view" a="Reporting">
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reporting Dashboard</h1>
          <p className="text-muted-foreground mt-2">Access comprehensive reports and analytics for course runs, trainers, and organisations</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => {
            const Icon = report.icon;
            return (
              <Card
                key={report.id}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                onClick={() => navigate(report.path)}
              >
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${report.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl">{report.title}</CardTitle>
                  <CardDescription className="text-sm">{report.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        {/* Learner Report Download */}
        <Card className="border-2 border-dashed border-muted-foreground/20 bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Learner Report
            </CardTitle>
            <CardDescription>
              Download a comprehensive Excel report of all learner enrollments across every course run — including course dates, trainer names, organisations,
              BU numbers, designations, payment methods, run types and billing months.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleDownloadLearnerReport} disabled={downloading} className="gap-2">
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {downloading ? "Generating…" : "Download Learner Report (.xlsx)"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Can>
  );
}
