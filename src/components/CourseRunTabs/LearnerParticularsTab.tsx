import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Upload, Mail, Phone, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { Learner } from "@/types/courseRun";

interface LearnerParticularsTabProps {
  courseRunId: string;
  learners: Learner[];
  onAddLearner: (learner: Learner) => void;
  onUpdateLearner: (learnerId: string, data: Partial<Learner>) => void;
  courseData?: {
    defaultCourseFee?: number;
    discounts?: Array<{ id: string; name: string; percentage: number }>;
  };
  clientOrganizations?: Array<{
    id: string;
    name: string;
    divisions?: Array<{
      id: string;
      name: string;
      trainingOfficers?: Array<{
        id: string;
        name: string;
        email: string;
        phone: string;
      }>;
    }>;
  }>;
}

const LearnerParticularsTab: React.FC<LearnerParticularsTabProps> = ({
  courseRunId,
  learners,
  onAddLearner,
  onUpdateLearner,
  courseData = {},
  clientOrganizations = []
}) => {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newLearner, setNewLearner] = useState<Partial<Learner>>({
    courseRunId,
    paymentMode: 'Self-Payment',
    enrolmentStatus: 'Enrolled',
    attendance: 'Present'
  });
  const [selectedDiscount, setSelectedDiscount] = useState<string>('none');
  
  // Get available divisions from client organizations
  const allDivisions = clientOrganizations.flatMap(org => 
    (org.divisions || []).map(div => ({
      ...div,
      organizationName: org.name
    }))
  );

  // Get training officers for selected division
  const selectedDivision = allDivisions.find(div => div.id === newLearner.division);
  const availableTrainingCoordinators = selectedDivision?.trainingOfficers || [];

  // Calculate final fee
  const calculateFinalFee = () => {
    const baseFee = courseData.defaultCourseFee || 0;
    if (!selectedDiscount || selectedDiscount === 'none') return baseFee;
    
    const discount = courseData.discounts?.find(d => d.id === selectedDiscount);
    if (!discount) return baseFee;
    
    const discountAmount = (baseFee * discount.percentage) / 100;
    return baseFee - discountAmount;
  };

  // Set default training coordinator when division is selected
  const handleDivisionChange = (divisionId: string) => {
    const division = allDivisions.find(div => div.id === divisionId);
    const defaultCoordinator = division?.trainingOfficers?.[0];
    
    setNewLearner({
      ...newLearner,
      division: divisionId,
      department: division?.name || '',
      trainingOfficerName: defaultCoordinator?.name || '',
      trainingOfficerEmail: defaultCoordinator?.email || '',
      trainingOfficerPhone: defaultCoordinator?.phone || ''
    });
  };

  const paymentModes = [
    'Self-Payment',
    'Transition Dollars (T$)',
    'ULTF (Unit Local Training Fund)',
    'Company-Sponsored (Non-HomeTeam)',
    'POLWEL Training Subsidy'
  ];

  const handleAddLearner = () => {
    if (!newLearner.name || !newLearner.email || !newLearner.designation) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Calculate final fee and set discount
    const finalFee = calculateFinalFee();
    const appliedDiscounts = selectedDiscount && selectedDiscount !== 'none' ? [selectedDiscount] : [];

    const learner: Learner = {
      id: `learner-${Date.now()}`,
      courseRunId,
      name: newLearner.name || '',
      designation: newLearner.designation || '',
      email: newLearner.email || '',
      contactNumber: newLearner.contactNumber || '',
      division: newLearner.division || '',
      department: newLearner.department || '',
      paymentMode: newLearner.paymentMode || 'Self-Payment',
      buNumber: newLearner.buNumber,
      feesBeforeGST: finalFee,
      discounts: appliedDiscounts,
      feesRemarks: newLearner.feesRemarks,
      poPaymentAdviceNumber: newLearner.poPaymentAdviceNumber,
      invoiceNumber: newLearner.invoiceNumber,
      receiptNumber: newLearner.receiptNumber,
      trainingOfficerName: newLearner.trainingOfficerName || '',
      trainingOfficerEmail: newLearner.trainingOfficerEmail || '',
      trainingOfficerPhone: newLearner.trainingOfficerPhone || '',
      remarks: newLearner.remarks,
      enrolmentStatus: newLearner.enrolmentStatus || 'Enrolled',
      attendance: newLearner.attendance || 'Present',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onAddLearner(learner);
    setNewLearner({
      courseRunId,
      paymentMode: 'Self-Payment',
      enrolmentStatus: 'Enrolled',
      attendance: 'Present'
    });
    setSelectedDiscount('none');
    setIsAddDialogOpen(false);
  };

  const handleCSVImport = () => {
    toast({
      title: "CSV Import",
      description: "CSV import functionality will be implemented soon",
    });
  };

  const handleSendConfirmationEmail = (learner: Learner) => {
    toast({
      title: "Email Sent",
      description: `Training confirmation email sent to ${learner.name}`,
    });
  };

  const handleAttendanceChange = (learner: Learner, checked: boolean) => {
    const newAttendance = checked ? 'Present' : 'Absent';
    onUpdateLearner(learner.id, { 
      attendance: newAttendance,
      updatedAt: new Date().toISOString()
    });
    toast({
      title: "Attendance Updated",
      description: `${learner.name} marked as ${newAttendance.toLowerCase()}`,
    });
  };

  const getAttendanceBadgeVariant = (attendance: string) => {
    switch (attendance) {
      case 'Present': return 'default';
      case 'Absent': return 'destructive';
      case 'Withdrawn': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Learner Management</h3>
        <div className="space-x-2">
          <Button variant="outline" onClick={handleCSVImport}>
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Learner
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Learner</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h4 className="font-medium text-lg border-b pb-2">Personal Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Name of Learner *</Label>
                      <Input
                        id="name"
                        value={newLearner.name || ''}
                        onChange={(e) => setNewLearner({...newLearner, name: e.target.value})}
                        placeholder="Enter learner's full name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="designation">Designation *</Label>
                      <Input
                        id="designation"
                        value={newLearner.designation || ''}
                        onChange={(e) => setNewLearner({...newLearner, designation: e.target.value})}
                        placeholder="Job title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newLearner.email || ''}
                        onChange={(e) => setNewLearner({...newLearner, email: e.target.value})}
                        placeholder="learner@company.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contactNumber">Contact Number</Label>
                      <Input
                        id="contactNumber"
                        value={newLearner.contactNumber || ''}
                        onChange={(e) => setNewLearner({...newLearner, contactNumber: e.target.value})}
                        placeholder="+65 xxxx xxxx"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="buNumber">BU Number (if any)</Label>
                      <Input
                        id="buNumber"
                        value={newLearner.buNumber || ''}
                        onChange={(e) => setNewLearner({...newLearner, buNumber: e.target.value})}
                        placeholder="Business Unit Number"
                      />
                    </div>
                  </div>
                </div>

                {/* Training Coordinator */}
                <div className="space-y-4">
                  <h4 className="font-medium text-lg border-b pb-2">Training Coordinator</h4>
                  <div>
                    <Label htmlFor="division">Division / Department</Label>
                    <Select
                      value={newLearner.division}
                      onValueChange={handleDivisionChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select division" />
                      </SelectTrigger>
                      <SelectContent>
                        {allDivisions.map(division => (
                          <SelectItem key={division.id} value={division.id}>
                            {division.name} ({division.organizationName})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="trainingCoordinator">Training Coordinator's Name</Label>
                    <Select
                      value={`${newLearner.trainingOfficerName}|${newLearner.trainingOfficerEmail}|${newLearner.trainingOfficerPhone}`}
                      onValueChange={(value) => {
                        const [name, email, phone] = value.split('|');
                        setNewLearner({
                          ...newLearner,
                          trainingOfficerName: name,
                          trainingOfficerEmail: email,
                          trainingOfficerPhone: phone
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select training coordinator" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTrainingCoordinators.map(coordinator => (
                          <SelectItem 
                            key={coordinator.id} 
                            value={`${coordinator.name}|${coordinator.email}|${coordinator.phone}`}
                          >
                            {coordinator.name} ({coordinator.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="coordinatorEmail">Training Coordinator's Email</Label>
                      <Input
                        id="coordinatorEmail"
                        value={newLearner.trainingOfficerEmail || ''}
                        onChange={(e) => setNewLearner({...newLearner, trainingOfficerEmail: e.target.value})}
                        placeholder="coordinator@company.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="coordinatorPhone">Training Coordinator's Phone Number</Label>
                      <Input
                        id="coordinatorPhone"
                        value={newLearner.trainingOfficerPhone || ''}
                        onChange={(e) => setNewLearner({...newLearner, trainingOfficerPhone: e.target.value})}
                        placeholder="+65 xxxx xxxx"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment */}
                <div className="space-y-4">
                  <h4 className="font-medium text-lg border-b pb-2">Payment</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="paymentMode">Payment Mode</Label>
                      <Select
                        value={newLearner.paymentMode}
                        onValueChange={(value) => setNewLearner({...newLearner, paymentMode: value as any})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentModes.map(mode => (
                            <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="feesRemarks">Fees Remarks (Optional)</Label>
                      <Input
                        id="feesRemarks"
                        value={newLearner.feesRemarks || ''}
                        onChange={(e) => setNewLearner({...newLearner, feesRemarks: e.target.value})}
                        placeholder="Any additional fee notes"
                      />
                    </div>
                    <div>
                      <Label htmlFor="poPaymentAdviceNumber">PO/Payment Advice Number (Optional)</Label>
                      <Input
                        id="poPaymentAdviceNumber"
                        value={newLearner.poPaymentAdviceNumber || ''}
                        onChange={(e) => setNewLearner({...newLearner, poPaymentAdviceNumber: e.target.value})}
                        placeholder="PO/Payment advice number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="invoiceNumber">Invoice Number (Optional)</Label>
                      <Input
                        id="invoiceNumber"
                        value={newLearner.invoiceNumber || ''}
                        onChange={(e) => setNewLearner({...newLearner, invoiceNumber: e.target.value})}
                        placeholder="Invoice number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="receiptNumber">Receipt Number (Optional)</Label>
                      <Input
                        id="receiptNumber"
                        value={newLearner.receiptNumber || ''}
                        onChange={(e) => setNewLearner({...newLearner, receiptNumber: e.target.value})}
                        placeholder="Receipt number"
                      />
                    </div>
                  </div>

                  {/* Fee Calculation */}
                  <div className="space-y-4 mt-6">
                    <h5 className="font-medium">Fee Calculation</h5>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Current Default Course Fee</Label>
                        <div className="p-2 bg-muted rounded text-sm">
                          ${courseData.defaultCourseFee?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="discount">Apply Discount (Optional)</Label>
                        <Select value={selectedDiscount} onValueChange={setSelectedDiscount}>
                          <SelectTrigger>
                            <SelectValue placeholder="No discount" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No discount</SelectItem>
                            {courseData.discounts?.map(discount => (
                              <SelectItem key={discount.id} value={discount.id}>
                                {discount.name} ({discount.percentage}%)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Total Fees Before GST</Label>
                        <div className="p-2 bg-primary/10 rounded text-sm font-semibold">
                          ${calculateFinalFee().toFixed(2)}
                        </div>
                      </div>
                    </div>
                    
                    {selectedDiscount && selectedDiscount !== 'none' && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="text-sm text-green-800">
                          <strong>Discount Applied:</strong> {courseData.discounts?.find(d => d.id === selectedDiscount)?.name} 
                          ({courseData.discounts?.find(d => d.id === selectedDiscount)?.percentage}% off)
                        </div>
                        <div className="text-sm text-green-800">
                          <strong>Discount Amount:</strong> $
                          {((courseData.defaultCourseFee || 0) * (courseData.discounts?.find(d => d.id === selectedDiscount)?.percentage || 0) / 100).toFixed(2)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Remarks */}
                <div className="space-y-4">
                  <h4 className="font-medium text-lg border-b pb-2">Additional Notes</h4>
                  <div>
                    <Label htmlFor="remarks">Remarks</Label>
                    <Textarea
                      id="remarks"
                      value={newLearner.remarks || ''}
                      onChange={(e) => setNewLearner({...newLearner, remarks: e.target.value})}
                      rows={3}
                      placeholder="Additional notes or special instructions"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddLearner}>
                  Add Learner
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Learners Table */}
      <Card>
        <CardHeader>
          <CardTitle>Enrolled Learners ({learners.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {learners.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No learners enrolled yet</p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Learner
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Payment Mode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {learners.map((learner) => (
                    <TableRow key={learner.id}>
                      <TableCell>
                        <Checkbox
                          checked={learner.attendance === 'Present'}
                          onCheckedChange={(checked) => handleAttendanceChange(learner, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{learner.name}</p>
                          <p className="text-sm text-muted-foreground">{learner.division}</p>
                        </div>
                      </TableCell>
                      <TableCell>{learner.designation}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="w-3 h-3" />
                            {learner.email}
                          </div>
                          {learner.contactNumber && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="w-3 h-3" />
                              {learner.contactNumber}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {learner.paymentMode}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={learner.enrolmentStatus === 'Cancelled' ? 'destructive' : 'secondary'}>
                          {learner.enrolmentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Send Training Confirmation Email"
                              >
                                <Mail className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Send Training Confirmation Email</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to send a training confirmation email to {learner.name} at {learner.email}?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleSendConfirmationEmail(learner)}>
                                  Send Email
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <Button variant="ghost" size="icon" title="Edit Learner">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LearnerParticularsTab;