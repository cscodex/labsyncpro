#!/usr/bin/env node

/**
 * Verify Computer Inventory in Supabase
 * 
 * This script verifies the computer inventory in Supabase and displays
 * all computers with their details.
 * 
 * Usage: node verify-computer-inventory.js
 */

require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

// Supabase connection
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verifyInventory() {
  console.log('🔍 Verifying Computer Inventory in Supabase...\n');
  
  try {
    // Get labs
    const { data: labs, error: labsError } = await supabase
      .from('labs')
      .select('*')
      .order('name');
    
    if (labsError) {
      throw new Error(`Failed to fetch labs: ${labsError.message}`);
    }
    
    console.log(`📋 Found ${labs.length} labs:\n`);
    
    for (const lab of labs) {
      console.log(`🏢 ${lab.name}`);
      console.log(`   📍 Location: ${lab.location}`);
      console.log(`   🪑 Capacity: ${lab.capacity} seats`);
      console.log(`   📝 Description: ${lab.description}`);
      console.log(`   🆔 ID: ${lab.id}\n`);
      
      // Get computers for this lab
      const { data: computers, error: computersError } = await supabase
        .from('computers')
        .select('*')
        .eq('lab_id', lab.id)
        .order('computer_name');
      
      if (computersError) {
        console.log(`   ❌ Error fetching computers: ${computersError.message}\n`);
        continue;
      }
      
      console.log(`   💻 Computers (${computers.length}):`);
      
      if (computers.length === 0) {
        console.log(`      No computers found\n`);
        continue;
      }
      
      computers.forEach((computer, index) => {
        const specs = computer.specifications;
        console.log(`      ${index + 1}. ${computer.computer_name}`);
        console.log(`         🆔 ID: ${computer.id}`);
        console.log(`         🪑 Seat: ${computer.seat_number}`);
        console.log(`         📊 Status: ${computer.status}`);
        console.log(`         ✅ Functional: ${computer.is_functional ? 'Yes' : 'No'}`);
        if (specs) {
          console.log(`         💾 CPU: ${specs.cpu}`);
          console.log(`         🧠 RAM: ${specs.ram}`);
          console.log(`         💽 Storage: ${specs.storage}`);
          console.log(`         🖥️ OS: ${specs.os}`);
        }
        console.log('');
      });
    }
    
    // Summary
    const totalComputers = labs.reduce(async (total, lab) => {
      const { count } = await supabase
        .from('computers')
        .select('*', { count: 'exact', head: true })
        .eq('lab_id', lab.id);
      return (await total) + (count || 0);
    }, Promise.resolve(0));
    
    const { count: totalComputerCount } = await supabase
      .from('computers')
      .select('*', { count: 'exact', head: true });
    
    console.log('📊 Summary:');
    console.log(`   🏢 Total Labs: ${labs.length}`);
    console.log(`   💻 Total Computers: ${totalComputerCount}`);
    console.log(`   🪑 Total Seat Capacity: ${labs.reduce((sum, lab) => sum + lab.capacity, 0)}`);
    
    // Verify specific requirements
    console.log('\n✅ Verification Results:');
    
    const lab1 = labs.find(lab => lab.name === 'Computer Lab 1');
    const lab2 = labs.find(lab => lab.name === 'Computer Lab 2');
    
    if (lab1) {
      const { count: lab1Count } = await supabase
        .from('computers')
        .select('*', { count: 'exact', head: true })
        .eq('lab_id', lab1.id);
      
      console.log(`   ✅ Computer Lab 1: ${lab1Count} computers (Expected: 15) - ${lab1Count === 15 ? 'PASS' : 'FAIL'}`);
      
      // Check specific computer names for Lab 1
      const { data: lab1Computers } = await supabase
        .from('computers')
        .select('computer_name')
        .eq('lab_id', lab1.id)
        .order('computer_name');
      
      const expectedLab1Names = [];
      for (let i = 1; i <= 15; i++) {
        expectedLab1Names.push(`CL1-PC-${i.toString().padStart(3, '0')}`);
      }
      
      const actualLab1Names = lab1Computers.map(c => c.computer_name).sort();
      const lab1NamesMatch = JSON.stringify(expectedLab1Names) === JSON.stringify(actualLab1Names);
      
      console.log(`   ✅ Computer Lab 1 naming: CL1-PC-001 to CL1-PC-015 - ${lab1NamesMatch ? 'PASS' : 'FAIL'}`);
    } else {
      console.log(`   ❌ Computer Lab 1: NOT FOUND`);
    }
    
    if (lab2) {
      const { count: lab2Count } = await supabase
        .from('computers')
        .select('*', { count: 'exact', head: true })
        .eq('lab_id', lab2.id);
      
      console.log(`   ✅ Computer Lab 2: ${lab2Count} computers (Expected: 19) - ${lab2Count === 19 ? 'PASS' : 'FAIL'}`);
      
      // Check specific computer names for Lab 2
      const { data: lab2Computers } = await supabase
        .from('computers')
        .select('computer_name')
        .eq('lab_id', lab2.id)
        .order('computer_name');
      
      const expectedLab2Names = [];
      for (let i = 1; i <= 19; i++) {
        expectedLab2Names.push(`CL2-PC-${i.toString().padStart(3, '0')}`);
      }
      
      const actualLab2Names = lab2Computers.map(c => c.computer_name).sort();
      const lab2NamesMatch = JSON.stringify(expectedLab2Names) === JSON.stringify(actualLab2Names);
      
      console.log(`   ✅ Computer Lab 2 naming: CL2-PC-001 to CL2-PC-019 - ${lab2NamesMatch ? 'PASS' : 'FAIL'}`);
    } else {
      console.log(`   ❌ Computer Lab 2: NOT FOUND`);
    }
    
    // Check for other labs
    const otherLabs = labs.filter(lab => !['Computer Lab 1', 'Computer Lab 2'].includes(lab.name));
    console.log(`   ✅ No other labs: ${otherLabs.length === 0 ? 'PASS' : 'FAIL'} (Found ${otherLabs.length} other labs)`);
    
    if (otherLabs.length > 0) {
      console.log(`      Other labs found: ${otherLabs.map(lab => lab.name).join(', ')}`);
    }
    
    console.log('\n🎉 Verification completed!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

// Run verification
if (require.main === module) {
  verifyInventory().catch(console.error);
}
