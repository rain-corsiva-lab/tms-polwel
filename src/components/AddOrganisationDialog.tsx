import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { clientOrganizationsApi } from "@/lib/api";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function AddOrganisationDialog({ onOrganisationCreated }: { onOrganisationCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    organisationType: "POLWEL",
    divisionOrganisationName: "",
    buNumber: "",
  });

  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.divisionOrganisationName) {
      toast({
        title: "Validation Error",
        description: "Name of Division/Organisation is required.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await clientOrganizationsApi.create({
        name: formData.divisionOrganisationName,
        industry: formData.organisationType,
        buNumber: formData.buNumber || undefined,
      });

      toast({
        title: "Organisation Created",
        description: `Organisation "${formData.divisionOrganisationName}" has been created successfully.`,
      });

      // Reset form and close dialog
      setFormData({
        organisationType: "POLWEL",
        divisionOrganisationName: "",
        buNumber: "",
      });
      setOpen(false);
      
      // Call the callback to refresh the parent component
      if (onOrganisationCreated) {
        onOrganisationCreated();
      }
    } catch (error) {
      console.error('Error creating organisation:', error);
      toast({
        title: "Error",
        description: "Failed to create organisation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add New Organisation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Add New Organisation
          </DialogTitle>
          <DialogDescription>
            Create a new client organisation in the system.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Organisation Type *</Label>
            <RadioGroup
              value={formData.organisationType}
              onValueChange={(value) => setFormData(prev => ({ ...prev, organisationType: value }))}
              className="grid grid-cols-2 gap-4 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="POLWEL" id="polwel" />
                <Label htmlFor="polwel">POLWEL</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="SPF" id="spf" />
                <Label htmlFor="spf">SPF</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Public Sector" id="public" />
                <Label htmlFor="public">Public Sector</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Private Sector" id="private" />
                <Label htmlFor="private">Private Sector</Label>
              </div>
            </RadioGroup>
          </div>
          
          <div>
            <Label htmlFor="divisionOrganisationName">Name of Division/Organisation *</Label>
            <Input
              id="divisionOrganisationName"
              value={formData.divisionOrganisationName}
              onChange={(e) => setFormData(prev => ({ ...prev, divisionOrganisationName: e.target.value }))}
              placeholder="e.g. Ang Mo Kio Division"
            />
          </div>
          <div>
            <Label htmlFor="buNumber">BU Number (Optional)</Label>
            <Input
              id="buNumber"
              value={formData.buNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, buNumber: e.target.value }))}
              placeholder="Enter BU number"
            />
          </div>
        </form>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Organisation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}