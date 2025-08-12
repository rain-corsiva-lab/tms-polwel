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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { clientOrganizationsApi } from "@/lib/api";

export function AddOrganisationDialog({ onOrganisationCreated }: { onOrganisationCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    organisationName: "",
    divisionDepartment: "",
    divisionAddress: "",
    paymentMode: "",
    requireBuNumber: false,
    buNumber: "",
  });

  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.organisationName) {
      toast({
        title: "Validation Error",
        description: "Organisation name is required.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await clientOrganizationsApi.create({
        name: formData.organisationName,
        industry: formData.divisionDepartment || undefined,
        address: formData.divisionAddress || undefined,
        buNumber: formData.requireBuNumber ? formData.buNumber : undefined,
      });

      toast({
        title: "Organisation Created",
        description: `Organisation "${formData.organisationName}" has been created successfully.`,
      });

      // Reset form and close dialog
      setFormData({
        organisationName: "",
        divisionDepartment: "",
        divisionAddress: "",
        paymentMode: "",
        requireBuNumber: false,
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
            <Label htmlFor="organisationName">Organisation Name *</Label>
            <Input
              id="organisationName"
              value={formData.organisationName}
              onChange={(e) => setFormData(prev => ({ ...prev, organisationName: e.target.value }))}
              placeholder="e.g. Singapore Police Force, SPF / POLWEL"
            />
          </div>
          
          <div>
            <Label htmlFor="divisionDepartment">Division / Department</Label>
            <Input
              id="divisionDepartment"
              value={formData.divisionDepartment}
              onChange={(e) => setFormData(prev => ({ ...prev, divisionDepartment: e.target.value }))}
              placeholder="e.g. Ang Mo Kio / AAO"
            />
          </div>
          
          <div>
            <Label htmlFor="divisionAddress">Division Address</Label>
            <Input
              id="divisionAddress"
              value={formData.divisionAddress}
              onChange={(e) => setFormData(prev => ({ ...prev, divisionAddress: e.target.value }))}
              placeholder="Enter division address"
            />
          </div>


          <div className="flex items-center space-x-2">
            <Checkbox
              id="requireBuNumber"
              checked={formData.requireBuNumber}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requireBuNumber: !!checked }))}
            />
            <Label htmlFor="requireBuNumber">Require BU number?</Label>
          </div>

          {formData.requireBuNumber && (
            <div>
              <Label htmlFor="buNumber">BU Number *</Label>
              <Input
                id="buNumber"
                value={formData.buNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, buNumber: e.target.value }))}
                placeholder="Enter BU number"
              />
            </div>
          )}

          <div>
            <Label htmlFor="paymentMode">Payment Mode</Label>
            <Select onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMode: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ULTF">ULTF</SelectItem>
                <SelectItem value="Transition Dollars">Transition Dollars</SelectItem>
                <SelectItem value="Self Sponsored">Self Sponsored</SelectItem>
                <SelectItem value="Not Applicable">Not Applicable</SelectItem>
              </SelectContent>
            </Select>
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