import { io, Socket } from 'socket.io-client';
import { performance } from 'perf_hooks';

interface LoadTestConfig {
  targetConnections: number;
  rampUpTime: number; // seconds
  testDuration: number; // seconds
  messageInterval: number; // milliseconds between location updates per driver
  driverCount: number;
}

interface LoadTestResults {
  totalConnections: number;
  successfulConnections: number;
  failedConnections: number;
  avgConnectionTime: number;
  messagesSent: number;
  messagesReceived: number;
  avgLatency: number;
  errors: string[];
}

/**
 * WebSocket Load Testing Script
 * Tests horizontal scaling, rate limiting, and performance under load
 */
class WebSocketLoadTester {
  private results: LoadTestResults = {
    totalConnections: 0,
    successfulConnections: 0,
    failedConnections: 0,
    avgConnectionTime: 0,
    messagesSent: 0,
    messagesReceived: 0,
    avgLatency: 0,
    errors: [],
  };

  private connections: Socket[] = [];
  private connectionTimes: number[] = [];
  private messageLatencies: number[] = [];
  private startTime: number = 0;

  constructor(private config: LoadTestConfig, private serverUrl: string = 'http://localhost:3000') {}

  async runTest(): Promise<LoadTestResults> {
    console.log('🚀 Starting WebSocket Load Test...');
    console.log(`Target: ${this.config.targetConnections} connections`);
    console.log(`Duration: ${this.config.testDuration}s`);
    console.log(`Drivers: ${this.config.driverCount}`);

    this.startTime = performance.now();

    try {
      await this.rampUpConnections();
      await this.runMessageLoad();
      await this.cleanup();

      this.calculateResults();
      this.printResults();

      return this.results;
    } catch (error) {
      console.error('❌ Load test failed:', error);
      throw error;
    }
  }

  private async rampUpConnections(): Promise<void> {
    console.log('\n📈 Ramping up connections...');

    const connectionsPerSecond = this.config.targetConnections / this.config.rampUpTime;
    const delayBetweenConnections = 1000 / connectionsPerSecond;

    for (let i = 0; i < this.config.targetConnections; i++) {
      const connectionStart = performance.now();

      try {
        const socket = await this.createConnection(i);
        this.connections.push(socket);
        this.results.successfulConnections++;

        const connectionTime = performance.now() - connectionStart;
        this.connectionTimes.push(connectionTime);

        if ((i + 1) % 100 === 0) {
          console.log(`  Connected ${i + 1}/${this.config.targetConnections} clients`);
        }
      } catch (error) {
        this.results.failedConnections++;
        this.results.errors.push(`Connection ${i} failed: ${error}`);
        console.log(`  ❌ Connection ${i} failed: ${error}`);
      }

      // Delay between connections to respect ramp-up time
      await this.delay(delayBetweenConnections);
    }

    console.log(`✅ Connected ${this.results.successfulConnections}/${this.config.targetConnections} clients`);
  }

  private createConnection(clientId: number): Promise<Socket> {
    return new Promise((resolve, reject) => {
      const isDriver = clientId < this.config.driverCount;
      const userType = isDriver ? 'driver' : 'customer';
      const userId = `${userType}_${clientId}`;

      const socket = io(this.serverUrl, {
        auth: {
          token: this.generateTestToken(userId, userType),
        },
        timeout: 5000,
      });

      const timeout = setTimeout(() => {
        socket.disconnect();
        reject(new Error('Connection timeout'));
      }, 5000);

      socket.on('connect', () => {
        clearTimeout(timeout);

        if (isDriver) {
          // Join driver-specific rooms
          socket.emit('join-room', `driver-${userId}`);
        }

        resolve(socket);
      });

      socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private async runMessageLoad(): Promise<void> {
    console.log('\n💬 Running message load test...');

    const driverSockets = this.connections.slice(0, this.config.driverCount);
    const testEndTime = Date.now() + (this.config.testDuration * 1000);

    // Start location updates for drivers
    const locationPromises = driverSockets.map((socket, index) =>
      this.simulateDriverLocationUpdates(socket, index, testEndTime)
    );

    // Wait for test duration
    await Promise.all(locationPromises);

    console.log(`✅ Sent ${this.results.messagesSent} location updates`);
  }

  private async simulateDriverLocationUpdates(
    socket: Socket,
    driverIndex: number,
    endTime: number
  ): Promise<void> {
    const driverId = `driver_${driverIndex}`;
    let sequence = 0;

    while (Date.now() < endTime) {
      const messageStart = performance.now();

      // Generate realistic location update
      const location = {
        latitude: 48.2082 + (Math.random() - 0.5) * 0.01, // Vienna area
        longitude: 16.3738 + (Math.random() - 0.5) * 0.01,
      };

      socket.emit('update_location', location);
      this.results.messagesSent++;

      // Wait for next update interval
      await this.delay(this.config.messageInterval);

      sequence++;
    }
  }

  private async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up connections...');

    await Promise.all(
      this.connections.map(socket =>
        new Promise<void>((resolve) => {
          socket.disconnect();
          resolve();
        })
      )
    );

    this.connections = [];
    console.log('✅ Cleanup complete');
  }

  private calculateResults(): void {
    // Calculate average connection time
    if (this.connectionTimes.length > 0) {
      this.results.avgConnectionTime =
        this.connectionTimes.reduce((sum, time) => sum + time, 0) / this.connectionTimes.length;
    }

    // Calculate average message latency
    if (this.messageLatencies.length > 0) {
      this.results.avgLatency =
        this.messageLatencies.reduce((sum, latency) => sum + latency, 0) / this.messageLatencies.length;
    }

    this.results.totalConnections = this.config.targetConnections;
  }

  private printResults(): void {
    console.log('\n📊 Load Test Results:');
    console.log(`  Connections: ${this.results.successfulConnections}/${this.results.totalConnections} (${Math.round((this.results.successfulConnections / this.results.totalConnections) * 100)}%)`);
    console.log(`  Avg Connection Time: ${Math.round(this.results.avgConnectionTime)}ms`);
    console.log(`  Messages Sent: ${this.results.messagesSent}`);
    console.log(`  Messages Received: ${this.results.messagesReceived}`);
    console.log(`  Avg Latency: ${Math.round(this.results.avgLatency)}ms`);
    console.log(`  Errors: ${this.results.errors.length}`);

    if (this.results.errors.length > 0) {
      console.log('\n❌ Sample Errors:');
      this.results.errors.slice(0, 5).forEach(error => console.log(`  ${error}`));
    }

    // Performance assessment
    const successRate = (this.results.successfulConnections / this.results.totalConnections) * 100;
    const avgLatency = this.results.avgLatency;

    console.log('\n🏆 Performance Assessment:');
    if (successRate >= 95) {
      console.log('  ✅ Connection Success Rate: EXCELLENT');
    } else if (successRate >= 90) {
      console.log('  ⚠️ Connection Success Rate: GOOD');
    } else {
      console.log('  ❌ Connection Success Rate: POOR');
    }

    if (avgLatency <= 100) {
      console.log('  ✅ Average Latency: EXCELLENT');
    } else if (avgLatency <= 500) {
      console.log('  ⚠️ Average Latency: ACCEPTABLE');
    } else {
      console.log('  ❌ Average Latency: POOR');
    }
  }

  private generateTestToken(userId: string, userType: string): string {
    // Generate a mock JWT for testing
    // In production, you'd generate proper JWTs
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      sub: userId,
      type: userType,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    })).toString('base64url');
    const signature = Buffer.from('test-signature').toString('base64url');

    return `${header}.${payload}.${signature}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI Runner
async function main() {
  const config: LoadTestConfig = {
    targetConnections: parseInt(process.env.WS_LOAD_CONNECTIONS || '100'),
    rampUpTime: parseInt(process.env.WS_LOAD_RAMP_TIME || '30'),
    testDuration: parseInt(process.env.WS_LOAD_DURATION || '60'),
    messageInterval: parseInt(process.env.WS_LOAD_MESSAGE_INTERVAL || '1000'),
    driverCount: parseInt(process.env.WS_LOAD_DRIVER_COUNT || '20'),
  };

  const serverUrl = process.env.WS_SERVER_URL || 'http://localhost:3000';

  console.log('WebSocket Load Test Configuration:');
  console.log(`  Server: ${serverUrl}`);
  console.log(`  Connections: ${config.targetConnections}`);
  console.log(`  Ramp-up time: ${config.rampUpTime}s`);
  console.log(`  Test duration: ${config.testDuration}s`);
  console.log(`  Drivers: ${config.driverCount}`);
  console.log(`  Message interval: ${config.messageInterval}ms\n`);

  const tester = new WebSocketLoadTester(config, serverUrl);

  try {
    const results = await tester.runTest();
    process.exit(results.successfulConnections === config.targetConnections ? 0 : 1);
  } catch (error) {
    console.error('Load test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { WebSocketLoadTester, LoadTestConfig, LoadTestResults };