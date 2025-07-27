// Test environment setup
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-key';

// Global test utilities
global.testUtils = {
  // Test user credentials
  adminUser: {
    email: 'admin@labsyncpro.com',
    password: 'admin123',
    role: 'admin'
  },
  instructorUser: {
    email: 'instructor@labsyncpro.com', 
    password: 'instructor123',
    role: 'instructor'
  },
  studentUser: {
    email: 'student@labsyncpro.com',
    password: 'student123',
    role: 'student'
  },
  
  // Test data
  sampleClass: {
    id: 'test-class-001',
    name: 'Test Class A',
    description: 'Test class for unit testing'
  },
  
  sampleLab: {
    id: 'test-lab-001',
    name: 'Test Lab 1',
    location: 'Test Building',
    total_computers: 25,
    total_seats: 50
  },
  
  sampleStudent: {
    firstName: 'Test',
    lastName: 'Student',
    email: 'test.student@test.com',
    password: 'testpass123',
    role: 'student',
    studentId: 'TS000001'
  },
  
  // Helper functions
  generateUUID: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },
  
  generateStudentId: () => {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
  },
  
  generateEmail: (prefix = 'test') => {
    return `${prefix}.${Date.now()}@test.com`;
  }
};

// Increase timeout for async operations
jest.setTimeout(30000);
