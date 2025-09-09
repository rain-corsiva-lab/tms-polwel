import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Users, UserCheck, Search, ExternalLink } from "lucide-react";
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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Coordinators</TableHead>
                <TableHead className="text-center">Learners</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrgs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center space-y-4">
                      <Building2 className="h-12 w-12 text-muted-foreground" />
                      <div>
                        <h3 className="text-lg font-semibold text-muted-foreground mb-2">No organizations found</h3>
                        <p className="text-muted-foreground">
                          {searchTerm ? "Try adjusting your search terms" : "No client organizations have been added yet"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrgs.map((org) => (
                  <TableRow key={org.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Building2 className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-medium">{org.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">{org.industry || "-"}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={org.status === "ACTIVE" ? "default" : "secondary"}>
                        {org.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <UserCheck className="h-3 w-3 text-muted-foreground" />
                        <span>{org.coordinatorsCount}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span>{org.learnersCount}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link to={`/client-organisations/${org.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <ExternalLink className="h-4 w-4" />
                          <span className="sr-only">View organization details</span>
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default ClientOrganisations;