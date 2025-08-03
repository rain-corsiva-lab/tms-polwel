import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2 } from "lucide-react";

interface Venue {
  id: string;
  name: string;
  capacity: string;
  feeType: "per_head" | "per_venue";
  fee: number;
  contactNumber: string;
  contactEmail: string;
  remarks: string;
}

const VenueSetup = () => {
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: "",
    capacity: "",
    feeType: "per_head" as "per_head" | "per_venue",
    fee: 0,
    contactNumber: "",
    contactEmail: "",
    remarks: ""
  });

  const [venues, setVenues] = useState<Venue[]>([
    {
      id: "1",
      name: "Orchard Hotel",
      capacity: "70-80%",
      feeType: "per_head",
      fee: 25,
      contactNumber: "+65 6734 7766",
      contactEmail: "events@orchardhotel.com.sg",
      remarks: "Includes refreshments and WiFi. Minimum 20 pax required."
    },
    {
      id: "2", 
      name: "POLWEL Learning Pod",
      capacity: "25 pax",
      feeType: "per_venue",
      fee: 300,
      contactNumber: "+65 6123 4567",
      contactEmail: "bookings@polwel.org.sg",
      remarks: "Projector and whiteboard included. Tea/coffee service available."
    }
  ]);

  const [editingId, setEditingId] = useState<string | null>(null);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.contactNumber || !formData.contactEmail) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (editingId) {
      // Update existing venue
      setVenues(prev => prev.map(venue => 
        venue.id === editingId 
          ? { ...formData, id: editingId }
          : venue
      ));
      setEditingId(null);
      toast({
        title: "Venue Updated",
        description: "Venue has been successfully updated"
      });
    } else {
      // Add new venue
      const newVenue: Venue = {
        ...formData,
        id: Date.now().toString()
      };
      setVenues(prev => [...prev, newVenue]);
      toast({
        title: "Venue Added",
        description: "Venue has been successfully added"
      });
    }
    
    // Reset form
    setFormData({
      name: "",
      capacity: "",
      feeType: "per_head",
      fee: 0,
      contactNumber: "",
      contactEmail: "",
      remarks: ""
    });
  };

  const handleEdit = (venue: Venue) => {
    setFormData({
      name: venue.name,
      capacity: venue.capacity,
      feeType: venue.feeType,
      fee: venue.fee,
      contactNumber: venue.contactNumber,
      contactEmail: venue.contactEmail,
      remarks: venue.remarks
    });
    setEditingId(venue.id);
  };

  const handleDelete = (id: string) => {
    setVenues(prev => prev.filter(venue => venue.id !== id));
    toast({
      title: "Venue Deleted",
      description: "Venue has been successfully deleted"
    });
  };

  const handleCancel = () => {
    setFormData({
      name: "",
      capacity: "",
      feeType: "per_head",
      fee: 0,
      contactNumber: "",
      contactEmail: "",
      remarks: ""
    });
    setEditingId(null);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Venue Setup</h1>
      </div>

      {/* Add/Edit Venue Form */}
      <Card>
        <CardHeader>
          <CardTitle>
            {editingId ? "Edit Venue" : "Add New Venue"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Venue Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="e.g. Orchard Hotel, POLWEL Learning Pod"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  value={formData.capacity}
                  onChange={(e) => handleInputChange("capacity", e.target.value)}
                  placeholder="e.g. 70-80%, 25 pax"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="feeType">Fee Type</Label>
                <Select value={formData.feeType} onValueChange={(value) => handleInputChange("feeType", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_head">Per Head</SelectItem>
                    <SelectItem value="per_venue">Per Venue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fee">Fee Amount ($)</Label>
                <Input
                  id="fee"
                  type="number"
                  value={formData.fee}
                  onChange={(e) => handleInputChange("fee", parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactNumber">Point of Contact Number *</Label>
                <Input
                  id="contactNumber"
                  value={formData.contactNumber}
                  onChange={(e) => handleInputChange("contactNumber", e.target.value)}
                  placeholder="+65 1234 5678"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Point of Contact Email *</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => handleInputChange("contactEmail", e.target.value)}
                  placeholder="contact@venue.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={formData.remarks}
                onChange={(e) => handleInputChange("remarks", e.target.value)}
                placeholder="Enter venue details, amenities, requirements, etc. (for mass email to clients)"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-4">
              {editingId && (
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit">
                {editingId ? "Update Venue" : "Add Venue"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Venues List */}
      <Card>
        <CardHeader>
          <CardTitle>Training Venues</CardTitle>
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
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(venue)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(venue.id)}
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

export default VenueSetup;