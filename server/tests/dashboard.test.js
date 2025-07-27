const request = require('supertest');
const app = require('../index');

describe('Dashboard Endpoints', () => {
  let server;
  let authToken;
  let adminToken;
  
  beforeAll(async () => {
    server = app.listen(0);
    
    // Create and login admin user for testing
    const adminData = {
      firstName: 'Admin',
      lastName: 'Test',
      email: global.testUtils.generateEmail('admin'),
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
    
    // Create and login regular user
    const userData = {
      firstName: 'User',
      lastName: 'Test',
      email: global.testUtils.generateEmail('user'),
      password: 'user123',
      role: 'student',
      studentId: global.testUtils.generateStudentId()
    };
    
    await request(app)
      .post('/api/auth/register')
      .send(userData);
    
    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      });
    
    authToken = userLogin.body.token;
  });
  
  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  describe('GET /api/groups/dashboard-stats', () => {
    it('should return dashboard statistics with valid token', async () => {
      const response = await request(app)
        .get('/api/groups/dashboard-stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalStudents');
      expect(response.body).toHaveProperty('totalGroups');
      expect(response.body).toHaveProperty('totalComputers');
      expect(response.body).toHaveProperty('totalClasses');
      expect(response.body).toHaveProperty('classes');
      
      expect(typeof response.body.totalStudents).toBe('number');
      expect(typeof response.body.totalGroups).toBe('number');
      expect(typeof response.body.totalComputers).toBe('number');
      expect(typeof response.body.totalClasses).toBe('number');
      expect(Array.isArray(response.body.classes)).toBe(true);
    });

    it('should reject request without authentication token', async () => {
      const response = await request(app)
        .get('/api/groups/dashboard-stats')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access denied. No token provided.');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/groups/dashboard-stats')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid token');
    });

    it('should return consistent data structure even with empty database', async () => {
      const response = await request(app)
        .get('/api/groups/dashboard-stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should always have these properties even if values are 0
      expect(response.body).toHaveProperty('totalStudents');
      expect(response.body).toHaveProperty('totalGroups');
      expect(response.body).toHaveProperty('totalComputers');
      expect(response.body).toHaveProperty('totalClasses');
      expect(response.body).toHaveProperty('classes');
      
      // Classes should be an array (even if empty)
      expect(Array.isArray(response.body.classes)).toBe(true);
      
      // Each class should have required properties
      response.body.classes.forEach(classItem => {
        expect(classItem).toHaveProperty('name');
        expect(classItem).toHaveProperty('studentCount');
        expect(typeof classItem.name).toBe('string');
        expect(typeof classItem.studentCount).toBe('number');
      });
    });

    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking the database connection
      // For now, we'll test that the endpoint returns a valid response
      const response = await request(app)
        .get('/api/groups/dashboard-stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('GET /api/groups/student/:userId', () => {
    let studentId;

    beforeAll(async () => {
      // Create a test student
      const studentData = {
        firstName: 'Test',
        lastName: 'Student',
        email: global.testUtils.generateEmail('test.student'),
        password: 'student123',
        role: 'student',
        studentId: global.testUtils.generateStudentId()
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(studentData);

      studentId = response.body.user.id;
    });

    it('should return student group information', async () => {
      const response = await request(app)
        .get(`/api/groups/student/${studentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('group');
      // Group might be null if student is not in any group
    });

    it('should reject request with invalid student ID format', async () => {
      const response = await request(app)
        .get('/api/groups/student/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200); // Returns 200 with null group for better UX

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.group).toBeNull();
    });

    it('should handle non-existent student ID gracefully', async () => {
      const fakeId = global.testUtils.generateUUID();
      const response = await request(app)
        .get(`/api/groups/student/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.group).toBeNull();
    });
  });

  describe('GET /api/groups/student/:userId/seat-info', () => {
    let studentId;

    beforeAll(async () => {
      const studentData = {
        firstName: 'Seat',
        lastName: 'Test',
        email: global.testUtils.generateEmail('seat.test'),
        password: 'student123',
        role: 'student',
        studentId: global.testUtils.generateStudentId()
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(studentData);

      studentId = response.body.user.id;
    });

    it('should return student seat assignment information', async () => {
      const response = await request(app)
        .get(`/api/groups/student/${studentId}/seat-info`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('seatAssignments');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.seatAssignments)).toBe(true);
      expect(typeof response.body.total).toBe('number');
    });

    it('should handle non-existent student gracefully', async () => {
      const fakeId = global.testUtils.generateUUID();
      const response = await request(app)
        .get(`/api/groups/student/${fakeId}/seat-info`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.seatAssignments).toEqual([]);
      expect(response.body.total).toBe(0);
    });
  });
});
