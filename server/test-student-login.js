const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

(async () => {
  console.log('🧪 Testing student login functionality...');
  
  try {
    // First, let's check if there are any student accounts
    console.log('\n1. Checking existing student accounts...');
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
    
    // Get all users to see if there are students
    const usersResponse = await fetch('http://localhost:5002/api/users?role=student', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (usersResponse.ok) {
      const { users } = await usersResponse.json();
      console.log(`📊 Found ${users.length} student accounts`);
      
      if (users.length > 0) {
        console.log('👥 Student accounts:');
        users.slice(0, 3).forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.firstName} ${user.lastName} (${user.email}) - ID: ${user.studentId || 'N/A'}`);
        });
        
        // Test login with first student
        const testStudent = users[0];
        console.log(`\n2. Testing login with student: ${testStudent.email}`);
        
        // Try common passwords
        const commonPasswords = ['student123', 'password', '123456', 'student', testStudent.studentId];
        
        for (const password of commonPasswords) {
          console.log(`   Trying password: ${password}`);
          
          const studentLoginResponse = await fetch('http://localhost:5002/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: testStudent.email,
              password: password
            })
          });
          
          if (studentLoginResponse.ok) {
            const studentData = await studentLoginResponse.json();
            console.log('✅ Student login successful!');
            console.log('👤 Student info:', {
              name: `${studentData.user.firstName} ${studentData.user.lastName}`,
              email: studentData.user.email,
              role: studentData.user.role,
              studentId: studentData.user.studentId,
              isActive: studentData.user.isActive
            });
            
            // Test accessing student dashboard data
            console.log('\n3. Testing student dashboard access...');
            const dashboardResponse = await fetch('http://localhost:5002/api/assignments', {
              headers: {
                'Authorization': `Bearer ${studentData.token}`
              }
            });
            
            if (dashboardResponse.ok) {
              console.log('✅ Student can access assignments');
            } else {
              console.log('❌ Student cannot access assignments:', dashboardResponse.status);
            }
            
            // Test accessing restricted admin endpoints
            console.log('\n4. Testing student access restrictions...');
            const adminResponse = await fetch('http://localhost:5002/api/users', {
              headers: {
                'Authorization': `Bearer ${studentData.token}`
              }
            });
            
            if (adminResponse.status === 403) {
              console.log('✅ Student correctly restricted from admin endpoints');
            } else {
              console.log('❌ Student can access admin endpoints (security issue!)');
            }
            
            return; // Exit after successful test
          } else {
            const errorData = await studentLoginResponse.json();
            console.log(`   ❌ Failed: ${errorData.error}`);
          }
        }
        
        console.log('❌ Could not login with any common passwords');
        console.log('💡 You may need to create a test student account or reset a student password');
        
      } else {
        console.log('❌ No student accounts found');
        console.log('💡 Creating a test student account...');
        
        // Create a test student account
        const createStudentResponse = await fetch('http://localhost:5002/api/users', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: 'student.test@labsyncpro.com',
            password: 'student123',
            firstName: 'Test',
            lastName: 'Student',
            role: 'student',
            studentId: '12345678'
          })
        });
        
        if (createStudentResponse.ok) {
          const newStudent = await createStudentResponse.json();
          console.log('✅ Test student account created');
          console.log('📧 Email: student.test@labsyncpro.com');
          console.log('🔑 Password: student123');
          
          // Test login with new student
          console.log('\n5. Testing login with new student account...');
          const newStudentLoginResponse = await fetch('http://localhost:5002/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'student.test@labsyncpro.com',
              password: 'student123'
            })
          });
          
          if (newStudentLoginResponse.ok) {
            const studentData = await newStudentLoginResponse.json();
            console.log('✅ New student login successful!');
            console.log('👤 Student info:', {
              name: `${studentData.user.firstName} ${studentData.user.lastName}`,
              email: studentData.user.email,
              role: studentData.user.role,
              studentId: studentData.user.studentId
            });
          } else {
            const errorData = await newStudentLoginResponse.json();
            console.log('❌ New student login failed:', errorData.error);
          }
        } else {
          const errorData = await createStudentResponse.json();
          console.log('❌ Failed to create test student:', errorData.error);
        }
      }
    } else {
      console.log('❌ Failed to fetch users');
    }
    
    console.log('\n🎉 Student login test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
})();
