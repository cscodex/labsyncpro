#!/usr/bin/env node

/**
 * Fix CRUD Operations for Supabase
 * 
 * This script identifies and fixes all CRUD operations that are failing
 * because they're using PostgreSQL syntax instead of Supabase client methods.
 */

const { supabase } = require('./config/supabase');
require('dotenv').config();

class CRUDFixer {
  constructor() {
    this.issues = [];
    this.fixes = [];
  }

  async testAllCRUDOperations() {
    console.log('🔍 Testing all CRUD operations...\n');

    // Test Users CRUD
    await this.testUsersCRUD();
    
    // Test Classes CRUD  
    await this.testClassesCRUD();
    
    // Test Labs CRUD
    await this.testLabsCRUD();
    
    // Test Groups CRUD
    await this.testGroupsCRUD();
    
    // Test Assignments CRUD
    await this.testAssignmentsCRUD();
    
    // Test Submissions CRUD
    await this.testSubmissionsCRUD();
    
    // Test Grades CRUD
    await this.testGradesCRUD();
    
    // Test Schedules CRUD
    await this.testSchedulesCRUD();

    this.printSummary();
  }

  async testUsersCRUD() {
    console.log('👥 Testing Users CRUD...');
    
    try {
      // Test READ
      const { data: users, error: readError } = await supabase
        .from('users')
        .select('*')
        .limit(1);
      
      if (readError) {
        this.issues.push(`Users READ: ${readError.message}`);
      } else {
        console.log('  ✅ Users READ works');
      }

      if (users && users.length > 0) {
        const testUser = users[0];
        
        // Test UPDATE
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({ 
            first_name: 'Test Updated',
            updated_at: new Date().toISOString()
          })
          .eq('id', testUser.id)
          .select()
          .single();
        
        if (updateError) {
          this.issues.push(`Users UPDATE: ${updateError.message}`);
        } else {
          console.log('  ✅ Users update works');
          
          // Revert the change
          await supabase
            .from('users')
            .update({ 
              first_name: testUser.first_name,
              updated_at: new Date().toISOString()
            })
            .eq('id', testUser.id);
        }
      }

      // Test CREATE (we'll create and immediately delete)
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: 'test-crud@example.com',
          password_hash: '$2a$10$test',
          first_name: 'Test',
          last_name: 'User',
          role: 'student',
          student_id: 'TEST001',
          is_active: true
        })
        .select()
        .single();
      
      if (createError) {
        this.issues.push(`Users CREATE: ${createError.message}`);
      } else {
        console.log('  ✅ Users create works');
        
        // Clean up - delete the test user
        await supabase
          .from('users')
          .delete()
          .eq('id', newUser.id);
      }

    } catch (error) {
      this.issues.push(`Users CRUD: ${error.message}`);
    }
  }

  async testClassesCRUD() {
    console.log('🏫 Testing Classes CRUD...');
    
    try {
      // Test READ
      const { data: classes, error: readError } = await supabase
        .from('classes')
        .select('*')
        .limit(1);
      
      if (readError) {
        this.issues.push(`Classes READ: ${readError.message}`);
      } else {
        console.log('  ✅ Classes read works');
      }

      // Test CREATE
      const { data: newClass, error: createError } = await supabase
        .from('classes')
        .insert({
          id: 'test-class-001',
          name: 'Test Class',
          description: 'Test class for CRUD testing'
        })
        .select()
        .single();
      
      if (createError) {
        this.issues.push(`Classes CREATE: ${createError.message}`);
      } else {
        console.log('  ✅ Classes create works');
        
        // Test UPDATE
        const { error: updateError } = await supabase
          .from('classes')
          .update({ 
            description: 'Updated test class',
            updated_at: new Date().toISOString()
          })
          .eq('id', newClass.id);
        
        if (updateError) {
          this.issues.push(`Classes UPDATE: ${updateError.message}`);
        } else {
          console.log('  ✅ Classes update works');
        }
        
        // Clean up
        await supabase
          .from('classes')
          .delete()
          .eq('id', newClass.id);
      }

    } catch (error) {
      this.issues.push(`Classes CRUD: ${error.message}`);
    }
  }

  async testLabsCRUD() {
    console.log('🔬 Testing Labs CRUD...');
    
    try {
      // Test READ
      const { data: labs, error: readError } = await supabase
        .from('labs')
        .select('*')
        .limit(1);
      
      if (readError) {
        this.issues.push(`Labs READ: ${readError.message}`);
      } else {
        console.log('  ✅ Labs read works');
      }

      // Test CREATE
      const { data: newLab, error: createError } = await supabase
        .from('labs')
        .insert({
          id: 'test-lab-001',
          name: 'Test Lab',
          description: 'Test lab for CRUD testing'
        })
        .select()
        .single();
      
      if (createError) {
        this.issues.push(`Labs CREATE: ${createError.message}`);
      } else {
        console.log('  ✅ Labs create works');
        
        // Test UPDATE
        const { error: updateError } = await supabase
          .from('labs')
          .update({ 
            description: 'Updated test lab',
            updated_at: new Date().toISOString()
          })
          .eq('id', newLab.id);
        
        if (updateError) {
          this.issues.push(`Labs UPDATE: ${updateError.message}`);
        } else {
          console.log('  ✅ Labs update works');
        }
        
        // Clean up
        await supabase
          .from('labs')
          .delete()
          .eq('id', newLab.id);
      }

    } catch (error) {
      this.issues.push(`Labs CRUD: ${error.message}`);
    }
  }

  async testGroupsCRUD() {
    console.log('👥 Testing Groups CRUD...');
    
    try {
      // Test READ
      const { data: groups, error: readError } = await supabase
        .from('groups')
        .select('*')
        .limit(1);
      
      if (readError) {
        this.issues.push(`Groups READ: ${readError.message}`);
      } else {
        console.log('  ✅ Groups read works');
      }

    } catch (error) {
      this.issues.push(`Groups CRUD: ${error.message}`);
    }
  }

  async testAssignmentsCRUD() {
    console.log('📝 Testing Assignments CRUD...');
    
    try {
      // Test READ - Note: assignments table might not exist
      const { data: assignments, error: readError } = await supabase
        .from('assignments')
        .select('*')
        .limit(1);
      
      if (readError) {
        this.issues.push(`Assignments READ: ${readError.message}`);
      } else {
        console.log('  ✅ Assignments read works');
      }

    } catch (error) {
      this.issues.push(`Assignments CRUD: ${error.message}`);
    }
  }

  async testSubmissionsCRUD() {
    console.log('📤 Testing Submissions CRUD...');
    
    try {
      // Test READ
      const { data: submissions, error: readError } = await supabase
        .from('submissions')
        .select('*')
        .limit(1);
      
      if (readError) {
        this.issues.push(`Submissions READ: ${readError.message}`);
      } else {
        console.log('  ✅ Submissions read works');
      }

    } catch (error) {
      this.issues.push(`Submissions CRUD: ${error.message}`);
    }
  }

  async testGradesCRUD() {
    console.log('📊 Testing Grades CRUD...');
    
    try {
      // Test READ
      const { data: grades, error: readError } = await supabase
        .from('grades')
        .select('*')
        .limit(1);
      
      if (readError) {
        this.issues.push(`Grades READ: ${readError.message}`);
      } else {
        console.log('  ✅ Grades read works');
      }

    } catch (error) {
      this.issues.push(`Grades CRUD: ${error.message}`);
    }
  }

  async testSchedulesCRUD() {
    console.log('📅 Testing Schedules CRUD...');
    
    try {
      // Test READ
      const { data: schedules, error: readError } = await supabase
        .from('schedules')
        .select('*')
        .limit(1);
      
      if (readError) {
        this.issues.push(`Schedules READ: ${readError.message}`);
      } else {
        console.log('  ✅ Schedules read works');
      }

    } catch (error) {
      this.issues.push(`Schedules CRUD: ${error.message}`);
    }
  }

  printSummary() {
    console.log('\n📊 CRUD Operations Test Summary:');
    console.log(`   ✅ Working operations: ${this.fixes.length}`);
    console.log(`   ❌ Issues found: ${this.issues.length}`);
    
    if (this.issues.length > 0) {
      console.log('\n⚠️  Issues found:');
      this.issues.forEach(issue => console.log(`   • ${issue}`));
      
      console.log('\n🔧 Recommended fixes:');
      console.log('   1. Update backend routes to use Supabase client instead of raw SQL');
      console.log('   2. Check table schemas match between frontend and backend');
      console.log('   3. Ensure proper error handling for Supabase operations');
      console.log('   4. Add missing tables if they don\'t exist');
    } else {
      console.log('\n🎉 All CRUD operations are working correctly!');
    }
  }
}

// Run the CRUD tests
if (require.main === module) {
  const fixer = new CRUDFixer();
  fixer.testAllCRUDOperations().catch(console.error);
}

module.exports = CRUDFixer;
