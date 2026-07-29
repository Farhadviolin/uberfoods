import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { WebSocketGateway } from "./websocket.gateway";

@Module({
  imports: [AuthModule],
  controllers: [],
  providers: [WebSocketGateway],
  exports: [],
})
export class WebsocketModule {}
