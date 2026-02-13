import { IoAdapter } from "@nestjs/platform-socket.io";
import { ServerOptions, Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { INestApplication } from "@nestjs/common";
import { Logger } from "@nestjs/common";

export class RedisSocketAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisSocketAdapter.name);
  private redisAdapterEnabled = false;

  constructor(
    private app: INestApplication,
    private redisUrl?: string,
  ) {
    super(app);
    this.checkRedisAvailability();
  }

  private async checkRedisAvailability(): Promise<void> {
    if (!this.redisUrl) {
      this.redisUrl = process.env.REDIS_URL || process.env.REDIS_SOCKET_URL;
    }

    if (!this.redisUrl) {
      this.logger.warn(
        "Redis URL not configured, falling back to local adapter",
      );
      return;
    }

    try {
      // Test Redis connection
      const testClient = createClient({ url: this.redisUrl });
      await testClient.connect();
      await testClient.ping();
      await testClient.disconnect();

      this.redisAdapterEnabled = true;
      this.logger.log("Redis adapter enabled and connection verified");
    } catch (error) {
      this.logger.error(
        "Redis connection failed, falling back to local adapter",
        error,
      );
      this.redisAdapterEnabled = false;
    }
  }

  async createIOServer(port: number, options?: ServerOptions): Promise<Server> {
    const corsOrigins = [
      "http://localhost:3002", // Admin Panel
      "http://localhost:3001", // Customer Web
      "http://localhost:3003", // Restaurant Web
      "http://localhost:3004", // Driver App
      "http://localhost:5173", // Vite Default Port
    ];

    // Get the HTTP server from NestJS
    const httpServer = this.app.getHttpServer();

    const serverOptions: ServerOptions = {
      ...options,
      cors: {
        origin: (origin: any, callback: any) => {
          // In Development: Allow all origins
          if (process.env.NODE_ENV !== "production") {
            callback(null, true);
            return;
          }
          // In Production: Only allowed origins
          if (!origin || corsOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error("Not allowed by CORS"));
          }
        },
        methods: ["GET", "POST"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization"],
      },
      transports: ["websocket", "polling"],
      allowEIO3: true,
      pingTimeout: 60000,
      pingInterval: 25000,
      path: "/socket.io/",
    };

    const server = super.createIOServer(httpServer, serverOptions);

    // Setup Redis adapter if available
    if (this.redisAdapterEnabled && this.redisUrl) {
      try {
        this.logger.log("Setting up Redis adapter for WebSocket scaling");

        // Create Redis pub/sub clients
        const pubClient = createClient({ url: this.redisUrl });
        const subClient = createClient({ url: this.redisUrl });

        // Handle Redis connection events
        pubClient.on("error", (err) => {
          this.logger.error("Redis pub client error", err);
        });

        subClient.on("error", (err) => {
          this.logger.error("Redis sub client error", err);
        });

        pubClient.on("connect", () => {
          this.logger.log("Redis pub client connected");
        });

        subClient.on("connect", () => {
          this.logger.log("Redis sub client connected");
        });

        // Connect to Redis
        await Promise.all([pubClient.connect(), subClient.connect()]);

        // Create and set the Redis adapter
        const redisAdapter = createAdapter(pubClient, subClient);
        server.adapter(redisAdapter);

        this.logger.log(
          "Redis adapter successfully configured for horizontal scaling",
        );

        // Cleanup on process exit
        const cleanup = async () => {
          this.logger.log("Cleaning up Redis connections");
          await Promise.allSettled([
            pubClient.disconnect(),
            subClient.disconnect(),
          ]);
        };

        process.on("SIGINT", cleanup);
        process.on("SIGTERM", cleanup);
        process.on("exit", cleanup);
      } catch (error) {
        this.logger.error(
          "Failed to setup Redis adapter, falling back to local adapter",
          error,
        );
        this.logger.warn(
          "WebSocket horizontal scaling disabled. Running in single-instance mode.",
        );
        this.redisAdapterEnabled = false;

        // Emit health warning
        if (this.app) {
          // Could emit to monitoring service here
          this.logger.warn(
            "Redis Socket Adapter: Degraded mode - horizontal scaling unavailable",
          );
        }
      }
    } else {
      this.logger.log("Using local Socket.IO adapter (single instance mode)");
    }

    return server;
  }

  isRedisEnabled(): boolean {
    return this.redisAdapterEnabled;
  }
}
