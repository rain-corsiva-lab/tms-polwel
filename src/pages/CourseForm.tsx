import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import CourseInformationTab from "@/components/CourseFormTabs/CourseInformationTab";
import FeesRevenueTab from "@/components/CourseFormTabs/FeesRevenueTab";
import DiscountsTab from "@/components/CourseFormTabs/DiscountsTab";

const CourseForm = () => {
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    duration: "",
    durationType: "days",
    trainer: [] as string[],
    courseFee: 0,
    venueFee: 0,
    trainerFee: 0,
    adminFees: 0,
    contingencyFees: 0,
    serviceFees: 0,
    vitalFees: 0,
    discount: 0,
    minPax: 1,
    amountPerPax: 0,
    venue: "",
    specifiedLocation: "",
    certificates: "polwel",
    remarks: "",
    defaultCourseFee: 0,
    discounts: [] as any[]
  });

  const [calculations, setCalculations] = useState({
    totalFee: 0,
    minimumRevenue: 0,
    totalCost: 0,
    profit: 0,
    profitMargin: 0
  });

  // Calculate fees whenever relevant fields change
  useEffect(() => {
    const totalFee = formData.courseFee + formData.venueFee + formData.trainerFee;
    const minimumRevenue = formData.amountPerPax * formData.minPax;
    const discountExpense = minimumRevenue * (formData.discount / 100);
    const totalCost = formData.adminFees + formData.contingencyFees + formData.serviceFees + formData.vitalFees + discountExpense;
    const profit = minimumRevenue - totalCost;
    const profitMargin = minimumRevenue > 0 ? (profit / minimumRevenue) * 100 : 0;

    setCalculations({
      totalFee,
      minimumRevenue,
      totalCost,
      profit,
      profitMargin
    });
  }, [formData]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.category || formData.trainer.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Course Created",
      description: "Course has been successfully created"
    });
    
    // Reset form
    setFormData({
      title: "",
      description: "",
      category: "",
      duration: "",
      durationType: "days",
      trainer: [],
      courseFee: 0,
      venueFee: 0,
      trainerFee: 0,
      adminFees: 0,
      contingencyFees: 0,
      serviceFees: 0,
      vitalFees: 0,
      discount: 0,
      minPax: 1,
      amountPerPax: 0,
      venue: "",
      specifiedLocation: "",
      certificates: "polwel",
      remarks: "",
      defaultCourseFee: 0,
      discounts: []
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Course Creation</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="information" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="information">Course Information</TabsTrigger>
            <TabsTrigger value="fees">Fees & Revenue</TabsTrigger>
            <TabsTrigger value="discounts">Discounts</TabsTrigger>
          </TabsList>

          <TabsContent value="information">
            <Card>
              <CardHeader>
                <CardTitle>Course Information</CardTitle>
              </CardHeader>
              <CardContent>
                <CourseInformationTab 
                  formData={formData} 
                  onInputChange={handleInputChange} 
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fees">
            <Card>
              <CardHeader>
                <CardTitle>Fees and Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <FeesRevenueTab 
                  formData={formData} 
                  calculations={calculations}
                  onInputChange={handleInputChange} 
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="discounts">
            <Card>
              <CardHeader>
                <CardTitle>Course Discounts</CardTitle>
              </CardHeader>
              <CardContent>
                <DiscountsTab 
                  formData={formData} 
                  onInputChange={handleInputChange} 
                />
              </CardContent>
            </Card>
          </TabsContent>

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline">
              Cancel
            </Button>
            <Button type="submit">
              Create Course
            </Button>
          </div>
        </Tabs>
      </form>
    </div>
  );
};

export default CourseForm;