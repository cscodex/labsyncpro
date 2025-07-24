#!/usr/bin/env node

/**
 * Add missing tables to the database
 */

const { pool } = require('../config/database');

async function addMissingTables() {
  try {
    console.log('🔧 Adding missing tables...\n');
    
    // Check if computers table exists
    const computersCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'computers'
      );
    `);
    
    if (!computersCheck.rows[0].exists) {
      console.log('📦 Creating computers table...');
      await pool.query(`
        CREATE TABLE computers (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          lab_id UUID NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
          computer_name VARCHAR(20) UNIQUE NOT NULL,
          computer_number INTEGER NOT NULL,
          specifications JSONB,
          is_functional BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(lab_id, computer_number)
        );
      `);
      console.log('✅ Computers table created');
    } else {
      console.log('✅ Computers table already exists');
    }
    
    // Check if seats table exists
    const seatsCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'seats'
      );
    `);
    
    if (!seatsCheck.rows[0].exists) {
      console.log('📦 Creating seats table...');
      await pool.query(`
        CREATE TABLE seats (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          lab_id UUID NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
          seat_number INTEGER NOT NULL,
          is_available BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(lab_id, seat_number)
        );
      `);
      console.log('✅ Seats table created');
    } else {
      console.log('✅ Seats table already exists');
    }
    
    // Check if seat_assignments table exists
    const seatAssignmentsCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'seat_assignments'
      );
    `);
    
    if (!seatAssignmentsCheck.rows[0].exists) {
      console.log('📦 Creating seat_assignments table...');
      await pool.query(`
        CREATE TABLE seat_assignments (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          seat_id UUID NOT NULL REFERENCES seats(id),
          assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(schedule_id, seat_id)
        );
      `);
      console.log('✅ Seat assignments table created');
    } else {
      console.log('✅ Seat assignments table already exists');
    }
    
    // Final check
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('\n📋 Current tables:');
    result.rows.forEach(row => {
      console.log(`   • ${row.table_name}`);
    });
    
    console.log(`\n📊 Total tables: ${result.rows.length}`);
    
  } catch (error) {
    console.error('❌ Error adding tables:', error.message);
  } finally {
    await pool.end();
  }
}

addMissingTables();
