import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import StatsCard from '@/components/StatsCard';
import { Users, GraduationCap, Building2, BookOpen } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  
  // Mock user data for demo purposes
  const user = { name: 'Demo User', role: 'POLWEL' };
  const hasRole = (roles: string[]) => roles.includes('POLWEL');

  // Dashboard for POLWEL users and general overview
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user.name}!
        </h1>
        <p className="text-muted-foreground">
          POLWEL Training Management System - {user.role.replace('_', ' ').toLowerCase()}
        </p>
      </div>

      {/* Quick Stats - Only for POLWEL users */}
      {hasRole(['POLWEL']) && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Users"
            value="1,234"
            description="+20.1% from last month"
            icon={Users}
          />
          <StatsCard
            title="Active Trainers"
            value="89"
            description="+5 new this month"
            icon={GraduationCap}
          />
          <StatsCard
            title="Organizations"
            value="56"
            description="+3 new partnerships"
            icon={Building2}
          />
          <StatsCard
            title="Active Courses"
            value="142"
            description="+12 new courses"
            icon={BookOpen}
          />
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {hasRole(['POLWEL']) && (
          <>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/polwel-users')}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>User Management</span>
                </CardTitle>
                <CardDescription>
                  Manage POLWEL users, trainers, and client organizations
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/client-organisations')}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5" />
                  <span>Organizations</span>
                </CardTitle>
                <CardDescription>
                  View and manage client organizations and partnerships
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/course-creation')}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5" />
                  <span>Course Management</span>
                </CardTitle>
                <CardDescription>
                  Create, edit, and manage training courses
                </CardDescription>
              </CardHeader>
            </Card>
          </>
        )}

        {hasRole(['TRAINING_COORDINATOR']) && (
          <>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/users')}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Learner Management</span>
                </CardTitle>
                <CardDescription>
                  Manage learners from your organization
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/course-creation')}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5" />
                  <span>Training Courses</span>
                </CardTitle>
                <CardDescription>
                  View and request training courses
                </CardDescription>
              </CardHeader>
            </Card>
          </>
        )}
      </div>

      {/* Recent Activity or Organization-specific content */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest updates and notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              • System maintenance scheduled for next Sunday
            </p>
            <p className="text-sm text-muted-foreground">
              • New training modules available
            </p>
            <p className="text-sm text-muted-foreground">
              • Quarterly reports are now ready for review
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Home;