import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, UserCheck, Calendar, Search, Plus } from "lucide-react";
import { AddOrganisationDialog } from "@/components/AddOrganisationDialog";
import { clientOrganizationsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface ClientOrg {
  id: string;
  name: string;
  industry: string;
  coordinatorsCount: number;
  learnersCount: number;
  status: "ACTIVE" | "INACTIVE";
}

const ClientOrganisations = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [clientOrgs, setClientOrgs] = useState<ClientOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50, // Load more items for grid view
    total: 0,
    totalPages: 0,
  });
  const { toast } = useToast();

  // Dummy data for client organizations
  const dummyClientOrgs: ClientOrg[] = [
    {
      id: "1",
      name: "TechCorp Singapore",
      industry: "Technology",
      coordinatorsCount: 3,
      learnersCount: 45,
      status: "ACTIVE"
    },
    {
      id: "2", 
      name: "Healthcare Solutions Pte Ltd",
      industry: "Healthcare",
      coordinatorsCount: 2,
      learnersCount: 28,
      status: "ACTIVE"
    },
    {
      id: "3",
      name: "Financial Services Group",
      industry: "Finance",
      coordinatorsCount: 4,
      learnersCount: 67,
      status: "ACTIVE"
    },
    {
      id: "4",
      name: "Manufacturing Excellence",
      industry: "Manufacturing",
      coordinatorsCount: 1,
      learnersCount: 15,
      status: "INACTIVE"
    },
    {
      id: "5",
      name: "Education Partners",
      industry: "Education",
      coordinatorsCount: 2,
      learnersCount: 32,
      status: "ACTIVE"
    }
  ];

  // Fetch client organizations from API
  const fetchClientOrgs = async () => {
    try {
      setLoading(true);
      const response = await clientOrganizationsApi.getAll({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm || undefined,
      });

      // Map backend data to frontend interface
      const mappedOrgs = response.organizations?.map(org => ({
        id: org.id,
        name: org.name,
        industry: org.industry || "",
        coordinatorsCount: org.coordinatorsCount || 0,
        learnersCount: org.learnersCount || 0,
        status: org.status,
      })) || [];

      setClientOrgs(mappedOrgs);
      setPagination(response.pagination || pagination);
    } catch (error) {
      console.error('Error fetching client organizations:', error);
      // Use dummy data when API fails
      setClientOrgs(dummyClientOrgs);
      setPagination({
        page: 1,
        limit: 50,
        total: dummyClientOrgs.length,
        totalPages: 1
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch organizations on component mount and when search changes
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchClientOrgs();
    }, 300); // Debounce search

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  // Filter client orgs based on search term (for immediate UI feedback)
  const filteredOrgs = clientOrgs.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.industry.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Client Organisation</h1>
          <p className="text-muted-foreground">Manage client organisations and their training programs</p>
        </div>
        <AddOrganisationDialog onOrganisationCreated={fetchClientOrgs} />
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search client organisations..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading client organizations...</p>
          </div>
        </div>
      ) : (
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
                    <Badge variant={org.status === "ACTIVE" ? "default" : "secondary"}>
                      {org.status}
                    </Badge>
                  </div>
                  {org.industry && <CardDescription>{org.industry}</CardDescription>}
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

          {filteredOrgs.length === 0 && !loading && (
            <div className="col-span-full text-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">No organizations found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? "Try adjusting your search terms" : "No client organizations have been added yet"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClientOrganisations;