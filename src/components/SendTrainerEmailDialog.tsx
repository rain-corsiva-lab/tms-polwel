import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Mail, Send } from "lucide-react";
import { toast } from "sonner";

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
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    try {
      setSending(true);

      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
      const endpoint = `${API_BASE}/course-runs/${courseRunId}/send-trainer-assignment-email`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("polwel_access_token")}`,
        },
        body: JSON.stringify({
          ccEmails: ccEmails
            .split(",")
            .map((e) => e.trim())
            .filter(Boolean),
          additionalBody,
        }),
      });

      // If network-level failure, fetch would have thrown. Here we have a response.
      let data: any = {};
      try {
        data = await response.json();
      } catch (err) {
        const text = await response.text().catch(() => null);
        throw new Error(text || `Server returned status ${response.status}`);
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || `Failed to send email (status ${response.status})`);
      }

      toast.success("Trainer assignment emails sent successfully!");
      onSuccess();
      onOpenChange(false);

      // Reset form
      setCcEmails("");
      setAdditionalBody("");
    } catch (error: any) {
      console.error("Error sending emails:", error);
      toast.error(error.message || "Failed to send trainer assignment emails");
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
                  <li>Serial Number: {courseRunDetails.serialNumber}</li>
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
