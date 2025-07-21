import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Filter, Shield } from "lucide-react";
import UserTable from "@/components/UserTable";
import { AddPolwelUserDialog } from "@/components/AddPolwelUserDialog";

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
    modifiedBy: 'john.tan@polwel.org'
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
    modifiedBy: 'john.tan@polwel.org'
  }
];

const PolwelUsers = () => {
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
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">23</div>
            <p className="text-sm text-muted-foreground">Total POLWEL Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-warning">3</div>
            <p className="text-sm text-muted-foreground">Pending Onboarding</p>
          </CardContent>
        </Card>
      </div>

      {/* POLWEL User Table */}
      <UserTable users={polwelUsers} title="POLWEL Staff Members" />

      {/* POLWEL Specific Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Permission Levels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Administrators</span>
                <span className="font-medium">8</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Managers</span>
                <span className="font-medium">6</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Coordinators</span>
                <span className="font-medium">7</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Viewers</span>
                <span className="font-medium">2</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PolwelUsers;