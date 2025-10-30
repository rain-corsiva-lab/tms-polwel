import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Award, Download, FileDown, Loader2, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface Learner {
  id: string;
  name: string;
  email: string;
  attendanceStatus: "PRESENT" | "ABSENT";
  certificateGeneratedAt?: string | null;
}

interface CourseRunInfo {
  id: string;
  serialNumber: string;
  course: {
    title: string;
    duration: string;
    durationType: string;
  };
  endDatetime: string;
}

interface CertificateGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseRun: CourseRunInfo | null;
  learners: Learner[];
  onSuccess?: () => void;
}

interface WaiverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  learner: Learner | null;
  courseRunId: string;
  onSuccess?: () => void;
}

function WaiverDialog({ open, onOpenChange, learner, courseRunId, onSuccess }: WaiverDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState("");
  const [document, setDocument] = useState<File | null>(null);

  const handleSubmit = async () => {
    if (!learner || !reason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a reason for absence.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      let documentData: { filename: string; mimetype: string; size: number; base64: string } | undefined;

      if (document) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(document);
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.onerror = reject;
        });

        documentData = {
          filename: document.name,
          mimetype: document.type,
          size: document.size,
          base64,
        };
      }

      const response = await fetch(`/api/course-runs/${courseRunId}/learners/${learner.id}/submit-waiver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason,
          supportingDocument: documentData,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to submit waiver form");
      }

      toast({
        title: "Waiver Submitted",
        description: `Waiver form for ${learner.name} has been submitted successfully.`,
      });

      setReason("");
      setDocument(null);
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error submitting waiver:", error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit waiver form",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Submit Waiver Form</DialogTitle>
          <DialogDescription>
            Submit a waiver form for <strong>{learner?.name}</strong> who was absent from the training.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason for Absence <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Please provide the reason for absence (e.g., medical emergency, family emergency, etc.)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="document">Supporting Document (Optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="document"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => setDocument(e.target.files?.[0] || null)}
                className="cursor-pointer"
              />
              {document && (
                <Button variant="ghost" size="icon" onClick={() => setDocument(null)} className="shrink-0">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Supported formats: PDF, DOC, DOCX, JPG, PNG (max 5MB)</p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Waiver"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CertificateGenerationDialog({ open, onOpenChange, courseRun, learners, onSuccess }: CertificateGenerationDialogProps) {
  const { toast } = useToast();
  const [selectedLearners, setSelectedLearners] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [waiverDialog, setWaiverDialog] = useState<{ open: boolean; learner: Learner | null }>({
    open: false,
    learner: null,
  });

  const presentLearners = learners.filter((l) => l.attendanceStatus === "PRESENT");
  const absentLearners = learners.filter((l) => l.attendanceStatus === "ABSENT");

  const eligibleLearners = presentLearners;
  const certificatesGenerated = eligibleLearners.filter((l) => l.certificateGeneratedAt).length;

  useEffect(() => {
    if (open) {
      setSelectedLearners(eligibleLearners.map((l) => l.id));
    }
  }, [open, learners]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLearners(eligibleLearners.map((l) => l.id));
    } else {
      setSelectedLearners([]);
    }
  };

  const handleSelectLearner = (learnerId: string, checked: boolean) => {
    if (checked) {
      setSelectedLearners((prev) => [...prev, learnerId]);
    } else {
      setSelectedLearners((prev) => prev.filter((id) => id !== learnerId));
    }
  };

  const handleDownloadSingle = async (learnerId: string) => {
    if (!courseRun) return;

    try {
      setDownloading(learnerId);

      const response = await fetch(`/api/course-runs/${courseRun.id}/certificates/${learnerId}`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to generate certificate");
      }

      const blob = await response.blob();
      const learner = learners.find((l) => l.id === learnerId);
      const filename = `Certificate_${learner?.name.replace(/\s+/g, "_")}_${courseRun.serialNumber}.pdf`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Certificate Downloaded",
        description: `Certificate for ${learner?.name} has been downloaded.`,
      });

      onSuccess?.();
    } catch (error: any) {
      console.error("Error downloading certificate:", error);
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download certificate",
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
    }
  };

  const handleExportZip = async () => {
    if (!courseRun || selectedLearners.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one learner to export certificates.",
        variant: "destructive",
      });
      return;
    }

    try {
      setGenerating(true);

      const response = await fetch(`/api/course-runs/${courseRun.id}/certificates/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learnerIds: selectedLearners }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate certificates");
      }

      const blob = await response.blob();
      const filename = `Certificates_${courseRun.serialNumber}_${new Date().getTime()}.zip`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Certificates Downloaded",
        description: `${selectedLearners.length} certificate(s) have been exported as ZIP.`,
      });

      onSuccess?.();
    } catch (error: any) {
      console.error("Error exporting certificates:", error);
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export certificates",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenWaiver = (learner: Learner) => {
    setWaiverDialog({ open: true, learner });
  };

  if (!courseRun) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Generate Certificates - {courseRun.serialNumber}
            </DialogTitle>
            <DialogDescription>
              <div className="space-y-1 mt-2">
                <div>
                  <strong>Course:</strong> {courseRun.course.title}
                </div>
                <div className="flex gap-4 text-sm">
                  <span>
                    <strong>Present:</strong> {presentLearners.length}
                  </span>
                  <span>
                    <strong>Absent:</strong> {absentLearners.length}
                  </span>
                  <span>
                    <strong>Certificates Generated:</strong> {certificatesGenerated}
                  </span>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Present Learners */}
            {eligibleLearners.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Checkbox id="select-all" checked={selectedLearners.length === eligibleLearners.length} onCheckedChange={handleSelectAll} />
                    <Label htmlFor="select-all" className="cursor-pointer font-medium">
                      Select All Eligible ({eligibleLearners.length})
                    </Label>
                  </div>
                  <Badge variant="secondary">{selectedLearners.length} selected</Badge>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Participant Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Attendance</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eligibleLearners.map((learner) => (
                        <TableRow key={learner.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedLearners.includes(learner.id)}
                              onCheckedChange={(checked) => handleSelectLearner(learner.id, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{learner.name}</TableCell>
                          <TableCell>{learner.email}</TableCell>
                          <TableCell>
                            <Badge variant="default" className="bg-green-600">
                              Present
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" onClick={() => handleDownloadSingle(learner.id)} disabled={downloading === learner.id}>
                              {downloading === learner.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Download className="h-4 w-4 mr-1" />
                                  PDF
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Absent Learners */}
            {absentLearners.length > 0 && (
              <div>
                <h4 className="font-medium mb-3 text-sm text-muted-foreground">Absent Learners</h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Participant Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Attendance</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {absentLearners.map((learner) => (
                        <TableRow key={learner.id} className="opacity-60">
                          <TableCell className="font-medium">{learner.name}</TableCell>
                          <TableCell>{learner.email}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">Absent</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => handleOpenWaiver(learner)}>
                              <FileText className="h-4 w-4 mr-1" />
                              Submit Waiver Form
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={handleExportZip} disabled={generating || selectedLearners.length === 0}>
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileDown className="mr-2 h-4 w-4" />
                  Export ZIP ({selectedLearners.length})
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <WaiverDialog
        open={waiverDialog.open}
        onOpenChange={(open) => setWaiverDialog({ open, learner: null })}
        learner={waiverDialog.learner}
        courseRunId={courseRun.id}
        onSuccess={onSuccess}
      />
    </>
  );
}
