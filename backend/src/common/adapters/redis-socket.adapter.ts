import { IoAdapter } from "@nestjs/platform-socket.io";
import { ServerOptions, Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { INestApplication } from "@nestjs/common";
import { Logger } from "@nestjs/common";
import {
  createSocketAllowRequest,
  createSocketCorsOptions,
  resolveCorsOrigins,
} from "../config/cors.config";

export class RedisSocketAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisSocketAdapter.name);
  private redisAdapterEnabled = false;
  private pubClient?: ReturnType<typeof createClient>;
  private subClient?: ReturnType<typeof createClient>;
  private initialized = false;

  constructor(
    private app: INestApplication,
    private redisUrl?: string,
    private readonly corsOrigins = resolveCorsOrigins(),
  ) {
    super(app);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
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
      const pubClient = createClient({ url: this.redisUrl });
      const subClient = createClient({ url: this.redisUrl });
      pubClient.on("error", (error) =>
        this.logger.error("Redis pub client error", error),
      );
      subClient.on("error", (error) =>
        this.logger.error("Redis sub client error", error),
      );
      await Promise.all([pubClient.connect(), subClient.connect()]);
      await pubClient.ping();
      this.pubClient = pubClient;
      this.subClient = subClient;
      this.redisAdapterEnabled = true;
      this.logger.log("Redis adapter enabled and connection verified");
      this.logger.log("Redis publisher and subscriber ready");
    } catch (error) {
      this.logger.error(
        "Redis connection failed, falling back to local adapter",
        error,
      );
      this.redisAdapterEnabled = false;
    }
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    // Get the HTTP server from NestJS
    const httpServer = this.app.getHttpServer();

    const serverOptions: ServerOptions = {
      ...options,
      cors: createSocketCorsOptions(this.corsOrigins),
      allowRequest: createSocketAllowRequest(this.corsOrigins),
      transports: ["websocket", "polling"],
      allowEIO3: true,
      pingTimeout: 60000,
      pingInterval: 25000,
      path: "/socket.io/",
    };

    const server = super.createIOServer(httpServer, serverOptions);

    // Setup Redis adapter after initialize() completed before Nest app startup.
    if (this.redisAdapterEnabled && this.pubClient && this.subClient) {
      try {
        this.logger.log("Setting up Redis adapter for WebSocket scaling");
        server.adapter(createAdapter(this.pubClient, this.subClient));
        this.logger.log(
          "Redis adapter successfully configured for horizontal scaling",
        );

        // Cleanup on process exit
        const cleanup = async () => {
          this.logger.log("Cleaning up Redis connections");
          await Promise.allSettled([
            this.pubClient?.disconnect(),
            this.subClient?.disconnect(),
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
