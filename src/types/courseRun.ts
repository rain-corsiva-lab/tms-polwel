export interface CourseRun {
  id: string;
  serialNumber: string;
  courseId: string;
  courseTitle: string;
  courseCode: string;
  type: 'Open' | 'Dedicated' | 'Talks';
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  venueId: string;
  venue?: {
    id: string;
    name: string;
    address: string;
  };
  venueType?: string;
  venueHotel?: string;
  specifiedLocation?: string;
  trainerIds: string[];
  trainers?: Array<{
    id: string;
    name: string;
  }>;
  contractFees: {
    baseAmount: number;
    perRun: boolean;
    perHead: boolean;
    additionalCosts: number;
    splitFees?: Array<{
      trainerId: string;
      amount: number;
    }>;
  };
  minClassSize: number;
  maxClassSize?: number;
  recommendedClassSize: number;
  individualRegistrationRequired: boolean;
  status: 'Pending' | 'Open' | 'Confirmed' | 'Cancelled' | 'In Progress' | 'Completed';
  currentParticipants: number;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Learner {
  id: string;
  courseRunId: string;
  name: string;
  designation: string;
  email: string;
  contactNumber: string;
  division: string;
  department: string;
  paymentMode: 'Self-Payment' | 'Transition Dollars (T$)' | 'ULTF' | 'Company-Sponsored (Non-HomeTeam)' | 'POLWEL Training Subsidy';
  buNumber?: string;
  feesBeforeGST: number;
  discounts: string[];
  feesRemarks?: string;
  poPaymentAdviceNumber?: string;
  invoiceNumber?: string;
  receiptNumber?: string;
  trainingOfficerName: string;
  trainingOfficerEmail: string;
  trainingOfficerPhone: string;
  remarks?: string;
  enrolmentStatus: string;
  attendance: 'Present' | 'Absent' | 'Withdrawn';
  createdAt: string;
  updatedAt: string;
}

export interface TrainerAssignment {
  id: string;
  courseRunId: string;
  trainerId: string;
  trainerName: string;
  dayAssigned?: string;
  confirmationSent: boolean;
  assignmentDate: string;
  remarks?: string;
}