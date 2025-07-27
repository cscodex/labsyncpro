describe('Utility Functions', () => {
  describe('Data Transformation', () => {
    it('should convert snake_case to camelCase', () => {
      const snakeCaseData = {
        first_name: 'John',
        last_name: 'Doe',
        student_id: '12345678',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      };

      const expected = {
        firstName: 'John',
        lastName: 'Doe',
        studentId: '12345678',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      expect(toCamelCase(snakeCaseData)).toEqual(expected);
    });

    it('should convert camelCase to snake_case', () => {
      const camelCaseData = {
        firstName: 'John',
        lastName: 'Doe',
        studentId: '12345678',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      const expected = {
        first_name: 'John',
        last_name: 'Doe',
        student_id: '12345678',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      };

      expect(toSnakeCase(camelCaseData)).toEqual(expected);
    });

    it('should handle nested objects', () => {
      const nestedData = {
        user_info: {
          first_name: 'John',
          last_name: 'Doe'
        },
        assignment_data: {
          due_date: '2024-01-01',
          max_score: 100
        }
      };

      const expected = {
        userInfo: {
          firstName: 'John',
          lastName: 'Doe'
        },
        assignmentData: {
          dueDate: '2024-01-01',
          maxScore: 100
        }
      };

      expect(toCamelCase(nestedData)).toEqual(expected);
    });

    it('should handle arrays of objects', () => {
      const arrayData = [
        { first_name: 'John', last_name: 'Doe' },
        { first_name: 'Jane', last_name: 'Smith' }
      ];

      const expected = [
        { firstName: 'John', lastName: 'Doe' },
        { firstName: 'Jane', lastName: 'Smith' }
      ];

      expect(arrayData.map(toCamelCase)).toEqual(expected);
    });
  });

  describe('Date Formatting', () => {
    it('should format dates to DD-MMM-YYYY format', () => {
      const testDates = [
        { input: '2024-01-01T00:00:00.000Z', expected: '01-Jan-2024' },
        { input: '2024-12-31T23:59:59.999Z', expected: '31-Dec-2024' },
        { input: '2024-07-15T12:30:00.000Z', expected: '15-Jul-2024' }
      ];

      testDates.forEach(({ input, expected }) => {
        expect(formatDateDDMMMYYYY(input)).toBe(expected);
      });
    });

    it('should handle invalid dates gracefully', () => {
      const invalidDates = [
        'invalid-date',
        null,
        undefined,
        '',
        'not-a-date'
      ];

      invalidDates.forEach(date => {
        expect(formatDateDDMMMYYYY(date)).toBe('Invalid Date');
      });
    });

    it('should calculate deadline from scheduled date', () => {
      const scheduledDate = '2024-01-01T00:00:00.000Z';
      const expectedDeadline = '2024-01-08T00:00:00.000Z';

      expect(calculateDeadline(scheduledDate, 7)).toBe(expectedDeadline);
    });

    it('should handle different deadline offsets', () => {
      const scheduledDate = '2024-01-01T00:00:00.000Z';
      
      const testCases = [
        { days: 1, expected: '2024-01-02T00:00:00.000Z' },
        { days: 7, expected: '2024-01-08T00:00:00.000Z' },
        { days: 14, expected: '2024-01-15T00:00:00.000Z' },
        { days: 30, expected: '2024-01-31T00:00:00.000Z' }
      ];

      testCases.forEach(({ days, expected }) => {
        expect(calculateDeadline(scheduledDate, days)).toBe(expected);
      });
    });
  });

  describe('String Utilities', () => {
    it('should generate unique identifiers', () => {
      const id1 = generateUniqueId();
      const id2 = generateUniqueId();
      
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
      expect(id2.length).toBeGreaterThan(0);
    });

    it('should sanitize input strings', () => {
      const testCases = [
        { input: '<script>alert("xss")</script>', expected: 'alert("xss")' },
        { input: 'Normal text', expected: 'Normal text' },
        { input: 'Text with <b>bold</b>', expected: 'Text with bold' },
        { input: '', expected: '' }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(sanitizeString(input)).toBe(expected);
      });
    });

    it('should truncate long strings', () => {
      const longString = 'This is a very long string that should be truncated';
      const truncated = truncateString(longString, 20);
      
      expect(truncated.length).toBeLessThanOrEqual(23); // 20 + '...'
      expect(truncated.endsWith('...')).toBe(true);
    });

    it('should not truncate short strings', () => {
      const shortString = 'Short';
      const result = truncateString(shortString, 20);
      
      expect(result).toBe(shortString);
      expect(result.endsWith('...')).toBe(false);
    });
  });

  describe('Array Utilities', () => {
    it('should chunk arrays into smaller arrays', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const chunked = chunkArray(array, 3);
      
      expect(chunked).toEqual([
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
        [10]
      ]);
    });

    it('should handle empty arrays', () => {
      const result = chunkArray([], 3);
      expect(result).toEqual([]);
    });

    it('should remove duplicates from arrays', () => {
      const arrayWithDuplicates = [1, 2, 2, 3, 3, 3, 4, 5, 5];
      const unique = removeDuplicates(arrayWithDuplicates);
      
      expect(unique).toEqual([1, 2, 3, 4, 5]);
    });

    it('should sort objects by property', () => {
      const objects = [
        { name: 'Charlie', age: 25 },
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 20 }
      ];

      const sortedByName = sortByProperty(objects, 'name');
      expect(sortedByName[0].name).toBe('Alice');
      expect(sortedByName[1].name).toBe('Bob');
      expect(sortedByName[2].name).toBe('Charlie');

      const sortedByAge = sortByProperty(objects, 'age');
      expect(sortedByAge[0].age).toBe(20);
      expect(sortedByAge[1].age).toBe(25);
      expect(sortedByAge[2].age).toBe(30);
    });
  });
});

// Utility function implementations for testing
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

function toSnakeCase(obj) {
  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase);
  } else if (obj !== null && typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = toSnakeCase(value);
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

function calculateDeadline(scheduledDate, daysOffset) {
  const date = new Date(scheduledDate);
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString();
}

function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/<[^>]*>/g, '');
}

function truncateString(str, maxLength) {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function removeDuplicates(array) {
  return [...new Set(array)];
}

function sortByProperty(array, property) {
  return [...array].sort((a, b) => {
    if (a[property] < b[property]) return -1;
    if (a[property] > b[property]) return 1;
    return 0;
  });
}
