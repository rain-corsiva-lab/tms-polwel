import { Users, UserCheck, GraduationCap, Building2, Shield, Calendar } from "lucide-react";
import StatsCard from "@/components/StatsCard";
import UserTable from "@/components/UserTable";

// Mock data
const mockUsers = [
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
];

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your Training Management System</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Users"
          value="127"
          icon={Users}
          trend={{ value: 12, isPositive: true }}
          description="Active system users"
        />
        <StatsCard
          title="POLWEL Staff"
          value="23"
          icon={Shield}
          trend={{ value: 5, isPositive: true }}
          description="Internal staff members"
        />
        <StatsCard
          title="Client Organizations"
          value="8"
          icon={Building2}
          trend={{ value: 2, isPositive: true }}
          description="Training coordinators"
        />
        <StatsCard
          title="Active Trainers"
          value="42"
          icon={GraduationCap}
          trend={{ value: -3, isPositive: false }}
          description="Certified trainers"
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title="Learners Enrolled"
          value="1,234"
          icon={UserCheck}
          description="Total learner records"
        />
        <StatsCard
          title="Scheduled Sessions"
          value="18"
          icon={Calendar}
          description="This month"
        />
        <StatsCard
          title="MFA Enabled"
          value="89%"
          icon={Shield}
          trend={{ value: 4, isPositive: true }}
          description="Security compliance"
        />
      </div>

      {/* Recent Users Table */}
      <UserTable users={mockUsers} title="Recent User Activity" />
    </div>
  );
};

export default Dashboard;