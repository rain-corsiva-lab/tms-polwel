import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, User, Settings, Lock, Key, CheckCircle } from "lucide-react";

export interface AuditTrailEntry {
  id: string;
  timestamp: string;
  action: string;
  actionType: 'login' | 'logout' | 'permission_change' | 'password_change' | 'profile_update' | 'status_change' | 'creation';
  performedBy: string;
  details: string;
  ipAddress?: string;
  userAgent?: string;
}

interface AuditTrailDialogProps {
  userName: string;
  userEmail: string;
  auditTrail: AuditTrailEntry[];
  children: React.ReactNode;
}

const getActionIcon = (actionType: string) => {
  switch (actionType) {
    case 'login':
    case 'logout':
      return <User className="h-4 w-4" />;
    case 'permission_change':
      return <Settings className="h-4 w-4" />;
    case 'password_change':
      return <Key className="h-4 w-4" />;
    case 'status_change':
      return <CheckCircle className="h-4 w-4" />;
    case 'creation':
      return <User className="h-4 w-4" />;
    default:
      return <History className="h-4 w-4" />;
  }
};

const getActionColor = (actionType: string) => {
  switch (actionType) {
    case 'login':
      return 'bg-success text-success-foreground';
    case 'logout':
      return 'bg-muted text-muted-foreground';
    case 'permission_change':
      return 'bg-warning text-warning-foreground';
    case 'password_change':
      return 'bg-primary text-primary-foreground';
    case 'status_change':
      return 'bg-blue-500 text-white';
    case 'creation':
      return 'bg-success text-success-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export const AuditTrailDialog = ({ userName, userEmail, auditTrail, children }: AuditTrailDialogProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Audit Trail - {userName}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{userEmail}</p>
        </DialogHeader>
        
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {auditTrail.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No audit trail entries found
              </div>
            ) : (
              auditTrail.map((entry) => (
                <div key={entry.id} className="border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getActionColor(entry.actionType)}>
                        {getActionIcon(entry.actionType)}
                        <span className="ml-1">{entry.action}</span>
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-sm">
                    <p className="text-foreground">{entry.details}</p>
                    <div className="mt-2 space-y-1 text-muted-foreground">
                      <p><strong>Performed by:</strong> {entry.performedBy}</p>
                      {entry.ipAddress && (
                        <p><strong>IP Address:</strong> {entry.ipAddress}</p>
                      )}
                      {entry.userAgent && (
                        <p><strong>User Agent:</strong> {entry.userAgent}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};