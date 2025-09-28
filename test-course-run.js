// Test script to create a course run
const testCourseRunCreation = async () => {
  try {
    console.log('Testing course run creation with schema validation...');
    
    // First, let's test just the schema validation by checking what the API expects
    const testData = {
      serialNumber: "TEST001",
      courseRunType: "OPEN",
      courseId: "test-course-id", // This needs to be a real course ID
      startDatetime: new Date().toISOString(),
      endDatetime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      venueType: "HOTEL",
      specifiedLocation: "Test Location",
      minClassSize: 10,
      maxClassSize: 25,
      individualRegistrationRequired: false,
      remarks: "Test course run",
      baseCourseFee: 850.00,
      otherFee: 150.00,
      status: "DRAFT"
    };

    console.log('Sending data:', JSON.stringify(testData, null, 2));

    // Try without auth first to see what error we get
    const response = await fetch('http://localhost:3001/api/course-runs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Let's try with a dummy token to bypass the auth check
        'Authorization': 'Bearer dummy-token'
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(result, null, 2));

    // Let's also test with a real course ID from the database
    console.log('\n--- Testing with minimal valid data ---');
    const minimalData = {
      courseId: "test-course-id",
      status: "DRAFT"
    };

    const response2 = await fetch('http://localhost:3001/api/course-runs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dummy-token'
      },
      body: JSON.stringify(minimalData)
    });

    const result2 = await response2.json();
    console.log('Minimal data response status:', response2.status);
    console.log('Minimal data response:', JSON.stringify(result2, null, 2));

  } catch (error) {
    console.error('Error testing course run creation:', error);
  }
};

testCourseRunCreation();