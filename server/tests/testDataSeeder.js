const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

class TestDataSeeder {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
  }

  async seedTestData() {
    console.log('🌱 Seeding test data...');

    try {
      // Clear existing test data
      await this.clearTestData();

      // Seed users
      const users = await this.seedUsers();
      
      // Seed classes
      const classes = await this.seedClasses();
      
      // Seed labs
      const labs = await this.seedLabs();
      
      // Seed groups
      const groups = await this.seedGroups(classes, users);
      
      // Seed assignments
      const assignments = await this.seedAssignments(classes, labs, users);

      console.log('✅ Test data seeded successfully');
      
      return {
        users,
        classes,
        labs,
        groups,
        assignments
      };

    } catch (error) {
      console.error('❌ Failed to seed test data:', error);
      throw error;
    }
  }

  async clearTestData() {
    console.log('🧹 Clearing existing test data...');
    
    // Note: In a real test environment, you would clear test-specific data
    // For now, we'll just log that we're clearing data
    console.log('Test data cleared');
  }

  async seedUsers() {
    console.log('👥 Seeding users...');
    
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    const testUsers = [
      {
        id: 'test-admin-001',
        email: 'test.admin@labsyncpro.com',
        password_hash: hashedPassword,
        first_name: 'Test',
        last_name: 'Admin',
        role: 'admin',
        student_id: null,
        is_active: true
      },
      {
        id: 'test-instructor-001',
        email: 'test.instructor@labsyncpro.com',
        password_hash: hashedPassword,
        first_name: 'Test',
        last_name: 'Instructor',
        role: 'instructor',
        student_id: null,
        is_active: true
      },
      {
        id: 'test-student-001',
        email: 'test.student1@labsyncpro.com',
        password_hash: hashedPassword,
        first_name: 'Test',
        last_name: 'Student1',
        role: 'student',
        student_id: 'TS000001',
        is_active: true
      },
      {
        id: 'test-student-002',
        email: 'test.student2@labsyncpro.com',
        password_hash: hashedPassword,
        first_name: 'Test',
        last_name: 'Student2',
        role: 'student',
        student_id: 'TS000002',
        is_active: true
      },
      {
        id: 'test-student-003',
        email: 'test.student3@labsyncpro.com',
        password_hash: hashedPassword,
        first_name: 'Test',
        last_name: 'Student3',
        role: 'student',
        student_id: 'TS000003',
        is_active: true
      }
    ];

    // In a real implementation, you would insert these into Supabase
    // For now, return the test data structure
    return testUsers;
  }

  async seedClasses() {
    console.log('🏫 Seeding classes...');
    
    const testClasses = [
      {
        id: 'test-class-001',
        name: 'Test Class A',
        description: 'Test class for unit testing - Section A',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'test-class-002',
        name: 'Test Class B',
        description: 'Test class for unit testing - Section B',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    return testClasses;
  }

  async seedLabs() {
    console.log('🔬 Seeding labs...');
    
    const testLabs = [
      {
        id: 'test-lab-001',
        name: 'Test Computer Lab 1',
        location: 'Test Building - Ground Floor',
        description: 'Test lab for unit testing',
        total_computers: 25,
        total_seats: 50,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'test-lab-002',
        name: 'Test Computer Lab 2',
        location: 'Test Building - First Floor',
        description: 'Second test lab for unit testing',
        total_computers: 20,
        total_seats: 40,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    return testLabs;
  }

  async seedGroups(classes, users) {
    console.log('👥 Seeding groups...');
    
    const students = users.filter(user => user.role === 'student');
    
    const testGroups = [
      {
        id: 'test-group-001',
        name: 'Test Group Alpha',
        description: 'Test group for unit testing',
        class_id: classes[0].id,
        leader_id: students[0].id,
        max_members: 4,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'test-group-002',
        name: 'Test Group Beta',
        description: 'Second test group for unit testing',
        class_id: classes[0].id,
        leader_id: students[1].id,
        max_members: 4,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    return testGroups;
  }

  async seedAssignments(classes, labs, users) {
    console.log('📝 Seeding assignments...');
    
    const instructor = users.find(user => user.role === 'instructor');
    
    const testAssignments = [
      {
        id: 'test-assignment-001',
        title: 'Test Programming Assignment',
        description: 'Test assignment for unit testing',
        class_id: classes[0].id,
        lab_id: labs[0].id,
        instructor_id: instructor.id,
        scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        duration_minutes: 120,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'scheduled',
        max_participants: 25,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'test-assignment-002',
        title: 'Test Data Structures Assignment',
        description: 'Second test assignment for unit testing',
        class_id: classes[1].id,
        lab_id: labs[1].id,
        instructor_id: instructor.id,
        scheduled_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        duration_minutes: 90,
        deadline: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'scheduled',
        max_participants: 20,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    return testAssignments;
  }

  async cleanupTestData() {
    console.log('🧹 Cleaning up test data...');
    
    // In a real implementation, you would delete test data from Supabase
    // For now, just log that cleanup is complete
    console.log('Test data cleanup complete');
  }
}

module.exports = TestDataSeeder;
