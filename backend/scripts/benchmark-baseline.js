#!/usr/bin/env node

// Benchmark Baseline Management
// Establishes and manages performance baselines for regression detection

const fs = require('fs');
const path = require('path');

class BenchmarkBaselineManager {
  constructor() {
    this.baselinesDir = path.join(__dirname, '..', 'k6', 'baselines');
    this.baselinesFile = path.join(this.baselinesDir, 'baselines.json');
    this.ensureBaselinesDirectory();
  }

  ensureBaselinesDirectory() {
    if (!fs.existsSync(this.baselinesDir)) {
      fs.mkdirSync(this.baselinesDir, { recursive: true });
    }

    if (!fs.existsSync(this.baselinesFile)) {
      fs.writeFileSync(this.baselinesFile, JSON.stringify({
        created: new Date().toISOString(),
        version: '1.0.0',
        environments: {},
      }, null, 2));
    }
  }

  /**
   * Load existing baselines
   */
  loadBaselines() {
    try {
      const data = fs.readFileSync(this.baselinesFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load baselines:', error);
      return {
        created: new Date().toISOString(),
        version: '1.0.0',
        environments: {},
      };
    }
  }

  /**
   * Save baselines to disk
   */
  saveBaselines(baselines) {
    try {
      fs.writeFileSync(this.baselinesFile, JSON.stringify(baselines, null, 2));
      console.log('✅ Baselines saved successfully');
    } catch (error) {
      console.error('❌ Failed to save baselines:', error);
    }
  }

  /**
   * Establish baseline from current test results
   */
  establishBaseline(environment, results) {
    console.log(`🏗️ Establishing baseline for environment: ${environment}`);

    const baselines = this.loadBaselines();

    if (!baselines.environments[environment]) {
      baselines.environments[environment] = {};
    }

    // Extract key metrics for baseline
    const baselineData = {
      established: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      commit: process.env.GIT_COMMIT || 'unknown',
      metrics: {
        // Overall metrics
        avgResponseTime: results.overall?.avgResponseTime || 0,
        p95ResponseTime: results.overall?.p95ResponseTime || 0,
        p99ResponseTime: results.overall?.p99ResponseTime || 0,
        errorRate: results.overall?.errorRate || 0,
        throughput: results.overall?.throughput || 0,

        // Scenario-specific baselines
        scenarios: {},
      },
    };

    // Extract scenario baselines
    Object.entries(results.scenarios || {}).forEach(([scenarioName, scenario]) => {
      baselineData.metrics.scenarios[scenarioName] = {
        p50ResponseTime: scenario.p50ResponseTime || scenario.avgResponseTime || 0,
        p95ResponseTime: scenario.p95ResponseTime || 0,
        p99ResponseTime: scenario.p99ResponseTime || 0,
        errorRate: scenario.errorRate || 0,
        throughput: scenario.throughput || 0,
      };
    });

    baselines.environments[environment] = baselineData;
    this.saveBaselines(baselines);

    console.log(`✅ Baseline established for ${environment}`);
    console.log(`   P95 Response Time: ${baselineData.metrics.p95ResponseTime}ms`);
    console.log(`   Error Rate: ${baselineData.metrics.errorRate.toFixed(2)}%`);
    console.log(`   Throughput: ${baselineData.metrics.throughput.toFixed(1)} req/s`);

    return baselineData;
  }

  /**
   * Compare current results against baseline
   */
  compareAgainstBaseline(environment, currentResults) {
    console.log(`📊 Comparing results against baseline for ${environment}`);

    const baselines = this.loadBaselines();
    const baseline = baselines.environments[environment];

    if (!baseline) {
      console.warn(`⚠️ No baseline found for environment ${environment}`);
      console.log('💡 Run: npm run benchmark:baseline');
      return null;
    }

    const comparison = {
      environment,
      baselineDate: baseline.established,
      currentDate: new Date().toISOString(),
      regressions: [],
      improvements: [],
      summary: {
        status: 'unknown',
        score: 0,
      },
    };

    // Compare overall metrics
    const currentOverall = currentResults.overall || {};
    const baselineMetrics = baseline.metrics;

    // Response time comparisons (lower is better)
    this.compareMetric(
      comparison,
      'p95_response_time',
      currentOverall.p95ResponseTime || 0,
      baselineMetrics.p95ResponseTime,
      'ms',
      false, // lower is better
      1.1, // 10% degradation threshold
    );

    this.compareMetric(
      comparison,
      'p99_response_time',
      currentOverall.p99ResponseTime || 0,
      baselineMetrics.p99ResponseTime,
      'ms',
      false,
      1.15, // 15% degradation threshold
    );

    // Error rate comparison (lower is better)
    this.compareMetric(
      comparison,
      'error_rate',
      currentOverall.errorRate || 0,
      baselineMetrics.errorRate,
      '%',
      false,
      2.0, // 2x error rate threshold
    );

    // Throughput comparison (higher is better)
    this.compareMetric(
      comparison,
      'throughput',
      currentOverall.throughput || 0,
      baselineMetrics.throughput,
      'req/s',
      true, // higher is better
      0.9, // 10% degradation threshold
    );

    // Compare scenario-specific metrics
    Object.entries(currentResults.scenarios || {}).forEach(([scenarioName, currentScenario]) => {
      const baselineScenario = baselineMetrics.scenarios[scenarioName];

      if (baselineScenario) {
        this.compareMetric(
          comparison,
          `${scenarioName}_p95`,
          currentScenario.p95ResponseTime || 0,
          baselineScenario.p95ResponseTime,
          'ms',
          false,
          1.1,
        );
      }
    });

    // Calculate overall status
    const hasRegressions = comparison.regressions.length > 0;
    comparison.summary.status = hasRegressions ? 'failed' : 'passed';
    comparison.summary.score = Math.max(0, 100 - (comparison.regressions.length * 20));

    this.printComparisonResults(comparison);

    return comparison;
  }

  /**
   * Compare a single metric
   */
  compareMetric(comparison, name, current, baseline, unit, higherIsBetter, threshold) {
    const ratio = higherIsBetter ? current / baseline : baseline / current;
    const changePercent = ((current - baseline) / baseline * 100);

    const isRegression = higherIsBetter ? ratio < threshold : ratio > (1 / threshold);
    const isImprovement = higherIsBetter ? ratio > 1.05 : ratio < 0.95; // 5% improvement threshold

    const result = {
      metric: name,
      current: `${current}${unit}`,
      baseline: `${baseline}${unit}`,
      change: `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%`,
      status: isRegression ? 'regression' : isImprovement ? 'improvement' : 'stable',
    };

    if (isRegression) {
      comparison.regressions.push(result);
    } else if (isImprovement) {
      comparison.improvements.push(result);
    }
  }

  /**
   * Print comparison results
   */
  printComparisonResults(comparison) {
    console.log('\n📈 BASELINE COMPARISON RESULTS');
    console.log('='.repeat(40));
    console.log(`Environment: ${comparison.environment}`);
    console.log(`Baseline: ${comparison.baselineDate}`);
    console.log(`Current: ${comparison.currentDate}`);
    console.log(`Status: ${comparison.summary.status.toUpperCase()}`);
    console.log(`Score: ${comparison.summary.score}/100`);

    if (comparison.regressions.length > 0) {
      console.log('\n❌ REGRESSIONS DETECTED:');
      comparison.regressions.forEach(regression => {
        console.log(`   ${regression.metric}: ${regression.current} vs ${regression.baseline} (${regression.change})`);
      });
    }

    if (comparison.improvements.length > 0) {
      console.log('\n✅ IMPROVEMENTS DETECTED:');
      comparison.improvements.forEach(improvement => {
        console.log(`   ${improvement.metric}: ${improvement.current} vs ${improvement.baseline} (${improvement.change})`);
      });
    }

    if (comparison.regressions.length === 0 && comparison.improvements.length === 0) {
      console.log('\n📊 NO SIGNIFICANT CHANGES DETECTED');
    }

    console.log('='.repeat(40));
  }

  /**
   * List all available baselines
   */
  listBaselines() {
    const baselines = this.loadBaselines();

    console.log('📋 AVAILABLE BASELINES');
    console.log('='.repeat(40));

    Object.entries(baselines.environments).forEach(([env, data]) => {
      console.log(`Environment: ${env}`);
      console.log(`  Established: ${data.established}`);
      console.log(`  Version: ${data.version}`);
      console.log(`  P95 Response Time: ${data.metrics.p95ResponseTime}ms`);
      console.log(`  Error Rate: ${data.metrics.errorRate.toFixed(2)}%`);
      console.log(`  Throughput: ${data.metrics.throughput.toFixed(1)} req/s`);
      console.log('');
    });

    if (Object.keys(baselines.environments).length === 0) {
      console.log('No baselines established yet.');
      console.log('Run: npm run benchmark:baseline');
    }
  }

  /**
   * Clean up old baselines (keep only latest N versions per environment)
   */
  cleanupOldBaselines(keepVersions = 5) {
    const baselines = this.loadBaselines();
    let cleaned = 0;

    // This is a simplified version - in practice you'd implement versioned baselines
    // For now, just log that cleanup would happen

    console.log(`🧹 Baseline cleanup: would keep ${keepVersions} versions per environment`);
    console.log(`   (Feature not yet implemented - manual cleanup required)`);

    return cleaned;
  }
}

// CLI Interface
async function main() {
  const manager = new BenchmarkBaselineManager();
  const command = process.argv[2];
  const environment = process.argv[3] || 'development';
  const resultsFile = process.argv[4];

  switch (command) {
    case 'establish':
    case 'baseline':
      if (!resultsFile) {
        console.error('❌ Results file required for baseline establishment');
        console.log('Usage: npm run benchmark:baseline <environment> <results.json>');
        process.exit(1);
      }

      try {
        const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
        manager.establishBaseline(environment, results);
      } catch (error) {
        console.error('❌ Failed to establish baseline:', error.message);
        process.exit(1);
      }
      break;

    case 'compare':
    case 'regression':
      if (!resultsFile) {
        console.error('❌ Results file required for comparison');
        console.log('Usage: npm run benchmark:regression <environment> <results.json>');
        process.exit(1);
      }

      try {
        const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
        const comparison = manager.compareAgainstBaseline(environment, results);

        if (comparison && !comparison.summary.status === 'passed') {
          console.log('❌ Performance regression detected!');
          process.exit(1);
        }
      } catch (error) {
        console.error('❌ Failed to compare against baseline:', error.message);
        process.exit(1);
      }
      break;

    case 'list':
      manager.listBaselines();
      break;

    case 'cleanup':
      const keepVersions = parseInt(process.argv[3]) || 5;
      manager.cleanupOldBaselines(keepVersions);
      break;

    default:
      console.log('Benchmark Baseline Manager');
      console.log('==========================');
      console.log('');
      console.log('Commands:');
      console.log('  baseline <env> <results.json>  - Establish new baseline');
      console.log('  regression <env> <results.json> - Compare against baseline');
      console.log('  list                            - List all baselines');
      console.log('  cleanup [versions]             - Clean up old baselines');
      console.log('');
      console.log('Examples:');
      console.log('  npm run benchmark:baseline staging results.json');
      console.log('  npm run benchmark:regression production results.json');
      break;
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Benchmark baseline command failed:', error);
    process.exit(1);
  });
}

module.exports = { BenchmarkBaselineManager };