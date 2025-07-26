#!/usr/bin/env node

/**
 * Comprehensive CRUD Testing Script
 *
 * This script tests all CRUD operations across all tables and provides
 * detailed feedback on what's working and what needs to be fixed.
 */

require('dotenv').config();
const { supabase } = require('./server/config/supabase');

class CRUDTester {
  constructor() {
    this.results = {
      working: [],
      broken: [],
      tableSchemas: {}
    };
  }

  async testAllCRUD() {
    console.log('🔍 Testing all CRUD operations systematically...\n');

    // Test each table
    await this.testTable('users');
    await this.testTable('classes');
    await this.testTable('labs');
    await this.testTable('computers');
    await this.testTable('groups');
    await this.testTable('submissions');
    await this.testTable('grades');
    await this.testTable('schedules');

    this.printResults();
    await this.generateFixedRoutes();
  }

  async testTable(tableName) {
    console.log(`\n📋 Testing ${tableName} table...`);
    
    try {
      // Test READ operation
      const { data, error: readError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (readError) {
        this.results.broken.push(`${tableName} READ: ${readError.message}`);
        console.log(`  ❌ READ failed: ${readError.message}`);
        return;
      }

      console.log(`  ✅ READ works`);
      this.results.working.push(`${tableName} READ`);

      // Store schema info
      if (data && data.length > 0) {
        this.results.tableSchemas[tableName] = Object.keys(data[0]);
        console.log(`  📊 Columns: ${Object.keys(data[0]).join(', ')}`);
      } else {
        // Try to get schema from empty table
        const { data: emptyData, error: schemaError } = await supabase
          .from(tableName)
          .select('*')
          .limit(0);
        
        if (!schemaError) {
          console.log(`  📊 Table exists but is empty`);
        }
      }

      // Test CREATE operation with minimal data
      await this.testCreate(tableName);

      // Test UPDATE operation
      await this.testUpdate(tableName);

      // Test DELETE operation
      await this.testDelete(tableName);

    } catch (error) {
      this.results.broken.push(`${tableName} GENERAL: ${error.message}`);
      console.log(`  ❌ General error: ${error.message}`);
    }
  }

  async testCreate(tableName) {
    try {
      let testData = {};
      
      // Define minimal test data for each table
      switch (tableName) {
        case 'users':
          testData = {
            email: 'test-crud@example.com',
            password_hash: '$2a$10$test',
            first_name: 'Test',
            last_name: 'User',
            role: 'student',
            is_active: true
          };
          break;
        case 'classes':
          testData = {
            name: 'Test Class CRUD',
            description: 'Test class for CRUD testing'
          };
          break;
        case 'labs':
          testData = {
            name: 'Test Lab CRUD',
            description: 'Test lab for CRUD testing'
          };
          break;
        case 'computers':
          testData = {
            name: 'TEST-PC-001',
            status: 'functional',
            description: 'Test computer'
          };
          break;
        case 'groups':
          testData = {
            name: 'Test Group CRUD',
            description: 'Test group for CRUD testing'
          };
          break;
        case 'submissions':
          testData = {
            title: 'Test Submission CRUD',
            content: 'Test submission content'
          };
          break;
        case 'grades':
          testData = {
            score: 85,
            max_score: 100,
            feedback: 'Test feedback'
          };
          break;
        case 'schedules':
          testData = {
            title: 'Test Schedule CRUD',
            description: 'Test schedule for CRUD testing'
          };
          break;
        default:
          console.log(`  ⚠️  No test data defined for ${tableName}`);
          return;
      }

      const { data: newRecord, error: createError } = await supabase
        .from(tableName)
        .insert(testData)
        .select()
        .single();

      if (createError) {
        this.results.broken.push(`${tableName} CREATE: ${createError.message}`);
        console.log(`  ❌ CREATE failed: ${createError.message}`);
        return null;
      }

      console.log(`  ✅ CREATE works`);
      this.results.working.push(`${tableName} CREATE`);
      return newRecord;

    } catch (error) {
      this.results.broken.push(`${tableName} CREATE: ${error.message}`);
      console.log(`  ❌ CREATE error: ${error.message}`);
      return null;
    }
  }

  async testUpdate(tableName) {
    try {
      // Get a record to update
      const { data: records } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (!records || records.length === 0) {
        console.log(`  ⚠️  No records to test UPDATE`);
        return;
      }

      const record = records[0];
      const recordId = record.id;

      if (!recordId) {
        console.log(`  ⚠️  No ID field found for UPDATE test`);
        return;
      }

      // Define update data
      let updateData = { updated_at: new Date().toISOString() };
      
      switch (tableName) {
        case 'users':
          updateData.first_name = 'Updated Test';
          break;
        case 'classes':
          updateData.description = 'Updated test class';
          break;
        case 'labs':
          updateData.description = 'Updated test lab';
          break;
        case 'computers':
          updateData.description = 'Updated test computer';
          break;
        case 'groups':
          updateData.description = 'Updated test group';
          break;
        case 'submissions':
          updateData.content = 'Updated test content';
          break;
        case 'grades':
          updateData.feedback = 'Updated test feedback';
          break;
        case 'schedules':
          updateData.description = 'Updated test schedule';
          break;
      }

      const { data: updatedRecord, error: updateError } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', recordId)
        .select()
        .single();

      if (updateError) {
        this.results.broken.push(`${tableName} UPDATE: ${updateError.message}`);
        console.log(`  ❌ UPDATE failed: ${updateError.message}`);
        return;
      }

      console.log(`  ✅ UPDATE works`);
      this.results.working.push(`${tableName} UPDATE`);

    } catch (error) {
      this.results.broken.push(`${tableName} UPDATE: ${error.message}`);
      console.log(`  ❌ UPDATE error: ${error.message}`);
    }
  }

  async testDelete(tableName) {
    try {
      // Only test delete on test records we created
      const { data: testRecords } = await supabase
        .from(tableName)
        .select('*')
        .or('email.eq.test-crud@example.com,name.like.*Test*CRUD*,title.like.*Test*CRUD*')
        .limit(1);

      if (!testRecords || testRecords.length === 0) {
        console.log(`  ⚠️  No test records to DELETE`);
        return;
      }

      const record = testRecords[0];
      const recordId = record.id;

      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', recordId);

      if (deleteError) {
        this.results.broken.push(`${tableName} DELETE: ${deleteError.message}`);
        console.log(`  ❌ DELETE failed: ${deleteError.message}`);
        return;
      }

      console.log(`  ✅ DELETE works`);
      this.results.working.push(`${tableName} DELETE`);

    } catch (error) {
      this.results.broken.push(`${tableName} DELETE: ${error.message}`);
      console.log(`  ❌ DELETE error: ${error.message}`);
    }
  }

  printResults() {
    console.log('\n📊 CRUD Test Results Summary:');
    console.log(`   ✅ Working operations: ${this.results.working.length}`);
    console.log(`   ❌ Broken operations: ${this.results.broken.length}`);

    if (this.results.working.length > 0) {
      console.log('\n✅ Working operations:');
      this.results.working.forEach(op => console.log(`   • ${op}`));
    }

    if (this.results.broken.length > 0) {
      console.log('\n❌ Broken operations:');
      this.results.broken.forEach(op => console.log(`   • ${op}`));
    }

    console.log('\n📋 Table Schemas:');
    Object.entries(this.results.tableSchemas).forEach(([table, columns]) => {
      console.log(`   ${table}: ${columns.join(', ')}`);
    });
  }

  async generateFixedRoutes() {
    console.log('\n🔧 Generating recommendations...');
    
    const recommendations = [];
    
    // Analyze broken operations
    this.results.broken.forEach(brokenOp => {
      if (brokenOp.includes('CREATE')) {
        recommendations.push(`Fix CREATE operation for ${brokenOp.split(' ')[0]} - check required fields and data types`);
      }
      if (brokenOp.includes('UPDATE')) {
        recommendations.push(`Fix UPDATE operation for ${brokenOp.split(' ')[0]} - check field names and constraints`);
      }
      if (brokenOp.includes('DELETE')) {
        recommendations.push(`Fix DELETE operation for ${brokenOp.split(' ')[0]} - check foreign key constraints`);
      }
    });

    if (recommendations.length > 0) {
      console.log('\n📝 Recommendations:');
      recommendations.forEach(rec => console.log(`   • ${rec}`));
    }

    console.log('\n🎯 Next Steps:');
    console.log('   1. Fix the broken operations based on error messages');
    console.log('   2. Update backend routes to use proper Supabase syntax');
    console.log('   3. Ensure frontend API calls match backend expectations');
    console.log('   4. Test each operation manually in the frontend');
  }
}

// Run the comprehensive CRUD test
if (require.main === module) {
  const tester = new CRUDTester();
  tester.testAllCRUD().catch(console.error);
}

module.exports = CRUDTester;
