import * as http from "http";
import * as https from "https";

/**
 * Performance/Load Test Script
 *
 * Führt einfache Load-Tests für kritische Endpunkte durch.
 * Für umfangreichere Tests sollte ein Tool wie k6, Artillery oder Apache Bench verwendet werden.
 */

interface TestResult {
  endpoint: string;
  method: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  errors: string[];
}

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const CONCURRENT_REQUESTS = parseInt(
  process.env.CONCURRENT_REQUESTS || "10",
  10,
);
const TOTAL_REQUESTS = parseInt(process.env.TOTAL_REQUESTS || "100", 10);

function makeRequest(
  method: string,
  path: string,
  token?: string,
): Promise<{ status: number; time: number; error?: string }> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const url = new URL(path, BASE_URL);

    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    };

    // erzwinge https außer bei localhost
    if (
      url.protocol !== "https:" &&
      !["localhost", "127.0.0.1", "::1"].includes(url.hostname)
    ) {
      throw new Error("HTTPS erforderlich für Performance-Tests");
    }
    const client = url.protocol === "https:" ? https : http;
    const req = client.request(options, (res) => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        resolve({
          status: res.statusCode || 0,
          time: responseTime,
        });
      });
    });

    req.on("error", (error) => {
      const endTime = Date.now();
      resolve({
        status: 0,
        time: endTime - startTime,
        error: error.message,
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        status: 0,
        time: 10000,
        error: "Request timeout",
      });
    });

    req.end();
  });
}

async function runLoadTest(
  endpoint: string,
  method: string = "GET",
  token?: string,
): Promise<TestResult> {
  const results: Array<{ status: number; time: number; error?: string }> = [];
  const errors: string[] = [];

  console.log(`\n🧪 Testing ${method} ${endpoint}...`);
  console.log(
    `   Concurrent: ${CONCURRENT_REQUESTS}, Total: ${TOTAL_REQUESTS}`,
  );

  const batches = Math.ceil(TOTAL_REQUESTS / CONCURRENT_REQUESTS);

  for (let batch = 0; batch < batches; batch++) {
    const batchSize = Math.min(
      CONCURRENT_REQUESTS,
      TOTAL_REQUESTS - batch * CONCURRENT_REQUESTS,
    );
    const batchPromises: Promise<{
      status: number;
      time: number;
      error?: string;
    }>[] = [];

    for (let i = 0; i < batchSize; i++) {
      batchPromises.push(makeRequest(method, endpoint, token));
    }

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Progress indicator
    const progress = ((batch + 1) / batches) * 100;
    process.stdout.write(`\r   Progress: ${progress.toFixed(0)}%`);
  }

  console.log(""); // New line after progress

  const successful = results.filter((r) => r.status >= 200 && r.status < 300);
  const failed = results.filter(
    (r) => r.status < 200 || r.status >= 300 || r.error,
  );

  failed.forEach((r) => {
    if (r.error) {
      errors.push(r.error);
    } else if (r.status !== 0) {
      errors.push(`HTTP ${r.status}`);
    }
  });

  const responseTimes = results.map((r) => r.time);
  const averageTime =
    responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const minTime = Math.min(...responseTimes);
  const maxTime = Math.max(...responseTimes);

  return {
    endpoint,
    method,
    totalRequests: results.length,
    successfulRequests: successful.length,
    failedRequests: failed.length,
    averageResponseTime: averageTime,
    minResponseTime: minTime,
    maxResponseTime: maxTime,
    errors: [...new Set(errors)],
  };
}

async function runAllTests() {
  console.log("🚀 Starting Performance Tests");
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(
    `⚙️  Configuration: ${CONCURRENT_REQUESTS} concurrent, ${TOTAL_REQUESTS} total requests\n`,
  );

  const testResults: TestResult[] = [];

  // Public Endpoints (no auth required)
  const publicEndpoints = [
    { path: "/api/health", method: "GET" },
    { path: "/api/restaurants/public", method: "GET" },
    { path: "/api/social/live-orders?limit=10", method: "GET" },
    { path: "/api/social/trending?limit=10", method: "GET" },
    { path: "/api/gamification/achievements", method: "GET" },
    {
      path: "/api/gamification/leaderboard?type=level&limit=10",
      method: "GET",
    },
  ];

  for (const endpoint of publicEndpoints) {
    const result = await runLoadTest(endpoint.path, endpoint.method);
    testResults.push(result);
  }

  // Print Summary
  console.log("\n📊 Performance Test Summary\n");
  console.log("=".repeat(80));

  testResults.forEach((result) => {
    console.log(`\n${result.method} ${result.endpoint}`);
    console.log(
      `  ✅ Successful: ${result.successfulRequests}/${result.totalRequests} (${((result.successfulRequests / result.totalRequests) * 100).toFixed(1)}%)`,
    );
    console.log(
      `  ❌ Failed: ${result.failedRequests}/${result.totalRequests}`,
    );
    console.log(
      `  ⏱️  Response Time: avg=${result.averageResponseTime.toFixed(0)}ms, min=${result.minResponseTime}ms, max=${result.maxResponseTime}ms`,
    );
    if (result.errors.length > 0) {
      console.log(`  ⚠️  Errors: ${result.errors.join(", ")}`);
    }
  });

  console.log("\n" + "=".repeat(80));

  // Overall Statistics
  const totalSuccessful = testResults.reduce(
    (sum, r) => sum + r.successfulRequests,
    0,
  );
  const totalFailed = testResults.reduce((sum, r) => sum + r.failedRequests, 0);
  const totalRequests = testResults.reduce(
    (sum, r) => sum + r.totalRequests,
    0,
  );
  const avgResponseTime =
    testResults.reduce((sum, r) => sum + r.averageResponseTime, 0) /
    testResults.length;

  console.log("\n📈 Overall Statistics:");
  console.log(`  Total Requests: ${totalRequests}`);
  console.log(
    `  Successful: ${totalSuccessful} (${((totalSuccessful / totalRequests) * 100).toFixed(1)}%)`,
  );
  console.log(
    `  Failed: ${totalFailed} (${((totalFailed / totalRequests) * 100).toFixed(1)}%)`,
  );
  console.log(`  Average Response Time: ${avgResponseTime.toFixed(0)}ms`);

  // Performance Rating
  let rating = "🟢 EXCELLENT";
  if (avgResponseTime > 1000) rating = "🟡 GOOD";
  if (avgResponseTime > 2000) rating = "🟠 ACCEPTABLE";
  if (avgResponseTime > 5000) rating = "🔴 NEEDS IMPROVEMENT";

  const successRate = (totalSuccessful / totalRequests) * 100;
  if (successRate < 95) rating = "🔴 NEEDS IMPROVEMENT";
  if (successRate < 99 && avgResponseTime > 2000) rating = "🟠 ACCEPTABLE";

  console.log(`\n  Performance Rating: ${rating}`);
  console.log("\n");
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

export { runLoadTest, runAllTests };
