import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Filter } from "lucide-react";
import UserTable from "@/components/UserTable";
import { AddUserDialog } from "@/components/AddUserDialog";

// Extended mock data for user management
const allUsers = [
  {
    id: '1',
    name: 'John Tan',
    email: 'john.tan@spf.gov.sg',
    role: 'POLWEL' as const,
    status: 'Active' as const,
    lastLogin: '2024-01-15 09:30',
    mfaEnabled: true,
  },
  {
    id: '2',
    name: 'Mary Lim',
    email: 'mary.lim@spf.gov.sg',
    role: 'Client' as const,
    status: 'Active' as const,
    lastLogin: '2024-01-14 16:45',
    mfaEnabled: true,
    organization: 'Singapore Police Force - Ang Mo Kio',
  },
  {
    id: '3',
    name: 'David Chen',
    email: 'david.chen@training.com',
    role: 'Trainer' as const,
    status: 'Active' as const,
    lastLogin: '2024-01-13 14:20',
    mfaEnabled: false,
  },
  {
    id: '4',
    name: 'Sarah Wong',
    email: 'sarah.wong@polwel.org',
    role: 'POLWEL' as const,
    status: 'Inactive' as const,
    lastLogin: '2024-01-10 11:15',
    mfaEnabled: true,
  },
  {
    id: '5',
    name: 'Ahmad Rahman',
    email: 'ahmad.rahman@spf.gov.sg',
    role: 'Client' as const,
    status: 'Active' as const,
    lastLogin: '2024-01-15 08:45',
    mfaEnabled: true,
    organization: 'Singapore Police Force - Jurong',
  },
  {
    id: '6',
    name: 'Jennifer Lee',
    email: 'jennifer.lee@partners.com',
    role: 'Trainer' as const,
    status: 'Active' as const,
    lastLogin: '2024-01-12 15:30',
    mfaEnabled: true,
  },
];

const UserManagement = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">User Management</h2>
          <p className="text-muted-foreground">Manage all system users and their permissions</p>
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
          <AddUserDialog />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">127</div>
            <p className="text-sm text-muted-foreground">Total Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">112</div>
            <p className="text-sm text-muted-foreground">Active Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-warning">15</div>
            <p className="text-sm text-muted-foreground">Pending Approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">89%</div>
            <p className="text-sm text-muted-foreground">MFA Enabled</p>
          </CardContent>
        </Card>
      </div>

      {/* User Table */}
      <UserTable users={allUsers} title="All System Users" />

      {/* User Type Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">POLWEL Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active</span>
                <span className="font-medium">18</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Inactive</span>
                <span className="font-medium">5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">MFA Enabled</span>
                <span className="font-medium text-success">23/23</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Client Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">SPF Divisions</span>
                <span className="font-medium">6</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Other Agencies</span>
                <span className="font-medium">2</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Training Coordinators</span>
                <span className="font-medium">47</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Trainers & Partners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Trainers</span>
                <span className="font-medium">42</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Partner Organizations</span>
                <span className="font-medium">8</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scheduled Sessions</span>
                <span className="font-medium">156</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserManagement;