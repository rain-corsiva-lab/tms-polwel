export interface TrainerBlockout {
  id: string;
  trainerId: string;
  trainerName: string;
  startDate: string;
  endDate: string;
  remarks?: string | null;
  description?: string;
  isRecurring: boolean;
  recurringPattern?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CourseRun {
  id: string;
  courseId: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  status: string;
  course: {
    title: string;
  };
  venue?: {
    id: string;
    name: string;
    address: string;
  };
  currentParticipants: number;
  maxParticipants: number;
  organization?: {
    name: string;
  };
}
