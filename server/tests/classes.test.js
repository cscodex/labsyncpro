const request = require('supertest');
const app = require('../index');

describe('Classes Endpoints', () => {
  let server;
  let authToken;
  let instructorToken;
  let adminToken;
  let testClassId;
  
  beforeAll(async () => {
    server = app.listen(0);
    
    // Create admin user
    const adminData = {
      firstName: 'Admin',
      lastName: 'Classes',
      email: global.testUtils.generateEmail('admin.classes'),
      password: 'admin123',
      role: 'admin'
    };
    
    await request(app)
      .post('/api/auth/register')
      .send(adminData);
    
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: adminData.email,
        password: adminData.password
      });
    
    adminToken = adminLogin.body.token;
    
    // Create instructor
    const instructorData = {
      firstName: 'Instructor',
      lastName: 'Classes',
      email: global.testUtils.generateEmail('instructor.classes'),
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
      lastName: 'Classes',
      email: global.testUtils.generateEmail('student.classes'),
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
    
    testClassId = global.testUtils.generateUUID();
  });
  
  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  describe('GET /api/classes', () => {
    it('should return list of classes', async () => {
      const response = await request(app)
        .get('/api/classes')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('classes');
      expect(Array.isArray(response.body.classes)).toBe(true);
      
      // Validate class structure
      response.body.classes.forEach(classItem => {
        expect(classItem).toHaveProperty('id');
        expect(classItem).toHaveProperty('name');
        expect(classItem).toHaveProperty('description');
        expect(classItem).toHaveProperty('created_at');
        expect(classItem).toHaveProperty('updated_at');
        
        expect(typeof classItem.id).toBe('string');
        expect(typeof classItem.name).toBe('string');
        expect(typeof classItem.description).toBe('string');
        expect(typeof classItem.created_at).toBe('string');
        expect(typeof classItem.updated_at).toBe('string');
      });
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/classes')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access denied. No token provided.');
    });

    it('should handle empty classes table', async () => {
      const response = await request(app)
        .get('/api/classes')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('classes');
      expect(Array.isArray(response.body.classes)).toBe(true);
      // Should return sample data even if database is empty
    });
  });

  describe('GET /api/classes/:id', () => {
    it('should return specific class details', async () => {
      const response = await request(app)
        .get(`/api/classes/${testClassId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('class');
      expect(response.body.class).toHaveProperty('id');
      expect(response.body.class).toHaveProperty('name');
      expect(response.body.class).toHaveProperty('description');
    });

    it('should handle non-existent class ID', async () => {
      const fakeId = global.testUtils.generateUUID();
      const response = await request(app)
        .get(`/api/classes/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Class not found');
    });

    it('should handle invalid class ID format', async () => {
      const response = await request(app)
        .get('/api/classes/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Class not found');
    });
  });

  describe('GET /api/classes/:id/assignments', () => {
    it('should return assignments for a class', async () => {
      const labId = '1';
      const response = await request(app)
        .get(`/api/classes/${testClassId}/assignments`)
        .query({ labId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('assignments');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.assignments)).toBe(true);
      expect(typeof response.body.total).toBe('number');
      
      // Validate assignment structure
      response.body.assignments.forEach(assignment => {
        expect(assignment).toHaveProperty('id');
        expect(assignment).toHaveProperty('title');
        expect(assignment).toHaveProperty('description');
        expect(assignment).toHaveProperty('lab_id');
        expect(assignment).toHaveProperty('instructor_id');
        expect(assignment).toHaveProperty('class_id');
        expect(assignment).toHaveProperty('scheduled_date');
        expect(assignment).toHaveProperty('duration_minutes');
        expect(assignment).toHaveProperty('deadline');
        expect(assignment).toHaveProperty('status');
        expect(assignment).toHaveProperty('max_participants');
        
        expect(typeof assignment.id).toBe('string');
        expect(typeof assignment.title).toBe('string');
        expect(typeof assignment.description).toBe('string');
        expect(typeof assignment.lab_id).toBe('string');
        expect(typeof assignment.instructor_id).toBe('string');
        expect(typeof assignment.class_id).toBe('string');
        expect(typeof assignment.scheduled_date).toBe('string');
        expect(typeof assignment.duration_minutes).toBe('number');
        expect(typeof assignment.deadline).toBe('string');
        expect(typeof assignment.status).toBe('string');
        expect(typeof assignment.max_participants).toBe('number');
        
        // Validate date formats
        expect(new Date(assignment.scheduled_date).toString()).not.toBe('Invalid Date');
        expect(new Date(assignment.deadline).toString()).not.toBe('Invalid Date');
        
        // Validate status values
        expect(['scheduled', 'in_progress', 'completed', 'cancelled'].includes(assignment.status)).toBe(true);
        
        // Validate class_id matches request
        expect(assignment.class_id).toBe(testClassId);
        
        // Validate lab_id matches query parameter
        expect(assignment.lab_id).toBe(labId);
      });
    });

    it('should handle missing labId query parameter', async () => {
      const response = await request(app)
        .get(`/api/classes/${testClassId}/assignments`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('assignments');
      expect(response.body).toHaveProperty('total');
      
      // Should default to lab_id '1' when not specified
      response.body.assignments.forEach(assignment => {
        expect(assignment.lab_id).toBe('1');
      });
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get(`/api/classes/${testClassId}/assignments`)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access denied. No token provided.');
    });

    it('should handle invalid class ID', async () => {
      const response = await request(app)
        .get('/api/classes/invalid-id/assignments')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should still return sample data structure
      expect(response.body).toHaveProperty('assignments');
      expect(response.body).toHaveProperty('total');
    });

    it('should handle non-existent class ID', async () => {
      const fakeId = global.testUtils.generateUUID();
      const response = await request(app)
        .get(`/api/classes/${fakeId}/assignments`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('assignments');
      expect(response.body).toHaveProperty('total');
      
      // Assignments should have the requested class_id
      response.body.assignments.forEach(assignment => {
        expect(assignment.class_id).toBe(fakeId);
      });
    });

    it('should handle different lab IDs', async () => {
      const labId = '2';
      const response = await request(app)
        .get(`/api/classes/${testClassId}/assignments`)
        .query({ labId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.assignments.forEach(assignment => {
        expect(assignment.lab_id).toBe(labId);
      });
    });
  });

  describe('POST /api/classes', () => {
    it('should create new class with admin role', async () => {
      const classData = {
        name: 'Test Class',
        description: 'Test class for unit testing'
      };

      const response = await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(classData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Class created successfully');
      expect(response.body).toHaveProperty('class');
      expect(response.body.class.name).toBe(classData.name);
      expect(response.body.class.description).toBe(classData.description);
    });

    it('should reject class creation with student role', async () => {
      const classData = {
        name: 'Unauthorized Class',
        description: 'This should not be created'
      };

      const response = await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(classData)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Access denied. Admin role required.');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        description: 'Missing name field'
      };

      const response = await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should handle duplicate class names', async () => {
      const classData = {
        name: 'Duplicate Class',
        description: 'First instance'
      };

      // First creation should succeed
      await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(classData)
        .expect(201);

      // Second creation with same name should fail
      const response = await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...classData,
          description: 'Second instance'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very long class names', async () => {
      const longName = 'A'.repeat(1000);
      const classData = {
        name: longName,
        description: 'Test long name'
      };

      const response = await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(classData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should handle special characters in class names', async () => {
      const classData = {
        name: 'Test Class !@#$%^&*()',
        description: 'Test special characters'
      };

      const response = await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(classData)
        .expect(201);

      expect(response.body.class.name).toBe(classData.name);
    });

    it('should handle empty description', async () => {
      const classData = {
        name: 'Empty Description Class',
        description: ''
      };

      const response = await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(classData)
        .expect(201);

      expect(response.body.class.description).toBe('');
    });
  });
});
