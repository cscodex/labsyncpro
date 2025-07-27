const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

(async () => {
  console.log('🧪 Testing student assignments endpoint...');
  
  try {
    // Login as student
    console.log('\n1. Logging in as student...');
    const loginResponse = await fetch('http://localhost:5002/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student1@labsyncpro.com',
        password: 'student123'
      })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Student login failed');
      return;
    }
    
    const { token, user } = await loginResponse.json();
    console.log('✅ Student login successful');
    console.log('👤 Student:', user.firstName, user.lastName, `(${user.email})`);
    
    // Test student assignments endpoint
    console.log('\n2. Testing /api/assignments/student endpoint...');
    const assignmentsResponse = await fetch('http://localhost:5002/api/assignments/student', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('📊 Response status:', assignmentsResponse.status);
    
    if (assignmentsResponse.ok) {
      const data = await assignmentsResponse.json();
      console.log('✅ Student assignments endpoint working!');
      console.log('📚 Response:', {
        assignments: data.assignments?.length || 0,
        message: data.message
      });
    } else {
      const errorData = await assignmentsResponse.json();
      console.log('❌ Student assignments failed:', errorData);
    }
    
    // Test other student endpoints
    console.log('\n3. Testing other student-accessible endpoints...');
    
    // Test grades endpoint
    const gradesResponse = await fetch('http://localhost:5002/api/grades', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('📊 Grades endpoint status:', gradesResponse.status);
    if (gradesResponse.ok) {
      console.log('✅ Grades endpoint accessible');
    } else {
      console.log('❌ Grades endpoint failed');
    }
    
    // Test groups endpoint (student's group)
    const groupResponse = await fetch('http://localhost:5002/api/groups/my-group', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('📊 My group endpoint status:', groupResponse.status);
    if (groupResponse.ok) {
      const groupData = await groupResponse.json();
      console.log('✅ My group endpoint accessible');
      console.log('👥 Group info:', groupData.group?.name || 'No group assigned');
    } else {
      console.log('❌ My group endpoint failed');
    }
    
    // Test restricted endpoint (should fail)
    console.log('\n4. Testing restricted endpoint access...');
    const usersResponse = await fetch('http://localhost:5002/api/users', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (usersResponse.status === 403) {
      console.log('✅ Student correctly restricted from admin endpoints');
    } else {
      console.log('❌ Student can access admin endpoints (security issue!)');
    }
    
    console.log('\n🎉 Student login and access test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
})();
