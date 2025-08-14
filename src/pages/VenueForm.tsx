import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { venuesApi, type Contact, type Venue } from "@/lib/api";

interface VenueFormData {
  name: string;
  capacity: string;
  feeType: string;
  fee: number | string;
  contacts: Contact[];
  remarks: string;
  status: string;
}

const VenueForm = () => {
  const navigate = useNavigate();
  const { id: venueId } = useParams();
  const { toast } = useToast();

  const [formData, setFormData] = useState<VenueFormData>({
    name: "",
    capacity: "",
    feeType: "per_head",
    fee: "",
    contacts: [{ id: "temp-1", name: "", number: "", email: "" }],
    remarks: "",
    status: "ACTIVE"
  });

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (venueId) {
      loadVenueData();
    }
  }, [venueId]);

  const loadVenueData = async () => {
    try {
      setLoading(true);
      const response = await venuesApi.getById(venueId!);
      
      if (response.success && response.data.venue) {
        const venue = response.data.venue;
        setFormData({
          name: venue.name,
          capacity: venue.capacity,
          feeType: venue.feeType,
          fee: venue.fee,
          contacts: venue.contacts && venue.contacts.length > 0 
            ? venue.contacts 
            : [{ id: "temp-1", name: "", number: "", email: "" }],
          remarks: venue.remarks || "",
          status: venue.status || "ACTIVE"
        });
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to load venue data",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading venue:', error);
      toast({
        title: "Error",
        description: "Failed to load venue data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof VenueFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleContactChange = (index: number, field: keyof Contact, value: string) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.map((contact, i) => 
        i === index ? { ...contact, [field]: value } : contact
      )
    }));
  };

  const addContact = () => {
    const newId = `temp-${Date.now()}`;
    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, { id: newId, name: "", number: "", email: "" }]
    }));
  };

  const removeContact = (index: number) => {
    if (formData.contacts.length > 1) {
      setFormData(prev => ({
        ...prev,
        contacts: prev.contacts.filter((_, i) => i !== index)
      }));
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Venue name is required",
        variant: "destructive"
      });
      return false;
    }

    if (!formData.capacity.trim()) {
      toast({
        title: "Validation Error", 
        description: "Capacity is required",
        variant: "destructive"
      });
      return false;
    }

    if (!formData.fee || formData.fee === "") {
      toast({
        title: "Validation Error",
        description: "Fee is required",
        variant: "destructive"
      });
      return false;
    }

    // Validate contacts
    const validContacts = formData.contacts.filter(contact => 
      contact.name.trim() || contact.number.trim() || contact.email.trim()
    );

    if (validContacts.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one contact is required",
        variant: "destructive"
      });
      return false;
    }

    for (const contact of validContacts) {
      if (contact.name.trim() && (!contact.number.trim() || !contact.email.trim())) {
        toast({
          title: "Validation Error",
          description: "Complete contact information is required (name, number, and email)",
          variant: "destructive"
        });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setSubmitting(true);

      // Filter out empty contacts
      const validContacts = formData.contacts.filter(contact => 
        contact.name.trim() && contact.number.trim() && contact.email.trim()
      );

      const venueData = {
        name: formData.name.trim(),
        capacity: formData.capacity.trim(),
        feeType: (formData.feeType === "per_head" ? "PER_HEAD" : "PER_VENUE") as "PER_HEAD" | "PER_VENUE",
        fee: typeof formData.fee === 'string' ? parseFloat(formData.fee) : formData.fee,
        contacts: validContacts,
        remarks: formData.remarks.trim(),
        status: formData.status as "ACTIVE" | "INACTIVE" | "MAINTENANCE"
      };

      let response;
      if (venueId) {
        response = await venuesApi.update(venueId, venueData);
      } else {
        response = await venuesApi.create(venueData);
      }

      if (response.success) {
        toast({
          title: "Success",
          description: venueId ? "Venue updated successfully" : "Venue created successfully"
        });
        navigate('/venue-setup');
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to save venue",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error saving venue:', error);
      toast({
        title: "Error",
        description: "Failed to save venue",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading venue data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={() => navigate("/venue-setup")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Venues
        </Button>
        <h1 className="text-3xl font-bold">
          {venueId ? 'Edit Venue' : 'Add New Venue'}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Venue Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Venue Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter venue name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity *</Label>
                <Input
                  id="capacity"
                  value={formData.capacity}
                  onChange={(e) => handleInputChange("capacity", e.target.value)}
                  placeholder="e.g., 50-60 pax"
                  required
                />
              </div>
            </div>

            {/* Fee Structure */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="feeType">Fee Type *</Label>
                <Select 
                  value={formData.feeType} 
                  onValueChange={(value) => handleInputChange("feeType", value)}
                >
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
                <Label htmlFor="fee">Fee Amount ($) *</Label>
                <Input
                  id="fee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.fee}
                  onChange={(e) => handleInputChange("fee", e.target.value)}
                  placeholder="Enter fee amount"
                  required
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => handleInputChange("status", value)}
              >
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Points of Contact *</Label>
                <Button type="button" variant="outline" onClick={addContact}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </div>

              {formData.contacts.map((contact, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold">Contact {index + 1}</h4>
                    {formData.contacts.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeContact(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={contact.name}
                        onChange={(e) => handleContactChange(index, "name", e.target.value)}
                        placeholder="Contact name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input
                        value={contact.number}
                        onChange={(e) => handleContactChange(index, "number", e.target.value)}
                        placeholder="+65 1234 5678"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={contact.email}
                        onChange={(e) => handleContactChange(index, "email", e.target.value)}
                        placeholder="contact@example.com"
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Remarks */}
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={formData.remarks}
                onChange={(e) => handleInputChange("remarks", e.target.value)}
                placeholder="Additional notes about the venue..."
                rows={4}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={submitting}>
                {submitting 
                  ? "Saving..." 
                  : venueId 
                    ? "Update Venue" 
                    : "Create Venue"
                }
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default VenueForm;