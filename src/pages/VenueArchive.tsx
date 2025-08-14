import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { venuesApi, type Venue } from "@/lib/api";

const VenueArchive = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVenues();
  }, []);

  const loadVenues = async () => {
    try {
      setLoading(true);
      const response = await venuesApi.getAll();
      
      if (response.success) {
        setVenues(response.data || []);
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to load venues",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading venues:', error);
      toast({
        title: "Error",
        description: "Failed to load venues",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
          description: response.error || "Failed to delete venue",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting venue:', error);
      toast({
        title: "Error",
        description: "Failed to delete venue",
        variant: "destructive",
      });
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

  const getFeeTypeBadge = (feeType: string) => {
    switch (feeType?.toLowerCase()) {
      case "per_head":
        return <Badge variant="default">Per Head</Badge>;
      case "per_venue":
        return <Badge variant="secondary">Per Venue</Badge>;
      default:
        return <Badge variant="outline">{feeType}</Badge>;
    }
  };

  if (loading) {
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
        <h1 className="text-3xl font-bold text-foreground">Venue Management</h1>
        <Button onClick={() => navigate('/venue-setup/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Venue
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Training Venues</CardTitle>
        </CardHeader>
        <CardContent>
          {venues.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No venues found</p>
              <Button onClick={() => navigate('/venue-setup/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Venue
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Venue Name</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Fee Type</TableHead>
                  <TableHead>Fee Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {venues.map((venue) => (
                  <TableRow key={venue.id}>
                    <TableCell className="font-medium">{venue.name}</TableCell>
                    <TableCell>{venue.capacity || 'Not specified'}</TableCell>
                    <TableCell>
                      {getFeeTypeBadge(venue.feeType)}
                    </TableCell>
                    <TableCell>${venue.fee}</TableCell>
                    <TableCell>{getStatusBadge(venue.status || 'ACTIVE')}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/venue-detail/${venue.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/venue-setup/edit/${venue.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(venue.id, venue.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VenueArchive;