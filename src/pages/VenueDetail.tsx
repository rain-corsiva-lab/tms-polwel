import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, MapPin, Users, Phone, Mail, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { venuesApi, type Contact, type Venue } from "@/lib/api";

const VenueDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadVenueData();
    }
  }, [id]);

  const loadVenueData = async () => {
    try {
      setLoading(true);
      const response = await venuesApi.getById(id!);
      
      if (response.success && response.data.venue) {
        setVenue(response.data.venue);
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to load venue data",
          variant: "destructive"
        });
        navigate('/venue-setup');
      }
    } catch (error) {
      console.error('Error loading venue:', error);
      toast({
        title: "Error",
        description: "Failed to load venue data",
        variant: "destructive"
      });
      navigate('/venue-setup');
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading venue details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Venue not found</p>
            <Button onClick={() => navigate('/venue-setup')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Venues
            </Button>
          </div>
        </div>
      </div>
    );
  }


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

              <div>
                <h3 className="font-semibold text-foreground mb-2">Remarks</h3>
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
              {venue.contacts && venue.contacts.length > 0 ? (
                <div className="space-y-4">
                  {venue.contacts.map((contact: Contact, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
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
              ) : (
                <p className="text-muted-foreground">No contact information available</p>
              )}
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
        </div>
      </div>
    </div>
  );
};

export default VenueDetail;