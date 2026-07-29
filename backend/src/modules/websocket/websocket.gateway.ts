import { Injectable, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway as NestWebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import {
  createSocketCorsOptions,
  resolveCorsOrigins,
} from "../../common/config/cors.config";

type SocketRole = "admin" | "customer" | "driver" | "restaurant";

interface SocketTokenPayload {
  sub?: string;
  role?: string;
  type?: string;
}

interface SocketIdentity {
  id: string;
  role: SocketRole;
  primaryRoom: string;
}

type AuthenticatedSocket = Socket & { data: { identity?: SocketIdentity } };

@Injectable()
@NestWebSocketGateway({
  cors: createSocketCorsOptions(resolveCorsOrigins()),
  path: "/socket.io",
})
export class WebSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(WebSocketGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwtService: JwtService) {}

  afterInit(server: Server): void {
    server.use(async (client, next) => {
      const token = this.extractToken(client);
      if (!token) {
        return next(new Error("authentication required"));
      }

      try {
        const payload =
          await this.jwtService.verifyAsync<SocketTokenPayload>(token);
        const identity = this.toSocketIdentity(payload);
        if (!identity) {
          return next(new Error("authentication required"));
        }

        (client as AuthenticatedSocket).data.identity = identity;
        return next();
      } catch {
        return next(new Error("authentication required"));
      }
    });
  }

  handleConnection(client: AuthenticatedSocket): void {
    const identity = client.data.identity;
    if (!identity) {
      client.disconnect(true);
      return;
    }

    client.join(identity.primaryRoom);
    this.logger.debug(
      `Authenticated ${identity.role} socket connected: ${client.id}`,
    );
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage("join-room")
  joinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: string | { room?: string },
  ): { success: boolean; room?: string; error?: string } {
    const requestedRoom =
      typeof body === "string"
        ? body
        : typeof body?.room === "string"
          ? body.room
          : undefined;
    const identity = client.data.identity;

    if (identity && requestedRoom === identity.primaryRoom) {
      client.join(identity.primaryRoom);
      return { success: true, room: identity.primaryRoom };
    }

    return { success: false, error: "room access denied" };
  }

  async broadcastToRoom(
    room: string,
    event: string,
    payload: unknown,
  ): Promise<void> {
    this.server?.to(room).emit(event, payload);
  }

  async sendToUser(
    userId: string,
    event: string,
    payload: unknown,
  ): Promise<void> {
    this.server?.to(userId).emit(event, payload);
  }

  private extractToken(client: Socket): string | undefined {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === "string" && authToken.length > 0) {
      return authToken;
    }

    const authorization = client.handshake.headers.authorization;
    const bearerToken =
      typeof authorization === "string" && authorization.startsWith("Bearer ")
        ? authorization.slice("Bearer ".length)
        : undefined;

    return bearerToken || undefined;
  }

  private toSocketIdentity(
    payload: SocketTokenPayload,
  ): SocketIdentity | undefined {
    if (!payload.sub) {
      return undefined;
    }

    const role = String(payload.role ?? payload.type ?? "").toLowerCase();
    switch (role) {
      case "admin":
      case "super_admin":
        return { id: payload.sub, role: "admin", primaryRoom: "admin-room" };
      case "customer":
        return {
          id: payload.sub,
          role: "customer",
          primaryRoom: `customer_${payload.sub}`,
        };
      case "driver":
        return {
          id: payload.sub,
          role: "driver",
          primaryRoom: `driver_${payload.sub}`,
        };
      case "restaurant":
        return {
          id: payload.sub,
          role: "restaurant",
          primaryRoom: `restaurant_${payload.sub}`,
        };
      default:
        return undefined;
    }
  }
}
