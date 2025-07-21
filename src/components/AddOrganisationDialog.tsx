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

export function AddOrganisationDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    organisationName: "",
    divisionDepartment: "",
    divisionAddress: "",
  });

  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.organisationName || !formData.divisionDepartment) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Organisation Created",
      description: `Organisation "${formData.organisationName}" has been created successfully.`,
    });

    // Reset form and close dialog
    setFormData({
      organisationName: "",
      divisionDepartment: "",
      divisionAddress: "",
    });
    setOpen(false);
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
            <Label htmlFor="divisionDepartment">Division / Department *</Label>
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
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit}>
            Create Organisation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}