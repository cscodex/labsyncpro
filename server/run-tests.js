#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function runTests() {
  const args = process.argv.slice(2);
  const testType = args[0] || 'all';

  log('🧪 LabSyncPro Test Suite', 'cyan');
  log('========================', 'cyan');

  try {
    switch (testType) {
      case 'all':
        log('Running all tests...', 'blue');
        await runCommand('npm', ['test']);
        break;

      case 'coverage':
        log('Running tests with coverage...', 'blue');
        await runCommand('npm', ['run', 'test:coverage']);
        break;

      case 'watch':
        log('Running tests in watch mode...', 'blue');
        await runCommand('npm', ['run', 'test:watch']);
        break;

      case 'auth':
        log('Running authentication tests...', 'blue');
        await runCommand('npm', ['run', 'test:auth']);
        break;

      case 'dashboard':
        log('Running dashboard tests...', 'blue');
        await runCommand('npm', ['run', 'test:dashboard']);
        break;

      case 'labs':
        log('Running lab management tests...', 'blue');
        await runCommand('npm', ['run', 'test:labs']);
        break;

      case 'capacity':
        log('Running capacity management tests...', 'blue');
        await runCommand('npm', ['run', 'test:capacity']);
        break;

      case 'classes':
        log('Running classes tests...', 'blue');
        await runCommand('npm', ['run', 'test:classes']);
        break;

      case 'verbose':
        log('Running tests in verbose mode...', 'blue');
        await runCommand('npm', ['run', 'test:verbose']);
        break;

      case 'help':
        showHelp();
        return;

      default:
        log(`Unknown test type: ${testType}`, 'red');
        showHelp();
        process.exit(1);
    }

    log('✅ Tests completed successfully!', 'green');

  } catch (error) {
    log('❌ Tests failed!', 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

function showHelp() {
  log('Usage: node run-tests.js [test-type]', 'yellow');
  log('', 'reset');
  log('Available test types:', 'yellow');
  log('  all        - Run all tests (default)', 'reset');
  log('  coverage   - Run tests with coverage report', 'reset');
  log('  watch      - Run tests in watch mode', 'reset');
  log('  auth       - Run authentication tests only', 'reset');
  log('  dashboard  - Run dashboard tests only', 'reset');
  log('  labs       - Run lab management tests only', 'reset');
  log('  capacity   - Run capacity management tests only', 'reset');
  log('  classes    - Run classes tests only', 'reset');
  log('  verbose    - Run tests with verbose output', 'reset');
  log('  help       - Show this help message', 'reset');
  log('', 'reset');
  log('Examples:', 'yellow');
  log('  node run-tests.js', 'reset');
  log('  node run-tests.js coverage', 'reset');
  log('  node run-tests.js auth', 'reset');
  log('  node run-tests.js watch', 'reset');
}

// Run the tests
runTests();
