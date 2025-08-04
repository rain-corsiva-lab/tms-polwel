import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Eye } from "lucide-react";

interface Venue {
  id: string;
  name: string;
  capacity: string;
  feeType: "per_head" | "per_venue";
  fee: number;
  contactNumber: string;
  contactEmail: string;
  remarks: string;
  status: "active" | "inactive";
}

const VenueArchive = () => {
  const navigate = useNavigate();
  
  const [venues] = useState<Venue[]>([
    {
      id: "1",
      name: "Orchard Hotel",
      capacity: "70-80%",
      feeType: "per_head",
      fee: 25,
      contactNumber: "+65 6734 7766",
      contactEmail: "events@orchardhotel.com.sg",
      remarks: "Includes refreshments and WiFi. Minimum 20 pax required.",
      status: "active"
    },
    {
      id: "2", 
      name: "POLWEL Learning Pod",
      capacity: "25 pax",
      feeType: "per_venue",
      fee: 300,
      contactNumber: "+65 6123 4567",
      contactEmail: "bookings@polwel.org.sg",
      remarks: "Projector and whiteboard included. Tea/coffee service available.",
      status: "active"
    },
    {
      id: "3",
      name: "Marina Bay Conference Center",
      capacity: "150 pax",
      feeType: "per_venue",
      fee: 800,
      contactNumber: "+65 6555 1234",
      contactEmail: "events@mbcc.com.sg",
      remarks: "Premium location with full AV equipment. Catering options available.",
      status: "inactive"
    }
  ]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Active</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Venue Archive</h1>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Venue Name</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Fee Type</TableHead>
                <TableHead>Fee Amount</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {venues.map((venue) => (
                <TableRow key={venue.id}>
                  <TableCell className="font-medium">{venue.name}</TableCell>
                  <TableCell>{venue.capacity}</TableCell>
                  <TableCell>
                    <Badge variant={venue.feeType === "per_head" ? "default" : "secondary"}>
                      {venue.feeType === "per_head" ? "Per Head" : "Per Venue"}
                    </Badge>
                  </TableCell>
                  <TableCell>${venue.fee}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{venue.contactNumber}</div>
                      <div className="text-muted-foreground">{venue.contactEmail}</div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(venue.status)}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/venue-setup/view/${venue.id}`)}
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
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default VenueArchive;