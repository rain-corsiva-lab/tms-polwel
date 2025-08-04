import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Check, ChevronsUpDown, X } from "lucide-react";

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
    certificates: "polwel",
    remarks: ""
  });

  const [calculations, setCalculations] = useState({
    totalFee: 0,
    minimumRevenue: 0,
    totalCost: 0,
    profit: 0,
    profitMargin: 0
  });

  const categoryGroups = [
    {
      name: "Self-Mastery",
      color: "bg-red-100 text-red-800 border-red-200",
      subcategories: ["Growth Mindset", "Personal Effectiveness", "Self-awareness"]
    },
    {
      name: "Thinking Skills", 
      color: "bg-blue-100 text-blue-800 border-blue-200",
      subcategories: ["Agile Mindset", "Strategic Planning", "Critical Thinking & Creative Problem-Solving"]
    },
    {
      name: "People Skills",
      color: "bg-green-100 text-green-800 border-green-200", 
      subcategories: ["Emotional Intelligence", "Collaboration", "Communication"]
    },
    {
      name: "Leadership Skills",
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      subcategories: ["Mindful Leadership", "Empowerment", "Decision-making"]
    }
  ];

  const allCategories = categoryGroups.flatMap(group => [group.name, ...group.subcategories]);

  const trainers = [
    "John Smith",
    "Sarah Johnson", 
    "Michael Chen",
    "Emily Davis",
  ];

  const partners = [
    "Excellence Training Partners",
    "Professional Development Corp",
    "Leadership Institute Singapore",
    "Corporate Training Solutions",
    "Skills Development Academy"
  ];

  // Combine trainers and partners for the dropdown
  const allTrainersAndPartners = [
    ...trainers.map(trainer => ({ name: trainer, type: "Trainer" })),
    ...partners.map(partner => ({ name: partner, type: "Partner" }))
  ];

  const venues = [
    "Main Training Room",
    "Conference Hall A",
    "Conference Hall B",
    "Online Platform",
    "External Venue"
  ];

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
      certificates: "polwel",
      remarks: ""
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Course Creation</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Course Information */}
        <Card>
          <CardHeader>
            <CardTitle>Course Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Course Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="Enter course title"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Course Category *</Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryGroups.map((group) => (
                      <React.Fragment key={group.name}>
                        <div className={`px-2 py-1 text-xs font-semibold ${group.color} rounded mx-1 my-1 pointer-events-none`}>
                          {group.name}
                        </div>
                        {group.subcategories.map((subcategory) => (
                          <SelectItem 
                            key={subcategory} 
                            value={subcategory}
                            className="ml-2 text-sm"
                          >
                            {subcategory}
                          </SelectItem>
                        ))}
                      </React.Fragment>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Course Description / Learning Objectives</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Enter course description and learning objectives"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Course Duration</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => handleInputChange("duration", e.target.value)}
                  placeholder="Duration"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="durationType">Duration Type</Label>
                <Select value={formData.durationType} onValueChange={(value) => handleInputChange("durationType", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trainer">Trainers *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between min-h-10"
                    >
                      {formData.trainer.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {formData.trainer.map((trainerName) => (
                            <Badge key={trainerName} variant="secondary" className="text-xs">
                              {trainerName}
                              <button
                                type="button"
                                className="ml-1 hover:bg-muted rounded-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInputChange("trainer", formData.trainer.filter(t => t !== trainerName));
                                }}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        "Select trainers..."
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search trainers..." />
                      <CommandList>
                        <CommandEmpty>No trainer found.</CommandEmpty>
                        <CommandGroup heading="Trainers">
                          {trainers.map((trainer) => (
                            <CommandItem
                              key={trainer}
                              value={trainer}
                              onSelect={() => {
                                if (!formData.trainer.includes(trainer)) {
                                  handleInputChange("trainer", [...formData.trainer, trainer]);
                                }
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  formData.trainer.includes(trainer) ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              {trainer}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        <CommandGroup heading="Partners">
                          {partners.map((partner) => (
                            <CommandItem
                              key={partner}
                              value={partner}
                              onSelect={() => {
                                if (!formData.trainer.includes(partner)) {
                                  handleInputChange("trainer", [...formData.trainer, partner]);
                                }
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  formData.trainer.includes(partner) ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              {partner}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="venue">Venue</Label>
              <Select value={formData.venue} onValueChange={(value) => handleInputChange("venue", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select venue" />
                </SelectTrigger>
                <SelectContent>
                  {venues.map((venue) => (
                    <SelectItem key={venue} value={venue}>
                      {venue}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Fees and Revenue */}
        <Card>
          <CardHeader>
            <CardTitle>Fees and Revenue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="courseFee">Course Fee ($)</Label>
                <Input
                  id="courseFee"
                  type="number"
                  value={formData.courseFee}
                  onChange={(e) => handleInputChange("courseFee", parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="venueFee">Venue Fee ($)</Label>
                <Input
                  id="venueFee"
                  type="number"
                  value={formData.venueFee}
                  onChange={(e) => handleInputChange("venueFee", parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="trainerFee">Trainer Fee ($)</Label>
                <Input
                  id="trainerFee"
                  type="number"
                  value={formData.trainerFee}
                  onChange={(e) => handleInputChange("trainerFee", parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="adminFees">Admin Fees ($)</Label>
                <Input
                  id="adminFees"
                  type="number"
                  value={formData.adminFees}
                  onChange={(e) => handleInputChange("adminFees", parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contingencyFees">Contingency Fees ($)</Label>
                <Input
                  id="contingencyFees"
                  type="number"
                  value={formData.contingencyFees}
                  onChange={(e) => handleInputChange("contingencyFees", parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="serviceFees">Service Fees ($)</Label>
                <Input
                  id="serviceFees"
                  type="number"
                  value={formData.serviceFees}
                  onChange={(e) => handleInputChange("serviceFees", parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="vitalFees">Vital Fees ($)</Label>
                <Input
                  id="vitalFees"
                  type="number"
                  value={formData.vitalFees}
                  onChange={(e) => handleInputChange("vitalFees", parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minPax">Minimum Pax</Label>
                <Input
                  id="minPax"
                  type="number"
                  min="1"
                  value={formData.minPax}
                  onChange={(e) => handleInputChange("minPax", parseInt(e.target.value) || 1)}
                  placeholder="1"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="amountPerPax">Amount per Pax ($)</Label>
                <Input
                  id="amountPerPax"
                  type="number"
                  value={formData.amountPerPax}
                  onChange={(e) => handleInputChange("amountPerPax", parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount">Discount (%)</Label>
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.discount}
                  onChange={(e) => handleInputChange("discount", parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks (for minimum pax not met)</Label>
              <Textarea
                id="remarks"
                value={formData.remarks}
                onChange={(e) => handleInputChange("remarks", e.target.value)}
                placeholder="Enter remarks when minimum pax is not met"
                rows={2}
              />
            </div>

            {/* Financial Summary */}
            <div className="space-y-4">
              <Separator />
              <h3 className="text-lg font-semibold">Financial Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <Label className="text-sm text-muted-foreground">Total Fee</Label>
                  <p className="text-2xl font-bold text-foreground">${calculations.totalFee.toFixed(2)}</p>
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <Label className="text-sm text-muted-foreground">Minimum Revenue</Label>
                  <p className="text-2xl font-bold text-foreground">${calculations.minimumRevenue.toFixed(2)}</p>
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <Label className="text-sm text-muted-foreground">Total Cost</Label>
                  <p className="text-2xl font-bold text-foreground">${calculations.totalCost.toFixed(2)}</p>
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <Label className="text-sm text-muted-foreground">Profit</Label>
                  <p className={`text-2xl font-bold ${calculations.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${calculations.profit.toFixed(2)}
                  </p>
                </div>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <Label className="text-sm text-muted-foreground">Profit Margin</Label>
                <p className={`text-3xl font-bold ${calculations.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {calculations.profitMargin.toFixed(2)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Certificate Generation */}
        <Card>
          <CardHeader>
            <CardTitle>Certificate Generation</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup 
              value={formData.certificates} 
              onValueChange={(value) => handleInputChange("certificates", value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="polwel" id="polwel" />
                <Label htmlFor="polwel">YES - POLWEL generated</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="partner" id="partner" />
                <Label htmlFor="partner">YES - Partner generated</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="no" />
                <Label htmlFor="no">NO</Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline">
            Cancel
          </Button>
          <Button type="submit">
            Create Course
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CourseForm;