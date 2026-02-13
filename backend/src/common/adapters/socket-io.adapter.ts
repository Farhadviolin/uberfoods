import { IoAdapter } from "@nestjs/platform-socket.io";
import { ServerOptions } from "socket.io";
import { INestApplication } from "@nestjs/common";

export class SocketIOAdapter extends IoAdapter {
  constructor(private app: INestApplication) {
    super(app);
  }

  createIOServer(_port: number, options?: ServerOptions): any {
    const corsOrigins = [
      "http://localhost:3002", // Admin Panel
      "http://localhost:3001", // Customer Web
      "http://localhost:3003", // Restaurant Web
      "http://localhost:3004", // Driver App
      "http://localhost:5173", // Vite Default Port
    ];

    // Wichtig: Verwende den HTTP-Server von NestJS statt einen neuen Port zu erstellen
    const httpServer = this.app.getHttpServer();

    const server = super.createIOServer(httpServer, {
      ...options,
      cors: {
        origin: (origin: any, callback: any) => {
          // In Development: Erlaube alle Origins
          if (process.env.NODE_ENV !== "production") {
            callback(null, true);
            return;
          }
          // In Production: Nur erlaubte Origins
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
    });

    return server;
  }
}
