import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Download, Filter, Shield, Users, Clock } from "lucide-react";
import UserTable from "@/components/UserTable";
import { AddPolwelUserDialog } from "@/components/AddPolwelUserDialog";
import { AuditTrailEntry } from "@/components/AuditTrailDialog";

// Enhanced user data structure for POLWEL users
interface PolwelUser {
  id: string;
  name: string;
  email: string;
  role: 'POLWEL';
  status: 'Active' | 'Inactive' | 'Pending' | 'Locked';
  lastLogin: string;
  mfaEnabled: boolean;
  passwordExpiry?: string;
  failedLoginAttempts?: number;
  permissionLevel: string;
  department: string;
  createdAt: string;
  createdBy: string;
  lastModified: string;
  modifiedBy: string;
  auditTrail: AuditTrailEntry[];
}

const polwelUsers: PolwelUser[] = [
  {
    id: '1',
    name: 'John Tan',
    email: 'john.tan@polwel.org',
    role: 'POLWEL',
    status: 'Active',
    lastLogin: '2024-01-15 09:30',
    mfaEnabled: true,
    passwordExpiry: '2024-04-15',
    failedLoginAttempts: 0,
    permissionLevel: 'Administrator',
    department: 'System Administration',
    createdAt: '2023-06-01',
    createdBy: 'System',
    lastModified: '2024-01-15',
    modifiedBy: 'john.tan@polwel.org',
    auditTrail: [
      {
        id: 'audit_1_1',
        timestamp: '2024-01-15T09:30:00Z',
        action: 'User Login',
        actionType: 'login',
        performedBy: 'john.tan@polwel.org',
        details: 'Successful login from Singapore office',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        id: 'audit_1_2',
        timestamp: '2024-01-10T14:20:00Z',
        action: 'Permission Updated',
        actionType: 'permission_change',
        performedBy: 'admin@polwel.org',
        details: 'User granted Administrator access to Training Management module',
        ipAddress: '192.168.1.101'
      },
      {
        id: 'audit_1_3',
        timestamp: '2024-01-05T16:45:00Z',
        action: 'Password Changed',
        actionType: 'password_change',
        performedBy: 'john.tan@polwel.org',
        details: 'User changed password successfully',
        ipAddress: '192.168.1.100'
      },
      {
        id: 'audit_1_4',
        timestamp: '2023-12-20T11:30:00Z',
        action: 'Profile Updated',
        actionType: 'profile_update',
        performedBy: 'john.tan@polwel.org',
        details: 'Updated contact information and department details',
        ipAddress: '192.168.1.100'
      },
      {
        id: 'audit_1_5',
        timestamp: '2023-06-01T10:00:00Z',
        action: 'Account Created',
        actionType: 'creation',
        performedBy: 'System',
        details: 'POLWEL user account created with Administrator privileges',
        ipAddress: 'System'
      }
    ]
  },
  {
    id: '4',
    name: 'Sarah Wong',
    email: 'sarah.wong@polwel.org',
    role: 'POLWEL',
    status: 'Inactive',
    lastLogin: '2024-01-10 11:15',
    mfaEnabled: true,
    passwordExpiry: '2024-04-10',
    failedLoginAttempts: 0,
    permissionLevel: 'Manager',
    department: 'Course Management',
    createdAt: '2023-07-01',
    createdBy: 'john.tan@polwel.org',
    lastModified: '2024-01-10',
    modifiedBy: 'john.tan@polwel.org',
    auditTrail: [
      {
        id: 'audit_4_1',
        timestamp: '2024-01-10T11:15:00Z',
        action: 'User Login',
        actionType: 'login',
        performedBy: 'sarah.wong@polwel.org',
        details: 'Last successful login before account deactivation',
        ipAddress: '192.168.1.105',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      {
        id: 'audit_4_2',
        timestamp: '2024-01-11T09:00:00Z',
        action: 'Status Changed',
        actionType: 'status_change',
        performedBy: 'john.tan@polwel.org',
        details: 'User account status changed from Active to Inactive due to resignation',
        ipAddress: '192.168.1.100'
      },
      {
        id: 'audit_4_3',
        timestamp: '2023-12-15T13:20:00Z',
        action: 'Permission Updated',
        actionType: 'permission_change',
        performedBy: 'john.tan@polwel.org',
        details: 'User granted Manager access to Course Management module',
        ipAddress: '192.168.1.100'
      },
      {
        id: 'audit_4_4',
        timestamp: '2023-11-20T10:30:00Z',
        action: 'Password Changed',
        actionType: 'password_change',
        performedBy: 'sarah.wong@polwel.org',
        details: 'User changed password after security policy update',
        ipAddress: '192.168.1.105'
      },
      {
        id: 'audit_4_5',
        timestamp: '2023-07-01T08:00:00Z',
        action: 'Account Created',
        actionType: 'creation',
        performedBy: 'john.tan@polwel.org',
        details: 'POLWEL user account created for Course Management department',
        ipAddress: '192.168.1.100'
      }
    ]
  },
  {
    id: '9',
    name: 'Alex Kumar',
    email: 'alex.kumar@polwel.org',
    role: 'POLWEL',
    status: 'Pending',
    lastLogin: 'Never',
    mfaEnabled: false,
    permissionLevel: 'Staff',
    department: 'Training Coordination',
    createdAt: '2024-01-12',
    createdBy: 'john.tan@polwel.org',
    lastModified: '2024-01-12',
    modifiedBy: 'john.tan@polwel.org',
    auditTrail: []
  },
  {
    id: '10',
    name: 'Lisa Chen',
    email: 'lisa.chen@polwel.org',
    role: 'POLWEL',
    status: 'Pending',
    lastLogin: 'Never',
    mfaEnabled: false,
    permissionLevel: 'Staff',
    department: 'Quality Assurance',
    createdAt: '2024-01-14',
    createdBy: 'john.tan@polwel.org',
    lastModified: '2024-01-14',
    modifiedBy: 'john.tan@polwel.org',
    auditTrail: []
  }
];

const PolwelUsers = () => {
  // Calculate stats
  const totalUsers = polwelUsers.length;
  const pendingUsers = polwelUsers.filter(user => user.status === 'Pending');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6" />
            POLWEL Users
          </h2>
          <p className="text-muted-foreground">Manage POLWEL staff and their system permissions</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <AddPolwelUserDialog />
        </div>
      </div>

      {/* POLWEL Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total POLWEL Users</p>
                <p className="text-2xl font-bold text-foreground">{totalUsers}</p>
              </div>
              <div className="p-2 bg-accent rounded-lg">
                <Users className="h-5 w-5 text-accent-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Dialog>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pending Onboarding</p>
                    <p className="text-2xl font-bold text-foreground">{pendingUsers.length}</p>
                  </div>
                  <div className="p-2 bg-accent rounded-lg">
                    <Clock className="h-5 w-5 text-accent-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Pending POLWEL Users</DialogTitle>
              <DialogDescription>
                POLWEL staff who haven't clicked their secure onboarding link
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              {pendingUsers.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {pendingUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium text-foreground">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground">Department: {user.department}</p>
                        <p className="text-xs text-muted-foreground">Created: {new Date(user.createdAt).toLocaleDateString()}</p>
                      </div>
                      <Badge variant="outline" className="text-warning border-warning">
                        Pending
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No pending users</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* POLWEL User Table */}
      <UserTable users={polwelUsers} title="POLWEL Staff Members" />

    </div>
  );
};

export default PolwelUsers;