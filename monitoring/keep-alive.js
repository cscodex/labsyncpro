#!/usr/bin/env node

/**
 * Keep-Alive Monitor for Render Services
 * Pings your services every 10 minutes to prevent them from spinning down
 */

const https = require('https');

const SERVICES = [
  {
    name: 'Backend API',
    url: 'https://labsyncpro.onrender.com/health',
    expectedStatus: 200
  },
  {
    name: 'Frontend',
    url: 'https://labsyncpro-frontend.onrender.com',
    expectedStatus: 200
  }
];

const PING_INTERVAL = 10 * 60 * 1000; // 10 minutes

function pingService(service) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const req = https.get(service.url, (res) => {
      const responseTime = Date.now() - startTime;
      const timestamp = new Date().toISOString();
      
      if (res.statusCode === service.expectedStatus) {
        console.log(`✅ [${timestamp}] ${service.name}: OK (${responseTime}ms)`);
        resolve({ success: true, responseTime });
      } else {
        console.log(`⚠️ [${timestamp}] ${service.name}: Status ${res.statusCode} (${responseTime}ms)`);
        resolve({ success: false, statusCode: res.statusCode, responseTime });
      }
    });

    req.on('error', (error) => {
      const responseTime = Date.now() - startTime;
      const timestamp = new Date().toISOString();
      console.log(`❌ [${timestamp}] ${service.name}: Error - ${error.message} (${responseTime}ms)`);
      resolve({ success: false, error: error.message, responseTime });
    });

    req.setTimeout(30000, () => {
      req.destroy();
      const timestamp = new Date().toISOString();
      console.log(`⏰ [${timestamp}] ${service.name}: Timeout (30s)`);
      resolve({ success: false, error: 'Timeout', responseTime: 30000 });
    });
  });
}

async function pingAllServices() {
  console.log(`\n🔄 Pinging ${SERVICES.length} services...`);
  
  const results = await Promise.all(
    SERVICES.map(service => pingService(service))
  );
  
  const successful = results.filter(r => r.success).length;
  console.log(`📊 Summary: ${successful}/${SERVICES.length} services responding\n`);
  
  return results;
}

function startMonitoring() {
  console.log('🚀 Starting LabSyncPro Keep-Alive Monitor');
  console.log(`📡 Monitoring ${SERVICES.length} services every ${PING_INTERVAL / 60000} minutes`);
  console.log('🔗 Services:');
  SERVICES.forEach(service => {
    console.log(`   - ${service.name}: ${service.url}`);
  });
  console.log('\n' + '='.repeat(80));

  // Initial ping
  pingAllServices();

  // Set up interval
  setInterval(pingAllServices, PING_INTERVAL);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down monitor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down monitor...');
  process.exit(0);
});

// Start monitoring
if (require.main === module) {
  startMonitoring();
}

module.exports = { pingService, pingAllServices };
