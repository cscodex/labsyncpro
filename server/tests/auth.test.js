const request = require('supertest');

// Mock the app since we're testing with sample data
const mockApp = {
  post: jest.fn(),
  get: jest.fn(),
  listen: jest.fn(() => ({ close: jest.fn() }))
};

describe('Authentication Endpoints', () => {
  let server;

  beforeAll(async () => {
    // Mock server for testing
    server = { close: jest.fn() };
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  describe('POST /api/auth/register', () => {
    it('should register a new student with valid data', async () => {
      const studentData = {
        firstName: 'John',
        lastName: 'Doe',
        email: global.testUtils.generateEmail('john.doe'),
        password: 'password123',
        role: 'student',
        studentId: global.testUtils.generateStudentId()
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(studentData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(studentData.email);
      expect(response.body.user.role).toBe('student');
    });

    it('should reject registration with invalid email', async () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
        password: 'password123',
        role: 'student',
        studentId: global.testUtils.generateStudentId()
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should reject registration with short password', async () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: global.testUtils.generateEmail('short.pass'),
        password: '123',
        role: 'student',
        studentId: global.testUtils.generateStudentId()
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should reject registration with invalid student ID length', async () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: global.testUtils.generateEmail('invalid.id'),
        password: 'password123',
        role: 'student',
        studentId: '123' // Too short
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should reject registration with duplicate email', async () => {
      const email = global.testUtils.generateEmail('duplicate');
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: email,
        password: 'password123',
        role: 'student',
        studentId: global.testUtils.generateStudentId()
      };

      // First registration should succeed
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same email should fail
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...userData,
          studentId: global.testUtils.generateStudentId()
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should register instructor without student ID', async () => {
      const instructorData = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: global.testUtils.generateEmail('instructor'),
        password: 'password123',
        role: 'instructor'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(instructorData)
        .expect(201);

      expect(response.body.user.role).toBe('instructor');
      expect(response.body.user.studentId).toBeNull();
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser;

    beforeAll(async () => {
      // Create a test user for login tests
      const userData = {
        firstName: 'Login',
        lastName: 'Test',
        email: global.testUtils.generateEmail('login.test'),
        password: 'password123',
        role: 'student',
        studentId: global.testUtils.generateStudentId()
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      testUser = { ...userData, id: response.body.user.id };
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'password123'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should reject login with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email
          // Missing password
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });
});
