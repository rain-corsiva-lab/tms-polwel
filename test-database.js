// Test script to check database structure
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const testDatabase = async () => {
  try {
    console.log('Testing database connection and structure...');
    
    // Check if there are any courses
    console.log('\n=== COURSES ===');
    const courses = await prisma.course.findMany({
      take: 5,
      select: {
        id: true,
        title: true,
        courseCode: true,
        category: true
      }
    });
    console.log('Found courses:', courses.length);
    if (courses.length > 0) {
      console.log('Sample courses:', JSON.stringify(courses, null, 2));
    }

    // Check if there are any course runs
    console.log('\n=== COURSE RUNS ===');
    const courseRuns = await prisma.courseRun.findMany({
      take: 5,
      include: {
        course: {
          select: {
            id: true,
            title: true,
            courseCode: true
          }
        },
        courseRunLearners: {
          take: 3,
          include: {
            learner: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        courseRunTrainers: {
          take: 3,
          include: {
            trainer: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });
    console.log('Found course runs:', courseRuns.length);
    if (courseRuns.length > 0) {
      console.log('Sample course runs with learners/trainers:');
      courseRuns.forEach(run => {
        console.log(`- ${run.serialNumber}: ${run.course?.title}`);
        console.log(`  Learners: ${run.courseRunLearners.length}`);
        console.log(`  Trainers: ${run.courseRunTrainers.length}`);
        if (run.courseRunLearners.length > 0) {
          console.log(`  Sample learners:`, run.courseRunLearners.map(l => l.learner?.name || l.learner?.email).join(', '));
        }
        if (run.courseRunTrainers.length > 0) {
          console.log(`  Sample trainers:`, run.courseRunTrainers.map(t => t.trainer?.name || t.trainer?.email).join(', '));
        }
      });
    }

    // Check course run status values
    console.log('\n=== COURSE RUN STATUSES ===');
    const statuses = await prisma.courseRun.findMany({
      select: {
        id: true,
        status: true,
        serialNumber: true
      },
      distinct: ['status']
    });
    console.log('Course run statuses in database:', statuses.map(s => s.status));

  } catch (error) {
    console.error('Database test error:', error);
  } finally {
    await prisma.$disconnect();
  }
};

testDatabase();