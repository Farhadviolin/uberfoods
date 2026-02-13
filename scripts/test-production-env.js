const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing Production ENV Validation...\n');

// Test 1: Production start without JWT_SECRET should fail (always required)
console.log('Test 1: Production start without JWT_SECRET (always required - should fail)');

const env1 = {
  ...process.env,
  NODE_ENV: 'production',
  // JWT_SECRET intentionally missing
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  ALLOWED_ORIGINS: 'https://test.com',
};

const child1 = spawn('node', ['dist/main.js'], {
  cwd: path.join(__dirname, '..', 'backend'),
  env: env1,
  stdio: 'pipe'
});

let output1 = '';
child1.stdout.on('data', (data) => { output1 += data.toString(); });
child1.stderr.on('data', (data) => { output1 += data.toString(); });

child1.on('close', (code) => {
  if (code !== 0 && output1.includes('JWT_SECRET')) {
    console.log('✅ PASS: Production start failed without JWT_SECRET (always required)');
    console.log(`   Exit code: ${code}`);
    console.log(`   Error: ${output1.split('\n').find(line => line.includes('JWT_SECRET'))}\n`);
    runTest2();
  } else {
    console.log('❌ FAIL: Expected failure without JWT_SECRET');
    console.log(`   Exit code: ${code}`);
    console.log(`   Output: ${output1}\n`);
    process.exit(1);
  }
});

// Test 2: Production start without ALLOWED_ORIGINS (production-only requirement - should fail)
function runTest2() {
  console.log('Test 2: Production start without ALLOWED_ORIGINS (production-only - should fail)');

  const env2 = {
    ...process.env,
    NODE_ENV: 'production',
    JWT_SECRET: 'test-jwt-secret',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    // ALLOWED_ORIGINS intentionally missing
  };

  const child2 = spawn('node', ['dist/main.js'], {
    cwd: path.join(__dirname, '..', 'backend'),
    env: env2,
    stdio: 'pipe'
  });

  let output2 = '';
  child2.stdout.on('data', (data) => { output2 += data.toString(); });
  child2.stderr.on('data', (data) => { output2 += data.toString(); });

  child2.on('close', (code) => {
    if (code !== 0 && output2.includes('ALLOWED_ORIGINS')) {
      console.log('✅ PASS: Production start failed without ALLOWED_ORIGINS (production-only requirement)');
      console.log(`   Exit code: ${code}`);
      console.log(`   Error: ${output2.split('\n').find(line => line.includes('ALLOWED_ORIGINS'))}\n`);
      runTest3();
    } else {
      console.log('❌ FAIL: Expected failure without ALLOWED_ORIGINS');
      console.log(`   Exit code: ${code}`);
      console.log(`   Output: ${output2}\n`);
      process.exit(1);
    }
  });
}

// Test 3: Development start without ALLOWED_ORIGINS should warn but succeed
function runTest3() {
  console.log('Test 3: Development start without ALLOWED_ORIGINS (should warn but succeed)');

  const env3 = {
    ...process.env,
    NODE_ENV: 'development',
    JWT_SECRET: 'test-jwt-secret',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    // ALLOWED_ORIGINS intentionally missing
  };

  const child3 = spawn('node', ['dist/main.js'], {
    cwd: path.join(__dirname, '..', 'backend'),
    env: env3,
    stdio: 'pipe',
    timeout: 5000
  });

  let output3 = '';
  child3.stdout.on('data', (data) => { output3 += data.toString(); });
  child3.stderr.on('data', (data) => { output3 += data.toString(); });

  // Kill after 3 seconds to avoid hanging
  setTimeout(() => {
    child3.kill('SIGTERM');
  }, 3000);

  child3.on('close', (code) => {
    if (output3.includes('Missing required environment variables') && output3.includes('ALLOWED_ORIGINS')) {
      console.log('✅ PASS: Development warned about missing ALLOWED_ORIGINS');
      console.log(`   Warning: ${output3.split('\n').find(line => line.includes('ALLOWED_ORIGINS'))}\n`);
      console.log('🎉 All Production ENV validation tests completed!');
      process.exit(0);
    } else {
      console.log('❌ FAIL: Expected warning about missing ALLOWED_ORIGINS in development');
      console.log(`   Output: ${output3}\n`);
      process.exit(1);
    }
  });
}
