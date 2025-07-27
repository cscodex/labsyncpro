#!/usr/bin/env node

/**
 * Deployment Verification Script
 * 
 * This script helps verify that the deployment is working correctly
 * by testing key API endpoints and environment variables.
 * 
 * Usage: node verify-deployment.js [base-url]
 * Example: node verify-deployment.js https://your-app.onrender.com
 */

const https = require('https');
const http = require('http');

class DeploymentVerifier {
  constructor(baseUrl = 'http://localhost:5002') {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async verify() {
    console.log('🔍 LabSyncPro Deployment Verification');
    console.log('=====================================');
    console.log(`🌐 Testing: ${this.baseUrl}\n`);

    // Test basic endpoints
    await this.testEndpoint('GET', '/health', 'Health Check');
    await this.testEndpoint('GET', '/api/classes', 'Classes API', true);
    await this.testEndpoint('GET', '/api/labs', 'Labs API', true);
    await this.testEndpoint('GET', '/api/classes/e519c46b-7380-4ab4-9529-6bc258edbb8d/assignments', 'Class Assignments API', true);
    await this.testEndpoint('GET', '/api/labs/f202a2b2-08b0-41cf-8f97-c0160f247ad8', 'Lab Details API', true);
    await this.testEndpoint('GET', '/api/assignment-distributions', 'Assignment Distributions API', true);

    this.printSummary();
  }

  async testEndpoint(method, path, description, requiresAuth = false) {
    try {
      const result = await this.makeRequest(method, path, requiresAuth);
      
      if (result.statusCode >= 200 && result.statusCode < 300) {
        this.logSuccess(`✅ ${description}: ${result.statusCode}`);
        this.results.passed++;
      } else if (result.statusCode === 401 && requiresAuth) {
        this.logSuccess(`✅ ${description}: ${result.statusCode} (Auth required - expected)`);
        this.results.passed++;
      } else {
        this.logError(`❌ ${description}: ${result.statusCode} - ${result.data}`);
        this.results.failed++;
      }
      
      this.results.tests.push({
        description,
        path,
        statusCode: result.statusCode,
        passed: result.statusCode >= 200 && result.statusCode < 300 || (result.statusCode === 401 && requiresAuth)
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
          'User-Agent': 'LabSyncPro-Deployment-Verifier/1.0'
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
            data: data.substring(0, 200) // Limit data for logging
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
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

  printSummary() {
    console.log('\n📊 Verification Summary');
    console.log('=======================');
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
          }
        });
    }

    console.log('\n🔧 Troubleshooting Tips:');
    console.log('   • Check Render deployment logs for errors');
    console.log('   • Verify environment variables are set correctly');
    console.log('   • Ensure Supabase credentials are valid');
    console.log('   • Check if the deployment is still in progress');
    
    if (this.results.failed === 0) {
      console.log('\n🎉 All tests passed! Deployment looks good.');
    } else {
      console.log('\n⚠️  Some tests failed. Check the issues above.');
      process.exit(1);
    }
  }
}

// Run verification
if (require.main === module) {
  const baseUrl = process.argv[2] || 'http://localhost:5002';
  const verifier = new DeploymentVerifier(baseUrl);
  verifier.verify().catch(console.error);
}

module.exports = DeploymentVerifier;
