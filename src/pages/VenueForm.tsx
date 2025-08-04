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
import { Plus, Edit, Trash2, X } from "lucide-react";

interface Contact {
  id: string;
  name: string;
  number: string;
  email: string;
}

interface Venue {
  id: string;
  name: string;
  capacity: string;
  feeType: "per_head" | "per_venue";
  fee: number;
  contacts: Contact[];
  remarks: string;
}

const VenueForm = () => {
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: "",
    capacity: "",
    feeType: "per_head" as "per_head" | "per_venue",
    fee: 0,
    contacts: [{ id: "1", name: "", number: "", email: "" }] as Contact[],
    remarks: ""
  });

  const [venues, setVenues] = useState<Venue[]>([
    {
      id: "1",
      name: "Orchard Hotel",
      capacity: "70-80%",
      feeType: "per_head",
      fee: 25,
      contacts: [
        {
          id: "1",
          name: "Sarah Chen",
          number: "+65 6734 7766",
          email: "events@orchardhotel.com.sg"
        }
      ],
      remarks: "Includes refreshments and WiFi. Minimum 20 pax required."
    },
    {
      id: "2", 
      name: "POLWEL Learning Pod",
      capacity: "25 pax",
      feeType: "per_venue",
      fee: 300,
      contacts: [
        {
          id: "1",
          name: "Michael Tan",
          number: "+65 6123 4567",
          email: "bookings@polwel.org.sg"
        },
        {
          id: "2",
          name: "Jessica Lim",
          number: "+65 6123 4568",
          email: "support@polwel.org.sg"
        }
      ],
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

  const handleContactChange = (contactId: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.map(contact =>
        contact.id === contactId ? { ...contact, [field]: value } : contact
      )
    }));
  };

  const addContact = () => {
    const newContact: Contact = {
      id: Date.now().toString(),
      name: "",
      number: "",
      email: ""
    };
    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, newContact]
    }));
  };

  const removeContact = (contactId: string) => {
    if (formData.contacts.length === 1) {
      toast({
        title: "Error",
        description: "At least one contact is required",
        variant: "destructive"
      });
      return;
    }
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.filter(contact => contact.id !== contactId)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name) {
      toast({
        title: "Error",
        description: "Venue name is required",
        variant: "destructive"
      });
      return;
    }

    // Validate at least one complete contact
    const hasValidContact = formData.contacts.some(contact => 
      contact.name.trim() && contact.number.trim() && contact.email.trim()
    );

    if (!hasValidContact) {
      toast({
        title: "Error",
        description: "At least one complete contact (name, number, email) is required",
        variant: "destructive"
      });
      return;
    }

    // Filter out incomplete contacts
    const validContacts = formData.contacts.filter(contact => 
      contact.name.trim() && contact.number.trim() && contact.email.trim()
    );

    if (editingId) {
      // Update existing venue
      setVenues(prev => prev.map(venue => 
        venue.id === editingId 
          ? { ...formData, contacts: validContacts, id: editingId }
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
        contacts: validContacts,
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
      contacts: [{ id: "1", name: "", number: "", email: "" }],
      remarks: ""
    });
  };

  const handleEdit = (venue: Venue) => {
    setFormData({
      name: venue.name,
      capacity: venue.capacity,
      feeType: venue.feeType,
      fee: venue.fee,
      contacts: venue.contacts.map(contact => ({ ...contact })),
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
      contacts: [{ id: "1", name: "", number: "", email: "" }],
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
          <form onSubmit={handleSubmit} className="space-y-6">
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

            {/* Points of Contact Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Points of Contact *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addContact}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Contact
                </Button>
              </div>
              
              {formData.contacts.map((contact, index) => (
                <Card key={contact.id} className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">Contact {index + 1}</h4>
                    {formData.contacts.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeContact(contact.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`contact-name-${contact.id}`}>Name</Label>
                      <Input
                        id={`contact-name-${contact.id}`}
                        value={contact.name}
                        onChange={(e) => handleContactChange(contact.id, "name", e.target.value)}
                        placeholder="John Doe"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`contact-number-${contact.id}`}>Phone Number</Label>
                      <Input
                        id={`contact-number-${contact.id}`}
                        value={contact.number}
                        onChange={(e) => handleContactChange(contact.id, "number", e.target.value)}
                        placeholder="+65 1234 5678"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`contact-email-${contact.id}`}>Email</Label>
                      <Input
                        id={`contact-email-${contact.id}`}
                        type="email"
                        value={contact.email}
                        onChange={(e) => handleContactChange(contact.id, "email", e.target.value)}
                        placeholder="john@venue.com"
                      />
                    </div>
                  </div>
                </Card>
              ))}
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
          <CardTitle>Existing Venues</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Venue Name</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Contacts</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {venues.map((venue) => (
                <TableRow key={venue.id}>
                  <TableCell className="font-medium">{venue.name}</TableCell>
                  <TableCell>{venue.capacity}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>${venue.fee}</span>
                      <Badge variant="secondary" className="w-fit">
                        {venue.feeType === "per_head" ? "Per Head" : "Per Venue"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {venue.contacts.map((contact, index) => (
                        <div key={contact.id} className="text-sm">
                          <div className="font-medium">{contact.name}</div>
                          <div className="text-muted-foreground">{contact.number}</div>
                          <div className="text-muted-foreground">{contact.email}</div>
                          {index < venue.contacts.length - 1 && <hr className="my-2" />}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="truncate" title={venue.remarks}>
                      {venue.remarks}
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

export default VenueForm;