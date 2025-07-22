import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoreHorizontal, Edit, Trash2, Eye, History, Mail } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AuditTrailDialog, AuditTrailEntry } from "@/components/AuditTrailDialog";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  name: string;
  email: string;
  role: 'POLWEL' | 'TrainingCoordinator' | 'Trainer' | 'Learner';
  status: 'Active' | 'Inactive' | 'Pending' | 'Locked';
  lastLogin?: string;
  mfaEnabled: boolean;
  passwordExpiry?: string;
  failedLoginAttempts?: number;
  
  // Organization info (for TCs and Learners)
  organization?: string;
  division?: string;
  buCostCentre?: string;
  
  // Additional fields for display
  permissionLevel?: string;
  availabilityStatus?: string;
  courses?: string[];
  additionalEmails?: string[];
  
  // Audit trail for POLWEL users
  auditTrail?: AuditTrailEntry[];
}

interface UserTableProps {
  users: User[];
  title: string;
}

const getRoleColor = (role: string) => {
  switch (role) {
    case 'POLWEL':
      return 'bg-primary text-primary-foreground';
    case 'TrainingCoordinator':
      return 'bg-warning text-warning-foreground';
    case 'Trainer':
      return 'bg-success text-success-foreground';
    case 'Learner':
      return 'bg-blue-500 text-white';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const getRoleDisplay = (role: string) => {
  switch (role) {
    case 'TrainingCoordinator':
      return 'Training Coordinator';
    default:
      return role;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Active':
      return 'bg-success text-success-foreground';
    case 'Inactive':
      return 'bg-muted text-muted-foreground';
    case 'Pending':
      return 'bg-warning text-warning-foreground';
    case 'Locked':
      return 'bg-destructive text-destructive-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const UserTable = ({ users, title }: UserTableProps) => {
  const { toast } = useToast();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Password Expiry</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Last Login</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-4">
                    <div>
                      {user.role === 'POLWEL' && user.auditTrail ? (
                        <AuditTrailDialog 
                          userName={user.name} 
                          userEmail={user.email} 
                          auditTrail={user.auditTrail}
                        >
                          <button className="text-left hover:text-primary transition-colors">
                            <div className="font-medium text-foreground underline decoration-dotted">{user.name}</div>
                            {user.organization && (
                              <div className="text-sm text-muted-foreground">
                                {user.organization}{user.division && ` - ${user.division}`}
                              </div>
                            )}
                            {user.buCostCentre && (
                              <div className="text-xs text-muted-foreground">BU: {user.buCostCentre}</div>
                            )}
                          </button>
                        </AuditTrailDialog>
                      ) : (
                        <div>
                          <div className="font-medium text-foreground">{user.name}</div>
                          {user.organization && (
                            <div className="text-sm text-muted-foreground">
                              {user.organization}{user.division && ` - ${user.division}`}
                            </div>
                          )}
                          {user.buCostCentre && (
                            <div className="text-xs text-muted-foreground">BU: {user.buCostCentre}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-foreground">{user.email}</div>
                    {user.additionalEmails && user.additionalEmails.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        +{user.additionalEmails.length} more
                      </div>
                    )}
                  </td>
                   <td className="py-3 px-4">
                     <Badge className={getStatusColor(user.status)}>{user.status}</Badge>
                      {(user.failedLoginAttempts ?? 0) > 0 && (
                        <div className="text-xs text-destructive mt-1">
                          {user.failedLoginAttempts} failed attempts
                        </div>
                      )}
                   </td>
                  <td className="py-3 px-4">
                    <div className="text-muted-foreground text-sm">
                      {user.passwordExpiry || 'Not set'}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {user.lastLogin || 'Never'}
                  </td>
                  <td className="py-3 px-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {user.role === 'POLWEL' && user.auditTrail && (
                          <AuditTrailDialog 
                            userName={user.name} 
                            userEmail={user.email} 
                            auditTrail={user.auditTrail}
                          >
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <History className="h-4 w-4 mr-2" />
                              View Audit Trail
                            </DropdownMenuItem>
                          </AuditTrailDialog>
                        )}
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit User
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            toast({
                              title: "Password Reset Link Sent",
                              description: `Password reset link has been sent to ${user.email}`,
                            });
                          }}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Send Password Reset Link
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserTable;