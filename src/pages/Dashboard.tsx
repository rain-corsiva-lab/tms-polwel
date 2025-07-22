import { Users, UserCheck, GraduationCap, Building2, Shield, Calendar } from "lucide-react";
import StatsCard from "@/components/StatsCard";
import UserTable from "@/components/UserTable";

// Mock data for dashboard
const mockUsers = [
  {
    id: '1',
    name: 'John Tan',
    email: 'john.tan@polwel.org',
    role: 'POLWEL' as const,
    status: 'Active' as const,
    lastLogin: '2024-01-15 09:30',
    mfaEnabled: true,
    passwordExpiry: '2024-04-15',
    permissionLevel: 'Administrator'
  },
  {
    id: '2',
    name: 'Mary Lim',
    email: 'mary.lim@spf.gov.sg',
    role: 'TrainingCoordinator' as const,
    status: 'Active' as const,
    lastLogin: '2024-01-14 16:45',
    mfaEnabled: true,
    organization: 'Singapore Police Force',
    division: 'Ang Mo Kio Division',
    buCostCentre: 'AMK001',
    passwordExpiry: '2024-04-14'
  },
  {
    id: '3',
    name: 'David Chen',
    email: 'david.chen@training.com',
    role: 'Trainer' as const,
    status: 'Active' as const,
    lastLogin: '2024-01-13 14:20',
    mfaEnabled: false,
    availabilityStatus: 'Available',
    passwordExpiry: '2024-04-13'
  },
  {
    id: '4',
    name: 'Raj Kumar',
    email: 'raj.kumar@spf.gov.sg',
    role: 'Learner' as const,
    status: 'Active' as const,
    lastLogin: '2024-01-12 08:30',
    mfaEnabled: false,
    organization: 'Singapore Police Force',
    division: 'Ang Mo Kio Division',
    passwordExpiry: '2024-04-12'
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
      </div>

      {/* Recent Users Table */}
      <UserTable users={mockUsers} title="Recent User Activity" />
    </div>
  );
};

export default Dashboard;