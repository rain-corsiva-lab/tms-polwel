import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { KeyRound, Mail, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { polwelUsersApi } from "@/lib/api";

interface PasswordResetDialogProps {
  userId: string | number;
  userName: string;
  userEmail: string;
  trigger?: React.ReactNode;
}

export function PasswordResetDialog({ userId, userName, userEmail, trigger }: PasswordResetDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSendResetLink = async () => {
    setLoading(true);
    try {
      console.log('PasswordResetDialog: Sending reset link for userId:', userId, 'type:', typeof userId);
      
      if (!userId || userId === 'undefined' || userId === 'null') {
        throw new Error('Invalid user ID');
      }
      
      await polwelUsersApi.sendPasswordResetLink(userId);
      setSent(true);
      toast({
        title: "Password Reset Email Sent",
        description: `Password reset instructions have been sent to ${userEmail}`,
      });
    } catch (error) {
      console.error('Error sending password reset email:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send password reset email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDialogChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Reset state when dialog closes
      setSent(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <KeyRound className="h-4 w-4 mr-2" />
            Send Password Reset
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Send Password Reset Link
          </DialogTitle>
          <DialogDescription>
            Send a secure password reset link to this user's email address.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* User Information */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">User:</span>
              <span className="text-sm">{userName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Email:</span>
              <span className="text-sm flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {userEmail}
              </span>
            </div>
          </div>

          {sent ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Email sent successfully!</strong>
                <br />
                A password reset link has been sent to {userEmail}. The link will expire in 1 hour.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will send a secure password reset link to the user's email address. The user will be able to create a new password using this link.
                <br /><br />
                <strong>Security features:</strong>
                <div className="mt-2 space-y-1">
                  <Badge variant="outline" className="text-xs">
                    • Link expires in 1 hour
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    • Single-use token
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    • Secure email delivery
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {sent ? 'Close' : 'Cancel'}
          </Button>
          {!sent && (
            <Button onClick={handleSendResetLink} disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Reset Link
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
