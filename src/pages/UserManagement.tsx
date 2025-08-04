import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Filter } from "lucide-react";
import UserTable from "@/components/UserTable";
import { AddUserDialog } from "@/components/AddUserDialog";
import { AddTrainerDialog } from "@/components/AddTrainerDialog";
import { AddPartnerDialog } from "@/components/AddPartnerDialog";

// Enhanced user data structure matching system requirements
interface User {
  id: string;
  name: string;
  email: string;
  role: 'POLWEL' | 'TrainingCoordinator' | 'Trainer' | 'Learner';
  status: 'Active' | 'Inactive' | 'Pending' | 'Locked';
  lastLogin: string;
  mfaEnabled: boolean;
  passwordExpiry?: string;
  failedLoginAttempts?: number;
  
  // POLWEL specific
  permissionLevel?: string;
  department?: string;
  
  // Training Coordinator specific
  organization?: string;
  division?: string;
  buCostCentre?: string;
  buNumberRequired?: boolean;
  paymentMode?: string;
  contactNumber?: string;
  additionalEmails?: string[];
  
  // Trainer specific
  availabilityStatus?: 'Available' | 'Unavailable' | 'Limited';
  courses?: string[];
  partnerOrganization?: string;
  
  // Learner specific
  enrolledCourses?: string[];
  completedCourses?: string[];
  
  // Audit fields
  createdAt: string;
  createdBy: string;
  lastModified: string;
  modifiedBy: string;
}

const allUsers: User[] = [
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
    id: '2',
    name: 'Mary Lim',
    email: 'mary.lim@spf.gov.sg',
    role: 'TrainingCoordinator',
    status: 'Active',
    lastLogin: '2024-01-14 16:45',
    mfaEnabled: true,
    passwordExpiry: '2024-04-14',
    failedLoginAttempts: 0,
    organization: 'Singapore Police Force',
    division: 'Ang Mo Kio Division',
    buCostCentre: 'AMK001',
    buNumberRequired: true,
    paymentMode: 'ULTF',
    contactNumber: '+65 6555 0001',
    additionalEmails: ['mary.lim.backup@spf.gov.sg'],
    createdAt: '2023-08-15',
    createdBy: 'john.tan@polwel.org',
    lastModified: '2024-01-14',
    modifiedBy: 'mary.lim@spf.gov.sg'
  },
  {
    id: '3',
    name: 'David Chen',
    email: 'david.chen@training.com',
    role: 'Trainer',
    status: 'Active',
    lastLogin: '2024-01-13 14:20',
    mfaEnabled: true,
    passwordExpiry: '2024-04-13',
    failedLoginAttempts: 0,
    availabilityStatus: 'Available',
    courses: ['Leadership Development', 'Team Building'],
    partnerOrganization: 'Excellence Training Partners',
    createdAt: '2023-09-01',
    createdBy: 'john.tan@polwel.org',
    lastModified: '2024-01-13',
    modifiedBy: 'david.chen@training.com'
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
  },
  {
    id: '5',
    name: 'Ahmad Rahman',
    email: 'ahmad.rahman@spf.gov.sg',
    role: 'TrainingCoordinator',
    status: 'Active',
    lastLogin: '2024-01-15 08:45',
    mfaEnabled: true,
    passwordExpiry: '2024-04-15',
    failedLoginAttempts: 0,
    organization: 'Singapore Police Force',
    division: 'Jurong Police Division',
    buCostCentre: 'JPD002',
    buNumberRequired: true,
    paymentMode: 'Transition Dollars',
    contactNumber: '+65 6555 0002',
    createdAt: '2023-09-15',
    createdBy: 'john.tan@polwel.org',
    lastModified: '2024-01-15',
    modifiedBy: 'ahmad.rahman@spf.gov.sg'
  },
  {
    id: '6',
    name: 'Jennifer Lee',
    email: 'jennifer.lee@partners.com',
    role: 'Trainer',
    status: 'Active',
    lastLogin: '2024-01-12 15:30',
    mfaEnabled: true,
    passwordExpiry: '2024-04-12',
    failedLoginAttempts: 0,
    availabilityStatus: 'Limited',
    courses: ['Communication Skills', 'Customer Service'],
    partnerOrganization: 'Professional Development Corp',
    createdAt: '2023-10-01',
    createdBy: 'john.tan@polwel.org',
    lastModified: '2024-01-12',
    modifiedBy: 'jennifer.lee@partners.com'
  },
  {
    id: '7',
    name: 'Raj Kumar',
    email: 'raj.kumar@spf.gov.sg',
    role: 'Learner',
    status: 'Active',
    lastLogin: '2024-01-14 10:20',
    mfaEnabled: false,
    passwordExpiry: '2024-04-14',
    failedLoginAttempts: 0,
    enrolledCourses: ['Leadership Development', 'Communication Skills'],
    completedCourses: ['Basic Training'],
    organization: 'Singapore Police Force',
    division: 'Ang Mo Kio Division',
    createdAt: '2023-11-01',
    createdBy: 'mary.lim@spf.gov.sg',
    lastModified: '2024-01-14',
    modifiedBy: 'raj.kumar@spf.gov.sg'
  },
  {
    id: '8',
    name: 'Lisa Teo',
    email: 'lisa.teo@spf.gov.sg',
    role: 'Learner',
    status: 'Locked',
    lastLogin: '2024-01-05 14:30',
    mfaEnabled: false,
    passwordExpiry: '2024-04-05',
    failedLoginAttempts: 5,
    enrolledCourses: ['Team Building'],
    completedCourses: [],
    organization: 'Singapore Police Force',
    division: 'Jurong Police Division',
    createdAt: '2023-11-15',
    createdBy: 'ahmad.rahman@spf.gov.sg',
    lastModified: '2024-01-05',
    modifiedBy: 'System'
  }
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
          <AddPartnerDialog />
          <AddTrainerDialog />
          <AddUserDialog />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">1,347</div>
            <p className="text-sm text-muted-foreground">Total Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">1,289</div>
            <p className="text-sm text-muted-foreground">Active Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-warning">23</div>
            <p className="text-sm text-muted-foreground">Pending Approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-destructive">12</div>
            <p className="text-sm text-muted-foreground">Locked Accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">92%</div>
            <p className="text-sm text-muted-foreground">MFA Compliance</p>
          </CardContent>
        </Card>
      </div>

      {/* User Table */}
      <UserTable users={allUsers} title="All System Users" />

      {/* User Type Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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
              <div className="flex justify-between">
                <span className="text-muted-foreground">Admin Level</span>
                <span className="font-medium">8</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Training Coordinators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">SPF Divisions</span>
                <span className="font-medium">47</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">POLWEL TCs</span>
                <span className="font-medium">8</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Other Agencies</span>
                <span className="font-medium">12</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">BU Number Required</span>
                <span className="font-medium">55</span>
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
                <span className="text-muted-foreground">Available</span>
                <span className="font-medium text-success">42</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Limited Availability</span>
                <span className="font-medium text-warning">8</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unavailable</span>
                <span className="font-medium text-destructive">3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Partner Organizations</span>
                <span className="font-medium">12</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Learners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Enrolled</span>
                <span className="font-medium">1,234</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Learners</span>
                <span className="font-medium text-success">1,156</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">View Only Access</span>
                <span className="font-medium">1,234</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Course Completions</span>
                <span className="font-medium">2,847</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security & Compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Security Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">MFA Enabled</span>
                <span className="font-medium text-success">1,238/1,347 (92%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Password Expiring (30 days)</span>
                <span className="font-medium text-warning">45</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Failed Login Attempts (24h)</span>
                <span className="font-medium text-destructive">12</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Auto-locked Accounts</span>
                <span className="font-medium text-destructive">3</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">System Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Sessions (now)</span>
                <span className="font-medium">156</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Login Events (24h)</span>
                <span className="font-medium">2,847</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Audit Log Entries</span>
                <span className="font-medium">12,456</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Terms Acceptance Rate</span>
                <span className="font-medium text-success">98.5%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserManagement;