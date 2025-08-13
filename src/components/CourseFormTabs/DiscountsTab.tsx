import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Discount {
  id: string;
  name: string;
  percentage: number;
}

interface DiscountsTabProps {
  formData: any;
  onInputChange: (field: string, value: any) => void;
}

const DiscountsTab: React.FC<DiscountsTabProps> = ({ formData, onInputChange }) => {
  const [discountName, setDiscountName] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState("");
  const { toast } = useToast();

  const discounts = formData.discounts || [];

  const addDiscount = () => {
    if (!discountName.trim() || !discountPercentage || parseFloat(discountPercentage) <= 0) {
      toast({
        title: "Invalid Discount",
        description: "Please enter a valid discount name and percentage.",
        variant: "destructive",
      });
      return;
    }

    const newDiscount: Discount = {
      id: Date.now().toString(),
      name: discountName.trim(),
      percentage: parseFloat(discountPercentage),
    };

    onInputChange("discounts", [...discounts, newDiscount]);
    setDiscountName("");
    setDiscountPercentage("");

    toast({
      title: "Discount Added",
      description: `${newDiscount.name} (${newDiscount.percentage}%) has been added.`,
    });
  };

  const removeDiscount = (discountId: string) => {
    const updatedDiscounts = discounts.filter((discount: Discount) => discount.id !== discountId);
    onInputChange("discounts", updatedDiscounts);

    toast({
      title: "Discount Removed",
      description: "Discount has been removed successfully.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Add New Discount */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Discount</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discountName">Discount Name</Label>
              <Input
                id="discountName"
                value={discountName}
                onChange={(e) => setDiscountName(e.target.value)}
                placeholder="e.g., Early Bird, Student, Corporate"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="discountPercentage">Percentage (%)</Label>
              <Input
                id="discountPercentage"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(e.target.value)}
                placeholder="10.0"
              />
            </div>
            
            <div className="flex items-end">
              <Button onClick={addDiscount} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Discount
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Discounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Applied Discounts</CardTitle>
        </CardHeader>
        <CardContent>
          {discounts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Discount Name</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Value (based on amount per pax)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discounts.map((discount: Discount) => {
                  const discountValue = (formData.amountPerPax * discount.percentage) / 100;
                  return (
                    <TableRow key={discount.id}>
                      <TableCell className="font-medium">{discount.name}</TableCell>
                      <TableCell>{discount.percentage}%</TableCell>
                      <TableCell>${discountValue.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDiscount(discount.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <div className="text-muted-foreground">
                <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No discounts added</h3>
                <p>Add discounts to provide special pricing options for this course.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Discount Summary */}
      {discounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Discount Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <Label className="text-sm text-muted-foreground">Total Discounts</Label>
                <p className="text-2xl font-bold text-foreground">{discounts.length}</p>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <Label className="text-sm text-muted-foreground">Highest Discount</Label>
                <p className="text-2xl font-bold text-foreground">
                  {Math.max(...discounts.map((d: Discount) => d.percentage))}%
                </p>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <Label className="text-sm text-muted-foreground">Max Discount Value</Label>
                <p className="text-2xl font-bold text-foreground">
                  ${Math.max(...discounts.map((d: Discount) => (formData.amountPerPax * d.percentage) / 100)).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DiscountsTab;