import React, { useState } from "react";
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
  }>;
  courseRunDetails: {
    serialNumber: string;
    courseName: string;
    startDate: string;
    endDate: string;
    venue: string;
  };
  onSuccess: () => void;
}

export const SendCourseConfirmationEmailDialog: React.FC<SendCourseConfirmationEmailDialogProps> = ({
  open,
  onOpenChange,
  courseRunId,
  learners,
  courseRunDetails,
  onSuccess,
}) => {
  const [ccEmails, setCcEmails] = useState("");
  const [additionalBody, setAdditionalBody] = useState("");
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Validate file sizes (25MB each)
    const invalidFiles = files.filter((file) => file.size > 25 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      toast.error(`${invalidFiles.length} file(s) exceed 25MB limit`);
      return;
    }

    setAttachmentFiles((prev) => [...prev, ...files]);
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
      const learnerIds = learners.map(l => l.id);

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
          {/* Course Run Summary */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-semibold text-sm mb-3">Email Preview</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Course:</span>
                <span className="font-medium">{courseRunDetails.courseName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Serial Number:</span>
                <span className="font-medium">{courseRunDetails.serialNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">
                  {courseRunDetails.startDate} to {courseRunDetails.endDate}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Venue:</span>
                <span className="font-medium">{courseRunDetails.venue}</span>
              </div>
              <div className="mt-3 pt-3 border-t">
                <div className="font-semibold mb-2">Participants ({learners.length}):</div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {learners.map((learner) => (
                    <div key={learner.id} className="flex justify-between items-center text-xs py-1 border-b last:border-b-0">
                      <div className="flex flex-col">
                        <span className="font-medium">{learner.name}</span>
                        <span className="text-gray-500">{learner.email}</span>
                      </div>
                      <span className="text-gray-600 text-right">{learner.organizationName}</span>
                    </div>
                  ))}
                </div>
              </div>
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
