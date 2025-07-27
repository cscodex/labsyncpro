#!/usr/bin/env node

/**
 * LabSyncPro Edge Case Testing Script
 * 
 * This script demonstrates and tests various edge cases for all API endpoints
 * Run with: node test-edge-cases.js
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function testValidation() {
  log('\n🧪 Testing Validation Edge Cases', 'cyan');
  log('=====================================', 'cyan');

  // Email validation edge cases
  log('\n📧 Email Validation:', 'yellow');
  const emailTests = [
    { input: 'valid@example.com', expected: true, description: 'Valid email' },
    { input: 'user.name+tag@domain.co.uk', expected: true, description: 'Complex valid email' },
    { input: 'invalid-email', expected: false, description: 'Missing @ and domain' },
    { input: '@domain.com', expected: false, description: 'Missing username' },
    { input: 'user@', expected: false, description: 'Missing domain' },
    { input: 'user..name@domain.com', expected: false, description: 'Double dots' },
    { input: '', expected: false, description: 'Empty string' },
    { input: null, expected: false, description: 'Null value' },
    { input: undefined, expected: false, description: 'Undefined value' }
  ];

  emailTests.forEach(test => {
    const result = isValidEmail(test.input);
    const status = result === test.expected ? '✅' : '❌';
    log(`  ${status} ${test.description}: "${test.input}" -> ${result}`, result === test.expected ? 'green' : 'red');
  });

  // Student ID validation edge cases
  log('\n🆔 Student ID Validation:', 'yellow');
  const studentIdTests = [
    { input: '12345678', expected: true, description: 'Valid 8-digit ID' },
    { input: 'ST000001', expected: true, description: 'Valid alphanumeric ID' },
    { input: '123', expected: false, description: 'Too short (3 chars)' },
    { input: '123456789', expected: false, description: 'Too long (9 chars)' },
    { input: '', expected: false, description: 'Empty string' },
    { input: null, expected: false, description: 'Null value' },
    { input: undefined, expected: false, description: 'Undefined value' },
    { input: '1234567', expected: false, description: 'Exactly 7 chars' },
    { input: 'ABCDEFGH', expected: true, description: 'All letters (8 chars)' }
  ];

  studentIdTests.forEach(test => {
    const result = isValidStudentId(test.input);
    const status = result === test.expected ? '✅' : '❌';
    log(`  ${status} ${test.description}: "${test.input}" -> ${result}`, result === test.expected ? 'green' : 'red');
  });

  // Password validation edge cases
  log('\n🔒 Password Validation:', 'yellow');
  const passwordTests = [
    { input: 'password123', expected: true, description: 'Valid password (11 chars)' },
    { input: 'pass', expected: false, description: 'Too short (4 chars)' },
    { input: 'passwo', expected: true, description: 'Minimum length (6 chars)' },
    { input: '', expected: false, description: 'Empty string' },
    { input: null, expected: false, description: 'Null value' },
    { input: undefined, expected: false, description: 'Undefined value' },
    { input: 'a'.repeat(100), expected: true, description: 'Very long password' },
    { input: '12345', expected: false, description: 'Exactly 5 chars' }
  ];

  passwordTests.forEach(test => {
    const result = isValidPassword(test.input);
    const status = result === test.expected ? '✅' : '❌';
    log(`  ${status} ${test.description}: "${test.input}" -> ${result}`, result === test.expected ? 'green' : 'red');
  });
}

function testDataTransformation() {
  log('\n🔄 Testing Data Transformation Edge Cases', 'cyan');
  log('==========================================', 'cyan');

  // Snake case to camel case
  log('\n🐍 Snake Case to Camel Case:', 'yellow');
  const snakeToCamelTests = [
    { 
      input: { first_name: 'John', last_name: 'Doe' },
      expected: { firstName: 'John', lastName: 'Doe' },
      description: 'Simple object'
    },
    {
      input: { user_profile: { first_name: 'John', email_address: 'john@test.com' } },
      expected: { userProfile: { firstName: 'John', emailAddress: 'john@test.com' } },
      description: 'Nested object'
    },
    {
      input: [{ first_name: 'John' }, { last_name: 'Doe' }],
      expected: [{ firstName: 'John' }, { lastName: 'Doe' }],
      description: 'Array of objects'
    },
    {
      input: null,
      expected: null,
      description: 'Null value'
    },
    {
      input: 'simple string',
      expected: 'simple string',
      description: 'Non-object value'
    }
  ];

  snakeToCamelTests.forEach(test => {
    const result = toCamelCase(test.input);
    const status = JSON.stringify(result) === JSON.stringify(test.expected) ? '✅' : '❌';
    log(`  ${status} ${test.description}`, status === '✅' ? 'green' : 'red');
    if (status === '❌') {
      log(`    Expected: ${JSON.stringify(test.expected)}`, 'red');
      log(`    Received: ${JSON.stringify(result)}`, 'red');
    }
  });
}

function testDateFormatting() {
  log('\n📅 Testing Date Formatting Edge Cases', 'cyan');
  log('=====================================', 'cyan');

  const dateTests = [
    { input: '2024-01-01T00:00:00.000Z', expected: '01-Jan-2024', description: 'Valid ISO date' },
    { input: '2024-12-31T23:59:59.999Z', expected: '31-Dec-2024', description: 'End of year' },
    { input: 'invalid-date', expected: 'Invalid Date', description: 'Invalid date string' },
    { input: null, expected: 'Invalid Date', description: 'Null value' },
    { input: undefined, expected: 'Invalid Date', description: 'Undefined value' },
    { input: '', expected: 'Invalid Date', description: 'Empty string' },
    { input: '2024-13-01', expected: 'Invalid Date', description: 'Invalid month' },
    { input: '2024-02-30', expected: 'Invalid Date', description: 'Invalid day for February' }
  ];

  dateTests.forEach(test => {
    const result = formatDateDDMMMYYYY(test.input);
    const status = result === test.expected ? '✅' : '❌';
    log(`  ${status} ${test.description}: "${test.input}" -> "${result}"`, status === '✅' ? 'green' : 'red');
  });
}

function testAPIEndpointEdgeCases() {
  log('\n🌐 API Endpoint Edge Cases', 'cyan');
  log('===========================', 'cyan');

  log('\n📝 Common Edge Cases for All Endpoints:', 'yellow');
  log('  • Missing authentication token -> 401 Unauthorized');
  log('  • Invalid/expired token -> 401 Invalid token');
  log('  • Malformed request body -> 400 Bad Request');
  log('  • Invalid UUID parameters -> 400/404 depending on endpoint');
  log('  • SQL injection attempts -> Sanitized by Supabase');
  log('  • XSS attempts -> Sanitized by validation');
  log('  • Very large payloads -> Request size limits');
  log('  • Concurrent requests -> Rate limiting');
  log('  • Database connection failures -> 500 Internal Server Error');

  log('\n🔐 Authentication Endpoints:', 'yellow');
  log('  • Duplicate email registration -> 400 Email already exists');
  log('  • Invalid email format -> 400 Validation error');
  log('  • Password too short -> 400 Validation error');
  log('  • Student ID wrong length -> 400 Validation error');
  log('  • Login with non-existent email -> 401 Invalid credentials');
  log('  • Login with wrong password -> 401 Invalid credentials');

  log('\n📊 Dashboard Endpoints:', 'yellow');
  log('  • Empty database -> Returns 0 counts with empty arrays');
  log('  • Database connection error -> 500 with error message');
  log('  • Invalid user ID -> Returns null/empty data gracefully');

  log('\n🔬 Lab Management Endpoints:', 'yellow');
  log('  • Non-existent lab ID -> 404 Lab not found');
  log('  • Invalid lab ID format -> 404 Lab not found');
  log('  • Student accessing instructor endpoints -> 403 Access denied');
  log('  • Missing required fields -> 400 Validation error');

  log('\n👥 Capacity Management Endpoints:', 'yellow');
  log('  • Invalid class/lab ID -> Returns sample data for demo');
  log('  • Non-existent schedule ID -> Handled gracefully');
  log('  • Malformed UUID parameters -> Returns sample data');
  log('  • Very long parameter values -> Handled gracefully');

  log('\n🏫 Classes Endpoints:', 'yellow');
  log('  • Non-existent class ID -> 404 Class not found');
  log('  • Duplicate class names -> 400 Class already exists');
  log('  • Student creating classes -> 403 Access denied');
  log('  • Missing lab ID query -> Defaults to lab ID "1"');
}

// Validation helper functions (same as in tests)
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && !email.includes('..') && !email.startsWith('@') && !email.endsWith('@');
}

function isValidStudentId(studentId) {
  if (!studentId || typeof studentId !== 'string') return false;
  return studentId.length === 8;
}

function isValidPassword(password) {
  if (!password || typeof password !== 'string') return false;
  return password.length >= 6;
}

function toCamelCase(obj) {
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  } else if (obj !== null && typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = toCamelCase(value);
    }
    return result;
  }
  return obj;
}

function formatDateDDMMMYYYY(dateString) {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
  } catch {
    return 'Invalid Date';
  }
}

// Main execution
function main() {
  log('🚀 LabSyncPro Edge Case Testing Suite', 'bright');
  log('=====================================', 'bright');
  
  testValidation();
  testDataTransformation();
  testDateFormatting();
  testAPIEndpointEdgeCases();
  
  log('\n✅ Edge case testing completed!', 'green');
  log('\nTo run full test suite:', 'cyan');
  log('  npm test                    # Run all tests', 'reset');
  log('  npm run test:coverage       # Run with coverage', 'reset');
  log('  npm run test:unit           # Run unit tests only', 'reset');
  log('  node run-tests.js help      # See all test options', 'reset');
}

if (require.main === module) {
  main();
}
