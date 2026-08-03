import EmailService from '../services/emailService';

function runRecipientNormalizationTests() {
  console.log('================================================================');
  console.log('📧 TESTING RECIPIENT EMAIL NORMALIZATION & SPLITTING');
  console.log('================================================================\n');

  const testCases = [
    {
      name: 'Semicolon-delimited string (Production error case)',
      input: 'Jaymann_WONG@spf.gov.sg; Kimberly_PX_LIM@spf.gov.sg; LIM_Jian_Xiong@spf.gov.sg',
      expectedCount: 3,
    },
    {
      name: 'Comma-delimited string',
      input: 'Jaymann_WONG@spf.gov.sg, Kimberly_PX_LIM@spf.gov.sg, LIM_Jian_Xiong@spf.gov.sg',
      expectedCount: 3,
    },
    {
      name: 'Array containing concatenated semicolon strings',
      input: ['Jaymann_WONG@spf.gov.sg; Kimberly_PX_LIM@spf.gov.sg', 'LIM_Jian_Xiong@spf.gov.sg'],
      expectedCount: 3,
    },
    {
      name: 'Name + angle brackets format',
      input: 'Jaymann WONG <Jaymann_WONG@spf.gov.sg>; Lim Jian Xiong <LIM_Jian_Xiong@spf.gov.sg>',
      expectedCount: 2,
    },
    {
      name: 'Single email address',
      input: 'kukuhlumajang@gmail.com',
      expectedCount: 1,
    },
    {
      name: 'Duplicates and trailing spaces',
      input: 'Jaymann_WONG@spf.gov.sg; JAYMANN_WONG@SPF.GOV.SG ;  Kimberly_PX_LIM@spf.gov.sg ',
      expectedCount: 2,
    },
  ];

  let passedAll = true;

  for (const tc of testCases) {
    const normalized = EmailService.normalizeEmailAddresses(tc.input);
    const pass = normalized.length === tc.expectedCount;
    if (!pass) passedAll = false;

    console.log(`Test: ${tc.name}`);
    console.log(` Input:    `, tc.input);
    console.log(` Output:   `, normalized);
    console.log(` Count:    ${normalized.length} (Expected: ${tc.expectedCount}) -> ${pass ? '✅ PASS' : '❌ FAIL'}\n`);
  }

  if (passedAll) {
    console.log('================================================================');
    console.log('🎉 ALL RECIPIENT NORMALIZATION TESTS PASSED SUCCESSFULLY!');
    console.log('================================================================');
  } else {
    console.error('❌ Some recipient normalization tests failed.');
    process.exit(1);
  }
}

runRecipientNormalizationTests();
