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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AddCoordinatorDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    tcName: "",
    tcEmail: "",
    tcContactNumber: "",
    password: "",
    buCostCentre: "",
    paymentMode: "",
    organisationType: "", // To determine if BU Cost Centre is mandatory
  });

  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tcName || !formData.tcEmail || !formData.tcContactNumber || !formData.password) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Check if BU Cost Centre is mandatory for SPF/POLWEL
    const isSPForPOLWEL = formData.organisationType === "SPF" || formData.organisationType === "POLWEL";
    if (isSPForPOLWEL && !formData.buCostCentre) {
      toast({
        title: "Validation Error",
        description: "BU Cost Centre is mandatory for SPF and POLWEL organisations.",
        variant: "destructive",
      });
      return;
    }

    // Password complexity validation
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
    if (!passwordPattern.test(formData.password)) {
      toast({
        title: "Password Validation Error",
        description: "Password must be at least 12 characters with uppercase, lowercase, numbers, and symbols.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Training Coordinator Created",
      description: `Training Coordinator "${formData.tcName}" has been created successfully. Multi-FA setup email sent.`,
    });

    // Reset form and close dialog
    setFormData({
      tcName: "",
      tcEmail: "",
      tcContactNumber: "",
      password: "",
      buCostCentre: "",
      paymentMode: "",
      organisationType: "",
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add New Coordinator
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Add New Training Coordinator
          </DialogTitle>
          <DialogDescription>
            Create a new training coordinator account with Multi-FA authentication.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="tcName">Training Coordinator (TC) Name *</Label>
            <Input
              id="tcName"
              value={formData.tcName}
              onChange={(e) => setFormData(prev => ({ ...prev, tcName: e.target.value }))}
              placeholder="Enter coordinator's full name"
            />
          </div>
          
          <div>
            <Label htmlFor="tcEmail">TC Email Address * (Unique Identifier)</Label>
            <Input
              id="tcEmail"
              type="email"
              value={formData.tcEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, tcEmail: e.target.value }))}
              placeholder="Enter unique email address"
            />
          </div>
          
          <div>
            <Label htmlFor="tcContactNumber">TC Contact Number *</Label>
            <Input
              id="tcContactNumber"
              value={formData.tcContactNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, tcContactNumber: e.target.value }))}
              placeholder="Enter contact number"
            />
          </div>
          
          <div>
            <Label htmlFor="password">Password (with Multi-FA via email) *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Min 12 chars, mixed case, numbers, symbols"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Multi-FA will be enabled via email verification.
            </p>
          </div>

          <div>
            <Label htmlFor="organisationType">Organisation Type</Label>
            <Select onValueChange={(value) => setFormData(prev => ({ ...prev, organisationType: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select organisation type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SPF">Singapore Police Force (SPF)</SelectItem>
                <SelectItem value="POLWEL">POLWEL</SelectItem>
                <SelectItem value="MHA">MHA Agencies</SelectItem>
                <SelectItem value="Other">Other Government Agency</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="buCostCentre">
              BU Cost Centre (for billing purpose) 
              {(formData.organisationType === "SPF" || formData.organisationType === "POLWEL") && " *"}
            </Label>
            <Input
              id="buCostCentre"
              value={formData.buCostCentre}
              onChange={(e) => setFormData(prev => ({ ...prev, buCostCentre: e.target.value }))}
              placeholder={`${(formData.organisationType === "SPF" || formData.organisationType === "POLWEL") ? "Mandatory for SPF/POLWEL" : "Enter BU Cost Centre"}`}
            />
          </div>

          <div>
            <Label htmlFor="paymentMode">Payment Mode Applicable</Label>
            <Select onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMode: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ULTF">ULTF</SelectItem>
                <SelectItem value="Transition Dollars">Transition Dollars</SelectItem>
                <SelectItem value="Self Sponsored">Self Sponsored</SelectItem>
                <SelectItem value="Not Applicable">Not Applicable (for non-SPF/MHA organisations and POLWEL staff)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit}>
            Create Coordinator
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}