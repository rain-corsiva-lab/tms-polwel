import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedBookings() {
  console.log('🌱 Starting booking seeding for learners...');

  try {
    // Get all learners
    const learners = await prisma.user.findMany({
      where: { role: 'LEARNER' },
      select: { id: true, name: true, organizationId: true }
    });

    // Get all courses (create some if none exist)
    let courses = await prisma.course.findMany({
      select: { id: true, title: true }
    });

    if (courses.length === 0) {
      console.log('📚 Creating sample courses...');
      
      const courseData = [
        {
          title: 'Leadership Development Program',
          description: 'A comprehensive leadership training program',
          duration: '3 days',
          maxParticipants: 25,
          status: 'ACTIVE' as const,
        },
        {
          title: 'Data Analysis Fundamentals',
          description: 'Learn the basics of data analysis',
          duration: '2 days',
          maxParticipants: 20,
          status: 'ACTIVE' as const,
        },
        {
          title: 'Communication Skills Workshop',
          description: 'Improve your communication skills',
          duration: '1 day',
          maxParticipants: 30,
          status: 'ACTIVE' as const,
        }
      ];

      for (const course of courseData) {
        const created = await prisma.course.create({
          data: course,
          select: { id: true, title: true }
        });
        courses.push(created);
      }
    }

    console.log(`👥 Found ${learners.length} learners`);
    console.log(`📚 Found ${courses.length} courses`);

    // Create random bookings for learners
    const bookingStatuses = ['CONFIRMED', 'COMPLETED', 'PENDING'];
    
    for (const learner of learners) {
      // Create 2-4 random bookings per learner
      const numBookings = Math.floor(Math.random() * 3) + 2;
      
      for (let i = 0; i < numBookings; i++) {
        const randomCourse = courses[Math.floor(Math.random() * courses.length)];
        const randomStatus = bookingStatuses[Math.floor(Math.random() * bookingStatuses.length)];
        
        try {
          await prisma.booking.create({
            data: {
              courseId: randomCourse.id,
              userId: learner.id,
              organizationId: learner.organizationId!,
              status: randomStatus as any,
              participantCount: 1,
              totalAmount: Math.floor(Math.random() * 1000) + 500,
              bookingReference: `BK${Date.now()}${Math.random().toString(36).substr(2, 5)}`.toUpperCase(),
              notes: `Sample booking for ${learner.name}`
            }
          });
          
          console.log(`  ✅ Created ${randomStatus} booking: ${learner.name} -> ${randomCourse.title}`);
        } catch (error: any) {
          // Skip if booking already exists or other error
          console.log(`  ⚠️  Skipping duplicate booking for ${learner.name}`);
        }
      }
    }

    console.log('🎉 Booking seeding completed!');

    // Display summary
    const totalBookings = await prisma.booking.count();
    console.log(`📊 Total bookings in database: ${totalBookings}`);

  } catch (error) {
    console.error('❌ Error during booking seeding:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedBookings();
