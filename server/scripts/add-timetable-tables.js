const { query } = require('../config/database');

async function addTimetableTables() {
  console.log('🔧 Adding timetable tables...');

  try {
    // Check database connection
    await query('SELECT NOW()');
    console.log('✅ Database connected successfully');

    // Create timetable_config table
    await query(`
      CREATE TABLE IF NOT EXISTS timetable_config (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        max_lectures_per_day INTEGER NOT NULL DEFAULT 8,
        lecture_duration_minutes INTEGER NOT NULL DEFAULT 45,
        break_duration_minutes INTEGER NOT NULL DEFAULT 15,
        start_time TIME NOT NULL DEFAULT '08:00:00',
        end_time TIME NOT NULL DEFAULT '17:00:00',
        working_days JSONB NOT NULL DEFAULT '["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT valid_lecture_count CHECK (max_lectures_per_day BETWEEN 1 AND 12),
        CONSTRAINT valid_duration CHECK (lecture_duration_minutes BETWEEN 30 AND 120),
        CONSTRAINT valid_break CHECK (break_duration_minutes BETWEEN 5 AND 60),
        CONSTRAINT valid_time_range CHECK (start_time < end_time)
      )
    `);
    console.log('✅ Created timetable_config table');

    // Create time_slots table
    await query(`
      CREATE TABLE IF NOT EXISTS time_slots (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        slot_number INTEGER NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_break BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT valid_slot_number CHECK (slot_number BETWEEN 1 AND 20),
        CONSTRAINT valid_slot_time CHECK (start_time < end_time),
        UNIQUE(slot_number)
      )
    `);
    console.log('✅ Created time_slots table');

    // Create timetable_entries table
    await query(`
      CREATE TABLE IF NOT EXISTS timetable_entries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        week_start_date DATE NOT NULL,
        day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
        time_slot_id UUID NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
        class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
        subject VARCHAR(100),
        instructor_id UUID REFERENCES users(id) ON DELETE SET NULL,
        lab_id UUID REFERENCES labs(id) ON DELETE SET NULL,
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE(week_start_date, day_of_week, time_slot_id, class_id)
      )
    `);
    console.log('✅ Created timetable_entries table');

    // Create indexes
    await query('CREATE INDEX IF NOT EXISTS idx_timetable_entries_week_day ON timetable_entries(week_start_date, day_of_week)');
    await query('CREATE INDEX IF NOT EXISTS idx_timetable_entries_class ON timetable_entries(class_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_timetable_entries_instructor ON timetable_entries(instructor_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_timetable_entries_time_slot ON timetable_entries(time_slot_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_time_slots_number ON time_slots(slot_number)');
    console.log('✅ Created timetable indexes');

    // Create triggers
    await query(`
      CREATE TRIGGER update_timetable_config_updated_at 
      BEFORE UPDATE ON timetable_config 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
    
    await query(`
      CREATE TRIGGER update_timetable_entries_updated_at 
      BEFORE UPDATE ON timetable_entries 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
    console.log('✅ Created timetable triggers');

    // Insert default configuration
    await query(`
      INSERT INTO timetable_config (max_lectures_per_day, lecture_duration_minutes, break_duration_minutes, start_time, end_time) 
      VALUES (8, 45, 15, '08:00:00', '17:00:00')
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ Inserted default timetable configuration');

    // Insert default time slots
    const timeSlots = [
      { slot_number: 1, start_time: '08:00:00', end_time: '08:45:00', is_break: false },
      { slot_number: 2, start_time: '08:45:00', end_time: '09:00:00', is_break: true },
      { slot_number: 3, start_time: '09:00:00', end_time: '09:45:00', is_break: false },
      { slot_number: 4, start_time: '09:45:00', end_time: '10:00:00', is_break: true },
      { slot_number: 5, start_time: '10:00:00', end_time: '10:45:00', is_break: false },
      { slot_number: 6, start_time: '10:45:00', end_time: '11:00:00', is_break: true },
      { slot_number: 7, start_time: '11:00:00', end_time: '11:45:00', is_break: false },
      { slot_number: 8, start_time: '11:45:00', end_time: '12:00:00', is_break: true },
      { slot_number: 9, start_time: '12:00:00', end_time: '12:45:00', is_break: false },
      { slot_number: 10, start_time: '12:45:00', end_time: '13:00:00', is_break: true },
      { slot_number: 11, start_time: '13:00:00', end_time: '13:45:00', is_break: false },
      { slot_number: 12, start_time: '13:45:00', end_time: '14:00:00', is_break: true },
      { slot_number: 13, start_time: '14:00:00', end_time: '14:45:00', is_break: false },
      { slot_number: 14, start_time: '14:45:00', end_time: '15:00:00', is_break: true },
      { slot_number: 15, start_time: '15:00:00', end_time: '15:45:00', is_break: false },
      { slot_number: 16, start_time: '15:45:00', end_time: '16:00:00', is_break: true }
    ];

    for (const slot of timeSlots) {
      await query(`
        INSERT INTO time_slots (slot_number, start_time, end_time, is_break)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (slot_number) DO NOTHING
      `, [slot.slot_number, slot.start_time, slot.end_time, slot.is_break]);
    }
    console.log('✅ Inserted default time slots');

    console.log('🎉 Timetable tables added successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error adding timetable tables:', error.message);
    process.exit(1);
  }
}

addTimetableTables();
