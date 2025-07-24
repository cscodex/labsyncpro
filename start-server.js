const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting LabSyncPro server...');

// Kill any existing processes on port 5002
const killProcess = spawn('lsof', ['-ti:5002']);
killProcess.stdout.on('data', (data) => {
  const pids = data.toString().trim().split('\n');
  pids.forEach(pid => {
    if (pid) {
      console.log(`🛑 Killing process ${pid}`);
      spawn('kill', ['-9', pid]);
    }
  });
});

// Start the server after a short delay
setTimeout(() => {
  console.log('📦 Installing dependencies...');
  const install = spawn('npm', ['install'], { 
    cwd: path.join(__dirname, 'server'),
    stdio: 'inherit'
  });
  
  install.on('close', (code) => {
    if (code === 0) {
      console.log('🚀 Starting server...');
      const server = spawn('npm', ['run', 'dev'], { 
        cwd: path.join(__dirname, 'server'),
        stdio: 'inherit'
      });
      
      server.on('error', (err) => {
        console.error('❌ Server error:', err);
      });
    } else {
      console.error('❌ Failed to install dependencies');
    }
  });
}, 2000);
