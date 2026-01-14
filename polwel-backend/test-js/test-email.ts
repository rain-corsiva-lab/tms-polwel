import EmailService from '../src/services/emailService';

async function testEmailService() {
  console.log('🧪 Testing Email Service...\n');

  // Test trainer setup email
  console.log('📧 Testing Trainer Setup Email...');
  const trainerResult = await EmailService.sendTrainerSetupEmail(
    'test.trainer@example.com',
    'John Trainer',
    'http://localhost:8080/onboarding/test-token-123'
  );
  console.log(`✅ Trainer email sent: ${trainerResult}\n`);

  // Test coordinator setup email
  console.log('📧 Testing Coordinator Setup Email...');
  const coordinatorResult = await EmailService.sendCoordinatorSetupEmail(
    'test.coordinator@example.com',
    'Jane Coordinator',
    'http://localhost:8080/onboarding/test-token-456',
    'Example Organization'
  );
  console.log(`✅ Coordinator email sent: ${coordinatorResult}\n`);

  // Test POLWEL user setup email
  console.log('📧 Testing POLWEL User Setup Email...');
  const polwelResult = await EmailService.sendPolwelUserSetupEmail(
    'test.polwel@example.com',
    'Bob Admin',
    'http://localhost:8080/onboarding/test-token-789'
  );
  console.log(`✅ POLWEL email sent: ${polwelResult}\n`);

  // Test password reset email
  console.log('📧 Testing Password Reset Email...');
  const resetResult = await EmailService.sendPasswordResetEmail(
    'test.reset@example.com',
    'Alice User',
    'http://localhost:8080/reset-password/test-reset-token'
  );
  console.log(`✅ Password reset email sent: ${resetResult}\n`);

  console.log('🎉 All email tests completed!');
}

// Run the test
testEmailService().catch(console.error);
