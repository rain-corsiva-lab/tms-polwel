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
    buCostCentre: "",
    paymentMode: "",
  });

  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tcName || !formData.tcEmail || !formData.tcContactNumber) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Training Coordinator Created",
      description: `Training Coordinator "${formData.tcName}" has been created successfully. Onboarding email sent.`,
    });

    // Reset form and close dialog
    setFormData({
      tcName: "",
      tcEmail: "",
      tcContactNumber: "",
      buCostCentre: "",
      paymentMode: "",
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
            Create a new training coordinator account. User will set password in onboarding flow.
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
            <Label htmlFor="buCostCentre">BU Cost Centre (for billing purpose)</Label>
            <Input
              id="buCostCentre"
              value={formData.buCostCentre}
              onChange={(e) => setFormData(prev => ({ ...prev, buCostCentre: e.target.value }))}
              placeholder="Enter BU Cost Centre"
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