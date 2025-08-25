import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, BookOpen, Calendar, Plus, Search } from "lucide-react";
import { AddCoordinatorDialog } from "@/components/AddCoordinatorDialog";
import StatsCard from "@/components/StatsCard";

// Mock data for organization
const organizationData = {
  name: "TechCorp Solutions",
  industry: "Technology",
  totalLearners: 156,
  activeTrainings: 12,
  completedTrainings: 87,
  coordinators: [
    { id: 1, name: "Sarah Johnson", email: "sarah.johnson@techcorp.com", phone: "+1-555-0123", status: "active" },
    { id: 2, name: "Mike Chen", email: "mike.chen@techcorp.com", phone: "+1-555-0124", status: "active" },
    { id: 3, name: "Emily Davis", email: "emily.davis@techcorp.com", phone: "+1-555-0125", status: "inactive" },
  ]
};

const trainingRecords = [
  { id: 1, title: "Safety Training", learners: 25, status: "ongoing", startDate: "2024-01-15", endDate: "2024-01-20" },
  { id: 2, title: "Leadership Development", learners: 15, status: "completed", startDate: "2024-01-10", endDate: "2024-01-14" },
  { id: 3, title: "Technical Skills", learners: 30, status: "scheduled", startDate: "2024-01-25", endDate: "2024-01-30" },
];

const learners = [
  { id: 1, name: "John Smith", email: "john.smith@techcorp.com", department: "Engineering", status: "active", trainings: 5 },
  { id: 2, name: "Sarah Wilson", email: "sarah.wilson@techcorp.com", department: "Marketing", status: "active", trainings: 3 },
  { id: 3, name: "Michael Brown", email: "michael.brown@techcorp.com", department: "HR", status: "inactive", trainings: 2 },
  { id: 4, name: "Lisa Davis", email: "lisa.davis@techcorp.com", department: "Finance", status: "active", trainings: 4 },
  { id: 5, name: "David Jones", email: "david.jones@techcorp.com", department: "Engineering", status: "active", trainings: 6 },
  { id: 6, name: "Emma Thompson", email: "emma.thompson@techcorp.com", department: "Operations", status: "active", trainings: 3 },
];

const OrganizationDashboard = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [learnerSearchTerm, setLearnerSearchTerm] = useState("");

  const filteredCoordinators = organizationData.coordinators.filter(coordinator =>
    coordinator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coordinator.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLearners = learners.filter(learner =>
    learner.name.toLowerCase().includes(learnerSearchTerm.toLowerCase()) ||
    learner.email.toLowerCase().includes(learnerSearchTerm.toLowerCase()) ||
    learner.department.toLowerCase().includes(learnerSearchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "inactive": return "bg-red-100 text-red-800";
      case "ongoing": return "bg-blue-100 text-blue-800";
      case "completed": return "bg-green-100 text-green-800";
      case "scheduled": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{organizationData.name}</h1>
          <p className="text-muted-foreground">{organizationData.industry} Organization</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatsCard
          title="Total Learners"
          value={organizationData.totalLearners}
          icon={Users}
        />
        <StatsCard
          title="Training Coordinators"
          value={organizationData.coordinators.length}
          icon={Users}
        />
      </div>

      {/* Tabs for Coordinators and Learners */}
      <Tabs defaultValue="coordinators" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="coordinators">Training Coordinators</TabsTrigger>
          <TabsTrigger value="learners">Organization Learners</TabsTrigger>
        </TabsList>
        
        <TabsContent value="coordinators">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Training Coordinators</CardTitle>
                <AddCoordinatorDialog onCoordinatorAdd={async () => {}} />
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search coordinators..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredCoordinators.map((coordinator) => (
                  <div key={coordinator.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{coordinator.name}</h3>
                        <p className="text-sm text-muted-foreground">{coordinator.email}</p>
                        <p className="text-sm text-muted-foreground">{coordinator.phone}</p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(coordinator.status)}>
                      {coordinator.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="learners">
          <Card>
            <CardHeader>
              <CardTitle>Organization Learners</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search learners..."
                  value={learnerSearchTerm}
                  onChange={(e) => setLearnerSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredLearners.map((learner) => (
                  <div key={learner.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{learner.name}</h3>
                        <p className="text-sm text-muted-foreground">{learner.email}</p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(learner.status)}>
                      {learner.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OrganizationDashboard;