const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

(async () => {
  console.log('🧪 Testing webmail users endpoint...');
  
  try {
    // Login as admin
    console.log('\n1. Logging in as admin...');
    const loginResponse = await fetch('http://localhost:5002/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@labsyncpro.com',
        password: 'admin123'
      })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Admin login failed');
      return;
    }
    
    const { token } = await loginResponse.json();
    console.log('✅ Admin login successful');
    
    // Test webmail users endpoint
    console.log('\n2. Testing /api/webmail/users endpoint...');
    const usersResponse = await fetch('http://localhost:5002/api/webmail/users', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('📊 Response status:', usersResponse.status);
    
    if (usersResponse.ok) {
      const data = await usersResponse.json();
      console.log('✅ Webmail users endpoint working!');
      console.log('👥 Users found:', data.users?.length || 0);
      
      if (data.users && data.users.length > 0) {
        console.log('📋 Sample users:');
        data.users.slice(0, 3).forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.name} (${user.email}) - ${user.role}`);
        });
      }
    } else {
      const errorData = await usersResponse.json();
      console.log('❌ Webmail users failed:', errorData);
    }
    
    console.log('\n🎉 Webmail users test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
})();
