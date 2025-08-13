import { PrismaClient, UserRole, UserStatus, AvailabilityStatus, PaymentMode, CourseStatus, VenueStatus, FeeType, BookingStatus, AuditActionType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data (in reverse order of dependencies)
  await prisma.auditLog.deleteMany();
  await prisma.userPermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.trainerBlockout.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.courseRun.deleteMany();
  await prisma.course.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  console.log('🗑️  Cleared existing data');

  // Create Organizations
  const spfOrg = await prisma.organization.create({
    data: {
      name: 'Singapore Police Force',
      displayName: 'SPF',
      industry: 'Government',
      address: 'Police Cantonment Complex, 391 New Bridge Road, Singapore 188762',
      contactEmail: 'contact@spf.gov.sg',
      contactPhone: '+65 6355 0000',
      buNumber: 'SPF-MAIN-001',
      status: UserStatus.ACTIVE,
    },
  });

  const angMoKioDiv = await prisma.organization.create({
    data: {
      name: 'Singapore Police Force - Ang Mo Kio Division',
      displayName: 'Ang Mo Kio',
      industry: 'Government',
      address: 'Ang Mo Kio Police Division HQ, Singapore',
      contactEmail: 'contact@spf.gov.sg',
      contactPhone: '+65 6555 0001',
      buNumber: 'SPF-AMK-001',
      divisionAddress: 'Ang Mo Kio Police Division HQ, Singapore',
      status: UserStatus.ACTIVE,
    },
  });

  const choaChuKangDiv = await prisma.organization.create({
    data: {
      name: 'Singapore Police Force - Choa Chu Kang Division',
      displayName: 'Choa Chu Kang',
      industry: 'Government',
      address: 'Choa Chu Kang Police Division HQ, Singapore',
      contactEmail: 'contact@spf.gov.sg',
      contactPhone: '+65 6555 0002',
      buNumber: 'SPF-CCK-001',
      divisionAddress: 'Choa Chu Kang Police Division HQ, Singapore',
      status: UserStatus.ACTIVE,
    },
  });

  console.log('🏢 Created organizations');

  // Hash password for all users
  const hashedPassword = await bcrypt.hash('password123', 12);

  // Create POLWEL Users
  const johnTan = await prisma.user.create({
    data: {
      email: 'john.tan@polwel.org',
      password: hashedPassword,
      name: 'John Tan',
      role: UserRole.POLWEL,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      mfaEnabled: true,
      permissionLevel: 'Administrator',
      department: 'System Administration',
      lastLogin: new Date('2024-01-15T09:30:00Z'),
      passwordExpiry: new Date('2024-04-15'),
    },
  });

  const sarahWong = await prisma.user.create({
    data: {
      email: 'sarah.wong@polwel.org',
      password: hashedPassword,
      name: 'Sarah Wong',
      role: UserRole.POLWEL,
      status: UserStatus.INACTIVE,
      emailVerified: true,
      mfaEnabled: true,
      permissionLevel: 'Manager',
      department: 'Course Management',
      lastLogin: new Date('2024-01-10T11:15:00Z'),
      passwordExpiry: new Date('2024-04-10'),
      createdBy: johnTan.id,
    },
  });

  const alexKumar = await prisma.user.create({
    data: {
      email: 'alex.kumar@polwel.org',
      password: hashedPassword,
      name: 'Alex Kumar',
      role: UserRole.POLWEL,
      status: UserStatus.PENDING,
      emailVerified: false,
      mfaEnabled: false,
      permissionLevel: 'Staff',
      department: 'Training Coordination',
      createdBy: johnTan.id,
    },
  });

  // Create Training Coordinators
  const maryLim = await prisma.user.create({
    data: {
      email: 'mary.lim@spf.gov.sg',
      password: hashedPassword,
      name: 'Mary Lim',
      role: UserRole.TRAINING_COORDINATOR,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      mfaEnabled: true,
      organizationId: angMoKioDiv.id,
      division: 'Ang Mo Kio Division',
      buCostCentre: 'AMK001',
      buNumberRequired: true,
      paymentMode: PaymentMode.ULTF,
      contactNumber: '+65 6555 0001',
      additionalEmails: ['mary.lim.backup@spf.gov.sg'],
      lastLogin: new Date('2024-01-14T16:45:00Z'),
      passwordExpiry: new Date('2024-04-14'),
      createdBy: johnTan.id,
    },
  });

  const ahmadRahman = await prisma.user.create({
    data: {
      email: 'ahmad.rahman@spf.gov.sg',
      password: hashedPassword,
      name: 'Ahmad Rahman',
      role: UserRole.TRAINING_COORDINATOR,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      mfaEnabled: true,
      organizationId: choaChuKangDiv.id,
      division: 'Choa Chu Kang Division',
      buCostCentre: 'CCK002',
      buNumberRequired: true,
      paymentMode: PaymentMode.TRANSITION_DOLLARS,
      contactNumber: '+65 6555 0002',
      lastLogin: new Date('2024-01-15T08:45:00Z'),
      passwordExpiry: new Date('2024-04-15'),
      createdBy: johnTan.id,
    },
  });

  // Create Trainers
  const davidChen = await prisma.user.create({
    data: {
      email: 'david.chen@training.com',
      password: hashedPassword,
      name: 'David Chen',
      role: UserRole.TRAINER,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      mfaEnabled: true,
      availabilityStatus: AvailabilityStatus.AVAILABLE,
      partnerOrganization: 'Excellence Training Partners',
      bio: 'Experienced trainer with over 5 years in corporate development. Passionate about empowering teams and individuals to reach their full potential through innovative training methodologies.',
      specializations: ['Leadership Development', 'Team Building', 'Communication Skills'],
      certifications: ['Certified Professional Trainer', 'Leadership Coach', 'Team Dynamics Specialist'],
      experience: '5 years',
      rating: 4.8,
      lastLogin: new Date('2024-01-13T14:20:00Z'),
      passwordExpiry: new Date('2024-04-13'),
      createdBy: johnTan.id,
    },
  });

  const jenniferLee = await prisma.user.create({
    data: {
      email: 'jennifer.lee@partners.com',
      password: hashedPassword,
      name: 'Jennifer Lee',
      role: UserRole.TRAINER,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      mfaEnabled: true,
      availabilityStatus: AvailabilityStatus.LIMITED,
      partnerOrganization: 'Professional Development Corp',
      bio: 'Specialist in communication and customer service training with extensive experience in corporate environments.',
      specializations: ['Communication Skills', 'Customer Service', 'Presentation Skills'],
      certifications: ['Certified Communication Trainer', 'Customer Service Excellence'],
      experience: '7 years',
      rating: 4.6,
      lastLogin: new Date('2024-01-12T15:30:00Z'),
      passwordExpiry: new Date('2024-04-12'),
      createdBy: johnTan.id,
    },
  });

  const michaelBrown = await prisma.user.create({
    data: {
      email: 'michael.brown@partners.com',
      password: hashedPassword,
      name: 'Michael Brown',
      role: UserRole.TRAINER,
      status: UserStatus.PENDING,
      emailVerified: false,
      mfaEnabled: false,
      availabilityStatus: AvailabilityStatus.AVAILABLE,
      partnerOrganization: 'Training Solutions Ltd',
      specializations: ['Project Management', 'Leadership'],
      experience: '3 years',
      createdBy: johnTan.id,
    },
  });

  // Create Learners
  const rajKumar = await prisma.user.create({
    data: {
      email: 'raj.kumar@spf.gov.sg',
      password: hashedPassword,
      name: 'Raj Kumar',
      role: UserRole.LEARNER,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      mfaEnabled: false,
      organizationId: angMoKioDiv.id,
      division: 'Ang Mo Kio Division',
      employeeId: 'SPF001234',
      lastLogin: new Date('2024-01-14T10:20:00Z'),
      passwordExpiry: new Date('2024-04-14'),
      createdBy: maryLim.id,
    },
  });

  const lisaTeo = await prisma.user.create({
    data: {
      email: 'lisa.teo@spf.gov.sg',
      password: hashedPassword,
      name: 'Lisa Teo',
      role: UserRole.LEARNER,
      status: UserStatus.LOCKED,
      emailVerified: true,
      mfaEnabled: false,
      organizationId: choaChuKangDiv.id,
      division: 'Choa Chu Kang Division',
      employeeId: 'SPF005678',
      failedLoginAttempts: 5,
      lastLogin: new Date('2024-01-05T14:30:00Z'),
      passwordExpiry: new Date('2024-04-05'),
      createdBy: ahmadRahman.id,
    },
  });

  console.log('👥 Created users');

  // Create Venues
  const orchardHotel = await prisma.venue.create({
    data: {
      name: 'Orchard Hotel',
      address: '442 Orchard Road, Singapore 238879',
      capacity: '70-80 pax',
      description: 'Professional conference facility with modern amenities',
      facilities: ['projector', 'whiteboard', 'wifi', 'air-conditioning', 'sound-system'],
      contactName: 'Sarah Chen',
      contactNumber: '+65 6734 7766',
      contactEmail: 'sarah.chen@orchardhotel.com.sg',
      feeType: FeeType.PER_HEAD,
      fee: 25.0,
      status: VenueStatus.ACTIVE,
      remarks: 'Includes tea break and lunch. Additional AV equipment available on request.',
      createdBy: johnTan.id,
    },
  });

  const polwelLearningPod = await prisma.venue.create({
    data: {
      name: 'POLWEL Learning Pod',
      address: 'POLWEL Training Center, Singapore',
      capacity: '25 pax',
      description: 'Intimate learning environment perfect for small group training',
      facilities: ['projector', 'whiteboard', 'wifi', 'flip-charts'],
      contactName: 'Training Center Admin',
      contactNumber: '+65 6123 4567',
      contactEmail: 'bookings@polwel.org.sg',
      feeType: FeeType.PER_VENUE,
      fee: 300.0,
      status: VenueStatus.ACTIVE,
      remarks: 'Projector and whiteboard included. Tea/coffee service available.',
      createdBy: johnTan.id,
    },
  });

  const marinaBayCenter = await prisma.venue.create({
    data: {
      name: 'Marina Bay Conference Center',
      address: 'Marina Bay, Singapore',
      capacity: '150 pax',
      description: 'Premium conference facility with harbor views',
      facilities: ['projector', 'sound-system', 'wifi', 'air-conditioning', 'catering'],
      contactName: 'Events Manager',
      contactNumber: '+65 6555 1234',
      contactEmail: 'events@mbcc.com.sg',
      feeType: FeeType.PER_VENUE,
      fee: 800.0,
      status: VenueStatus.INACTIVE,
      remarks: 'Premium location with full AV equipment. Catering options available.',
      createdBy: johnTan.id,
    },
  });

  console.log('🏢 Created venues');

  // Create Courses
  const leadershipCourse = await prisma.course.create({
    data: {
      title: 'Leadership Excellence Program',
      description: 'A comprehensive leadership development program designed to enhance your management capabilities and inspire effective team leadership. This program covers essential leadership principles, communication strategies, and practical tools for managing diverse teams.',
      objectives: [
        'Develop authentic leadership presence and communication skills',
        'Master techniques for motivating and engaging team members', 
        'Learn conflict resolution and decision-making frameworks',
        'Build emotional intelligence and self-awareness',
        'Create actionable leadership development plans'
      ],
      duration: '3',
      durationType: 'days',
      maxParticipants: 25,
      minParticipants: 15,
      category: 'Mindful Leadership',
      level: 'Intermediate',
      prerequisites: ['2+ years management experience recommended'],
      materials: ['Leadership Workbook', 'Case Studies', 'Assessment Tools', 'Action Planning Templates'],
      status: CourseStatus.ACTIVE,
      venue: 'Main Training Room',
      trainers: ['John Smith', 'Sarah Johnson'],
      certificates: 'polwel',
      remarks: 'Course will be postponed if minimum participants not met',
      courseOutline: {
        "modules": [
          {
            "module": "Module 1: Leadership Foundations", 
            "duration": "Day 1",
            "topics": ["Leadership styles and approaches", "Self-assessment and awareness", "Building trust and credibility"]
          },
          {
            "module": "Module 2: Communication & Influence",
            "duration": "Day 2", 
            "topics": ["Effective communication strategies", "Influencing without authority", "Active listening and feedback"]
          },
          {
            "module": "Module 3: Team Leadership",
            "duration": "Day 3",
            "topics": ["Team building and motivation", "Performance management", "Action planning and implementation"]
          }
        ]
      },
      targetAudience: 'Middle managers, team leaders, and aspiring executives',
      courseFee: 800.0,
      venueFee: 150.0,
      trainerFee: 2000.0,
      amountPerPax: 850.0,
      discount: 0.0,
      adminFees: 50.0,
      contingencyFees: 25.0,
      serviceFees: 30.0,
      vitalFees: 15.0,
      syllabus: 'Day 1: Leadership Fundamentals, Communication Skills\\nDay 2: Team Management, Performance Coaching\\nDay 3: Strategic Leadership, Change Management',
      assessmentMethod: 'Practical exercises, group discussions, and case study presentations',
      certificationType: 'Certificate of Completion',
      createdBy: johnTan.id,
    },
  });

  const emotionalIntelligenceCourse = await prisma.course.create({
    data: {
      title: 'Emotional Intelligence Workshop',
      description: 'Master the art of emotional intelligence to enhance personal and professional relationships through self-awareness, empathy, and effective emotional regulation.',
      objectives: [
        'Develop self-awareness of emotional patterns',
        'Learn techniques for emotional regulation',
        'Build empathy and social awareness skills', 
        'Apply EQ principles in workplace situations'
      ],
      duration: '8',
      durationType: 'hours',
      maxParticipants: 20,
      minParticipants: 12,
      category: 'Emotional Intelligence',
      level: 'Beginner',
      prerequisites: ['None - open to all levels'],
      materials: ['EQ Assessment Tools', 'Practical Exercises', 'Reference Guide'],
      status: CourseStatus.ACTIVE,
      venue: 'Conference Hall A',
      trainers: ['Jennifer Lee'],
      certificates: 'partner',
      remarks: '',
      courseOutline: {
        "modules": [
          {
            "module": "Morning Session: EQ Foundations",
            "duration": "4 hours",
            "topics": ["Understanding emotional intelligence", "Self-awareness techniques", "Emotional triggers identification"]
          },
          {
            "module": "Afternoon Session: Practical Application", 
            "duration": "4 hours",
            "topics": ["Empathy building exercises", "Communication under pressure", "Workplace EQ scenarios"]
          }
        ]
      },
      targetAudience: 'All professionals seeking to improve interpersonal skills',
      courseFee: 300.0,
      venueFee: 80.0,
      trainerFee: 800.0,
      amountPerPax: 420.0,
      discount: 5.0,
      adminFees: 25.0,
      contingencyFees: 15.0,
      serviceFees: 20.0,
      vitalFees: 10.0,
      syllabus: 'Morning: EQ Fundamentals, Self-Assessment\\nAfternoon: Practical Applications, Action Planning',
      assessmentMethod: 'Interactive exercises, peer feedback, and self-reflection activities',
      certificationType: 'Certificate of Attendance',
      createdBy: sarahWong.id,
    },
  });

  const strategicThinkingCourse = await prisma.course.create({
    data: {
      title: 'Strategic Thinking Masterclass',
      description: 'Develop strategic thinking capabilities to analyze complex business situations, make informed decisions, and create long-term value for your organization.',
      objectives: [
        'Master strategic analysis frameworks',
        'Learn systems thinking approaches',
        'Develop scenario planning skills',
        'Create strategic action plans'
      ],
      duration: '2',
      durationType: 'days',
      maxParticipants: 15,
      minParticipants: 12,
      category: 'Strategic Planning',
      level: 'Advanced',
      prerequisites: ['Senior management experience', 'Strategic planning background'],
      materials: ['Strategy Toolkit', 'Case Study Collection', 'Planning Templates'],
      status: CourseStatus.DRAFT,
      venue: 'Online Platform',
      trainers: ['Michael Brown', 'Excellence Training Partners'],
      certificates: 'polwel',
      remarks: 'Hybrid delivery with online and in-person components',
      courseOutline: {
        "modules": [
          {
            "module": "Day 1: Strategic Analysis",
            "duration": "8 hours", 
            "topics": ["SWOT and competitive analysis", "Market dynamics", "Strategic frameworks"]
          },
          {
            "module": "Day 2: Strategy Implementation",
            "duration": "8 hours",
            "topics": ["Action planning", "Risk assessment", "Performance metrics", "Change management"]
          }
        ]
      },
      targetAudience: 'Senior managers, directors, and strategic planning professionals',
      courseFee: 600.0,
      venueFee: 0.0, // Online delivery
      trainerFee: 1500.0,
      amountPerPax: 680.0,
      discount: 0.0,
      adminFees: 40.0,
      contingencyFees: 20.0,
      serviceFees: 35.0,
      vitalFees: 15.0,
      syllabus: 'Day 1: Strategic Analysis Tools, Competitive Intelligence\\nDay 2: Strategy Development, Implementation Planning',
      assessmentMethod: 'Strategic case study analysis and presentation of strategic plan',
      certificationType: 'Professional Certificate',
      createdBy: johnTan.id,
    },
  });

  const growthMindsetCourse = await prisma.course.create({
    data: {
      title: 'Growth Mindset Development',
      description: 'Transform your approach to challenges and learning through developing a growth mindset that embraces continuous improvement and resilience.',
      objectives: [
        'Understand fixed vs growth mindset concepts',
        'Develop resilience in face of setbacks',
        'Learn continuous learning strategies',
        'Build self-efficacy and confidence'
      ],
      duration: '6',
      durationType: 'hours',
      maxParticipants: 30,
      minParticipants: 15,
      category: 'Growth Mindset',
      level: 'Beginner',
      prerequisites: ['Open to all - no prerequisites'],
      materials: ['Mindset Assessment', 'Personal Development Plan', 'Resource Library'],
      status: CourseStatus.ACTIVE,
      venue: 'Main Training Room',
      trainers: ['David Chen'],
      certificates: 'no',
      remarks: 'Highly interactive workshop with practical exercises',
      courseOutline: {
        "modules": [
          {
            "module": "Session 1: Mindset Foundations",
            "duration": "3 hours",
            "topics": ["Fixed vs Growth mindset", "Neuroscience of learning", "Self-assessment tools"]
          },
          {
            "module": "Session 2: Practical Application",
            "duration": "3 hours", 
            "topics": ["Overcoming limiting beliefs", "Goal setting strategies", "Action planning"]
          }
        ]
      },
      targetAudience: 'All employees seeking personal and professional development',
      courseFee: 250.0,
      venueFee: 50.0,
      trainerFee: 600.0,
      amountPerPax: 320.0,
      discount: 10.0,
      adminFees: 20.0,
      contingencyFees: 10.0,
      serviceFees: 15.0,
      vitalFees: 8.0,
      syllabus: 'Session 1: Mindset Theory, Self-Discovery\\nSession 2: Practical Strategies, Goal Setting',
      assessmentMethod: 'Self-reflection exercises and personal development plan creation',
      certificationType: 'Certificate of Participation',
      createdBy: sarahWong.id,
    },
  });

  console.log('📚 Created courses');

  // Create Course Runs
  const leadershipRun1 = await prisma.courseRun.create({
    data: {
      courseId: leadershipCourse.id,
      startDate: new Date('2024-02-15T09:00:00Z'),
      endDate: new Date('2024-02-16T17:00:00Z'),
      startTime: '09:00',
      endTime: '17:00',
      venueId: orchardHotel.id,
      trainerId: davidChen.id,
      maxParticipants: 25,
      currentParticipants: 0,
      status: CourseStatus.PUBLISHED,
      trainerFee: 2000.0,
      venueFee: 1500.0,
      totalCost: 4500.0,
      notes: 'Premium leadership program with experienced trainer',
    },
  });

  const emotionalIntelligenceRun1 = await prisma.courseRun.create({
    data: {
      courseId: emotionalIntelligenceCourse.id,
      startDate: new Date('2024-02-20T09:00:00Z'),
      endDate: new Date('2024-02-20T17:00:00Z'),
      startTime: '09:00',
      endTime: '17:00',
      venueId: polwelLearningPod.id,
      trainerId: jenniferLee.id,
      maxParticipants: 25,
      currentParticipants: 0,
      status: CourseStatus.PUBLISHED,
      trainerFee: 800.0,
      venueFee: 300.0,
      totalCost: 1500.0,
      notes: 'Interactive communication skills workshop',
    },
  });

  console.log('🎯 Created course runs');

  // Create Bookings
  const booking1 = await prisma.booking.create({
    data: {
      courseId: leadershipCourse.id,
      courseRunId: leadershipRun1.id,
      userId: rajKumar.id,
      organizationId: angMoKioDiv.id,
      participantCount: 1,
      status: BookingStatus.CONFIRMED,
      notes: 'Approved by direct supervisor',
      totalAmount: 400.0,
      paymentStatus: 'PAID',
      paymentReference: 'PAY-2024-001',
      bookingReference: 'BOOK-2024-001',
      confirmedAt: new Date('2024-01-20T10:00:00Z'),
      createdBy: maryLim.id,
    },
  });

  const booking2 = await prisma.booking.create({
    data: {
      courseId: emotionalIntelligenceCourse.id,
      courseRunId: emotionalIntelligenceRun1.id,
      userId: lisaTeo.id,
      organizationId: choaChuKangDiv.id,
      participantCount: 1,
      status: BookingStatus.PENDING,
      notes: 'Waiting for budget approval',
      totalAmount: 200.0,
      paymentStatus: 'PENDING',
      bookingReference: 'BOOK-2024-002',
      createdBy: ahmadRahman.id,
    },
  });

  console.log('📝 Created bookings');

  // Create Trainer Blockouts
  await prisma.trainerBlockout.create({
    data: {
      trainerId: davidChen.id,
      date: new Date('2024-01-25'),
      reason: 'Conference Attendance',
      type: 'unavailable',
      description: 'Speaking at Leadership Excellence Conference 2024',
    },
  });

  await prisma.trainerBlockout.create({
    data: {
      trainerId: jenniferLee.id,
      date: new Date('2024-02-05'),
      reason: 'Personal Leave',
      type: 'personal',
      description: 'Family commitment',
    },
  });

  console.log('🚫 Created trainer blockouts');

  // Create Audit Logs
  await prisma.auditLog.create({
    data: {
      userId: johnTan.id,
      action: 'User Login',
      actionType: AuditActionType.LOGIN,
      details: 'Successful login from Singapore office',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      performedBy: johnTan.email,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: sarahWong.id,
      action: 'Status Changed',
      actionType: AuditActionType.STATUS_CHANGE,
      tableName: 'users',
      recordId: sarahWong.id,
      details: 'User account status changed from Active to Inactive due to resignation',
      ipAddress: '192.168.1.100',
      performedBy: johnTan.email,
    },
  });

  console.log('📋 Created audit logs');

  // Create Permissions
  const permissions = [
    { name: 'users.view', description: 'View users', module: 'User Management', action: 'read' },
    { name: 'users.create', description: 'Create users', module: 'User Management', action: 'create' },
    { name: 'users.edit', description: 'Edit users', module: 'User Management', action: 'update' },
    { name: 'users.delete', description: 'Delete users', module: 'User Management', action: 'delete' },
    { name: 'courses.view', description: 'View courses', module: 'Course Management', action: 'read' },
    { name: 'courses.create', description: 'Create courses', module: 'Course Management', action: 'create' },
    { name: 'courses.edit', description: 'Edit courses', module: 'Course Management', action: 'update' },
    { name: 'courses.delete', description: 'Delete courses', module: 'Course Management', action: 'delete' },
    { name: 'venues.view', description: 'View venues', module: 'Venue Management', action: 'read' },
    { name: 'venues.create', description: 'Create venues', module: 'Venue Management', action: 'create' },
    { name: 'bookings.view', description: 'View bookings', module: 'Booking Management', action: 'read' },
    { name: 'bookings.create', description: 'Create bookings', module: 'Booking Management', action: 'create' },
  ];

  for (const permission of permissions) {
    await prisma.permission.create({ data: permission });
  }

  console.log('🔐 Created permissions');

  // Create System Settings
  const systemSettings = [
    { key: 'site_name', value: 'POLWEL Training Management System', description: 'Application name' },
    { key: 'max_booking_days_advance', value: '90', description: 'Maximum days in advance for booking', dataType: 'number' },
    { key: 'default_session_timeout', value: '3600', description: 'Default session timeout in seconds', dataType: 'number' },
    { key: 'enable_email_notifications', value: 'true', description: 'Enable email notifications', dataType: 'boolean' },
    { key: 'maintenance_mode', value: 'false', description: 'Enable maintenance mode', dataType: 'boolean' },
    { key: 'booking_cancellation_hours', value: '24', description: 'Minimum hours before course start to allow cancellation', dataType: 'number' },
  ];

  for (const setting of systemSettings) {
    await prisma.systemSetting.create({ data: setting });
  }

  console.log('⚙️  Created system settings');

  // Update course run participant counts
  await prisma.courseRun.update({
    where: { id: leadershipRun1.id },
    data: { currentParticipants: 1 },
  });

  console.log('✅ Database seeding completed successfully!');
  console.log('');
  console.log('📊 Seeded Data Summary:');
  console.log('- Organizations: 3');
  console.log('- Users: 8 (2 POLWEL, 2 Training Coordinators, 3 Trainers, 2 Learners)');
  console.log('- Courses: 3');
  console.log('- Course Runs: 2');
  console.log('- Venues: 3');
  console.log('- Bookings: 2');
  console.log('- Trainer Blockouts: 2');
  console.log('- Audit Logs: 2');
  console.log('- Permissions: 12');
  console.log('- System Settings: 6');
  console.log('');
  console.log('🔑 Default Login Credentials:');
  console.log('- Admin: john.tan@polwel.org / password123');
  console.log('- Training Coordinator: mary.lim@spf.gov.sg / password123');
  console.log('- Trainer: david.chen@training.com / password123');
  console.log('- Learner: raj.kumar@spf.gov.sg / password123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
