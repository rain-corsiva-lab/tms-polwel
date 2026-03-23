import React, { useState, useEffect, useRef } from "react";
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

interface SendTrainerEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseRunId: string;
  trainers: Array<{
    id: string;
    name: string;
    email: string;
    baseFee: number;
  }>;
  partners?: Array<{
    id: string;
    name: string;
    email: string;
    pointOfContactEmail?: string;
    partnerTrainers?: Array<{
      id: string;
      trainerName: string;
      trainerEmail?: string;
    }>;
  }>;
  /** Optional; live preview is loaded from the API. */
  courseRunDetails?: {
    serialNumber: string;
    courseName: string;
    startDate: string;
    endDate: string;
    venue: string;
  };
  onSuccess: () => void;
}

export const SendTrainerEmailDialog: React.FC<SendTrainerEmailDialogProps> = ({
  open,
  onOpenChange,
  courseRunId,
  trainers,
  partners,
  onSuccess,
}) => {
  const [ccEmails, setCcEmails] = useState("");
  const [additionalBody, setAdditionalBody] = useState("");
  const [debouncedAdditionalBody, setDebouncedAdditionalBody] = useState("");
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewSubject, setPreviewSubject] = useState<string | null>(null);
  const [previewLabel, setPreviewLabel] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewRecipientType, setPreviewRecipientType] = useState<"trainer" | "partner">("trainer");
  const [previewTrainerId, setPreviewTrainerId] = useState<string | null>(null);
  const prevOpenRef = useRef(false);

  const hasPartners = !!(partners && partners.length > 0);
  const showTrainerPartnerToggle = hasPartners && trainers.length > 0;
  const trainerRosterKey = `${trainers.length}:${trainers.map((t) => t.id).join(",")}`;

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
      setPreviewLabel(null);
      setPreviewError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (trainers.length > 0) {
      setPreviewRecipientType("trainer");
      setPreviewTrainerId((prev) =>
        prev && trainers.some((t) => t.id === prev) ? prev : (trainers[0]?.id ?? null),
      );
    } else if (hasPartners) {
      setPreviewRecipientType("partner");
      setPreviewTrainerId(null);
    }
  }, [open, hasPartners, trainerRosterKey]);

  useEffect(() => {
    if (!open || !courseRunId) return;
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(null);
    const body = debouncedAdditionalBody.trim() ? debouncedAdditionalBody.trim() : undefined;
    const payload: {
      additionalBody?: string;
      recipientType?: "trainer" | "partner";
      trainerId?: string;
    } = {
      additionalBody: body,
      recipientType: previewRecipientType,
    };
    if (previewRecipientType === "trainer" && previewTrainerId) {
      payload.trainerId = previewTrainerId;
    }
    courseRunsApi
      .previewTrainerAssignmentEmail(courseRunId, payload)
      .then((res: any) => {
        if (cancelled) return;
        if (res?.success && typeof res.html === "string") {
          setPreviewHtml(res.html);
          setPreviewSubject(typeof res.subject === "string" ? res.subject : null);
          setPreviewLabel(typeof res.previewLabel === "string" ? res.previewLabel : null);
        } else {
          setPreviewError(res?.message || res?.error || "Could not load preview");
          setPreviewHtml(null);
          setPreviewSubject(null);
          setPreviewLabel(null);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPreviewError(err instanceof Error ? err.message : "Could not load preview");
        setPreviewHtml(null);
        setPreviewSubject(null);
        setPreviewLabel(null);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, courseRunId, debouncedAdditionalBody, previewRecipientType, previewTrainerId]);

  // Internally resolved partner trainers keyed by partnerId
  // This avoids relying on parent state timing and ensures fresh data on open
  const [resolvedPartnerTrainers, setResolvedPartnerTrainers] = useState<
    Record<string, Array<{ id: string; trainerName: string; trainerEmail?: string | null }>>
  >({});

  useEffect(() => {
    if (!open || !courseRunId) return;

    courseRunsApi
      .getById(courseRunId)
      .then((res: any) => {
        const crps: any[] = res?.courseRun?.courseRunPartners || [];
        const map: Record<string, Array<{ id: string; trainerName: string; trainerEmail?: string | null }>> = {};

        for (const crp of crps) {
          const partnerId: string = crp.partner?.id;
          if (!partnerId) continue;

          const allTrainers: Array<{ id: string; trainerName: string; trainerEmail?: string | null }> = crp.partner?.partnerTrainers || [];

          // selectedTrainerIds is a Json field — comes as array or null
          const selectedIds: string[] = Array.isArray(crp.selectedTrainerIds) ? crp.selectedTrainerIds : [];

          map[partnerId] = selectedIds.length > 0 ? allTrainers.filter((pt) => selectedIds.includes(pt.id)) : allTrainers;
        }

        setResolvedPartnerTrainers(map);
      })
      .catch(() => {
        // silently ignore — fall back to prop data
      });
  }, [open, courseRunId]);

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
      "image/jpeg",
      "image/png",
      "image/gif",
      "text/plain",
    ];

    const invalidTypes = files.filter((file) => {
      // Allow zip files by extension check as well
      const isZip = file.name.toLowerCase().endsWith(".zip");
      return !isZip && !allowedTypes.includes(file.type);
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
      const isZip = file.name.toLowerCase().endsWith(".zip");
      return isZip || allowedTypes.includes(file.type);
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

      const response = await courseRunsApi.sendTrainerAssignmentEmail(courseRunId, {
        ...(ccList.length ? { ccEmails: ccList } : {}),
        additionalBody: additionalBody.trim() ? additionalBody.trim() : undefined,
        ...(uploadedAttachmentIds.length ? { attachmentIds: uploadedAttachmentIds } : {}),
      });

      if (!response?.success) {
        throw new Error(response?.message || "Failed to send trainer assignment emails");
      }

      toast.success(response?.message || "Trainer assignment emails sent successfully!");
      onSuccess();
      onOpenChange(false);

      // Reset form
      setCcEmails("");
      setAdditionalBody("");
      setAttachmentFiles([]);
    } catch (error: any) {
      console.error("Error sending emails:", error);
      toast.error(error?.message || "Failed to send trainer assignment emails");
    } finally {
      setSending(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-SG", { style: "currency", currency: "SGD" }).format(amount);
  };

  const totalFees = trainers.reduce((sum, t) => sum + t.baseFee, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Trainer Assignment Email
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Partner Information - Show if partners exist */}
          {hasPartners && (
            <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
              <h3 className="font-semibold text-sm mb-3 text-blue-800">Partner Organization</h3>
              <div className="space-y-3">
                {partners!.map((partner) => (
                  <div key={partner.id} className="bg-white p-3 rounded border border-blue-200">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <span className="text-gray-600 min-w-[80px]">Organization:</span>
                        <span className="font-semibold text-blue-900">{partner.name}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-gray-600 min-w-[80px]">Email To:</span>
                        <span className="font-medium text-blue-700">{partner.pointOfContactEmail || partner.email}</span>
                      </div>
                      {/* Partner Trainers List */}
                      {(() => {
                        const pts = resolvedPartnerTrainers[partner.id] ?? partner.partnerTrainers ?? [];
                        if (pts.length === 0) return null;
                        return (
                          <div className="mt-2 pt-2 border-t border-blue-100">
                            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Partner Trainer(s)</p>
                            <div className="space-y-1">
                              {pts.map((pt) => (
                                <div key={pt.id} className="flex items-center gap-2 text-xs text-gray-700">
                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                                  <span className="font-medium">{pt.trainerName}</span>
                                  {pt.trainerEmail && <span className="text-gray-500">({pt.trainerEmail})</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ))}
                <div className="mt-2 p-2 bg-blue-100 rounded text-xs text-blue-800">
                  <strong>Note:</strong> Email will be sent to the partner organization's contact email. Trainers listed below are for reference only.
                </div>
              </div>
            </div>
          )}

          {/* Live HTML preview — same template as sent email */}
          <div className="border rounded-lg overflow-hidden bg-slate-100">
            <div className="px-3 py-2 border-b bg-white flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-semibold text-sm">Email preview</h3>
              {previewLoading && <span className="text-xs text-muted-foreground">Updating…</span>}
            </div>

            {showTrainerPartnerToggle && (
              <div className="px-3 py-2 bg-white border-b flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
                <span className="text-xs text-muted-foreground shrink-0">Preview as:</span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={previewRecipientType === "trainer" ? "default" : "outline"}
                    onClick={() => setPreviewRecipientType("trainer")}
                  >
                    Trainer email
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={previewRecipientType === "partner" ? "default" : "outline"}
                    onClick={() => setPreviewRecipientType("partner")}
                  >
                    Partner email
                  </Button>
                </div>
              </div>
            )}

            {previewRecipientType === "trainer" && trainers.length > 1 && (
              <div className="px-3 py-2 bg-white border-b flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                <Label htmlFor="preview-trainer" className="text-xs text-muted-foreground shrink-0">
                  Trainer
                </Label>
                <select
                  id="preview-trainer"
                  className="flex h-9 w-full sm:max-w-md rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={previewTrainerId ?? ""}
                  onChange={(e) => setPreviewTrainerId(e.target.value || null)}
                >
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {previewLabel && (
              <div className="px-3 py-1.5 bg-amber-50 border-b text-xs text-amber-900">
                Showing: <span className="font-medium">{previewLabel}</span>
              </div>
            )}

            {previewSubject && (
              <div className="px-3 py-2 bg-white border-b text-xs">
                <span className="text-muted-foreground">Subject: </span>
                <span className="font-medium text-foreground break-all">{previewSubject}</span>
              </div>
            )}

            {previewError && <div className="p-3 text-sm text-destructive bg-white">{previewError}</div>}

            <div className="relative bg-[#0f172a] min-h-[320px] max-h-[55vh] overflow-auto">
              {previewLoading && !previewHtml && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400 z-10 bg-[#0f172a]/80">
                  Loading preview…
                </div>
              )}
              {previewHtml && (
                <iframe
                  title="Trainer assignment email preview"
                  srcDoc={previewHtml}
                  sandbox="allow-same-origin"
                  className="w-full min-h-[480px] border-0 block bg-white"
                  style={{ minHeight: "min(55vh, 640px)" }}
                />
              )}
            </div>

            <div className="p-3 bg-gray-50 border-t space-y-3">
              <div>
                <div className="font-semibold text-sm mb-2">
                  {hasPartners ? "Assigned trainers (for reference)" : `Trainers (${trainers.length})`}
                </div>
                <div className="space-y-1">
                  {trainers.map((t) => (
                    <div key={t.id} className="flex justify-between items-center text-xs">
                      <span className={hasPartners ? "text-gray-600" : ""}>{t.name}</span>
                      {!hasPartners && <span className="text-gray-600">Fee: {formatCurrency(t.baseFee)}</span>}
                    </div>
                  ))}
                  {!hasPartners && trainers.length > 0 && (
                    <div className="flex justify-between items-center font-semibold pt-2 border-t border-gray-200">
                      <span>Total:</span>
                      <span>{formatCurrency(totalFees)}</span>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Attachments are not shown in this preview; they will be included when you send. CC is not shown in the body but will be applied on send.
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
                placeholder="Add any additional notes or instructions for the trainers..."
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

export default SendTrainerEmailDialog;
