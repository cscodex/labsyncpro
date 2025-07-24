// Simple test script to verify timetable API endpoints
const axios = require('axios');

const API_BASE = 'http://localhost:5002/api';

async function testTimetableAPI() {
  console.log('🧪 Testing Timetable API Endpoints...\n');

  try {
    // Test 1: Get timetable versions
    console.log('1. Testing GET /timetable/versions');
    try {
      const versionsResponse = await axios.get(`${API_BASE}/timetable/versions`);
      console.log('✅ Versions endpoint working');
      console.log(`   Found ${versionsResponse.data.versions?.length || 0} versions\n`);
    } catch (err) {
      console.log('❌ Versions endpoint failed:', err.response?.status, err.response?.statusText);
      console.log('   This is expected if not authenticated\n');
    }

    // Test 2: Check if server is responding
    console.log('2. Testing server health');
    try {
      const healthResponse = await axios.get(`${API_BASE}/health`);
      console.log('✅ Server health check passed\n');
    } catch (err) {
      console.log('❌ Server health check failed, but server might still be working\n');
    }

    // Test 3: Check timetable routes registration
    console.log('3. Testing timetable routes registration');
    try {
      const response = await axios.get(`${API_BASE}/timetable/stats`);
      console.log('✅ Timetable routes are registered');
    } catch (err) {
      if (err.response?.status === 401) {
        console.log('✅ Timetable routes are registered (authentication required)');
      } else {
        console.log('❌ Timetable routes may not be registered:', err.response?.status);
      }
    }

    console.log('\n🎉 Timetable API test completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Login to the application at http://localhost:5174');
    console.log('2. Use credentials: admin@labsyncpro.com / admin123');
    console.log('3. Navigate to the Timetable section');
    console.log('4. Test the comprehensive timetable features');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testTimetableAPI();
