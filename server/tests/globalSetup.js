module.exports = async () => {
  console.log('🚀 Setting up test environment...');

  try {
    // Set default test environment variables if not provided
    if (!process.env.SUPABASE_URL) {
      process.env.SUPABASE_URL = 'https://test.supabase.co';
    }
    if (!process.env.SUPABASE_ANON_KEY) {
      process.env.SUPABASE_ANON_KEY = 'test-key';
    }
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
    }

    // Note: In a real test environment, you would set up test database
    // For now, we'll use sample data responses

    console.log('✅ Test environment setup complete');
  } catch (error) {
    console.error('❌ Test setup failed:', error);
    throw error;
  }
};
