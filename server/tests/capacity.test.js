const request = require('supertest');
const app = require('../index');

describe('Capacity Management Endpoints', () => {
  let server;
  let authToken;
  let instructorToken;
  let testClassId;
  let testLabId;
  
  beforeAll(async () => {
    server = app.listen(0);
    
    // Create instructor
    const instructorData = {
      firstName: 'Instructor',
      lastName: 'Capacity',
      email: global.testUtils.generateEmail('instructor.capacity'),
      password: 'instructor123',
      role: 'instructor'
    };
    
    await request(app)
      .post('/api/auth/register')
      .send(instructorData);
    
    const instructorLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: instructorData.email,
        password: instructorData.password
      });
    
    instructorToken = instructorLogin.body.token;
    
    // Create student
    const studentData = {
      firstName: 'Student',
      lastName: 'Capacity',
      email: global.testUtils.generateEmail('student.capacity'),
      password: 'student123',
      role: 'student',
      studentId: global.testUtils.generateStudentId()
    };
    
    await request(app)
      .post('/api/auth/register')
      .send(studentData);
    
    const studentLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: studentData.email,
        password: studentData.password
      });
    
    authToken = studentLogin.body.token;
    
    // Set test IDs
    testClassId = global.testUtils.generateUUID();
    testLabId = '1'; // Using sample lab ID
  });
  
  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  describe('GET /api/capacity/students-groups/:classId', () => {
    it('should return students and groups for a class', async () => {
      const response = await request(app)
        .get(`/api/capacity/students-groups/${testClassId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('students');
      expect(response.body).toHaveProperty('groups');
      expect(Array.isArray(response.body.students)).toBe(true);
      expect(Array.isArray(response.body.groups)).toBe(true);
      
      // Validate student structure
      response.body.students.forEach(student => {
        expect(student).toHaveProperty('id');
        expect(student).toHaveProperty('firstName');
        expect(student).toHaveProperty('lastName');
        expect(student).toHaveProperty('studentId');
        expect(student).toHaveProperty('email');
        expect(student).toHaveProperty('groupId');
        expect(student).toHaveProperty('groupName');
        expect(student).toHaveProperty('groupRole');
        
        expect(typeof student.id).toBe('string');
        expect(typeof student.firstName).toBe('string');
        expect(typeof student.lastName).toBe('string');
        expect(typeof student.studentId).toBe('string');
        expect(typeof student.email).toBe('string');
        expect(['leader', 'member'].includes(student.groupRole)).toBe(true);
      });
      
      // Validate group structure
      response.body.groups.forEach(group => {
        expect(group).toHaveProperty('id');
        expect(group).toHaveProperty('name');
        expect(group).toHaveProperty('description');
        expect(group).toHaveProperty('maxMembers');
        expect(group).toHaveProperty('leaderId');
        expect(group).toHaveProperty('leaderName');
        expect(group).toHaveProperty('memberCount');
        expect(group).toHaveProperty('members');
        
        expect(typeof group.id).toBe('string');
        expect(typeof group.name).toBe('string');
        expect(typeof group.maxMembers).toBe('number');
        expect(typeof group.memberCount).toBe('number');
        expect(Array.isArray(group.members)).toBe(true);
      });
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get(`/api/capacity/students-groups/${testClassId}`)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access denied. No token provided.');
    });

    it('should handle invalid class ID format', async () => {
      const response = await request(app)
        .get('/api/capacity/students-groups/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should still return sample data structure
      expect(response.body).toHaveProperty('students');
      expect(response.body).toHaveProperty('groups');
    });

    it('should handle non-existent class ID', async () => {
      const fakeClassId = global.testUtils.generateUUID();
      const response = await request(app)
        .get(`/api/capacity/students-groups/${fakeClassId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should return sample data for demonstration
      expect(response.body).toHaveProperty('students');
      expect(response.body).toHaveProperty('groups');
    });
  });

  describe('GET /api/capacity/labs/:labId/seat-assignments', () => {
    it('should return seat assignments for a lab', async () => {
      const response = await request(app)
        .get(`/api/capacity/labs/${testLabId}/seat-assignments`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      // Validate seat assignment structure
      response.body.forEach(assignment => {
        expect(assignment).toHaveProperty('id');
        expect(assignment).toHaveProperty('user_id');
        expect(assignment).toHaveProperty('seat_id');
        expect(assignment).toHaveProperty('seat_number');
        expect(assignment).toHaveProperty('first_name');
        expect(assignment).toHaveProperty('last_name');
        expect(assignment).toHaveProperty('student_id');
        expect(assignment).toHaveProperty('student_name');
        expect(assignment).toHaveProperty('assigned_at');
        
        expect(typeof assignment.id).toBe('string');
        expect(typeof assignment.user_id).toBe('string');
        expect(typeof assignment.seat_id).toBe('string');
        expect(typeof assignment.seat_number).toBe('string');
        expect(typeof assignment.first_name).toBe('string');
        expect(typeof assignment.last_name).toBe('string');
        expect(typeof assignment.student_id).toBe('string');
        expect(typeof assignment.student_name).toBe('string');
        expect(typeof assignment.assigned_at).toBe('string');
        
        // Validate seat number format (should match CL1-CR-001 pattern)
        expect(assignment.seat_number).toMatch(/^CL\d+-CR-\d{3}$/);
      });
    });

    it('should handle query parameters', async () => {
      const scheduleId = global.testUtils.generateUUID();
      const response = await request(app)
        .get(`/api/capacity/labs/${testLabId}/seat-assignments`)
        .query({ scheduleId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get(`/api/capacity/labs/${testLabId}/seat-assignments`)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access denied. No token provided.');
    });

    it('should handle invalid lab ID', async () => {
      const response = await request(app)
        .get('/api/capacity/labs/invalid-lab/seat-assignments')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should return sample data even for invalid lab ID
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should handle non-existent lab ID', async () => {
      const fakeLabId = global.testUtils.generateUUID();
      const response = await request(app)
        .get(`/api/capacity/labs/${fakeLabId}/seat-assignments`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/capacity/unassigned-students/:classId/:labId', () => {
    it('should return unassigned students for class and lab', async () => {
      const response = await request(app)
        .get(`/api/capacity/unassigned-students/${testClassId}/${testLabId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('students');
      expect(Array.isArray(response.body.students)).toBe(true);
      
      // Validate student structure
      response.body.students.forEach(student => {
        expect(student).toHaveProperty('id');
        expect(student).toHaveProperty('first_name');
        expect(student).toHaveProperty('last_name');
        expect(student).toHaveProperty('student_id');
        expect(student).toHaveProperty('email');
        
        expect(typeof student.id).toBe('string');
        expect(typeof student.first_name).toBe('string');
        expect(typeof student.last_name).toBe('string');
        expect(typeof student.student_id).toBe('string');
        expect(typeof student.email).toBe('string');
      });
    });

    it('should handle schedule ID query parameter', async () => {
      const scheduleId = global.testUtils.generateUUID();
      const response = await request(app)
        .get(`/api/capacity/unassigned-students/${testClassId}/${testLabId}`)
        .query({ scheduleId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('students');
      expect(Array.isArray(response.body.students)).toBe(true);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get(`/api/capacity/unassigned-students/${testClassId}/${testLabId}`)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access denied. No token provided.');
    });

    it('should handle invalid parameters', async () => {
      const response = await request(app)
        .get('/api/capacity/unassigned-students/invalid/invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed UUID parameters', async () => {
      const response = await request(app)
        .get('/api/capacity/students-groups/not-a-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should still return data structure
      expect(response.body).toHaveProperty('students');
      expect(response.body).toHaveProperty('groups');
    });

    it('should handle very long class ID', async () => {
      const longId = 'a'.repeat(1000);
      const response = await request(app)
        .get(`/api/capacity/students-groups/${longId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('students');
      expect(response.body).toHaveProperty('groups');
    });

    it('should handle special characters in parameters', async () => {
      const specialId = 'test-id-with-special-chars-!@#$%';
      const response = await request(app)
        .get(`/api/capacity/students-groups/${encodeURIComponent(specialId)}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('students');
      expect(response.body).toHaveProperty('groups');
    });
  });
});
