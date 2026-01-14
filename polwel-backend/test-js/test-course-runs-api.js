const fetch = require('node-fetch');

async function testCourseRunsAPI() {
  try {
    // Test 1: GET with PENDING_BILLING,IN_PROGRESS
    console.log('\n=== Test 1: PENDING_BILLING,IN_PROGRESS ===');
    const url1 = 'http://localhost:3001/api/course-runs?page=1&limit=1000&status=PENDING_BILLING,IN_PROGRESS';
    console.log('URL:', url1);
    
    const response1 = await fetch(url1);
    const data1 = await response1.json();
    
    console.log('Success:', data1.success);
    console.log('Course runs count:', data1.courseRuns?.length || 0);
    if (data1.courseRuns && data1.courseRuns.length > 0) {
      console.log('First run:', {
        id: data1.courseRuns[0].id,
        status: data1.courseRuns[0].status,
        serialNumber: data1.courseRuns[0].serialNumber
      });
    }
    console.log('Error:', data1.error || 'none');
    
    // Test 2: GET with COMPLETED,CANCELLED
    console.log('\n=== Test 2: COMPLETED,CANCELLED ===');
    const url2 = 'http://localhost:3001/api/course-runs?page=1&limit=1000&status=COMPLETED,CANCELLED';
    console.log('URL:', url2);
    
    const response2 = await fetch(url2);
    const data2 = await response2.json();
    
    console.log('Success:', data2.success);
    console.log('Course runs count:', data2.courseRuns?.length || 0);
    if (data2.courseRuns && data2.courseRuns.length > 0) {
      console.log('First 3 runs:');
      data2.courseRuns.slice(0, 3).forEach(run => {
        console.log('-', run.status, run.serialNumber);
      });
    }
    console.log('Error:', data2.error || 'none');
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testCourseRunsAPI();
