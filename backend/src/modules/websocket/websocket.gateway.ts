import { Injectable } from "@nestjs/common";

@Injectable()
export class WebSocketGateway {
  // Minimal implementation for test compatibility
  server: any = {
    to: () => ({ emit: () => {} }),
    emit: () => {},
  };

  async broadcastToRoom(): Promise<void> {
    // No-op implementation
  }

  async sendToUser(): Promise<void> {
    // No-op implementation
  }
}
