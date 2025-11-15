import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, Search, Download, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
// native select used for status/org-type to avoid portal scroll-jump
import { AddOrganisationDialog } from "@/components/AddOrganisationDialog";
import { clientOrganizationsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PaginationControls from "@/components/ui/pagination";

interface ClientOrg {
  id: string;
  name: string;
  organizationType?: "POLWEL" | "SPF" | "PUBLIC_SECTOR" | "PRIVATE_SECTOR";
  coordinatorsCount: number;
  learnersCount: number;
  status: "ACTIVE" | "INACTIVE";
}

const ClientOrganisations = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [clientOrgs, setClientOrgs] = useState<ClientOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [orgTypeFilter, setOrgTypeFilter] = useState<"ALL_TYPES" | "POLWEL" | "SPF" | "PUBLIC_SECTOR" | "PRIVATE_SECTOR">("ALL_TYPES");
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0,
  });
  const [perPage, setPerPage] = useState(10);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  // No dummy data: always fetch from server. In case of error we show an empty list and surface a toast.

  // Fetch client organisations from API
  const fetchClientOrgs = async (pageArg?: number, limitArg?: number) => {
    try {
      setLoading(true);
      const pageToUse = pageArg ?? pagination.page;
      const limitToUse = limitArg ?? perPage;

      const response = await clientOrganizationsApi.getAll({
        page: pageToUse,
        limit: limitToUse,
        search: searchTerm || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        organizationType: orgTypeFilter !== "ALL_TYPES" ? orgTypeFilter : undefined,
      });

      // Map backend data to frontend interface
      const mappedOrgs: ClientOrg[] =
        response.organizations?.map((org: any) => ({
          id: org.id,
          name: org.name ?? org.displayName ?? org.display_name ?? "",
          organizationType: org.organizationType,
          coordinatorsCount: org.coordinatorsCount || 0,
          learnersCount: org.learnersCount || 0,
          status: org.status,
        })) || [];

      setClientOrgs(mappedOrgs);
      setPagination(
        response.pagination || { page: pageToUse, total: mappedOrgs.length, totalPages: Math.max(1, Math.ceil((mappedOrgs.length || 0) / limitToUse)) }
      );
    } catch (error) {
      console.error("Error fetching client organizations:", error);
      // If fetch fails, show empty list and surface a toast so user is aware
      setClientOrgs([]);
      setPagination((p) => ({ ...p, total: 0, totalPages: 0 }));
      toast({ title: "Failed to fetch client organisations", description: "Please try again later.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const t = setTimeout(() => {
      setPagination((p) => ({ ...p, page: 1 }));
      fetchClientOrgs(1);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // Immediate refetch on page, status, org type, or perPage changes
  useEffect(() => {
    fetchClientOrgs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, statusFilter, orgTypeFilter, perPage]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await clientOrganizationsApi.getAll({
        search: searchTerm || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        organizationType: orgTypeFilter !== "ALL_TYPES" ? orgTypeFilter : undefined,
        all: true,
      });

      const rows = (response.organizations || []).map((org: any) => ({
        Name: org.name ?? "",
        OrganisationType:
          org.organizationType === "PUBLIC_SECTOR"
            ? "Public Sector"
            : org.organizationType === "PRIVATE_SECTOR"
            ? "Private Sector"
            : org.organizationType ?? "",
        Status: org.status ?? "",
        Coordinators: org.coordinatorsCount ?? 0,
        Learners: org.learnersCount ?? 0,
        ContactEmail: org.contactEmail ?? "",
        ContactPhone: org.contactPhone ?? "",
        BUNumber: org.buNumber ?? "",
        CreatedAt: org.createdAt ?? "",
        UpdatedAt: org.updatedAt ?? "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Client Organisations");
      XLSX.writeFile(workbook, "client_organisations.xlsx");
      toast({
        title: "Exported",
        description: `Exported ${rows.length} client organisation${rows.length === 1 ? "" : "s"}.`,
      });
    } catch (error) {
      console.error("Error exporting client organisations:", error);
      toast({
        title: "Export failed",
        description: "We couldn't export the client organisations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const orgTypeOptions = useMemo(
    () => [
      { value: "ALL_TYPES", label: "All Types" },
      { value: "POLWEL", label: "POLWEL" },
      { value: "SPF", label: "SPF" },
      { value: "PUBLIC_SECTOR", label: "Public Sector" },
      { value: "PRIVATE_SECTOR", label: "Private Sector" },
    ],
    []
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Client Organisation</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            {exporting ? "Exporting..." : "Export"}
          </Button>
          <AddOrganisationDialog onOrganisationCreated={fetchClientOrgs} />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input placeholder="Search client organisations..." value={searchTerm} onChange={(e) => handleSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="w-40">
          <label className="sr-only" htmlFor="statusSelect">
            Status
          </label>
          <select
            id="statusSelect"
            value={statusFilter}
            onChange={(e) => {
              const v = e.target.value as any;
              setStatusFilter(v);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="h-9 rounded-md border bg-background px-3 py-1 text-sm w-full"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
        <div className="w-48">
          {/* Native select used to avoid portal/scroll jump caused by popover-based selects */}
          <label className="sr-only" htmlFor="orgTypeSelect">
            Organisation Type
          </label>
          <select
            id="orgTypeSelect"
            value={orgTypeFilter}
            onChange={(e) => {
              const v = e.target.value as any;
              setOrgTypeFilter(v);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="h-9 rounded-md border bg-background px-3 py-1 text-sm w-full"
          >
            {orgTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Organisation Type</TableHead>
              <TableHead>Coordinators</TableHead>
              <TableHead>Learners</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span>Loading client organisations...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : clientOrgs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Building2 className="h-8 w-8" />
                    <div>No organisations found</div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              clientOrgs.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <Link to={`/client-organisations/${org.id}`} className="text-primary hover:underline">
                      {org.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {org.organizationType ? (
                      <Badge variant="outline">
                        {org.organizationType === "PUBLIC_SECTOR"
                          ? "Public Sector"
                          : org.organizationType === "PRIVATE_SECTOR"
                          ? "Private Sector"
                          : org.organizationType}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{org.coordinatorsCount}</TableCell>
                  <TableCell>{org.learnersCount}</TableCell>
                  <TableCell>
                    <Badge variant={org.status === "ACTIVE" ? "default" : "secondary"}>{org.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to={`/client-organisations/${org.id}`}>
                      <Button variant="outline" size="sm">
                        Manage
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="px-1">
        <PaginationControls
          page={pagination.page}
          perPage={perPage}
          total={pagination.total}
          onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
          onPerPageChange={(pp) => {
            setPerPage(pp);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
        />
      </div>
    </div>
  );
};

export default ClientOrganisations;
