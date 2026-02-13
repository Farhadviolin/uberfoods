#!/usr/bin/env node

/**
 * Node.js script to run E2E stability tests (10 consecutive runs)
 */

const { execSync } = require('child_process');
const path = require('path');

const runs = 10;
const testPattern = 'api-validation.spec.ts';

console.log(`🧪 Running E2E Stability Test: ${runs} consecutive runs`);
console.log(`📋 Test Pattern: ${testPattern}`);

let successCount = 0;
let totalTime = 0;

for (let i = 1; i <= runs; i++) {
    console.log(`\n🔄 Run ${i}/${runs} - Starting...`);

    const startTime = Date.now();

    try {
        // Run the specific test
        execSync(`npx playwright test ${testPattern} --reporter=line`, {
            stdio: 'inherit',
            cwd: path.dirname(__filename)
        });

        console.log(`✅ Run ${i}/${runs} - PASSED`);
        successCount++;
    } catch (error) {
        console.log(`❌ Run ${i}/${runs} - FAILED`);
        console.error('Output:', error.message);
    }

    const endTime = Date.now();
    const runTime = (endTime - startTime) / 1000;
    totalTime += runTime;

    console.log(`⏱️  Run ${i} took ${runTime.toFixed(2)} seconds`);
}

// Summary
const avgTime = totalTime / runs;
const successRate = (successCount / runs) * 100;

console.log(`\n📊 STABILITY TEST RESULTS:`);
console.log('═══════════════════════════════════════');
console.log(`✅ Successful runs: ${successCount}/${runs}`);
console.log(`📈 Success rate: ${successRate.toFixed(2)}%`);
console.log(`⏱️  Average time per run: ${avgTime.toFixed(2)} seconds`);
console.log(`⏱️  Total time: ${totalTime.toFixed(2)} seconds`);

if (successCount === runs) {
    console.log(`\n🎉 PERFECT STABILITY ACHIEVED! All ${runs} runs passed.`);
    process.exit(0);
} else if (successCount >= runs * 0.9) {
    console.log(`\n👍 HIGH STABILITY: ${successRate.toFixed(2)}% success rate`);
    process.exit(0);
} else {
    console.log(`\n💥 STABILITY ISSUES: Only ${successRate.toFixed(2)}% success rate`);
    process.exit(1);
}