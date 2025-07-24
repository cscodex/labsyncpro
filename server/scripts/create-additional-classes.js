#!/usr/bin/env node

/**
 * Create additional classes to reach 20 total classes
 * and assign them to Computer Lab 1 and Computer Lab 2
 */

const { pool } = require('../config/database');

async function createAdditionalClasses() {
  try {
    console.log('🏫 Creating additional classes to reach 20 total...\n');
    
    // Get current class count
    const currentClassesResult = await pool.query('SELECT COUNT(*) as count FROM classes');
    const currentCount = parseInt(currentClassesResult.rows[0].count);
    console.log(`📊 Current classes: ${currentCount}`);
    
    if (currentCount >= 20) {
      console.log('✅ Already have 20 or more classes');
      return;
    }
    
    const classesToCreate = 20 - currentCount;
    console.log(`➕ Creating ${classesToCreate} additional classes...\n`);
    
    // Additional classes to create
    const newClasses = [
      { name: '11 COM B', grade: 11, stream: 'Commerce', capacity: 50 },
      { name: '11 M B', grade: 11, stream: 'Medical', capacity: 40 },
      { name: '12 COM B', grade: 12, stream: 'Commerce', capacity: 48 },
      { name: '12 M B', grade: 12, stream: 'Medical', capacity: 38 },
      { name: '11 NM G', grade: 11, stream: 'Non-Medical', capacity: 45 },
      { name: '11 NM H', grade: 11, stream: 'Non-Medical', capacity: 45 },
      { name: '12 NM C', grade: 12, stream: 'Non-Medical', capacity: 42 },
      { name: '12 NM D', grade: 12, stream: 'Non-Medical', capacity: 42 }
    ];
    
    // Create only the needed number of classes
    const classesToAdd = newClasses.slice(0, classesToCreate);
    
    for (const cls of classesToAdd) {
      try {
        const result = await pool.query(`
          INSERT INTO classes (name, grade, stream, capacity)
          VALUES ($1, $2, $3, $4)
          RETURNING id, name
        `, [cls.name, cls.grade, cls.stream, cls.capacity]);
        
        console.log(`✅ Created class: ${result.rows[0].name} (ID: ${result.rows[0].id})`);
      } catch (error) {
        if (error.code === '23505') { // Unique constraint violation
          console.log(`⚠️  Class ${cls.name} already exists, skipping...`);
        } else {
          throw error;
        }
      }
    }
    
    // Verify final count
    const finalClassesResult = await pool.query('SELECT COUNT(*) as count FROM classes');
    const finalCount = parseInt(finalClassesResult.rows[0].count);
    console.log(`\n📊 Final class count: ${finalCount}`);
    
    console.log('\n✅ Additional classes created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating additional classes:', error.message);
  } finally {
    await pool.end();
  }
}

createAdditionalClasses();
