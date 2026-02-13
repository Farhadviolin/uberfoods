import * as http from "http";
import * as https from "https";

/**
 * Performance/Load Test für neue Features
 * Testet Security, Monitoring und Search Endpoints unter Last
 */

const BASE_URL = process.env.API_URL || "http://localhost:3000";
const AUTH_TOKEN = process.env.AUTH_TOKEN || "";

interface TestResult {
  endpoint: string;
  totalRequests: number;
  successful: number;
  failed: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  errorRate: number;
}

async function makeRequest(
  path: string,
  method: string = "GET",
  body?: any,
): Promise<{ status: number; time: number; error?: string }> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);
    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(AUTH_TOKEN && { Authorization: `Bearer ${AUTH_TOKEN}` }),
      },
    };

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

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function runLoadTest(
  endpoint: string,
  method: string = "GET",
  body?: any,
  concurrency: number = 10,
  requests: number = 100,
): Promise<TestResult> {
  const results: Array<{ status: number; time: number; error?: string }> = [];

  console.log(
    `\n🧪 Testing ${method} ${endpoint} (${requests} requests, ${concurrency} concurrent)`,
  );

  const batches = Math.ceil(requests / concurrency);

  for (let batch = 0; batch < batches; batch++) {
    const batchPromises: Promise<any>[] = [];
    const batchSize = Math.min(concurrency, requests - batch * concurrency);

    for (let i = 0; i < batchSize; i++) {
      batchPromises.push(makeRequest(endpoint, method, body));
    }

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Progress indicator
    if ((batch + 1) % 10 === 0) {
      process.stdout.write(".");
    }
  }

  const successful = results.filter(
    (r) => r.status >= 200 && r.status < 300,
  ).length;
  const failed = results.length - successful;
  const times = results.map((r) => r.time);
  const avgResponseTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minResponseTime = Math.min(...times);
  const maxResponseTime = Math.max(...times);
  const errorRate = (failed / results.length) * 100;

  return {
    endpoint,
    totalRequests: results.length,
    successful,
    failed,
    avgResponseTime: Math.round(avgResponseTime),
    minResponseTime,
    maxResponseTime,
    errorRate: Math.round(errorRate * 100) / 100,
  };
}

async function runAllTests() {
  console.log("🚀 Starting Performance Tests for New Features\n");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(
    `Auth Token: ${AUTH_TOKEN ? "Provided" : "Not provided (some tests may fail)"}\n`,
  );

  const tests: Array<{ endpoint: string; method: string; body?: any }> = [
    // Security Endpoints
    { endpoint: "/api/security/ip/blacklist", method: "GET" },
    { endpoint: "/api/security/analytics", method: "GET" },

    // Monitoring Endpoints
    { endpoint: "/api/monitoring/health", method: "GET" },
    { endpoint: "/api/monitoring/performance", method: "GET" },
    { endpoint: "/api/monitoring/dashboard", method: "GET" },
    { endpoint: "/api/monitoring/alerts", method: "GET" },

    // Search Endpoints
    { endpoint: "/api/search/autocomplete?q=pizza", method: "GET" },
    { endpoint: "/api/search/popular", method: "GET" },
    { endpoint: "/api/search/suggestions?q=pizza", method: "GET" },
  ];

  const results: TestResult[] = [];

  for (const test of tests) {
    const result = await runLoadTest(
      test.endpoint,
      test.method,
      test.body,
      10, // concurrency
      50, // requests per endpoint
    );
    results.push(result);

    // Small delay between tests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Print Summary
  console.log("\n\n📊 Performance Test Results\n");
  console.log("=".repeat(100));
  console.log(
    "Endpoint".padEnd(50) +
      "Requests".padEnd(12) +
      "Success".padEnd(10) +
      "Failed".padEnd(10) +
      "Avg(ms)".padEnd(10) +
      "Error%".padEnd(8),
  );
  console.log("=".repeat(100));

  results.forEach((result) => {
    const status =
      result.errorRate < 5 ? "✅" : result.errorRate < 20 ? "⚠️" : "❌";
    console.log(
      `${status} ${result.endpoint.substring(0, 48).padEnd(48)}` +
        `${result.totalRequests.toString().padEnd(12)}` +
        `${result.successful.toString().padEnd(10)}` +
        `${result.failed.toString().padEnd(10)}` +
        `${result.avgResponseTime.toString().padEnd(10)}` +
        `${result.errorRate.toFixed(1)}%`.padEnd(8),
    );
  });

  console.log("=".repeat(100));

  const totalRequests = results.reduce((sum, r) => sum + r.totalRequests, 0);
  const totalSuccessful = results.reduce((sum, r) => sum + r.successful, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
  const avgResponseTime =
    results.reduce((sum, r) => sum + r.avgResponseTime, 0) / results.length;

  console.log("\n📈 Summary:");
  console.log(`Total Requests: ${totalRequests}`);
  console.log(
    `Successful: ${totalSuccessful} (${((totalSuccessful / totalRequests) * 100).toFixed(1)}%)`,
  );
  console.log(
    `Failed: ${totalFailed} (${((totalFailed / totalRequests) * 100).toFixed(1)}%)`,
  );
  console.log(`Average Response Time: ${Math.round(avgResponseTime)}ms`);

  // Performance thresholds
  const performanceThreshold = 500; // ms
  const slowEndpoints = results.filter(
    (r) => r.avgResponseTime > performanceThreshold,
  );

  if (slowEndpoints.length > 0) {
    console.log(`\n⚠️  Slow Endpoints (>${performanceThreshold}ms):`);
    slowEndpoints.forEach((r) => {
      console.log(`  - ${r.endpoint}: ${r.avgResponseTime}ms`);
    });
  }

  console.log("\n✅ Performance tests completed!\n");
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

export { runAllTests, runLoadTest };
