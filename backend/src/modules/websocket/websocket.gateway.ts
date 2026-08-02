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
import { PrismaService } from "../../prisma/prisma.service";
import {
  createSocketCorsOptions,
  resolveCorsOrigins,
} from "../../common/config/cors.config";

type SocketRole = "admin" | "customer" | "driver" | "restaurant";

interface SocketTokenPayload {
  sub?: string;
  role?: string;
  type?: string;
  sessionId?: string;
}

interface SocketIdentity {
  id: string;
  role: SocketRole;
  primaryRoom: string;
  sessionId?: string;
}

type AuthenticatedSocket = Socket & { data: { identity?: SocketIdentity } };

const SOCKET_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const TRACKING_STATUSES = new Set([
  "ACCEPTED",
  "PICKED_UP",
  "IN_TRANSIT",
  "DELIVERING",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(server: Server): void {
    server.use(async (client, next) => {
      const token = this.extractToken(client);
      if (!token) {
        return next(new Error("authentication required"));
      }

      try {
        const payload =
          await this.jwtService.verifyAsync<SocketTokenPayload>(token);
        const identity = await this.toSocketIdentity(payload);
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
  async joinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: unknown,
  ): Promise<{ success: boolean; room?: string; error?: string }> {
    const requestedRoom =
      typeof body === "string"
        ? body
        : isRecord(body) && typeof body.room === "string"
          ? body.room
          : undefined;
    const identity = await this.getActiveIdentity(client);

    if (identity && requestedRoom === identity.primaryRoom) {
      client.join(identity.primaryRoom);
      return { success: true, room: identity.primaryRoom };
    }

    if (identity && requestedRoom?.startsWith("order_")) {
      return this.joinOrderRoom(client, requestedRoom.slice("order_".length));
    }

    return { success: false, error: "room access denied" };
  }

  @SubscribeMessage("join-order")
  async joinOrder(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: unknown,
  ): Promise<{ success: boolean; room?: string; error?: string }> {
    return this.joinOrderRoom(client, this.extractOrderId(body));
  }

  @SubscribeMessage("join_order")
  async joinOrderLegacy(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: unknown,
  ): Promise<{ success: boolean; room?: string; error?: string }> {
    return this.joinOrderRoom(client, this.extractOrderId(body));
  }

  @SubscribeMessage("leave-room")
  async leaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: unknown,
  ): Promise<{ success: boolean; room?: string; error?: string }> {
    const room =
      typeof body === "string"
        ? body
        : isRecord(body) && typeof body.room === "string"
          ? body.room
          : undefined;
    const identity = await this.getActiveIdentity(client);
    if (!identity || !room || !this.isAllowedRoomName(room)) {
      return { success: false, error: "room access denied" };
    }

    if (room === identity.primaryRoom || room.startsWith("order_")) {
      client.leave(room);
      return { success: true, room };
    }

    return { success: false, error: "room access denied" };
  }

  @SubscribeMessage("leave-order")
  async leaveOrder(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: unknown,
  ): Promise<{ success: boolean; room?: string; error?: string }> {
    return this.leaveOrderRoom(client, this.extractOrderId(body));
  }

  @SubscribeMessage("leave_order")
  async leaveOrderLegacy(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: unknown,
  ): Promise<{ success: boolean; room?: string; error?: string }> {
    return this.leaveOrderRoom(client, this.extractOrderId(body));
  }

  @SubscribeMessage("location_update")
  async updateLocation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: unknown,
  ): Promise<Record<string, unknown>> {
    const identity = await this.getActiveIdentity(client);
    if (!identity || identity.role !== "driver") {
      return { success: false, error: "tracking access denied" };
    }

    if (!isRecord(body)) {
      return { success: false, error: "invalid tracking payload" };
    }

    const orderId = typeof body.orderId === "string" ? body.orderId : undefined;
    if (!orderId || !SOCKET_ID_PATTERN.test(orderId)) {
      return { success: false, error: "valid orderId is required" };
    }

    if (body.driverId !== undefined && body.driverId !== identity.id) {
      return { success: false, error: "driver identity mismatch" };
    }

    const lat = body.lat ?? body.latitude;
    const lng = body.lng ?? body.longitude;
    if (
      typeof lat !== "number" ||
      !Number.isFinite(lat) ||
      lat < -90 ||
      lat > 90 ||
      typeof lng !== "number" ||
      !Number.isFinite(lng) ||
      lng < -180 ||
      lng > 180
    ) {
      return { success: false, error: "invalid coordinates" };
    }

    for (const [field, minimum, maximum] of [
      ["heading", 0, 360],
      ["speed", 0, Number.MAX_SAFE_INTEGER],
      ["accuracy", 0, Number.MAX_SAFE_INTEGER],
    ] as Array<[string, number, number]>) {
      const value = body[field];
      if (
        value !== undefined &&
        value !== null &&
        (typeof value !== "number" ||
          !Number.isFinite(value) ||
          value < minimum ||
          value > maximum)
      ) {
        return { success: false, error: `invalid ${field}` };
      }
    }

    const timestampValue = body.timestamp;
    if (
      typeof timestampValue !== "string" &&
      typeof timestampValue !== "number" &&
      !(timestampValue instanceof Date)
    ) {
      return { success: false, error: "valid timestamp is required" };
    }
    const timestamp = new Date(timestampValue);
    if (
      Number.isNaN(timestamp.getTime()) ||
      Math.abs(Date.now() - timestamp.getTime()) > 5 * 60 * 1000
    ) {
      return { success: false, error: "timestamp outside accepted window" };
    }

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, driverId: identity.id },
      select: { id: true, status: true },
    });
    if (!order || !TRACKING_STATUSES.has(order.status)) {
      return {
        success: false,
        error: "driver is not assigned to an active order",
      };
    }

    const event = {
      orderId: order.id,
      driverId: identity.id,
      lat,
      lng,
      heading: typeof body.heading === "number" ? body.heading : null,
      speed: typeof body.speed === "number" ? body.speed : null,
      accuracy: typeof body.accuracy === "number" ? body.accuracy : null,
      timestamp: timestamp.toISOString(),
    };

    await this.prisma.driver.update({
      where: { id: identity.id },
      data: { location: event },
    });

    const room = `order_${order.id}`;
    this.server
      ?.to(room)
      .to("admin-room")
      .emit("driver-location-update", event);
    this.server
      ?.to(room)
      .to("admin-room")
      .emit("driver_location_update", event);
    return { success: true, ...event };
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

  private async toSocketIdentity(
    payload: SocketTokenPayload,
  ): Promise<SocketIdentity | undefined> {
    if (!payload.sub) {
      return undefined;
    }

    const role = this.normalizeRole(payload.role ?? payload.type);
    if (!(await this.isActiveUser(role, payload.sub, payload.sessionId))) {
      return undefined;
    }

    return this.identityFor(role, payload.sub, payload.sessionId);
  }

  private normalizeRole(value: unknown): SocketRole | undefined {
    const role = String(value ?? "").toLowerCase();
    switch (role) {
      case "admin":
      case "super_admin":
        return "admin";
      case "customer":
        return "customer";
      case "driver":
        return "driver";
      case "restaurant":
        return "restaurant";
      default:
        return undefined;
    }
  }

  private identityFor(
    role: SocketRole | undefined,
    id: string,
    sessionId?: string,
  ): SocketIdentity | undefined {
    if (!role) return undefined;
    if (role === "admin")
      return { id, role, primaryRoom: "admin-room", sessionId };
    return { id, role, primaryRoom: `${role}_${id}`, sessionId };
  }

  private async isActiveUser(
    role: SocketRole | undefined,
    id: string,
    sessionId?: string,
  ): Promise<boolean> {
    if (!role || !SOCKET_ID_PATTERN.test(id)) return false;
    const user =
      role === "admin"
        ? await this.prisma.admin.findUnique({
            where: { id },
            select: { id: true, isActive: true },
          })
        : role === "customer"
          ? await this.prisma.customer.findUnique({
              where: { id },
              select: { id: true, isActive: true },
            })
          : role === "driver"
            ? await this.prisma.driver.findUnique({
                where: { id },
                select: { id: true, isActive: true },
              })
            : await this.prisma.restaurant.findUnique({
                where: { id },
                select: { id: true, isActive: true },
              });
    if (!user || !user.isActive) return false;
    if (!sessionId) return true;

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { userId: true, userType: true, expiresAt: true },
    });
    return Boolean(
      session &&
      session.userId === id &&
      session.userType.toLowerCase() === role &&
      session.expiresAt &&
      session.expiresAt > new Date(),
    );
  }

  private async getActiveIdentity(
    client: AuthenticatedSocket,
  ): Promise<SocketIdentity | undefined> {
    const identity = client.data.identity;
    if (!identity) return undefined;
    try {
      if (
        await this.isActiveUser(identity.role, identity.id, identity.sessionId)
      )
        return identity;
    } catch (error) {
      this.logger.warn(`Socket identity revalidation failed: ${String(error)}`);
    }
    client.disconnect(true);
    return undefined;
  }

  private extractOrderId(body: unknown): string | undefined {
    if (typeof body === "string") return body;
    if (!isRecord(body)) return undefined;
    if (typeof body.orderId === "string") return body.orderId;
    if (typeof body.room === "string" && body.room.startsWith("order_")) {
      return body.room.slice("order_".length);
    }
    return undefined;
  }

  private isAllowedRoomName(room: string): boolean {
    if (room === "admin-room") return true;
    const separator = room.indexOf("_");
    if (separator <= 0) return false;
    const prefix = room.slice(0, separator);
    const id = room.slice(separator + 1);
    return (
      ["customer", "restaurant", "driver", "order"].includes(prefix) &&
      SOCKET_ID_PATTERN.test(id)
    );
  }

  private async joinOrderRoom(
    client: AuthenticatedSocket,
    orderId: string | undefined,
  ): Promise<{ success: boolean; room?: string; error?: string }> {
    const identity = await this.getActiveIdentity(client);
    if (!identity || !orderId || !SOCKET_ID_PATTERN.test(orderId)) {
      return { success: false, error: "invalid order room" };
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        customerId: true,
        restaurantId: true,
        driverId: true,
      },
    });
    const ownsOrder =
      identity.role === "admin" ||
      (identity.role === "customer" && order?.customerId === identity.id) ||
      (identity.role === "restaurant" && order?.restaurantId === identity.id) ||
      (identity.role === "driver" && order?.driverId === identity.id);
    if (!order || !ownsOrder) {
      return { success: false, error: "order access denied" };
    }

    const room = `order_${order.id}`;
    client.join(room);
    return { success: true, room };
  }

  private async leaveOrderRoom(
    client: AuthenticatedSocket,
    orderId: string | undefined,
  ): Promise<{ success: boolean; room?: string; error?: string }> {
    const identity = await this.getActiveIdentity(client);
    if (!identity || !orderId || !SOCKET_ID_PATTERN.test(orderId)) {
      return { success: false, error: "invalid order room" };
    }
    const room = `order_${orderId}`;
    client.leave(room);
    return { success: true, room };
  }
}
