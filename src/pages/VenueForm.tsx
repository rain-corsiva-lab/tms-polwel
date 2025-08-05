import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, X } from "lucide-react";

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

    const newVenue: Venue = {
      ...formData,
      contacts: validContacts,
      id: Date.now().toString()
    };

    toast({
      title: "Venue Added",
      description: "Venue has been successfully added"
    });
    
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


  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Venue Setup</h1>
      </div>

      {/* Add/Edit Venue Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Venue</CardTitle>
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

            <div className="flex justify-end">
              <Button type="submit">Add Venue</Button>
            </div>
          </form>
        </CardContent>
      </Card>

    </div>
  );
};

export default VenueForm;