import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Filter, GraduationCap } from "lucide-react";
import UserTable from "@/components/UserTable";
import { AddTrainerDialog } from "@/components/AddTrainerDialog";

// Enhanced user data structure for Trainers
interface Trainer {
  id: string;
  name: string;
  email: string;
  role: 'Trainer';
  status: 'Active' | 'Inactive' | 'Pending' | 'Locked';
  lastLogin: string;
  mfaEnabled: boolean;
  passwordExpiry?: string;
  failedLoginAttempts?: number;
  availabilityStatus: 'Available' | 'Unavailable' | 'Limited';
  courses: string[];
  partnerOrganization: string;
  createdAt: string;
  createdBy: string;
  lastModified: string;
  modifiedBy: string;
}

const trainers: Trainer[] = [
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
  }
];

const TrainersAndPartners = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="h-6 w-6" />
            Trainers & Partners
          </h2>
          <p className="text-muted-foreground">Manage training partners and their availability</p>
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
          <AddTrainerDialog />
        </div>
      </div>

      {/* Trainer Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">53</div>
            <p className="text-sm text-muted-foreground">Total Trainers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">42</div>
            <p className="text-sm text-muted-foreground">Available</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-warning">8</div>
            <p className="text-sm text-muted-foreground">Limited Availability</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-destructive">3</div>
            <p className="text-sm text-muted-foreground">Unavailable</p>
          </CardContent>
        </Card>
      </div>

      {/* Trainers Table */}
      <UserTable users={trainers} title="Training Partners" />

      {/* Trainer Specific Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Partner Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Excellence Training Partners</span>
                <span className="font-medium">12</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Professional Development Corp</span>
                <span className="font-medium">8</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Leadership Institute</span>
                <span className="font-medium">15</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Skills Training Ltd</span>
                <span className="font-medium">18</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Course Specializations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Leadership Development</span>
                <span className="font-medium">25</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Communication Skills</span>
                <span className="font-medium">18</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Team Building</span>
                <span className="font-medium">22</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer Service</span>
                <span className="font-medium">15</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TrainersAndPartners;