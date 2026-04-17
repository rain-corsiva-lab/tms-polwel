import React, { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Mail, Send, X, Upload } from "lucide-react";
import { toast } from "sonner";
import { courseRunsApi, API_BASE_URL } from "../lib/api";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import "../styles/quill-custom.css";

interface SendCourseConfirmationEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseRunId: string;
  learners: Array<{
    id: string;
    name: string;
    email: string;
    organizationName: string;
    trainingCoordinatorId?: string | null;
    trainingCoordinatorName?: string | null;
    trainingCoordinatorEmail?: string | null;
    paymentMode?: string | null;
  }>;
  /** Optional; preview is loaded from the API. Callers may omit. */
  courseRunDetails?: {
    serialNumber: string;
    courseName: string;
    startDate: string;
    endDate: string;
    venue: string;
  };
  onSuccess: () => void;
}

/** Groups learners by Training Coordinator and renders a structured recipients summary. */
const RecipientsGrouped: React.FC<{
  learners: SendCourseConfirmationEmailDialogProps["learners"];
}> = ({ learners }) => {
  const groups = useMemo(() => {
    const map = new Map<
      string,
      { tcName: string | null; tcEmail: string | null; learners: typeof learners }
    >();
    for (const l of learners) {
      const isSelfPay = l.paymentMode === "SELF_SPONSORED";
      const key = !isSelfPay && l.trainingCoordinatorId ? l.trainingCoordinatorId : "NO_TC";
      if (!map.has(key)) {
        map.set(key, {
          tcName: key !== "NO_TC" ? l.trainingCoordinatorName ?? null : null,
          tcEmail: key !== "NO_TC" ? l.trainingCoordinatorEmail ?? null : null,
          learners: [],
        });
      }
      map.get(key)!.learners.push(l);
    }
    return map;
  }, [learners]);

  const emailCount = groups.size;

  return (
    <>
      <div className="font-semibold text-sm mb-2">
        Recipients ({learners.length} learner{learners.length !== 1 ? "s" : ""} ·{" "}
        <span className="text-blue-600">
          {emailCount} email{emailCount !== 1 ? "s" : ""} to be sent
        </span>)
      </div>
      <div className="space-y-2 max-h-44 overflow-y-auto text-xs">
        {Array.from(groups.entries()).map(([key, group]) => (
          <div key={key} className="border rounded p-2 bg-white">
            <div className="font-semibold text-gray-700 mb-1">
              {key !== "NO_TC"
                ? `TC: ${group.tcName || "Unknown TC"}${group.tcEmail ? ` (${group.tcEmail})` : ""}`
                : "No Training Coordinator"}
            </div>
            <div className="text-gray-600 break-all">
              <span className="font-medium">To: </span>
              {group.learners.map((l) => l.email || "No email").join(", ")}
            </div>
            {group.tcEmail && key !== "NO_TC" && (
              <div className="text-gray-500 mt-0.5">
                <span className="font-medium">CC: </span>
                {group.tcEmail}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
};

export const SendCourseConfirmationEmailDialog: React.FC<SendCourseConfirmationEmailDialogProps> = ({
  open,
  onOpenChange,
  courseRunId,
  learners,
  onSuccess,
}) => {
  const [ccEmails, setCcEmails] = useState("");
  const [additionalBody, setAdditionalBody] = useState("");
  const [debouncedAdditionalBody, setDebouncedAdditionalBody] = useState("");
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewSubject, setPreviewSubject] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setDebouncedAdditionalBody(additionalBody);
    }
    prevOpenRef.current = open;
  }, [open, additionalBody]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedAdditionalBody(additionalBody), 400);
    return () => window.clearTimeout(t);
  }, [additionalBody]);

  useEffect(() => {
    if (!open) {
      setPreviewHtml(null);
      setPreviewSubject(null);
      setPreviewError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !courseRunId) {
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(null);
    const body = debouncedAdditionalBody.trim() ? debouncedAdditionalBody.trim() : undefined;
    courseRunsApi
      .previewCourseConfirmationEmail(courseRunId, { additionalBody: body })
      .then((res: any) => {
        if (cancelled) return;
        if (res?.success && typeof res.html === "string") {
          setPreviewHtml(res.html);
          setPreviewSubject(typeof res.subject === "string" ? res.subject : null);
        } else {
          setPreviewError(res?.message || res?.error || "Could not load preview");
          setPreviewHtml(null);
          setPreviewSubject(null);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Could not load preview";
        setPreviewError(message);
        setPreviewHtml(null);
        setPreviewSubject(null);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, courseRunId, debouncedAdditionalBody]);

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Validate file sizes (25MB each)
    const invalidFiles = files.filter((file) => file.size > 25 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      toast.error(`${invalidFiles.length} file(s) exceed 25MB limit`);
      return;
    }

    // Check for valid file types (allow all common formats including zips)
    const allowedTypes = [
      "application/pdf",
      "application/zip",
      "application/x-zip-compressed",
      "application/x-compressed",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "image/jpeg",
      "image/png",
      "image/gif",
      "text/plain",
    ];

    const allowedByExtension = (name: string) => {
      const n = name.toLowerCase();
      return n.endsWith(".zip") || n.endsWith(".ppt") || n.endsWith(".pptx");
    };

    const invalidTypes = files.filter((file) => {
      return !allowedByExtension(file.name) && !allowedTypes.includes(file.type);
    });

    if (invalidTypes.length > 0) {
      toast.error(`${invalidTypes.length} file(s) have unsupported file types`);
      console.warn(
        "Unsupported files:",
        invalidTypes.map((f) => ({ name: f.name, type: f.type })),
      );
    }

    // Add only valid files
    const validFiles = files.filter((file) => {
      return allowedByExtension(file.name) || allowedTypes.includes(file.type);
    });

    if (validFiles.length > 0) {
      setAttachmentFiles((prev) => [...prev, ...validFiles]);
    }

    // Reset input
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    try {
      setSending(true);

      const ccList = ccEmails
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean);

      // Upload all attachments first
      const uploadedAttachmentIds: string[] = [];

      for (const file of attachmentFiles) {
        const formData = new FormData();
        formData.append("file", file);

        try {
          const token = localStorage.getItem("polwel_access_token");
          const uploadResponse = await fetch(`${API_BASE_URL}/uploads/email-attachments`, {
            method: "POST",
            body: formData,
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!uploadResponse.ok) {
            throw new Error(`Failed to upload ${file.name}`);
          }

          const uploadData = await uploadResponse.json();
          const fileId = uploadData.fileId || uploadData.id;

          if (!fileId) {
            throw new Error(`No file ID returned for ${file.name}`);
          }

          uploadedAttachmentIds.push(fileId);
        } catch (uploadErr) {
          const message = uploadErr instanceof Error ? uploadErr.message : `Failed to upload ${file.name}`;
          console.error("Attachment upload error:", uploadErr);
          toast.error(message);
          setSending(false);
          return;
        }
      }

      // Extract learnerIds from the learners prop (these are already filtered by parent)
      const learnerIds = learners.map((l) => l.id);

      const response = await courseRunsApi.sendCourseConfirmationEmail(courseRunId, {
        learnerIds: learnerIds,
        ...(ccList.length ? { ccEmails: ccList } : {}),
        additionalBody: additionalBody.trim() ? additionalBody.trim() : undefined,
        ...(uploadedAttachmentIds.length ? { attachmentIds: uploadedAttachmentIds } : {}),
      });

      if (!response?.success) {
        throw new Error(response?.message || "Failed to send course confirmation emails");
      }

      toast.success(response?.message || "Course confirmation emails sent successfully!");
      onSuccess();
      onOpenChange(false);

      // Reset form
      setCcEmails("");
      setAdditionalBody("");
      setAttachmentFiles([]);
    } catch (error: any) {
      console.error("Error sending emails:", error);
      toast.error(error?.message || "Failed to send course confirmation emails");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Course Confirmation Email
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Live HTML preview — same template as sent email (server-rendered) */}
          <div className="border rounded-lg overflow-hidden bg-slate-100">
            <div className="px-3 py-2 border-b bg-white flex items-center justify-between gap-2">
              <h3 className="font-semibold text-sm">Email preview</h3>
              {previewLoading && <span className="text-xs text-muted-foreground">Updating…</span>}
            </div>
            {previewSubject && (
              <div className="px-3 py-2 bg-white border-b text-xs">
                <span className="text-muted-foreground">Subject: </span>
                <span className="font-medium text-foreground break-all">{previewSubject}</span>
              </div>
            )}
            {previewError && (
              <div className="p-3 text-sm text-destructive bg-white">{previewError}</div>
            )}
            <div className="relative bg-[#0f172a] min-h-[320px] max-h-[55vh] overflow-auto">
              {previewLoading && !previewHtml && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400 z-10 bg-[#0f172a]/80">
                  Loading preview…
                </div>
              )}
              {previewHtml && (
                <iframe
                  title="Course confirmation email preview"
                  srcDoc={previewHtml}
                  sandbox="allow-same-origin"
                  className="w-full min-h-[480px] border-0 block bg-white"
                  style={{ minHeight: "min(55vh, 640px)" }}
                />
              )}
            </div>
            <div className="p-3 bg-gray-50 border-t">
              <RecipientsGrouped learners={learners} />
              <p className="text-xs text-muted-foreground mt-2">
                Attachments are not shown in this preview; they will be included when you send.
              </p>
            </div>
          </div>

          {/* CC Emails */}
          <div className="space-y-2">
            <Label htmlFor="ccEmails">CC (Optional)</Label>
            <Input
              id="ccEmails"
              type="text"
              placeholder="email1@example.com, email2@example.com"
              value={ccEmails}
              onChange={(e) => setCcEmails(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Separate multiple emails with commas</p>
          </div>

          {/* Additional Body - Rich Text */}
          <div className="space-y-2">
            <Label htmlFor="additionalBody">Additional Message (Optional)</Label>
            <div className="border rounded-md overflow-hidden" style={{ minHeight: "200px" }}>
              <ReactQuill
                theme="snow"
                value={additionalBody}
                onChange={setAdditionalBody}
                placeholder="Add any additional notes or instructions for the participants..."
                modules={{
                  toolbar: [
                    [{ header: [1, 2, 3, false] }],
                    ["bold", "italic", "underline", "strike"],
                    [{ list: "ordered" }, { list: "bullet" }],
                    ["link", "image"],
                    ["clean"],
                  ],
                }}
                style={{ height: "150px" }}
              />
            </div>
            <p className="text-xs text-muted-foreground">Rich text supported; you can insert images and format text.</p>
          </div>

          {/* Attachments - Multiple Files */}
          <div className="space-y-2">
            <Label htmlFor="attachments">Attachments (Optional)</Label>
            <div className="border-2 border-dashed rounded-lg p-4">
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-gray-400" />
                <p className="text-sm text-gray-600">Click to upload files (max 25MB each)</p>
                <input type="file" id="attachments" multiple onChange={handleFilesSelect} className="hidden" />
                <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("attachments")?.click()} disabled={sending}>
                  <Upload className="h-4 w-4 mr-2" />
                  Select Files
                </Button>
              </div>

              {attachmentFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">{attachmentFiles.length} file(s) selected:</p>
                  {attachmentFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-sm truncate">{file.name}</span>
                        <span className="text-xs text-gray-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(index)} disabled={sending}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Emails
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SendCourseConfirmationEmailDialog;
