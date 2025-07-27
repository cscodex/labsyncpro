#!/usr/bin/env node

/**
 * Update Computer Inventory in Supabase
 * 
 * This script updates the Supabase database with specific computer inventory:
 * - Computer Lab 1: CL1-PC-001 to CL1-PC-015 (15 computers)
 * - Computer Lab 2: CL2-PC-001 to CL2-PC-019 (19 computers)
 * - No other labs
 * 
 * Usage: node update-computer-inventory.js
 */

require('dotenv').config({ path: './.env' });
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

class ComputerInventoryUpdater {
  constructor() {
    this.stats = {
      labsCreated: 0,
      computersCreated: 0,
      computersUpdated: 0,
      errors: []
    };
  }

  async updateInventory() {
    console.log('🚀 Updating Computer Inventory in Supabase...\n');
    
    try {
      // Test connection
      await this.testConnection();
      
      // Clear existing data
      await this.clearExistingData();
      
      // Create labs
      await this.createLabs();
      
      // Create computers
      await this.createComputers();
      
      // Print summary
      await this.printSummary();
      
    } catch (error) {
      console.error('❌ Update failed:', error);
      process.exit(1);
    }
  }

  async testConnection() {
    console.log('🔍 Testing Supabase connection...');
    
    try {
      const { data, error } = await supabase.from('labs').select('count').limit(1);
      if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist
        throw error;
      }
      console.log('✅ Supabase connection successful\n');
    } catch (error) {
      throw new Error(`Supabase connection failed: ${error.message}`);
    }
  }

  async clearExistingData() {
    console.log('🧹 Clearing existing computer and lab data...');
    
    try {
      // Clear computers first (foreign key constraint)
      const { error: computersError } = await supabase
        .from('computers')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (computersError && computersError.code !== 'PGRST116') {
        console.log(`   ⚠️  Could not clear computers: ${computersError.message}`);
      }
      
      // Clear labs
      const { error: labsError } = await supabase
        .from('labs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (labsError && labsError.code !== 'PGRST116') {
        console.log(`   ⚠️  Could not clear labs: ${labsError.message}`);
      }
      
      console.log('✅ Existing data cleared\n');
    } catch (error) {
      console.log(`   ⚠️  Warning during cleanup: ${error.message}`);
    }
  }

  async createLabs() {
    console.log('🏢 Creating labs...');
    
    const labs = [
      {
        name: 'Computer Lab 1',
        location: 'Science Building - Ground Floor',
        capacity: 50,
        description: 'Computer Lab 1 with 15 computers and 50 seats',
        is_active: true
      },
      {
        name: 'Computer Lab 2',
        location: 'Science Building - First Floor',
        capacity: 50,
        description: 'Computer Lab 2 with 19 computers and 50 seats',
        is_active: true
      }
    ];

    for (const lab of labs) {
      try {
        const { data, error } = await supabase.from('labs').insert(lab).select();

        if (error) {
          throw new Error(`Failed to create lab ${lab.name}: ${error.message}`);
        }

        console.log(`   ✅ Created ${lab.name} (ID: ${data[0].id})`);
        this.stats.labsCreated++;

        // Store lab ID for computer creation
        if (lab.name === 'Computer Lab 1') {
          this.lab1Id = data[0].id;
        } else if (lab.name === 'Computer Lab 2') {
          this.lab2Id = data[0].id;
        }
      } catch (error) {
        console.error(`   ❌ Failed to create lab ${lab.name}: ${error.message}`);
        this.stats.errors.push(error.message);
      }
    }
    
    console.log('');
  }

  async createComputers() {
    console.log('💻 Creating computers...');

    // Computer Lab 1: CL1-PC-001 to CL1-PC-015
    await this.createComputersForLab(this.lab1Id, 'CL1', 15);

    // Computer Lab 2: CL2-PC-001 to CL2-PC-019
    await this.createComputersForLab(this.lab2Id, 'CL2', 19);

    console.log('');
  }

  async createComputersForLab(labId, labCode, count) {
    console.log(`   📦 Creating computers for ${labCode}...`);
    
    const computers = [];
    
    for (let i = 1; i <= count; i++) {
      const computerNumber = i.toString().padStart(3, '0');
      const computerName = `${labCode}-PC-${computerNumber}`;
      
      const computer = {
        lab_id: labId,
        computer_name: computerName,
        seat_number: computerNumber,
        specifications: {
          cpu: labCode === 'CL1' ? 'Intel i7-12700' : 'Intel i5-11400',
          ram: labCode === 'CL1' ? '16GB DDR4' : '8GB DDR4',
          storage: labCode === 'CL1' ? '512GB NVMe SSD' : '256GB SSD',
          gpu: 'Intel UHD Graphics',
          os: 'Windows 11 Pro',
          network: 'Gigabit Ethernet',
          peripherals: ['Keyboard', 'Mouse', 'Monitor']
        },
        status: 'available',
        is_functional: true
      };
      
      computers.push(computer);
    }
    
    // Insert computers in batches
    const BATCH_SIZE = 10;
    for (let i = 0; i < computers.length; i += BATCH_SIZE) {
      const batch = computers.slice(i, i + BATCH_SIZE);
      
      try {
        const { error } = await supabase.from('computers').insert(batch);
        
        if (error) {
          throw new Error(`Batch insert failed: ${error.message}`);
        }
        
        this.stats.computersCreated += batch.length;
        
        // Progress indicator
        const progress = Math.min(i + BATCH_SIZE, computers.length);
        console.log(`      📊 Progress: ${progress}/${computers.length} computers created`);
        
      } catch (error) {
        console.error(`      ❌ Failed to create batch: ${error.message}`);
        this.stats.errors.push(`${labCode} batch error: ${error.message}`);
      }
    }
    
    console.log(`   ✅ Created ${computers.length} computers for ${labCode}`);
  }

  async printSummary() {
    console.log('\n🎉 Computer Inventory Update Completed!\n');
    console.log('📊 Update Summary:');
    console.log(`   🏢 Labs created: ${this.stats.labsCreated}`);
    console.log(`   💻 Computers created: ${this.stats.computersCreated}`);
    console.log(`   ❌ Errors: ${this.stats.errors.length}`);
    
    if (this.stats.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      this.stats.errors.forEach(error => console.log(`   • ${error}`));
    }
    
    // Verify the data
    await this.verifyData();
    
    console.log('\n✨ Computer inventory has been successfully updated in Supabase!');
    console.log('🔗 Check your Supabase dashboard to verify the data.');
  }

  async verifyData() {
    console.log('\n🔍 Verifying data...');
    
    try {
      // Count labs
      const { data: labs, error: labsError } = await supabase
        .from('labs')
        .select('id, name, capacity');
      
      if (labsError) {
        console.log(`   ⚠️  Could not verify labs: ${labsError.message}`);
        return;
      }
      
      console.log(`   📋 Labs in database: ${labs.length}`);
      labs.forEach(lab => {
        console.log(`      • ${lab.name}: Capacity ${lab.capacity} seats`);
      });
      
      // Count computers by lab
      const { data: computers, error: computersError } = await supabase
        .from('computers')
        .select('lab_id, computer_name')
        .order('computer_name');
      
      if (computersError) {
        console.log(`   ⚠️  Could not verify computers: ${computersError.message}`);
        return;
      }
      
      console.log(`   💻 Total computers in database: ${computers.length}`);
      
      // Group by lab
      const computersByLab = computers.reduce((acc, comp) => {
        acc[comp.lab_id] = (acc[comp.lab_id] || 0) + 1;
        return acc;
      }, {});
      
      Object.entries(computersByLab).forEach(([labId, count]) => {
        const lab = labs.find(l => l.id === labId);
        const labName = lab ? lab.name : labId;
        console.log(`      • ${labName}: ${count} computers`);
      });
      
    } catch (error) {
      console.log(`   ⚠️  Verification error: ${error.message}`);
    }
  }
}

// Run the update
if (require.main === module) {
  const updater = new ComputerInventoryUpdater();
  updater.updateInventory().catch(console.error);
}

module.exports = ComputerInventoryUpdater;
