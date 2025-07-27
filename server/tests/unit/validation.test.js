const { body, validationResult } = require('express-validator');

describe('Validation Functions', () => {
  describe('Email Validation', () => {
    it('should validate correct email format', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'admin@labsyncpro.com',
        'student123@university.edu'
      ];

      validEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..name@domain.com',
        'user@domain',
        ''
      ];

      invalidEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(false);
      });
    });
  });

  describe('Student ID Validation', () => {
    it('should validate 8-character student IDs', () => {
      const validStudentIds = [
        '12345678',
        'ST000001',
        'AB123456',
        '20240001'
      ];

      validStudentIds.forEach(id => {
        expect(isValidStudentId(id)).toBe(true);
      });
    });

    it('should reject invalid student ID formats', () => {
      const invalidStudentIds = [
        '123',           // Too short
        '123456789',     // Too long
        '',              // Empty
        '1234567',       // 7 characters
        '123456789',     // 9 characters
        null,            // Null
        undefined        // Undefined
      ];

      invalidStudentIds.forEach(id => {
        expect(isValidStudentId(id)).toBe(false);
      });
    });
  });

  describe('Password Validation', () => {
    it('should validate strong passwords', () => {
      const validPasswords = [
        'password123',
        'StrongPass1',
        'MySecurePassword2024',
        'Test@123'
      ];

      validPasswords.forEach(password => {
        expect(isValidPassword(password)).toBe(true);
      });
    });

    it('should reject weak passwords', () => {
      const invalidPasswords = [
        '123',           // Too short
        'pass',          // Too short
        '',              // Empty
        'a',             // Single character
        '12',            // Two characters
        null,            // Null
        undefined        // Undefined
      ];

      invalidPasswords.forEach(password => {
        expect(isValidPassword(password)).toBe(false);
      });
    });
  });

  describe('UUID Validation', () => {
    it('should validate correct UUID format', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        '6ba7b811-9dad-11d1-80b4-00c04fd430c8'
      ];

      validUUIDs.forEach(uuid => {
        expect(isValidUUID(uuid)).toBe(true);
      });
    });

    it('should reject invalid UUID formats', () => {
      const invalidUUIDs = [
        'invalid-uuid',
        '123-456-789',
        '',
        'not-a-uuid-at-all',
        '123e4567-e89b-12d3-a456',  // Too short
        '123e4567-e89b-12d3-a456-426614174000-extra', // Too long
        null,
        undefined
      ];

      invalidUUIDs.forEach(uuid => {
        expect(isValidUUID(uuid)).toBe(false);
      });
    });
  });

  describe('Role Validation', () => {
    it('should validate allowed roles', () => {
      const validRoles = ['admin', 'instructor', 'student'];

      validRoles.forEach(role => {
        expect(isValidRole(role)).toBe(true);
      });
    });

    it('should reject invalid roles', () => {
      const invalidRoles = [
        'superuser',
        'guest',
        'moderator',
        '',
        null,
        undefined,
        'ADMIN',  // Case sensitive
        'Student' // Case sensitive
      ];

      invalidRoles.forEach(role => {
        expect(isValidRole(role)).toBe(false);
      });
    });
  });

  describe('Date Validation', () => {
    it('should validate correct date formats', () => {
      const validDates = [
        '2024-01-01T00:00:00.000Z',
        '2024-12-31T23:59:59.999Z',
        new Date().toISOString(),
        '2025-07-27T10:30:00.000Z'
      ];

      validDates.forEach(date => {
        expect(isValidDate(date)).toBe(true);
      });
    });

    it('should reject invalid date formats', () => {
      const invalidDates = [
        'invalid-date',
        '2024-13-01',  // Invalid month
        '2024-01-32',  // Invalid day
        '',
        null,
        undefined,
        'not-a-date'
      ];

      invalidDates.forEach(date => {
        expect(isValidDate(date)).toBe(false);
      });
    });
  });
});

// Helper validation functions
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  // More strict email validation
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

function isValidUUID(uuid) {
  if (!uuid || typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

function isValidRole(role) {
  if (!role || typeof role !== 'string') return false;
  return ['admin', 'instructor', 'student'].includes(role);
}

function isValidDate(date) {
  if (!date) return false;
  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime());
}
