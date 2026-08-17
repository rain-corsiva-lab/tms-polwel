import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, Search, Download, Loader2, Filter, Trash2, ChevronDown, FileSpreadsheet } from "lucide-react";
import Swal from "sweetalert2";
import ExcelJS from "exceljs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
// native select used for status/org-type to avoid portal scroll-jump
import { AddOrganisationDialog } from "@/components/AddOrganisationDialog";
import { clientOrganizationsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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

  // Excel-style filter state
  const [filters, setFilters] = useState<Record<string, string[]>>({
    status: [],
    organizationType: [],
  });
  const [openFilter, setOpenFilter] = useState<string | null>(null);

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

  const handleDeleteOrg = async (org: ClientOrg) => {
    const result = await Swal.fire({
      title: "Delete Client Organisation?",
      text: `Are you sure you want to deactivate and delete "${org.name}"? This will mark the organisation status as INACTIVE and soft-delete all linked training coordinator users. This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        const resp = await clientOrganizationsApi.delete(org.id);
        if (resp.success) {
          toast({
            title: "Deleted successfully",
            description: `Organisation "${org.name}" and its coordinators were soft-deleted.`,
          });
          fetchClientOrgs();
        } else {
          throw new Error(resp.error || "Failed to delete organisation");
        }
      } catch (error: any) {
        console.error("Error deleting organisation:", error);
        toast({
          title: "Delete failed",
          description: error.message || "An error occurred during deletion",
          variant: "destructive",
        });
      }
    }
  };

  // Helper function to export styled Excel file
  const exportToStyledExcel = async (
    filename: string,
    sheetName: string,
    columns: Array<{ header: string; key: string }>,
    data: Record<string, any>[]
  ) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName, {
      views: [{ showGridLines: true }],
    });

    // Define columns
    worksheet.columns = columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: 20,
    }));

    // Add data rows
    data.forEach((item) => {
      worksheet.addRow(item);
    });

    // Style Header Row (Row 1)
    const headerRow = worksheet.getRow(1);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.font = {
        name: "Calibri",
        size: 11,
        bold: true,
        color: { argb: "FF000000" },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEEEEEE" }, // #eee gray background
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "left",
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFD0D0D0" } },
        left: { style: "thin", color: { argb: "FFD0D0D0" } },
        bottom: { style: "medium", color: { argb: "FFB0B0B0" } },
        right: { style: "thin", color: { argb: "FFD0D0D0" } },
      };
    });

    // Style Data Rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      row.height = 22;
      row.eachCell((cell) => {
        cell.font = {
          name: "Calibri",
          size: 10,
          color: { argb: "FF222222" },
        };
        cell.alignment = {
          vertical: "middle",
          horizontal: "left",
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFEAEAEA" } },
          left: { style: "thin", color: { argb: "FFEAEAEA" } },
          bottom: { style: "thin", color: { argb: "FFEAEAEA" } },
          right: { style: "thin", color: { argb: "FFEAEAEA" } },
        };
      });
    });

    // Auto-fit column widths based on maximum content length
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const cellValue = cell.value !== undefined && cell.value !== null ? String(cell.value) : "";
        if (cellValue.length > maxLength) {
          maxLength = cellValue.length;
        }
      });
      // Safety padding + minimum column width
      column.width = Math.max(maxLength + 4, 14);
    });

    // Write buffer and trigger browser download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportOrganizations = async () => {
    try {
      setExporting(true);
      const response = await clientOrganizationsApi.getAll({
        search: searchTerm || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        organizationType: orgTypeFilter !== "ALL_TYPES" ? orgTypeFilter : undefined,
        all: true,
      });

      const orgList = response.organizations || [];

      // Calculate maximum number of TCs across all organizations (at least 1)
      const maxTCs = Math.max(
        ...orgList.map((org: any) => (Array.isArray(org.coordinators) ? org.coordinators.length : 0)),
        1
      );

      // Base columns
      const columns: Array<{ header: string; key: string }> = [
        { header: "Name", key: "Name" },
        { header: "OrganisationType", key: "OrganisationType" },
        { header: "Status", key: "Status" },
        { header: "Coordinators", key: "Coordinators" },
        { header: "Participants", key: "Participants" },
        { header: "ContactEmail", key: "ContactEmail" },
        { header: "ContactPhone", key: "ContactPhone" },
        { header: "BUNumber", key: "BUNumber" },
        { header: "CreatedAt", key: "CreatedAt" },
        { header: "UpdatedAt", key: "UpdatedAt" },
      ];

      // Dynamically append 4 columns per TC at the very end / right side
      for (let i = 1; i <= maxTCs; i++) {
        columns.push(
          { header: `TC${i} Name`, key: `TC${i}_Name` },
          { header: `TC${i} Contact`, key: `TC${i}_Contact` },
          { header: `TC${i} Email`, key: `TC${i}_Email` },
          { header: `TC${i} Designation`, key: `TC${i}_Designation` }
        );
      }

      // Map rows with dynamic TC columns
      const rows = orgList.map((org: any) => {
        const rowData: Record<string, any> = {
          Name: org.name ?? "",
          OrganisationType:
            org.organizationType === "PUBLIC_SECTOR"
              ? "Public Sector"
              : org.organizationType === "PRIVATE_SECTOR"
              ? "Private Sector"
              : org.organizationType ?? "",
          Status: org.status ?? "",
          Coordinators: org.coordinatorsCount ?? (org.coordinators?.length || 0),
          Participants: org.learnersCount ?? 0,
          ContactEmail: org.contactEmail ?? "",
          ContactPhone: org.contactPhone ?? "",
          BUNumber: org.buNumber ?? "",
          CreatedAt: org.createdAt ?? "",
          UpdatedAt: org.updatedAt ?? "",
        };

        const tcList = Array.isArray(org.coordinators) ? org.coordinators : [];
        for (let i = 1; i <= maxTCs; i++) {
          const tc = tcList[i - 1];
          rowData[`TC${i}_Name`] = tc?.name ?? "";
          rowData[`TC${i}_Contact`] = tc?.contactNumber ?? tc?.contact ?? "";
          rowData[`TC${i}_Email`] = tc?.email ?? "";
          rowData[`TC${i}_Designation`] = tc?.designation ?? "";
        }

        return rowData;
      });

      await exportToStyledExcel("client_organisations.xlsx", "Client Organisations", columns, rows);

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

  const handleExportCoordinators = async () => {
    try {
      setExporting(true);
      const response = await clientOrganizationsApi.getAllCoordinatorsExport();
      const coordinators = response.coordinators || [];

      const rows = coordinators.map((tc: any) => ({
        Name: tc.name ?? "",
        Email: tc.email ?? "",
        Contact: tc.contact ?? "",
        Designation: tc.designation ?? "",
        Status: tc.status ?? "",
      }));

      const columns = [
        { header: "Name", key: "Name" },
        { header: "Email", key: "Email" },
        { header: "Contact", key: "Contact" },
        { header: "Designation", key: "Designation" },
        { header: "Status", key: "Status" },
      ];

      await exportToStyledExcel("training_coordinators.xlsx", "Training Coordinators", columns, rows);

      toast({
        title: "Exported",
        description: `Exported ${rows.length} unique training coordinator${rows.length === 1 ? "" : "s"}.`,
      });
    } catch (error) {
      console.error("Error exporting training coordinators:", error);
      toast({
        title: "Export failed",
        description: "We couldn't export the training coordinator list. Please try again.",
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

  // Excel-style filter functions
  const getUniqueValues = (field: keyof ClientOrg) => {
    const values = Array.from(new Set(clientOrgs.map((org) => String(org[field] || "")).filter(Boolean)));
    return values.sort();
  };

  const handleFilterToggle = (field: string, value: string) => {
    setFilters((prev) => {
      const current = prev[field] || [];
      const newValues = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [field]: newValues };
    });
  };

  const clearColumnFilter = (field: string) => {
    setFilters((prev) => ({ ...prev, [field]: [] }));
  };

  const hasActiveFilter = (field: string) => {
    return filters[field] && filters[field].length > 0;
  };

  // Apply column filters
  const filteredClientOrgs = clientOrgs.filter((org) => {
    // Status filter
    if (filters.status.length > 0 && !filters.status.includes(org.status)) {
      return false;
    }
    // Organization Type filter
    if (filters.organizationType.length > 0 && org.organizationType && !filters.organizationType.includes(org.organizationType)) {
      return false;
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Client Organisation</h1>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={exporting}>
                {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                {exporting ? "Exporting..." : "Export"}
                <ChevronDown className="h-4 w-4 ml-1 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuItem onClick={handleExportCoordinators} className="cursor-pointer">
                <Download className="h-4 w-4 mr-2 text-primary" />
                Training Coordinator List (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportOrganizations} className="cursor-pointer">
                <Download className="h-4 w-4 mr-2 text-primary" />
                Client Organisation (.xlsx)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
              <TableHead>
                <div className="flex items-center justify-between gap-2">
                  <span>Organisation Type</span>
                  <Popover open={openFilter === "organizationType"} onOpenChange={(open) => setOpenFilter(open ? "organizationType" : null)}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className={cn("h-7 w-7 p-0", hasActiveFilter("organizationType") && "text-primary")}>
                        <Filter className="h-3.5 w-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-0" align="start">
                      <div className="p-3 border-b">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Filter by Type</span>
                          {hasActiveFilter("organizationType") && (
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => clearColumnFilter("organizationType")}>
                              Clear
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="max-h-64 overflow-y-auto p-2">
                        {getUniqueValues("organizationType").map((value) => (
                          <div
                            key={value}
                            className="flex items-center space-x-2 py-1.5 px-2 hover:bg-muted rounded-sm cursor-pointer"
                            onClick={() => handleFilterToggle("organizationType", value)}
                          >
                            <Checkbox checked={filters.organizationType?.includes(value)} />
                            <span className="text-sm">{value}</span>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </TableHead>
              <TableHead>Coordinators</TableHead>
              <TableHead>Participants</TableHead>
              <TableHead>
                <div className="flex items-center justify-between gap-2">
                  <span>Status</span>
                  <Popover open={openFilter === "status"} onOpenChange={(open) => setOpenFilter(open ? "status" : null)}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className={cn("h-7 w-7 p-0", hasActiveFilter("status") && "text-primary")}>
                        <Filter className="h-3.5 w-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-0" align="start">
                      <div className="p-3 border-b">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Filter by Status</span>
                          {hasActiveFilter("status") && (
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => clearColumnFilter("status")}>
                              Clear
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="max-h-64 overflow-y-auto p-2">
                        {getUniqueValues("status").map((value) => (
                          <div
                            key={value}
                            className="flex items-center space-x-2 py-1.5 px-2 hover:bg-muted rounded-sm cursor-pointer"
                            onClick={() => handleFilterToggle("status", value)}
                          >
                            <Checkbox checked={filters.status?.includes(value)} />
                            <span className="text-sm">{value}</span>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </TableHead>
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
            ) : filteredClientOrgs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Building2 className="h-8 w-8" />
                    <div>No organisations found</div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredClientOrgs.map((org) => (
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
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-2">
                      <Link to={`/client-organisations/${org.id}`}>
                        <Button variant="outline" size="sm">
                          Manage
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-900 hover:bg-red-50"
                        onClick={() => handleDeleteOrg(org)}
                        title="Delete Client Organisation"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
