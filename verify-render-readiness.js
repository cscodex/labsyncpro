#!/usr/bin/env node

/**
 * Verify LabSyncPro is ready for Render deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying LabSyncPro Render deployment readiness...\n');

const checks = [];

// Check 1: render.yaml exists and is valid
try {
  const renderYaml = fs.readFileSync('render.yaml', 'utf8');
  if (renderYaml.includes('labsyncpro-api') && renderYaml.includes('labsyncpro-frontend')) {
    checks.push({ name: 'render.yaml configuration', status: '✅', details: 'Valid configuration found' });
  } else {
    checks.push({ name: 'render.yaml configuration', status: '❌', details: 'Invalid configuration' });
  }
} catch (error) {
  checks.push({ name: 'render.yaml configuration', status: '❌', details: 'File not found' });
}

// Check 2: Server package.json has start script
try {
  const serverPackage = JSON.parse(fs.readFileSync('server/package.json', 'utf8'));
  if (serverPackage.scripts && serverPackage.scripts.start) {
    checks.push({ name: 'Server start script', status: '✅', details: `Command: ${serverPackage.scripts.start}` });
  } else {
    checks.push({ name: 'Server start script', status: '❌', details: 'No start script found' });
  }
} catch (error) {
  checks.push({ name: 'Server start script', status: '❌', details: 'server/package.json not found' });
}

// Check 3: Client package.json has build script
try {
  const clientPackage = JSON.parse(fs.readFileSync('client/package.json', 'utf8'));
  if (clientPackage.scripts && clientPackage.scripts.build) {
    checks.push({ name: 'Client build script', status: '✅', details: `Command: ${clientPackage.scripts.build}` });
  } else {
    checks.push({ name: 'Client build script', status: '❌', details: 'No build script found' });
  }
} catch (error) {
  checks.push({ name: 'Client build script', status: '❌', details: 'client/package.json not found' });
}

// Check 4: Server environment configuration
try {
  const serverEnv = fs.readFileSync('server/.env', 'utf8');
  const hasSupabase = serverEnv.includes('SUPABASE_URL') && serverEnv.includes('SUPABASE_SERVICE_ROLE_KEY');
  if (hasSupabase) {
    checks.push({ name: 'Supabase configuration', status: '✅', details: 'Supabase credentials found' });
  } else {
    checks.push({ name: 'Supabase configuration', status: '❌', details: 'Missing Supabase credentials' });
  }
} catch (error) {
  checks.push({ name: 'Supabase configuration', status: '⚠️', details: 'server/.env not found (will use render.yaml)' });
}

// Check 5: Client environment configuration
try {
  const clientEnv = fs.readFileSync('client/.env', 'utf8');
  const hasApiUrl = clientEnv.includes('VITE_API_URL');
  if (hasApiUrl) {
    checks.push({ name: 'Client API configuration', status: '✅', details: 'API URL configured' });
  } else {
    checks.push({ name: 'Client API configuration', status: '❌', details: 'Missing VITE_API_URL' });
  }
} catch (error) {
  checks.push({ name: 'Client API configuration', status: '⚠️', details: 'client/.env not found (will use render.yaml)' });
}

// Check 6: Server main file exists
const serverMainExists = fs.existsSync('server/index.js');
checks.push({ 
  name: 'Server main file', 
  status: serverMainExists ? '✅' : '❌', 
  details: serverMainExists ? 'server/index.js found' : 'server/index.js not found' 
});

// Check 7: Required dependencies
try {
  const serverPackage = JSON.parse(fs.readFileSync('server/package.json', 'utf8'));
  const hasSupabaseDep = serverPackage.dependencies && serverPackage.dependencies['@supabase/supabase-js'];
  const hasExpressDep = serverPackage.dependencies && serverPackage.dependencies['express'];
  
  if (hasSupabaseDep && hasExpressDep) {
    checks.push({ name: 'Server dependencies', status: '✅', details: 'Key dependencies found' });
  } else {
    checks.push({ name: 'Server dependencies', status: '❌', details: 'Missing key dependencies' });
  }
} catch (error) {
  checks.push({ name: 'Server dependencies', status: '❌', details: 'Cannot read server/package.json' });
}

// Display results
console.log('📋 Deployment Readiness Report:\n');
checks.forEach(check => {
  console.log(`${check.status} ${check.name}`);
  console.log(`   ${check.details}\n`);
});

// Summary
const passed = checks.filter(c => c.status === '✅').length;
const failed = checks.filter(c => c.status === '❌').length;
const warnings = checks.filter(c => c.status === '⚠️').length;

console.log('📊 Summary:');
console.log(`   ✅ Passed: ${passed}`);
console.log(`   ❌ Failed: ${failed}`);
console.log(`   ⚠️  Warnings: ${warnings}`);
console.log('');

if (failed === 0) {
  console.log('🎉 Your application is ready for Render deployment!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Push your code to GitHub');
  console.log('2. Go to Render dashboard');
  console.log('3. Create new Blueprint');
  console.log('4. Select your repository');
  console.log('5. Render will use render.yaml automatically');
  console.log('');
  console.log('📖 See deploy-to-render.md for detailed instructions');
} else {
  console.log('⚠️  Please fix the failed checks before deploying');
}
