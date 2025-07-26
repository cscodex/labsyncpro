// Fix database users script using Supabase
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Supabase configuration
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

async function fixDatabase() {
  try {
    console.log('🔧 Adding admin user to Supabase database...');

    // Hash the password 'admin123'
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Check current users
    console.log('\n📋 Checking current users...');
    const { data: currentUsers, error: fetchError } = await supabase
      .from('users')
      .select('email, role, is_active')
      .order('role');

    if (fetchError) {
      console.error('❌ Error fetching users:', fetchError);
    } else {
      console.table(currentUsers || []);
    }

    // Add/update admin user
    console.log('\n➕ Adding/updating admin user...');

    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .upsert({
        email: 'admin@labsyncpro.com',
        password_hash: hashedPassword,
        first_name: 'System',
        last_name: 'Administrator',
        role: 'admin',
        is_active: true
      }, {
        onConflict: 'email'
      })
      .select();

    if (adminError) {
      console.error('❌ Error adding admin user:', adminError);
    } else {
      console.log('✅ Admin user added/updated successfully!');
    }

    // Add/update instructor user
    console.log('\n➕ Adding/updating instructor user...');

    const { data: instructorUser, error: instructorError } = await supabase
      .from('users')
      .upsert({
        email: 'instructor@labsyncpro.com',
        password_hash: hashedPassword,
        first_name: 'Test',
        last_name: 'Instructor',
        role: 'instructor',
        is_active: true
      }, {
        onConflict: 'email'
      })
      .select();

    if (instructorError) {
      console.error('❌ Error adding instructor user:', instructorError);
    } else {
      console.log('✅ Instructor user added/updated successfully!');
    }

    // Verify the users
    console.log('\n✅ Verification - Test users:');
    const { data: testUsers, error: verifyError } = await supabase
      .from('users')
      .select('email, first_name, last_name, role, is_active')
      .in('email', ['admin@labsyncpro.com', 'instructor@labsyncpro.com'])
      .order('role');

    if (verifyError) {
      console.error('❌ Error verifying users:', verifyError);
    } else {
      console.table(testUsers || []);
    }

    console.log('\n🔑 Login credentials:');
    console.log('Admin: admin@labsyncpro.com / admin123');
    console.log('Instructor: instructor@labsyncpro.com / admin123');

    // Add some sample data for dashboard
    console.log('\n➕ Adding sample data...');

    // Add sample labs
    const { data: labs, error: labsError } = await supabase
      .from('labs')
      .upsert([
        {
          name: 'Computer Lab 1',
          total_computers: 25,
          total_seats: 50,
          location: 'Science Building - Ground Floor'
        },
        {
          name: 'Computer Lab 2',
          total_computers: 30,
          total_seats: 50,
          location: 'Science Building - First Floor'
        }
      ], {
        onConflict: 'name'
      })
      .select();

    if (labsError) {
      console.error('❌ Error adding labs:', labsError);
    } else {
      console.log('✅ Sample labs added successfully!');
    }

    // Add sample classes
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .upsert([
        {
          class_code: '11 NM A',
          grade: 11,
          stream: 'NM',
          section: 'A',
          description: 'Grade 11 Non-Medical Section A'
        },
        {
          class_code: '12 COM B',
          grade: 12,
          stream: 'COM',
          section: 'B',
          description: 'Grade 12 Commerce Section B'
        }
      ], {
        onConflict: 'class_code'
      })
      .select();

    if (classesError) {
      console.error('❌ Error adding classes:', classesError);
    } else {
      console.log('✅ Sample classes added successfully!');
    }

    // Add sample students
    const studentPassword = await bcrypt.hash('student123', 10);
    const { data: students, error: studentsError } = await supabase
      .from('users')
      .upsert([
        {
          email: 'student1@labsyncpro.com',
          password_hash: studentPassword,
          first_name: 'Alice',
          last_name: 'Johnson',
          role: 'student',
          student_id: '20240001',
          is_active: true
        },
        {
          email: 'student2@labsyncpro.com',
          password_hash: studentPassword,
          first_name: 'Bob',
          last_name: 'Smith',
          role: 'student',
          student_id: '20240002',
          is_active: true
        }
      ], {
        onConflict: 'email'
      })
      .select();

    if (studentsError) {
      console.error('❌ Error adding students:', studentsError);
    } else {
      console.log('✅ Sample students added successfully!');
    }

    console.log('\n🎉 Database setup completed with sample data!');

  } catch (error) {
    console.error('❌ Error fixing database:', error);
  }
}

// Run the fix
fixDatabase().catch(console.error);
