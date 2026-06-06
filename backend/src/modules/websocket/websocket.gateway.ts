import { Injectable, Logger } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway as NestWebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

@Injectable()
@NestWebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  path: "/socket.io",
})
export class WebSocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(WebSocketGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket): void {
    this.logger.debug(`Socket connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage("join-room")
  joinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { room?: string },
  ): { success: boolean; room?: string } {
    if (body?.room) {
      client.join(body.room);
      return { success: true, room: body.room };
    }
    return { success: false };
  }

  async broadcastToRoom(room: string, event: string, payload: unknown): Promise<void> {
    this.server?.to(room).emit(event, payload);
  }

  async sendToUser(userId: string, event: string, payload: unknown): Promise<void> {
    this.server?.to(userId).emit(event, payload);
  }
}
