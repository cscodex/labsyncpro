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

  } catch (error) {
    console.error('❌ Error fixing database:', error);
  }
}

// Run the fix
fixDatabase().catch(console.error);
