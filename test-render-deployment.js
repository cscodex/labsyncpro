#!/usr/bin/env node

/**
 * Test Render Deployment Script
 * 
 * This script tests the Render deployment to ensure all API endpoints
 * are working correctly and returning valid JSON responses.
 * 
 * Usage: node test-render-deployment.js [render-url]
 * Example: node test-render-deployment.js https://your-app.onrender.com
 */

const https = require('https');
const http = require('http');

class RenderTester {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async testRenderDeployment() {
    console.log('🚀 RENDER DEPLOYMENT TESTER');
    console.log('===========================');
    console.log(`🌐 Testing: ${this.baseUrl}\n`);

    // Test critical endpoints that were failing
    await this.testEndpoint('GET', '/health', 'Health Check', false);
    await this.testEndpoint('GET', '/api', 'API Info', false);
    await this.testEndpoint('GET', '/api/classes', 'Classes API (was 404)', true);
    await this.testEndpoint('GET', '/api/labs', 'Labs API (was 404)', true);
    await this.testEndpoint('GET', '/api/capacity', 'Capacity API (was 404)', true);
    await this.testEndpoint('GET', '/api/classes/e519c46b-7380-4ab4-9529-6bc258edbb8d/assignments', 'Class Assignments (was 404)', true);
    await this.testEndpoint('GET', '/api/labs/f202a2b2-08b0-41cf-8f97-c0160f247ad8', 'Lab Details (was 500)', true);
    await this.testEndpoint('GET', '/api/assignment-distributions', 'Assignment Distributions', true);

    this.printResults();
  }

  async testEndpoint(method, path, description, requiresAuth = false) {
    try {
      const result = await this.makeRequest(method, path, requiresAuth);
      
      // Check if response is valid JSON
      let isValidJson = false;
      let responseData = null;
      
      try {
        responseData = JSON.parse(result.data);
        isValidJson = true;
      } catch (e) {
        isValidJson = false;
      }
      
      if (result.statusCode >= 200 && result.statusCode < 300 && isValidJson) {
        this.logSuccess(`✅ ${description}: ${result.statusCode} - Valid JSON response`);
        this.results.passed++;
      } else if (result.statusCode === 401 && requiresAuth && isValidJson) {
        this.logSuccess(`✅ ${description}: ${result.statusCode} - Auth required (expected)`);
        this.results.passed++;
      } else if (!isValidJson) {
        this.logError(`❌ ${description}: ${result.statusCode} - Invalid JSON (HTML response)`);
        this.logError(`   Response preview: ${result.data.substring(0, 100)}...`);
        this.results.failed++;
      } else {
        this.logError(`❌ ${description}: ${result.statusCode} - ${result.data.substring(0, 100)}`);
        this.results.failed++;
      }
      
      this.results.tests.push({
        description,
        path,
        statusCode: result.statusCode,
        isValidJson,
        passed: (result.statusCode >= 200 && result.statusCode < 300 && isValidJson) || 
                (result.statusCode === 401 && requiresAuth && isValidJson)
      });
      
    } catch (error) {
      this.logError(`❌ ${description}: ${error.message}`);
      this.results.failed++;
      this.results.tests.push({
        description,
        path,
        error: error.message,
        passed: false
      });
    }
  }

  makeRequest(method, path, requiresAuth = false) {
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}${path}`;
      const isHttps = url.startsWith('https');
      const client = isHttps ? https : http;
      
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LabSyncPro-Render-Tester/1.0'
        }
      };

      // Add dummy auth token for testing auth endpoints
      if (requiresAuth) {
        options.headers['Authorization'] = 'Bearer dummy-token-for-testing';
      }

      const req = client.request(url, options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error('Request timeout (15s)'));
      });

      req.end();
    });
  }

  logSuccess(message) {
    console.log(message);
  }

  logError(message) {
    console.log(message);
  }

  printResults() {
    console.log('\n📊 Test Results Summary');
    console.log('========================');
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success Rate: ${Math.round((this.results.passed / (this.results.passed + this.results.failed)) * 100)}%`);
    
    if (this.results.failed > 0) {
      console.log('\n⚠️  Failed Tests:');
      this.results.tests
        .filter(test => !test.passed)
        .forEach(test => {
          console.log(`   • ${test.description} (${test.path})`);
          if (test.error) {
            console.log(`     Error: ${test.error}`);
          } else if (!test.isValidJson) {
            console.log(`     Issue: Returning HTML instead of JSON (likely 404 page)`);
          }
        });
        
      console.log('\n🔧 Troubleshooting:');
      console.log('   1. Check if Render deployment is complete');
      console.log('   2. Verify environment variables are set in Render dashboard');
      console.log('   3. Check Render deployment logs for errors');
      console.log('   4. Ensure latest code was deployed (commit 23ef6a9)');
    } else {
      console.log('\n🎉 All tests passed!');
      console.log('   ✅ Render deployment is working correctly');
      console.log('   ✅ All API endpoints return valid JSON');
      console.log('   ✅ No more 404 HTML responses');
      console.log('   ✅ Capacity planning should load properly');
    }
    
    console.log('\n📝 Next Steps:');
    if (this.results.failed === 0) {
      console.log('   • Your Render deployment is ready to use!');
      console.log('   • Test the frontend capacity planning page');
      console.log('   • Verify all lab and class data loads correctly');
    } else {
      console.log('   • Wait for Render deployment to complete');
      console.log('   • Check Render dashboard for deployment status');
      console.log('   • Re-run this test after deployment completes');
    }
  }
}

// Run the test
if (require.main === module) {
  const renderUrl = process.argv[2];
  
  if (!renderUrl) {
    console.error('❌ Please provide your Render URL');
    console.error('Usage: node test-render-deployment.js https://your-app.onrender.com');
    process.exit(1);
  }
  
  const tester = new RenderTester(renderUrl);
  tester.testRenderDeployment().catch(console.error);
}

module.exports = RenderTester;
