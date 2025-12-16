import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { courseRunsApi, API_BASE_URL } from "../lib/api";

interface SendTrainerEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseRunId: string;
  trainers: Array<{
    id: string;
    name: string;
    email: string;
    baseFee: number;
    additionalCost: number;
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

export const SendTrainerEmailDialog: React.FC<SendTrainerEmailDialogProps> = ({ open, onOpenChange, courseRunId, trainers, courseRunDetails, onSuccess }) => {
  const [ccEmails, setCcEmails] = useState("");
  const [additionalBody, setAdditionalBody] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentId, setAttachmentId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Limit file size to 10MB
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setAttachmentFile(file);
    }
  };

  const handleSend = async () => {
    try {
      setSending(true);

      const ccList = ccEmails
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean);

      // If there's an attachment, upload it first
      let uploadedAttachmentId: string | undefined;
      if (attachmentFile) {
        const formData = new FormData();
        formData.append("file", attachmentFile);

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
            const errorData = await uploadResponse.json().catch(() => ({}));
            throw new Error(errorData.error || `Upload failed with status ${uploadResponse.status}`);
          }

          const uploadData = await uploadResponse.json();
          uploadedAttachmentId = uploadData.fileId || uploadData.id;

          if (!uploadedAttachmentId) {
            throw new Error("No file ID returned from upload");
          }
        } catch (uploadErr) {
          const message = uploadErr instanceof Error ? uploadErr.message : "Failed to upload attachment";
          console.error("Attachment upload error:", uploadErr);
          toast.error(message);
          setSending(false);
          return;
        }
      }

      const response = await courseRunsApi.sendTrainerAssignmentEmail(courseRunId, {
        ...(ccList.length ? { ccEmails: ccList } : {}),
        additionalBody: additionalBody.trim() ? additionalBody.trim() : undefined,
        ...(uploadedAttachmentId ? { attachmentId: uploadedAttachmentId } : {}),
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
      setAttachmentFile(null);
      setAttachmentId(null);
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

  const totalFees = trainers.reduce((sum, t) => sum + t.baseFee + t.additionalCost, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Trainer Assignment Email
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Email Preview Section */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-medium mb-3">Email Preview</h3>

            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Subject:</span> Trainer Assignment for {courseRunDetails.serialNumber}
              </div>

              <div>
                <span className="font-medium">Recipients:</span>
                <div className="mt-1 space-y-1">
                  {trainers.map((trainer) => (
                    <div key={trainer.id} className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      {trainer.name} ({trainer.email})
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t">
                <p className="font-medium mb-2">Course Run Details:</p>
                <ul className="space-y-1 ml-4">
                  <li>Course: {courseRunDetails.courseName}</li>
                  <li>Course Run Code: {courseRunDetails.serialNumber}</li>
                  <li>Start Date: {courseRunDetails.startDate}</li>
                  <li>End Date: {courseRunDetails.endDate}</li>
                  <li>Venue: {courseRunDetails.venue}</li>
                </ul>
              </div>

              <div className="pt-3 border-t">
                <p className="font-medium mb-2">Trainer Assignment Summary:</p>
                <div className="space-y-2">
                  {trainers.map((trainer) => (
                    <div key={trainer.id} className="ml-4">
                      <div className="font-medium">{trainer.name}</div>
                      <div className="text-xs space-y-1">
                        <div>Base Fee: {formatCurrency(trainer.baseFee)}</div>
                        {trainer.additionalCost > 0 && <div>Additional Cost: {formatCurrency(trainer.additionalCost)}</div>}
                        <div className="font-medium">Total: {formatCurrency(trainer.baseFee + trainer.additionalCost)}</div>
                      </div>
                    </div>
                  ))}
                  <div className="ml-4 pt-2 border-t font-medium">Total Trainer Fees: {formatCurrency(totalFees)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* CC Emails */}
          <div className="space-y-2">
            <Label htmlFor="ccEmails">CC (Comma-separated)</Label>
            <Input
              id="ccEmails"
              type="text"
              placeholder="email1@example.com, email2@example.com"
              value={ccEmails}
              onChange={(e) => setCcEmails(e.target.value)}
            />
            <p className="text-xs text-gray-500">Optional: Add additional recipients</p>
          </div>

          {/* Additional Body Content */}
          <div className="space-y-2">
            <Label htmlFor="additionalBody">Additional Message</Label>
            <Textarea
              id="additionalBody"
              rows={4}
              placeholder="Add any additional notes or instructions for the trainers..."
              value={additionalBody}
              onChange={(e) => setAdditionalBody(e.target.value)}
            />
            <p className="text-xs text-gray-500">Optional: This will be appended to the email body</p>
          </div>

          {/* Attachment Upload */}
          <div className="space-y-2">
            <Label htmlFor="attachment">Attach File (Optional)</Label>
            <div className="flex items-center gap-2">
              <Input id="attachment" type="file" onChange={handleFileSelect} disabled={sending} className="flex-1" />
            </div>
            {attachmentFile && (
              <div className="flex items-center justify-between bg-blue-50 p-2 rounded border border-blue-200">
                <span className="text-sm text-blue-900">{attachmentFile.name}</span>
                <button onClick={() => setAttachmentFile(null)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  Remove
                </button>
              </div>
            )}
            <p className="text-xs text-gray-500">Max file size: 10MB. Optional: Will be sent as attachment</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
