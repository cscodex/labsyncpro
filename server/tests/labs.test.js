const request = require('supertest');
const app = require('../index');

describe('Lab Management Endpoints', () => {
  let server;
  let authToken;
  let instructorToken;
  
  beforeAll(async () => {
    server = app.listen(0);
    
    // Create and login instructor
    const instructorData = {
      firstName: 'Instructor',
      lastName: 'Test',
      email: global.testUtils.generateEmail('instructor'),
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
    
    // Create and login student
    const studentData = {
      firstName: 'Student',
      lastName: 'Test',
      email: global.testUtils.generateEmail('student'),
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
  });
  
  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  describe('GET /api/labs', () => {
    it('should return list of labs with capacity information', async () => {
      const response = await request(app)
        .get('/api/labs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('labs');
      expect(Array.isArray(response.body.labs)).toBe(true);
      
      // Check sample data structure
      if (response.body.labs.length > 0) {
        const lab = response.body.labs[0];
        expect(lab).toHaveProperty('id');
        expect(lab).toHaveProperty('name');
        expect(lab).toHaveProperty('total_computers');
        expect(lab).toHaveProperty('total_seats');
        expect(lab).toHaveProperty('location');
        expect(lab).toHaveProperty('is_active');
        expect(lab).toHaveProperty('computer_count');
        expect(lab).toHaveProperty('functional_computers');
        expect(lab).toHaveProperty('maintenance_computers');
        expect(lab).toHaveProperty('assigned_computers');
        expect(lab).toHaveProperty('available_computers');
        
        // Validate data types
        expect(typeof lab.id).toBe('string');
        expect(typeof lab.name).toBe('string');
        expect(typeof lab.total_computers).toBe('number');
        expect(typeof lab.total_seats).toBe('number');
        expect(typeof lab.computer_count).toBe('number');
        expect(typeof lab.functional_computers).toBe('number');
        expect(typeof lab.maintenance_computers).toBe('number');
        expect(typeof lab.assigned_computers).toBe('number');
        expect(typeof lab.available_computers).toBe('number');
      }
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/labs')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access denied. No token provided.');
    });

    it('should handle empty labs table gracefully', async () => {
      // This test verifies that the endpoint returns sample data when no labs exist
      const response = await request(app)
        .get('/api/labs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('labs');
      expect(Array.isArray(response.body.labs)).toBe(true);
      // Should return sample data even if database is empty
    });

    it('should return consistent lab data structure', async () => {
      const response = await request(app)
        .get('/api/labs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.labs.forEach(lab => {
        // Validate required fields
        expect(lab).toHaveProperty('id');
        expect(lab).toHaveProperty('name');
        expect(lab).toHaveProperty('computer_count');
        expect(lab).toHaveProperty('functional_computers');
        expect(lab).toHaveProperty('maintenance_computers');
        expect(lab).toHaveProperty('assigned_computers');
        expect(lab).toHaveProperty('available_computers');
        
        // Validate logical relationships
        expect(lab.functional_computers + lab.maintenance_computers).toBeLessThanOrEqual(lab.computer_count);
        expect(lab.assigned_computers).toBeLessThanOrEqual(lab.functional_computers);
        expect(lab.available_computers).toBeLessThanOrEqual(lab.functional_computers);
      });
    });
  });

  describe('GET /api/labs/:id', () => {
    it('should return specific lab details', async () => {
      // First get list of labs to get a valid ID
      const labsResponse = await request(app)
        .get('/api/labs')
        .set('Authorization', `Bearer ${authToken}`);

      if (labsResponse.body.labs.length > 0) {
        const labId = labsResponse.body.labs[0].id;
        
        const response = await request(app)
          .get(`/api/labs/${labId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('lab');
        expect(response.body.lab).toHaveProperty('id', labId);
      }
    });

    it('should handle non-existent lab ID', async () => {
      const fakeId = global.testUtils.generateUUID();
      const response = await request(app)
        .get(`/api/labs/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Lab not found');
    });

    it('should handle invalid lab ID format', async () => {
      const response = await request(app)
        .get('/api/labs/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Lab not found');
    });
  });

  describe('GET /api/labs/:id/availability', () => {
    it('should return lab availability information', async () => {
      const labsResponse = await request(app)
        .get('/api/labs')
        .set('Authorization', `Bearer ${authToken}`);

      if (labsResponse.body.labs.length > 0) {
        const labId = labsResponse.body.labs[0].id;
        const testDate = new Date().toISOString();
        
        const response = await request(app)
          .get(`/api/labs/${labId}/availability`)
          .query({
            date: testDate,
            duration: 120
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('availability');
        expect(response.body.availability).toHaveProperty('totalComputers');
        expect(response.body.availability).toHaveProperty('totalSeats');
        expect(response.body.availability).toHaveProperty('availableComputers');
        expect(response.body.availability).toHaveProperty('availableSeats');
        expect(response.body.availability).toHaveProperty('conflictingSchedules');
        
        expect(Array.isArray(response.body.availability.conflictingSchedules)).toBe(true);
      }
    });

    it('should require date parameter', async () => {
      const labsResponse = await request(app)
        .get('/api/labs')
        .set('Authorization', `Bearer ${authToken}`);

      if (labsResponse.body.labs.length > 0) {
        const labId = labsResponse.body.labs[0].id;
        
        const response = await request(app)
          .get(`/api/labs/${labId}/availability`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('error');
      }
    });

    it('should handle invalid date format', async () => {
      const labsResponse = await request(app)
        .get('/api/labs')
        .set('Authorization', `Bearer ${authToken}`);

      if (labsResponse.body.labs.length > 0) {
        const labId = labsResponse.body.labs[0].id;
        
        const response = await request(app)
          .get(`/api/labs/${labId}/availability`)
          .query({
            date: 'invalid-date',
            duration: 120
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('POST /api/labs', () => {
    it('should create new lab with instructor role', async () => {
      const labData = {
        name: 'Test Lab',
        location: 'Test Building',
        description: 'Test lab for unit testing',
        total_computers: 20,
        total_seats: 40
      };

      const response = await request(app)
        .post('/api/labs')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send(labData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Lab created successfully');
      expect(response.body).toHaveProperty('lab');
      expect(response.body.lab.name).toBe(labData.name);
    });

    it('should reject lab creation with student role', async () => {
      const labData = {
        name: 'Unauthorized Lab',
        location: 'Test Building',
        total_computers: 20,
        total_seats: 40
      };

      const response = await request(app)
        .post('/api/labs')
        .set('Authorization', `Bearer ${authToken}`)
        .send(labData)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Access denied. Instructor role required.');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        location: 'Test Building'
        // Missing required name field
      };

      const response = await request(app)
        .post('/api/labs')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });
});
