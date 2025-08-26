import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Venue {
  id: string;
  name: string;
  address: string;
}

interface Trainer {
  id: string;
  name: string;
}

export default function CourseRunForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);

  const [formData, setFormData] = useState({
    serialNumber: '',
    courseTitle: '',
    courseCode: '',
    type: 'Open' as 'Open' | 'Dedicated' | 'Talks',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    venueId: '',
    trainerIds: [] as string[],
    contractFees: {
      baseAmount: 0,
      perRun: true,
      perHead: false,
      additionalCosts: 0,
    },
    minClassSize: 0,
    maxClassSize: undefined as number | undefined,
    recommendedClassSize: 0,
    individualRegistrationRequired: true,
    remarks: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Mock data - replace with actual API calls
        const mockVenues = [
          { id: '1', name: 'Training Room A', address: '123 Main St' },
          { id: '2', name: 'Training Room B', address: '456 Oak Ave' },
        ];

        const mockTrainers = [
          { id: '1', name: 'Mr. John Doe' },
          { id: '2', name: 'Ms. Jane Smith' },
        ];

        setVenues(mockVenues);
        setTrainers(mockTrainers);
      } catch (error) {
        toast.error('Failed to load data');
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  const handleInputChange = (field: string, value: any) => {
    if (field.startsWith('contractFees.')) {
      const contractField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        contractFees: {
          ...prev.contractFees,
          [contractField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleTrainerSelection = (trainerId: string, selected: boolean) => {
    setFormData(prev => ({
      ...prev,
      trainerIds: selected
        ? [...prev.trainerIds, trainerId]
        : prev.trainerIds.filter(id => id !== trainerId)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation
      if (!formData.serialNumber || !formData.courseTitle || !formData.courseCode || !formData.startDate || !formData.endDate) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Mock API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Course run created successfully!');
      navigate('/course-runs');
    } catch (error) {
      toast.error('Failed to create course run');
      console.error('Error creating course run:', error);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 pb-6 border-b">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/course-runs')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Course Runs
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create New Course Run</h1>
          <p className="text-muted-foreground">Set up a new course run with detailed information</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="serialNumber">Serial Number *</Label>
              <Input
                id="serialNumber"
                placeholder="e.g., CR001/25"
                value={formData.serialNumber}
                onChange={(e) => handleInputChange('serialNumber', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Course Run Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleInputChange('type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="Dedicated">Dedicated</SelectItem>
                  <SelectItem value="Talks">Talks</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="courseTitle">Course Title *</Label>
              <Input
                id="courseTitle"
                placeholder="e.g., Advanced Leadership Skills"
                value={formData.courseTitle}
                onChange={(e) => handleInputChange('courseTitle', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="courseCode">Course Code *</Label>
              <Input
                id="courseCode"
                placeholder="e.g., ALS01"
                maxLength={5}
                value={formData.courseCode}
                onChange={(e) => handleInputChange('courseCode', e.target.value.toUpperCase())}
                required
              />
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground">Schedule</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time *</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => handleInputChange('startTime', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time *</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => handleInputChange('endTime', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Venue & Trainers */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground">Venue & Trainers</h2>
          
          <div className="space-y-2">
            <Label htmlFor="venueId">Venue</Label>
            <Select
              value={formData.venueId}
              onValueChange={(value) => handleInputChange('venueId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select venue" />
              </SelectTrigger>
              <SelectContent>
                {venues.map((venue) => (
                  <SelectItem key={venue.id} value={venue.id}>
                    {venue.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Trainers</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {trainers.map((trainer) => (
                <div key={trainer.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`trainer-${trainer.id}`}
                    checked={formData.trainerIds.includes(trainer.id)}
                    onChange={(e) => handleTrainerSelection(trainer.id, e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor={`trainer-${trainer.id}`} className="font-normal">
                    {trainer.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Class Size */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground">Class Size Requirements</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="minClassSize">Min Class Size *</Label>
              <Input
                id="minClassSize"
                type="number"
                min="0"
                value={formData.minClassSize}
                onChange={(e) => handleInputChange('minClassSize', parseInt(e.target.value) || 0)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxClassSize">Max Class Size</Label>
              <Input
                id="maxClassSize"
                type="number"
                min="0"
                value={formData.maxClassSize || ''}
                onChange={(e) => handleInputChange('maxClassSize', e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recommendedClassSize">Recommended Class Size *</Label>
              <Input
                id="recommendedClassSize"
                type="number"
                min="0"
                value={formData.recommendedClassSize}
                onChange={(e) => handleInputChange('recommendedClassSize', parseInt(e.target.value) || 0)}
                required
              />
            </div>
          </div>
        </div>

        {/* Contract Fees */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground">Contract Fees</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="baseAmount">Base Amount *</Label>
              <Input
                id="baseAmount"
                type="number"
                min="0"
                step="0.01"
                value={formData.contractFees.baseAmount}
                onChange={(e) => handleInputChange('contractFees.baseAmount', parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="additionalCosts">Additional Costs</Label>
              <Input
                id="additionalCosts"
                type="number"
                min="0"
                step="0.01"
                value={formData.contractFees.additionalCosts}
                onChange={(e) => handleInputChange('contractFees.additionalCosts', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="perRun"
                checked={formData.contractFees.perRun}
                onCheckedChange={(checked) => {
                  handleInputChange('contractFees.perRun', checked);
                  if (checked) handleInputChange('contractFees.perHead', false);
                }}
              />
              <Label htmlFor="perRun">Per Run</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="perHead"
                checked={formData.contractFees.perHead}
                onCheckedChange={(checked) => {
                  handleInputChange('contractFees.perHead', checked);
                  if (checked) handleInputChange('contractFees.perRun', false);
                }}
              />
              <Label htmlFor="perHead">Per Head</Label>
            </div>
          </div>
        </div>

        {/* Additional Settings */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground">Additional Settings</h2>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="individualRegistrationRequired"
              checked={formData.individualRegistrationRequired}
              onCheckedChange={(checked) => handleInputChange('individualRegistrationRequired', checked)}
            />
            <Label htmlFor="individualRegistrationRequired">
              Individual Registration Required
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              placeholder="Enter any additional remarks..."
              value={formData.remarks}
              onChange={(e) => handleInputChange('remarks', e.target.value)}
              rows={4}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/course-runs')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Course Run
          </Button>
        </div>
      </form>
    </div>
  );
}