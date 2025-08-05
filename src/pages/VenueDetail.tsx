import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, MapPin, Users, Phone, Mail, DollarSign } from "lucide-react";

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
  status: "active" | "inactive";
  address?: string;
  facilities?: string[];
  createdAt?: string;
  lastUpdated?: string;
}

const VenueDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Mock data - in real app this would come from API
  const venue: Venue = {
    id: id || "1",
    name: "Orchard Hotel",
    capacity: "70-80 pax",
    feeType: "per_head",
    fee: 25,
    contacts: [
      {
        id: "1",
        name: "Sarah Chen",
        number: "+65 6734 7766",
        email: "sarah.chen@orchardhotel.com.sg"
      },
      {
        id: "2", 
        name: "Michael Tan",
        number: "+65 6734 7767",
        email: "michael.tan@orchardhotel.com.sg"
      }
    ],
    remarks: "Includes refreshments and WiFi. Minimum 20 pax required. Projector and sound system available.",
    status: "active",
    address: "442 Orchard Road, Singapore 238879",
    facilities: ["WiFi", "Projector", "Sound System", "Air Conditioning", "Refreshments", "Parking"],
    createdAt: "2024-01-15",
    lastUpdated: "2024-03-10"
  };

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => navigate('/venue-setup')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Venues
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{venue.name}</h1>
            <div className="flex items-center space-x-2 mt-2">
              {getStatusBadge(venue.status)}
              <Badge variant={venue.feeType === "per_head" ? "default" : "secondary"}>
                {venue.feeType === "per_head" ? "Per Head" : "Per Venue"}
              </Badge>
            </div>
          </div>
        </div>
        <Button onClick={() => navigate(`/venue-setup/edit/${venue.id}`)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Venue
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Venue Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Venue Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-2">Address</h3>
                <p className="text-muted-foreground">{venue.address}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-foreground mb-2">Capacity</h3>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{venue.capacity}</span>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">Pricing</h3>
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>${venue.fee} {venue.feeType === "per_head" ? "per person" : "per venue"}</span>
                </div>
              </div>

              {venue.facilities && (
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Facilities & Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {venue.facilities.map((facility, index) => (
                      <Badge key={index} variant="outline">{facility}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-foreground mb-2">Additional Information</h3>
                <p className="text-muted-foreground">{venue.remarks}</p>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Points of Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {venue.contacts.map((contact) => (
                  <div key={contact.id} className="border rounded-lg p-4">
                    <h4 className="font-semibold text-foreground mb-2">{contact.name}</h4>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{contact.number}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{contact.email}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Venue Details */}
          <Card>
            <CardHeader>
              <CardTitle>Venue Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Status</h4>
                {getStatusBadge(venue.status)}
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Fee Structure</h4>
                <Badge variant={venue.feeType === "per_head" ? "default" : "secondary"}>
                  {venue.feeType === "per_head" ? "Per Head" : "Per Venue"}
                </Badge>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Capacity</h4>
                <p className="text-sm">{venue.capacity}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Rate</h4>
                <p className="text-sm font-semibold">${venue.fee}</p>
              </div>
            </CardContent>
          </Card>

          {/* Venue Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Venue Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Created</h4>
                <p className="text-sm">{venue.createdAt}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Last Updated</h4>
                <p className="text-sm">{venue.lastUpdated}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Venue ID</h4>
                <p className="text-sm font-mono">{venue.id}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VenueDetail;