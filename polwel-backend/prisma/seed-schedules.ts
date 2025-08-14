import { PrismaClient, CourseStatus, VenueStatus } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

// Helper function to generate random date between two dates
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function to add business days (excluding weekends)
function addBusinessDays(date: Date, days: number): Date {
  let result = new Date(date);
  let addedDays = 0;
  
  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    if (result.getDay() !== 0 && result.getDay() !== 6) { // Not Sunday (0) or Saturday (6)
      addedDays++;
    }
  }
  
  return result;
}

// Helper function to check if two date ranges overlap
function datesOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
  return start1 <= end2 && end1 >= start2;
}

async function seedCourseSchedulesAndBlockouts() {
  try {
    console.log('Starting to seed course schedules and blockouts...');

    // Get all trainers
    const trainers = await prisma.user.findMany({
      where: { role: 'TRAINER' }
    });

    if (trainers.length === 0) {
      console.log('No trainers found. Creating some sample trainers...');
      
      // Create sample trainers if none exist
      for (let i = 1; i <= 5; i++) {
        await prisma.user.create({
          data: {
            email: `trainer${i}@polwel.com`,
            password: '$2b$10$8D8K9H7K8K9J9I9H8G7F6e5d4c3b2a1z0y9x8w7v6u5t4s3r2q1p0o', // hashed 'password123'
            name: `Trainer ${i}`,
            role: 'TRAINER',
            status: 'ACTIVE',
            emailVerified: true,
            specializations: faker.helpers.arrayElements([
              'Leadership Development',
              'Communication Skills',
              'Project Management',
              'Technical Training',
              'Soft Skills',
              'Sales Training',
              'Customer Service',
              'Team Building'
            ], { min: 2, max: 4 }),
            experience: `${faker.number.int({ min: 3, max: 15 })} years`,
            rating: parseFloat(faker.number.float({ min: 3.5, max: 5.0, fractionDigits: 1 }).toFixed(1))
          }
        });
      }
      
      // Refresh trainers list
      const newTrainers = await prisma.user.findMany({
        where: { role: 'TRAINER' }
      });
      trainers.push(...newTrainers);
    }

    // Get or create sample courses
    let courses = await prisma.course.findMany();
    
    if (courses.length === 0) {
      console.log('No courses found. Creating sample courses...');
      
      const courseData = [
        {
          title: 'Leadership Excellence Program',
          description: 'Comprehensive leadership development for managers and supervisors',
          duration: '3',
          durationType: 'days',
          maxParticipants: 20,
          category: 'Leadership',
          level: 'Intermediate',
          courseFee: 1200,
          status: CourseStatus.ACTIVE
        },
        {
          title: 'Effective Communication Workshop',
          description: 'Enhance your communication skills for workplace success',
          duration: '2',
          durationType: 'days',
          maxParticipants: 25,
          category: 'Communication',
          level: 'Beginner',
          courseFee: 800,
          status: CourseStatus.ACTIVE
        },
        {
          title: 'Project Management Fundamentals',
          description: 'Learn the basics of successful project management',
          duration: '5',
          durationType: 'days',
          maxParticipants: 18,
          category: 'Management',
          level: 'Intermediate',
          courseFee: 1500,
          status: CourseStatus.ACTIVE
        },
        {
          title: 'Team Building & Collaboration',
          description: 'Build stronger teams and improve collaboration',
          duration: '1',
          durationType: 'days',
          maxParticipants: 30,
          category: 'Team Development',
          level: 'Beginner',
          courseFee: 600,
          status: CourseStatus.ACTIVE
        },
        {
          title: 'Customer Service Excellence',
          description: 'Deliver exceptional customer service experiences',
          duration: '2',
          durationType: 'days',
          maxParticipants: 22,
          category: 'Customer Service',
          level: 'Beginner',
          courseFee: 900,
          status: CourseStatus.ACTIVE
        }
      ];

      for (const courseInfo of courseData) {
        await prisma.course.create({
          data: courseInfo
        });
      }

      // Refresh courses list
      courses = await prisma.course.findMany();
    }

    // Get or create sample venues
    let venues = await prisma.venue.findMany();
    
    if (venues.length === 0) {
      console.log('No venues found. Creating sample venues...');
      
      const venueData = [
        {
          name: 'Training Room A',
          address: '123 Business Park, Singapore 123456',
          capacity: '25',
          facilities: ['Projector', 'Whiteboard', 'Air Conditioning', 'WiFi'],
          fee: 200,
          status: VenueStatus.ACTIVE
        },
        {
          name: 'Conference Hall B',
          address: '456 Corporate Center, Singapore 654321',
          capacity: '50',
          facilities: ['Audio System', 'Projector', 'Stage', 'Air Conditioning', 'WiFi'],
          fee: 400,
          status: VenueStatus.ACTIVE
        },
        {
          name: 'Workshop Room C',
          address: '789 Learning Hub, Singapore 987654',
          capacity: '30',
          facilities: ['Interactive Whiteboard', 'Breakout Areas', 'Air Conditioning', 'WiFi'],
          fee: 300,
          status: VenueStatus.ACTIVE
        }
      ];

      for (const venueInfo of venueData) {
        await prisma.venue.create({
          data: venueInfo
        });
      }

      // Refresh venues list
      venues = await prisma.venue.findMany();
    }

    console.log(`Found ${trainers.length} trainers, ${courses.length} courses, ${venues.length} venues`);

    // Generate course schedules for each trainer (today to 3 months ahead)
    const today = new Date();
    const threeMonthsAhead = new Date();
    threeMonthsAhead.setMonth(today.getMonth() + 3);

    for (const trainer of trainers) {
      console.log(`\nGenerating schedules for trainer: ${trainer.name}`);
      
      const trainerCourseRuns: Array<{startDate: Date, endDate: Date, courseId: string}> = [];

      // Generate 10 course schedules per trainer
      for (let i = 0; i < 10; i++) {
        const course = faker.helpers.arrayElement(courses);
        const venue = faker.helpers.arrayElement(venues);
        
        // Generate a random start date (business days only)
        let startDate: Date;
        let attempts = 0;
        
        do {
          startDate = randomDate(today, threeMonthsAhead);
          // Ensure it's a weekday
          while (startDate.getDay() === 0 || startDate.getDay() === 6) {
            startDate.setDate(startDate.getDate() + 1);
          }
          attempts++;
        } while (attempts < 50); // Prevent infinite loops

        // Calculate end date based on course duration
        const durationDays = parseInt(course.duration);
        const endDate = addBusinessDays(startDate, durationDays - 1);

        // Check for conflicts with existing course runs for this trainer
        const hasConflict = trainerCourseRuns.some(existingRun => 
          datesOverlap(startDate, endDate, existingRun.startDate, existingRun.endDate)
        );

        if (!hasConflict) {
          // Create the course run
          const courseRun = await prisma.courseRun.create({
            data: {
              courseId: course.id,
              trainerId: trainer.id,
              venueId: venue.id,
              startDate: startDate,
              endDate: endDate,
              startTime: faker.helpers.arrayElement(['09:00', '14:00']),
              endTime: faker.helpers.arrayElement(['12:00', '17:00']),
              maxParticipants: course.maxParticipants,
              status: faker.helpers.arrayElement(['ACTIVE', 'PUBLISHED', 'ONGOING']),
              trainerFee: Math.round(faker.number.float({ min: 300, max: 800 }) / 50) * 50,
              venueFee: venue.fee,
              totalCost: Math.round(faker.number.float({ min: 1000, max: 3000 }) / 100) * 100,
              notes: faker.lorem.sentence()
            }
          });

          trainerCourseRuns.push({
            startDate: courseRun.startDate,
            endDate: courseRun.endDate,
            courseId: course.id
          });

          console.log(`  Created course run: ${course.title} (${startDate.toDateString()} - ${endDate.toDateString()})`);
        }
      }

      // Generate 3 blockouts per trainer that don't conflict with course schedules
      console.log(`  Generating blockouts for trainer: ${trainer.name}`);
      
      for (let i = 0; i < 3; i++) {
        let blockoutStartDate: Date;
        let blockoutEndDate: Date;
        let attempts = 0;
        let hasConflict = true;

        // Try to find a non-conflicting blockout period
        while (hasConflict && attempts < 100) {
          blockoutStartDate = randomDate(today, threeMonthsAhead);
          
          // Ensure it's a weekday
          while (blockoutStartDate.getDay() === 0 || blockoutStartDate.getDay() === 6) {
            blockoutStartDate.setDate(blockoutStartDate.getDate() + 1);
          }

          // Random blockout duration (1-5 days)
          const blockoutDuration = faker.number.int({ min: 1, max: 5 });
          blockoutEndDate = addBusinessDays(blockoutStartDate, blockoutDuration - 1);

          // Check for conflicts with course runs
          hasConflict = trainerCourseRuns.some(courseRun =>
            datesOverlap(blockoutStartDate, blockoutEndDate, courseRun.startDate, courseRun.endDate)
          );

          attempts++;
        }

        if (!hasConflict) {
          const blockoutTypes = ['vacation', 'sick', 'personal', 'training', 'conference'];
          const blockoutReasons = [
            'Annual Leave',
            'Medical Appointment',
            'Family Emergency',
            'Professional Development',
            'Conference Attendance',
            'Training Session',
            'Personal Time Off'
          ];

          const blockout = await prisma.trainerBlockout.create({
            data: {
              trainerId: trainer.id,
              startDate: blockoutStartDate!,
              endDate: blockoutEndDate!,
              reason: faker.helpers.arrayElement(blockoutReasons),
              type: faker.helpers.arrayElement(blockoutTypes),
              description: faker.lorem.sentence(),
              isRecurring: faker.datatype.boolean(0.2), // 20% chance of being recurring
              recurringPattern: faker.datatype.boolean(0.2) ? 
                faker.helpers.arrayElement(['weekly', 'monthly', 'annually']) : null
            }
          });

          console.log(`    Created blockout: ${blockout.reason} (${blockoutStartDate!.toDateString()} - ${blockoutEndDate!.toDateString()})`);
        } else {
          console.log(`    Failed to create blockout ${i + 1} for ${trainer.name} - too many conflicts`);
        }
      }
    }

    console.log('\n✅ Successfully seeded course schedules and blockouts!');
    
    // Print summary
    const totalCourseRuns = await prisma.courseRun.count();
    const totalBlockouts = await prisma.trainerBlockout.count();
    
    console.log(`\nSUMMARY:`);
    console.log(`- Trainers: ${trainers.length}`);
    console.log(`- Courses: ${courses.length}`);
    console.log(`- Venues: ${venues.length}`);
    console.log(`- Course Runs: ${totalCourseRuns}`);
    console.log(`- Blockouts: ${totalBlockouts}`);

  } catch (error) {
    console.error('Error seeding data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedCourseSchedulesAndBlockouts()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
