import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Eye, Download, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { venuesApi, type Venue } from "@/lib/api";
import { errorHandlers, getErrorMessage } from "@/lib/errorHandler";
import { Input } from "@/components/ui/input";
import PaginationControls from "@/components/ui/pagination";
import * as XLSX from "xlsx";

const VenueArchive = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const [exporting, setExporting] = useState(false);

  // Pagination state
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [perPage, setPerPage] = useState(10);

  // Debounce search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  useEffect(() => {
    // Reset to page 1 when search changes
    setPagination((p) => ({ ...p, page: 1 }));
  }, [debouncedSearch]);

  useEffect(() => {
    loadVenues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, pagination.page, perPage]);

  const loadVenues = async () => {
    try {
      setLoading(true);
      const response = await venuesApi.getAll({
        search: debouncedSearch || undefined,
        page: pagination.page,
        limit: perPage,
      });

      if (response.success) {
        setVenues(response.venues || []);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else {
        toast({
          title: "Error",
          description: getErrorMessage(response, "Failed to load venues"),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error loading venues:", error);
      errorHandlers.venueLoad(error, toast);
    } finally {
      setLoading(false);
      setInitialLoadComplete(true);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      toast({
        title: "Exporting...",
        description: "Generating venues export...",
      });

      // Fetch all venues for export (no pagination limit)
      const exportResponse = await venuesApi.getAll({
        search: debouncedSearch || undefined,
        limit: "all",
      });
      const allVenues: Venue[] = exportResponse.venues || [];

      const dataToExport = allVenues.map((venue: any) => ({
        Name: venue.name,
        Address: venue.address || "N/A",
        Capacity: venue.capacity || "N/A",
        Fee: venue.fee || "N/A",
        Status: venue.status || "ACTIVE",
        CreatedDate: venue.createdAt ? new Date(venue.createdAt).toLocaleDateString() : "N/A",
      }));

      if (dataToExport.length === 0) {
        toast({
          title: "No data",
          description: "No venues to export",
          variant: "destructive",
        });
        return;
      }

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Venues");
      XLSX.writeFile(wb, `venues-${new Date().toISOString().split("T")[0]}.xlsx`);
      toast({
        title: "Export successful",
        description: `Exported ${dataToExport.length} venue${dataToExport.length === 1 ? "" : "s"}`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: "We couldn't export venues. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await venuesApi.delete(id);

      if (response.success) {
        toast({
          title: "Success",
          description: "Venue deleted successfully",
        });
        loadVenues(); // Reload the list
      } else {
        toast({
          title: "Error",
          description: getErrorMessage(response, "Failed to delete venue"),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error deleting venue:", error);
      errorHandlers.venueDelete(error, toast);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
        return <Badge variant="default">Active</Badge>;
      case "INACTIVE":
        return <Badge variant="secondary">Inactive</Badge>;
      case "MAINTENANCE":
        return <Badge variant="destructive">Maintenance</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!initialLoadComplete && loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading venues...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Venue Management</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} disabled={exporting || venues.length === 0} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            {exporting ? "Exporting..." : "Export"}
          </Button>
          <Button onClick={() => navigate("/venue-setup/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Add New Venue
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search venues by name or address..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1" />
            {searchQuery && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setSearchQuery("")}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="relative">
        {loading && initialLoadComplete && (
          <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Refreshing venues…</p>
          </div>
        )}
        <CardHeader>
          <CardTitle>All Training Venues</CardTitle>
        </CardHeader>
        <CardContent>
          {venues.length === 0 && !loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No venues found</p>
              <Button onClick={() => navigate("/venue-setup/new")}>
                <Plus className="h-4 w-4 mr-2" />
                Add New Venue
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Venue Name</TableHead>
                    <TableHead>Venue Type</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Fee Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {venues.map((venue) => (
                    <TableRow key={venue.id}>
                      <TableCell className="font-medium">{venue.name}</TableCell>
                      <TableCell>{venue.venueType ? venue.venueType.replace(/_/g, " ") : "N/A"}</TableCell>
                      <TableCell>{venue.capacity || "Not specified"}</TableCell>
                      <TableCell>${venue.fee}</TableCell>
                      <TableCell>{getStatusBadge(venue.status || "ACTIVE")}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => navigate(`/venue-detail/${venue.id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => navigate(`/venue-setup/edit/${venue.id}`)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(venue.id, venue.name)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="border-t mt-4 px-1">
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VenueArchive;
