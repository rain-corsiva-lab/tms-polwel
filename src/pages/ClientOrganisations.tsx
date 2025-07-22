import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, UserCheck, Calendar, Search, Plus } from "lucide-react";
import { AddOrganisationDialog } from "@/components/AddOrganisationDialog";

interface ClientOrg {
  id: string;
  name: string;
  industry: string;
  coordinatorsCount: number;
  learnersCount: number;
  status: "active" | "inactive";
}

const mockClientOrgs: ClientOrg[] = [
  {
    id: "1",
    name: "Ang Mo Kio",
    industry: "SPF",
    coordinatorsCount: 3,
    learnersCount: 45,
    status: "active"
  },
  {
    id: "2", 
    name: "Choa Chu Kang",
    industry: "SPF",
    coordinatorsCount: 2,
    learnersCount: 28,
    status: "active"
  },
  {
    id: "3",
    name: "Yishun",
    industry: "SPF", 
    coordinatorsCount: 4,
    learnersCount: 67,
    status: "active"
  },
  {
    id: "4",
    name: "Corsiva Lab",
    industry: "Technology",
    coordinatorsCount: 1,
    learnersCount: 15,
    status: "active"
  }
];

const ClientOrganisations = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredOrgs, setFilteredOrgs] = useState(mockClientOrgs);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    const filtered = mockClientOrgs.filter(org =>
      org.name.toLowerCase().includes(value.toLowerCase()) ||
      org.industry.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredOrgs(filtered);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clients</h1>
          <p className="text-muted-foreground">Manage clients and their training programs</p>
        </div>
        <AddOrganisationDialog />
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOrgs.map((org) => (
          <Link key={org.id} to={`/client-organisations/${org.id}`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{org.name}</CardTitle>
                  </div>
                  <Badge variant={org.status === "active" ? "default" : "secondary"}>
                    {org.status}
                  </Badge>
                </div>
                <CardDescription>{org.industry}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Coordinators</span>
                    </div>
                    <span className="font-semibold">{org.coordinatorsCount}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Learners</span>
                    </div>
                    <span className="font-semibold">{org.learnersCount}</span>
                  </div>
                  
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ClientOrganisations;