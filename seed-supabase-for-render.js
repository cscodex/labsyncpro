#!/usr/bin/env node

/**
 * Seed Supabase for Render Deployment
 * 
 * This script ensures that the Supabase database has all the necessary data
 * for the Render deployment to work properly.
 */

require('dotenv').config({ path: './server/.env' });
const { createClient } = require('@supabase/supabase-js');

// Supabase connection
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration. Please check your .env file.');
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

class SupabaseSeeder {
  constructor() {
    this.stats = {
      created: 0,
      updated: 0,
      errors: 0
    };
  }

  async seedUsers() {
    console.log('👥 Seeding users...');
    
    const users = [
      {
        id: '0baa2fd8-cd21-4027-9534-1709718a0050',
        email: 'admin@labsyncpro.com',
        password_hash: '$2b$10$example.hash.for.admin',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'instructor-uuid-1',
        email: 'instructor@labsyncpro.com',
        password_hash: '$2b$10$example.hash.for.instructor',
        first_name: 'John',
        last_name: 'Instructor',
        role: 'instructor',
        is_active: true,
        created_at: new Date().toISOString()
      }
    ];

    for (const user of users) {
      try {
        const { data, error } = await supabase
          .from('users')
          .upsert(user, { onConflict: 'id' });
        
        if (error) throw error;
        this.stats.created++;
        console.log(`   ✅ User: ${user.email}`);
      } catch (error) {
        console.log(`   ❌ User ${user.email}: ${error.message}`);
        this.stats.errors++;
      }
    }
  }

  async seedLabs() {
    console.log('🏢 Seeding labs...');
    
    const labs = [
      {
        id: 'f202a2b2-08b0-41cf-8f97-c0160f247ad8',
        name: 'Computer Lab 1',
        title: 'Computer Lab 1',
        capacity: 50,
        location: 'Computer Science Building - Ground Floor',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        name: 'Computer Lab 2',
        title: 'Computer Lab 2',
        capacity: 50,
        location: 'Computer Science Building - First Floor',
        is_active: true,
        created_at: new Date().toISOString()
      }
    ];

    for (const lab of labs) {
      try {
        const { data, error } = await supabase
          .from('labs')
          .upsert(lab, { onConflict: 'id' });
        
        if (error) throw error;
        this.stats.created++;
        console.log(`   ✅ Lab: ${lab.name}`);
      } catch (error) {
        console.log(`   ❌ Lab ${lab.name}: ${error.message}`);
        this.stats.errors++;
      }
    }
  }

  async seedClasses() {
    console.log('📚 Seeding classes...');
    
    const classes = [
      {
        id: 'e519c46b-7380-4ab4-9529-6bc258edbb8d',
        name: '11 NM C',
        description: 'Grade 11 Non-Medical Section C',
        grade_level: 11,
        stream: 'Non-Medical',
        section: 'C',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'f202a2b2-08b0-41cf-8f97-c0160f247ad8',
        name: '11 NM D',
        description: 'Grade 11 Non-Medical Section D',
        grade_level: 11,
        stream: 'Non-Medical',
        section: 'D',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        name: '12 COM A',
        description: 'Grade 12 Commerce Section A',
        grade_level: 12,
        stream: 'Commerce',
        section: 'A',
        is_active: true,
        created_at: new Date().toISOString()
      }
    ];

    for (const classData of classes) {
      try {
        const { data, error } = await supabase
          .from('classes')
          .upsert(classData, { onConflict: 'id' });
        
        if (error) throw error;
        this.stats.created++;
        console.log(`   ✅ Class: ${classData.name}`);
      } catch (error) {
        console.log(`   ❌ Class ${classData.name}: ${error.message}`);
        this.stats.errors++;
      }
    }
  }

  async seedComputers() {
    console.log('💻 Seeding computers...');
    
    const computers = [];
    
    // Computer Lab 1: 15 computers
    for (let i = 1; i <= 15; i++) {
      const computerNumber = i.toString().padStart(3, '0');
      computers.push({
        id: `comp-lab1-${computerNumber}`,
        lab_id: 'f202a2b2-08b0-41cf-8f97-c0160f247ad8',
        computer_name: `CL1-PC-${computerNumber}`,
        seat_number: `CL1-CR-${computerNumber}`,
        specifications: {
          cpu: 'Intel i7-12700',
          ram: '16GB DDR4',
          storage: '512GB NVMe SSD',
          gpu: 'Intel UHD Graphics',
          os: 'Windows 11 Pro'
        },
        status: 'available',
        is_functional: true,
        created_at: new Date().toISOString()
      });
    }
    
    // Computer Lab 2: 19 computers
    for (let i = 1; i <= 19; i++) {
      const computerNumber = i.toString().padStart(3, '0');
      computers.push({
        id: `comp-lab2-${computerNumber}`,
        lab_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        computer_name: `CL2-PC-${computerNumber}`,
        seat_number: `CL2-CR-${computerNumber}`,
        specifications: {
          cpu: 'Intel i5-11400',
          ram: '8GB DDR4',
          storage: '256GB SSD',
          gpu: 'Intel UHD Graphics',
          os: 'Windows 11 Pro'
        },
        status: 'available',
        is_functional: true,
        created_at: new Date().toISOString()
      });
    }

    // Insert computers in batches
    const batchSize = 10;
    for (let i = 0; i < computers.length; i += batchSize) {
      const batch = computers.slice(i, i + batchSize);
      try {
        const { data, error } = await supabase
          .from('computers')
          .upsert(batch, { onConflict: 'id' });
        
        if (error) throw error;
        this.stats.created += batch.length;
        console.log(`   ✅ Computers batch ${Math.floor(i/batchSize) + 1}: ${batch.length} computers`);
      } catch (error) {
        console.log(`   ❌ Computers batch ${Math.floor(i/batchSize) + 1}: ${error.message}`);
        this.stats.errors++;
      }
    }
  }

  async verifyData() {
    console.log('\n🔍 Verifying seeded data...');
    
    const tables = ['users', 'labs', 'classes', 'computers'];
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        console.log(`   ${table}: ${count} records`);
      } catch (error) {
        console.log(`   ${table}: Error - ${error.message}`);
      }
    }
  }

  async run() {
    console.log('🌱 SUPABASE SEEDING FOR RENDER DEPLOYMENT');
    console.log('==========================================\n');
    
    try {
      await this.seedUsers();
      await this.seedLabs();
      await this.seedClasses();
      await this.seedComputers();
      await this.verifyData();
      
      console.log('\n📊 Seeding Summary:');
      console.log(`   ✅ Created/Updated: ${this.stats.created}`);
      console.log(`   ❌ Errors: ${this.stats.errors}`);
      
      if (this.stats.errors === 0) {
        console.log('\n🎉 Supabase seeding completed successfully!');
        console.log('   Your Render deployment should now have all required data.');
      } else {
        console.log('\n⚠️  Some errors occurred during seeding. Check the logs above.');
      }
      
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    }
  }
}

// Run the seeder
if (require.main === module) {
  const seeder = new SupabaseSeeder();
  seeder.run().catch(console.error);
}

module.exports = SupabaseSeeder;
