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

  // Dummy venue data
  const dummyVenues: Venue[] = [
    {
      id: "1",
      name: "POLWEL Training Center - Main Hall",
      capacity: "120",
      feeType: "per_venue",
      fee: 800,
      status: "ACTIVE",
      address: "123 Training Avenue, Singapore 138588",
      contacts: [{ id: "1", name: "John Manager", number: "+65 6234 5678", email: "john@polwel.com" }],
      facilities: ["Air conditioning", "Projector", "Whiteboard", "WiFi"],
      remarks: "Main training facility with full amenities"
    },
    {
      id: "2", 
      name: "Marina Bay Conference Center",
      capacity: "200",
      feeType: "per_venue",
      fee: 1200,
      status: "ACTIVE",
      address: "10 Marina Boulevard, Singapore 018983",
      contacts: [{ id: "2", name: "Sarah Lee", number: "+65 6688 8826", email: "sarah@marinabay.com" }],
      facilities: ["Premium AV equipment", "Catering available", "Breakout rooms"],
      remarks: "Premium conference venue with full service"
    },
    {
      id: "3",
      name: "Corporate Training Room A",
      capacity: "40",
      feeType: "per_head", 
      fee: 25,
      status: "ACTIVE",
      address: "50 Raffles Place, Singapore 048623",
      contacts: [{ id: "3", name: "Mike Tan", number: "+65 6533 8899", email: "mike@corporate.com" }],
      facilities: ["Smart board", "Video conferencing", "Coffee station"],
      remarks: "Intimate corporate setting ideal for workshops"
    },
    {
      id: "4",
      name: "Innovation Hub - Workshop Space",
      capacity: "60",
      feeType: "per_venue",
      fee: 600,
      status: "ACTIVE", 
      address: "1 Fusionopolis Place, Singapore 138522",
      contacts: [{ id: "4", name: "Lisa Wong", number: "+65 6602 3188", email: "lisa@innohub.sg" }],
      facilities: ["Modular furniture", "High-speed internet", "Collaborative tools"],
      remarks: "Modern workspace perfect for innovation workshops"
    },
    {
      id: "5",
      name: "Executive Meeting Room",
      capacity: "16",
      feeType: "per_head",
      fee: 35,
      status: "ACTIVE",
      address: "2 Shenton Way, Singapore 068804", 
      contacts: [{ id: "5", name: "David Lim", number: "+65 6224 1900", email: "david@executive.sg" }],
      facilities: ["Premium furnishing", "Executive amenities", "Private dining"],
      remarks: "Exclusive boardroom for executive training"
    },
    {
      id: "6",
      name: "Community Center Hall B", 
      capacity: "80",
      feeType: "per_venue",
      fee: 300,
      status: "MAINTENANCE",
      address: "15 Community Street, Singapore 169846",
      contacts: [{ id: "6", name: "Amy Chen", number: "+65 6270 7788", email: "amy@community.sg" }],
      facilities: ["Basic AV", "Parking available", "Wheelchair accessible"],
      remarks: "Currently under maintenance - available from next month"
    },
    {
      id: "7",
      name: "Hotel Seminar Room",
      capacity: "30",
      feeType: "per_head",
      fee: 45,
      status: "ACTIVE",
      address: "2 Stamford Road, Singapore 178882",
      contacts: [{ id: "7", name: "Robert Kim", number: "+65 6338 8585", email: "robert@hotel.com" }], 
      facilities: ["Hotel amenities", "Catering services", "Concierge support"],
      remarks: "Luxury hotel environment with full hospitality service"
    },
    {
      id: "8",
      name: "Online Virtual Platform",
      capacity: "500",
      feeType: "per_head",
      fee: 5,
      status: "ACTIVE",
      address: "Virtual - Cloud Based",
      contacts: [{ id: "8", name: "Tech Support", number: "+65 6789 0123", email: "support@virtual.com" }],
      facilities: ["HD video", "Screen sharing", "Breakout rooms", "Recording"],
      remarks: "Scalable virtual training platform"
    },
    {
      id: "9",
      name: "University Lecture Theatre",
      capacity: "150",
      feeType: "per_venue", 
      fee: 750,
      status: "INACTIVE",
      address: "21 Lower Kent Ridge Road, Singapore 119077",
      contacts: [{ id: "9", name: "Prof. Williams", number: "+65 6516 6666", email: "williams@university.edu" }],
      facilities: ["Tiered seating", "Advanced AV", "Academic atmosphere"],
      remarks: "Academic venue - currently not available for external bookings"
    },
    {
      id: "10",
      name: "Client Site - Flexible",
      capacity: "Variable",
      feeType: "per_head",
      fee: 50,
      status: "ACTIVE",
      address: "Various client locations",
      contacts: [{ id: "10", name: "Mobile Team Lead", number: "+65 6234 5678", email: "mobile@polwel.com" }],
      facilities: ["Customizable setup", "On-site support", "Equipment rental"],
      remarks: "Flexible on-site training at client premises"
    }
  ];

  useEffect(() => {
    loadVenues();
  }, []);

  const loadVenues = async () => {
    try {
      setLoading(true);
      const response = await venuesApi.getAll();
      
      if (response.success && response.data && response.data.length > 0) {
        setVenues(response.data);
      } else {
        // Load dummy data when no venues from API
        setVenues(dummyVenues);
      }
    } catch (error) {
      console.error('Error loading venues:', error);
      // Fallback to dummy data on error
      setVenues(dummyVenues);
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